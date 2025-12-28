from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from datetime import datetime, timedelta
import re

from database import get_db
from models.auth_models import Usuario, ProfissionalUbs, LoginAttempt
from utils.jwt_handler import create_access_token
from utils.cpf_validator import validate_cpf
from slowapi import Limiter
from slowapi.util import get_remote_address

auth_router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# Usa pbkdf2_sha256 para evitar dependência direta do backend bcrypt
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


class UsuarioCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    senha: str = Field(..., min_length=8, max_length=100)
    cpf: str = Field(..., min_length=11, max_length=14)
    
    @field_validator('nome')
    @classmethod
    def validate_nome(cls, v):
        if not v.strip():
            raise ValueError('Nome não pode estar vazio')
        if not re.match(r'^[a-zA-ZÀ-ÿ\s]+$', v):
            raise ValueError('Nome deve conter apenas letras')
        return v.strip()
    
    @field_validator('cpf')
    @classmethod
    def validate_cpf_field(cls, v):
        if not validate_cpf(v):
            raise ValueError('CPF inválido')
        return ''.join(filter(str.isdigit, v))
    
    @field_validator('senha')
    @classmethod
    def validate_senha(cls, v):
        if len(v) < 8:
            raise ValueError('Senha deve ter no mínimo 8 caracteres')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Senha deve conter pelo menos uma letra maiúscula')
        if not re.search(r'[a-z]', v):
            raise ValueError('Senha deve conter pelo menos uma letra minúscula')
        if not re.search(r'\d', v):
            raise ValueError('Senha deve conter pelo menos um número')
        return v


class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: EmailStr
    cpf: str
    is_profissional: bool

    class Config:
        from_attributes = True


class ProfissionalCreate(BaseModel):
    usuario_id: int
    cargo: str
    registro_profissional: str


def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    return pwd_context.verify(raw, hashed)


async def log_login_attempt(db: AsyncSession, email: str, ip_address: str, sucesso: bool, motivo: str = None):
    tentativa = LoginAttempt(
        email=email,
        ip_address=ip_address,
        sucesso=sucesso,
        motivo=motivo
    )
    db.add(tentativa)
    await db.commit()


async def check_account_lockout(db: AsyncSession, user: Usuario) -> bool:
    if user.bloqueado_ate and user.bloqueado_ate > datetime.utcnow():
        return True
    
    if user.bloqueado_ate and user.bloqueado_ate <= datetime.utcnow():
        user.tentativas_login = 0
        user.bloqueado_ate = None
        await db.commit()
    
    return False


async def handle_failed_login(db: AsyncSession, user: Usuario):
    user.tentativas_login += 1
    
    if user.tentativas_login >= MAX_LOGIN_ATTEMPTS:
        user.bloqueado_ate = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        user.tentativas_login = 0
    
    await db.commit()


async def reset_login_attempts(db: AsyncSession, user: Usuario):
    user.tentativas_login = 0
    user.bloqueado_ate = None
    await db.commit()


@auth_router.post("/register", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(request: Request, payload: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    resultado = await db.execute(select(Usuario).filter(Usuario.email == payload.email))
    if resultado.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    resultado = await db.execute(select(Usuario).filter(Usuario.cpf == payload.cpf))
    if resultado.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="CPF já cadastrado")
    
    usuario = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha=hash_password(payload.senha),
        cpf=payload.cpf
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    
    return UsuarioOut(
        id=usuario.id,
        nome=usuario.nome,
        email=usuario.email,
        cpf=usuario.cpf,
        is_profissional=False
    )


@auth_router.post("/login")
@limiter.limit("10/minute")
async def login_user(request: Request, payload: UsuarioLogin, db: AsyncSession = Depends(get_db)):
    ip_cliente = get_remote_address(request)
    
    resultado = await db.execute(select(Usuario).filter(Usuario.email == payload.email))
    usuario = resultado.scalar_one_or_none()
    
    if not usuario:
        await log_login_attempt(db, payload.email, ip_cliente, False, "Usuario nao encontrado")
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    if await check_account_lockout(db, usuario):
        tempo_restante = int((usuario.bloqueado_ate - datetime.utcnow()).total_seconds() / 60)
        await log_login_attempt(db, payload.email, ip_cliente, False, f"Conta bloqueada ({tempo_restante} min restantes)")
        raise HTTPException(
            status_code=403, 
            detail=f"Conta temporariamente bloqueada. Tente novamente em {tempo_restante} minutos."
        )
    
    if not usuario.ativo:
        await log_login_attempt(db, payload.email, ip_cliente, False, "Usuario inativo")
        raise HTTPException(status_code=403, detail="Usuario inativo")
    
    if not verify_password(payload.senha, usuario.senha):
        await handle_failed_login(db, usuario)
        tentativas_restantes = MAX_LOGIN_ATTEMPTS - usuario.tentativas_login
        await log_login_attempt(db, payload.email, ip_cliente, False, f"Senha incorreta ({tentativas_restantes} tentativas restantes)")
        
        if tentativas_restantes <= 0:
            raise HTTPException(
                status_code=403,
                detail=f"Conta bloqueada por {LOCKOUT_DURATION_MINUTES} minutos devido a múltiplas tentativas falhas."
            )
        
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    await reset_login_attempts(db, usuario)
    
    resultado = await db.execute(select(ProfissionalUbs).filter(ProfissionalUbs.usuario_id == usuario.id))
    is_profissional = resultado.scalar_one_or_none() is not None
    
    token_acesso = create_access_token(
        data={"sub": str(usuario.id), "email": usuario.email, "is_profissional": is_profissional}
    )
    
    await log_login_attempt(db, payload.email, ip_cliente, True, "Login bem-sucedido")
    
    return {
        "message": "Login realizado com sucesso",
        "access_token": token_acesso,
        "token_type": "bearer",
        "user": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "cpf": usuario.cpf,
            "is_profissional": is_profissional
        }
    }


@auth_router.post("/profissional", response_model=dict, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_profissional(request: Request, payload: ProfissionalCreate, db: AsyncSession = Depends(get_db)):
    resultado = await db.execute(select(Usuario).filter(Usuario.id == payload.usuario_id))
    usuario = resultado.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    resultado = await db.execute(select(ProfissionalUbs).filter(ProfissionalUbs.usuario_id == payload.usuario_id))
    if resultado.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Usuário já é profissional")
    
    resultado = await db.execute(select(ProfissionalUbs).filter(ProfissionalUbs.registro_profissional == payload.registro_profissional))
    if resultado.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Registro profissional já cadastrado")
    
    profissional = ProfissionalUbs(
        usuario_id=payload.usuario_id,
        cargo=payload.cargo,
        registro_profissional=payload.registro_profissional
    )
    db.add(profissional)
    await db.commit()
    await db.refresh(profissional)
    
    return {
        "message": "Profissional cadastrado com sucesso",
        "profissional": {
            "id": profissional.id,
            "usuario_id": profissional.usuario_id,
            "cargo": profissional.cargo,
            "registro_profissional": profissional.registro_profissional
        }
    }
