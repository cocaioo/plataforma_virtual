from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext
from datetime import datetime, timedelta
import re

from database import get_db
from models.auth_models import Usuario, ProfissionalUbs, LoginAttempt, ProfessionalRequest
from utils.jwt_handler import create_access_token
from utils.cpf_validator import validate_cpf
from utils.deps import get_current_active_user, get_current_gestor_user
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
    telefone: str | None = Field(None, max_length=20)
    role: Literal["USER", "GESTOR", "RECEPCAO", "ACS"] = "USER"
    
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

    @field_validator('telefone')
    @classmethod
    def validate_telefone(cls, v: str | None):
        if v is None:
            return v
        digits = ''.join(ch for ch in v if ch.isdigit())
        if len(digits) < 8:
            raise ValueError('Telefone deve ter ao menos 8 digitos')
        return v


class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: EmailStr
    cpf: str
    telefone: str | None = None
    is_profissional: bool
    role: str

    class Config:
        from_attributes = True


class UsuarioTelefoneUpdate(BaseModel):
    telefone: str | None = Field(None, max_length=20)

    @field_validator("telefone")
    @classmethod
    def validate_telefone(cls, v: str | None):
        if v is None:
            return v
        digits = ''.join(ch for ch in v if ch.isdigit())
        if len(digits) < 8:
            raise ValueError('Telefone deve ter ao menos 8 digitos')
        return v


@auth_router.get("/me", response_model=UsuarioOut)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    role = (current_user.role or "USER").upper()
    is_prof = role in ("PROFISSIONAL", "GESTOR")
    if not is_prof:
        resultado = await db.execute(
            select(ProfissionalUbs).where(ProfissionalUbs.usuario_id == current_user.id, ProfissionalUbs.ativo == True)
        )
        is_prof = resultado.scalar_one_or_none() is not None

    return {
        "id": current_user.id,
        "nome": current_user.nome,
        "email": current_user.email,
        "cpf": current_user.cpf,
        "telefone": current_user.telefone,
        "is_profissional": is_prof,
        "role": role,
    }


class ProfissionalCreate(BaseModel):
    usuario_id: int
    cargo: str
    registro_profissional: str


class ProfessionalRequestCreate(BaseModel):
    cargo: str = Field(..., min_length=2, max_length=100)
    registro_profissional: str = Field(..., min_length=3, max_length=50)


class ProfessionalRequestOut(BaseModel):
    id: int
    user_id: int
    cargo: str
    registro_profissional: str
    status: str
    rejection_reason: str | None = None
    submitted_at: datetime
    reviewed_at: datetime | None = None
    reviewed_by_user_id: int | None = None

    class Config:
        from_attributes = True


class UserSummaryOut(BaseModel):
    id: int
    nome: str
    email: EmailStr


class ProfessionalRequestWithUserOut(ProfessionalRequestOut):
    user: UserSummaryOut


class ProfessionalRequestReview(BaseModel):
    rejection_reason: str | None = Field(None, max_length=255)


class ProfessionalRequestApprove(BaseModel):
    role: str = Field(..., description="PROFISSIONAL ou GESTOR")

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str):
        role = (v or "").upper().strip()
        if role not in ("PROFISSIONAL", "GESTOR"):
            raise ValueError("role deve ser PROFISSIONAL ou GESTOR")
        return role


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
async def register_user(
    request: Request, 
    payload: UsuarioCreate, 
    db: AsyncSession = Depends(get_db)
):
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
        cpf=payload.cpf,
        telefone=payload.telefone,
        role=payload.role,
        welcome_email_sent=False # Default explicit
    )
    db.add(usuario)
    await db.commit()
    await db.refresh(usuario)
    
    return UsuarioOut(
        id=usuario.id,
        nome=usuario.nome,
        email=usuario.email,
        cpf=usuario.cpf,
        telefone=usuario.telefone,
        is_profissional=False,
        role=usuario.role or "USER",
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
    
    role = (usuario.role or "USER").upper()
    if role not in ("USER", "PROFISSIONAL", "GESTOR", "RECEPCAO", "ACS"):
        role = "USER"

    resultado = await db.execute(select(ProfissionalUbs).filter(ProfissionalUbs.usuario_id == usuario.id))
    tem_registro_prof = resultado.scalar_one_or_none() is not None
    is_profissional = role in ("PROFISSIONAL", "GESTOR") or tem_registro_prof
    
    token_acesso = create_access_token(
        data={"sub": str(usuario.id), "email": usuario.email, "is_profissional": is_profissional, "role": role}
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
            "telefone": usuario.telefone,
            "is_profissional": is_profissional,
            "role": role,
        }
    }


@auth_router.patch("/me/telefone", response_model=UsuarioOut)
async def update_my_phone(
    payload: UsuarioTelefoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    current_user.telefone = payload.telefone
    await db.commit()
    await db.refresh(current_user)
    return UsuarioOut.from_orm(current_user)


@auth_router.post("/professional-requests", response_model=ProfessionalRequestOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def create_professional_request(
    request: Request,
    payload: ProfessionalRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    role = (current_user.role or "USER").upper()
    if role in ("PROFISSIONAL", "GESTOR"):
        raise HTTPException(status_code=400, detail="Usuário já é profissional")

    # Uma solicitação por usuário (MVP). Se rejeitada, permite reenvio atualizando a mesma linha.
    resultado = await db.execute(select(ProfessionalRequest).where(ProfessionalRequest.user_id == current_user.id))
    existente = resultado.scalar_one_or_none()
    if existente is not None:
        if existente.status == "PENDING":
            raise HTTPException(status_code=400, detail="Você já possui uma solicitação pendente")
        if existente.status == "APPROVED":
            raise HTTPException(status_code=400, detail="Sua solicitação já foi aprovada")

    # Evita colisão com profissionais existentes
    resultado = await db.execute(
        select(ProfissionalUbs).where(ProfissionalUbs.registro_profissional == payload.registro_profissional)
    )
    if resultado.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Registro profissional já cadastrado")

    # Evita colisão com outra solicitação de outro usuário
    resultado = await db.execute(
        select(ProfessionalRequest).where(
            ProfessionalRequest.registro_profissional == payload.registro_profissional,
            ProfessionalRequest.user_id != current_user.id,
        )
    )
    if resultado.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Registro profissional já está em análise")

    if existente is None:
        solicitacao = ProfessionalRequest(
            user_id=current_user.id,
            cargo=payload.cargo,
            registro_profissional=payload.registro_profissional,
            status="PENDING",
        )
        db.add(solicitacao)
        await db.commit()
        await db.refresh(solicitacao)
        return solicitacao

    # Reenvio após rejeição
    existente.cargo = payload.cargo
    existente.registro_profissional = payload.registro_profissional
    existente.status = "PENDING"
    existente.rejection_reason = None
    existente.reviewed_at = None
    existente.reviewed_by_user_id = None
    existente.submitted_at = datetime.utcnow()
    await db.commit()
    await db.refresh(existente)
    return existente


@auth_router.get("/professional-requests/me", response_model=ProfessionalRequestOut)
async def get_my_professional_request(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    resultado = await db.execute(
        select(ProfessionalRequest)
        .where(ProfessionalRequest.user_id == current_user.id)
        .order_by(ProfessionalRequest.id.desc())
    )
    solicitacao = resultado.scalars().first()
    if not solicitacao:
        raise HTTPException(status_code=404, detail="Nenhuma solicitação encontrada")
    return solicitacao


@auth_router.get("/professional-requests", response_model=list[ProfessionalRequestWithUserOut])
async def list_professional_requests(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_gestor_user),
):
    stmt = (
        select(ProfessionalRequest, Usuario)
        .join(Usuario, Usuario.id == ProfessionalRequest.user_id)
        .order_by(ProfessionalRequest.id.desc())
    )
    if status_filter:
        stmt = stmt.where(ProfessionalRequest.status == status_filter.upper())
    resultado = await db.execute(stmt)
    itens: list[dict] = []
    for solicitacao, usuario in resultado.all():
        itens.append(
            {
                "id": solicitacao.id,
                "user_id": solicitacao.user_id,
                "cargo": solicitacao.cargo,
                "registro_profissional": solicitacao.registro_profissional,
                "status": solicitacao.status,
                "rejection_reason": solicitacao.rejection_reason,
                "submitted_at": solicitacao.submitted_at,
                "reviewed_at": solicitacao.reviewed_at,
                "reviewed_by_user_id": solicitacao.reviewed_by_user_id,
                "user": {
                    "id": usuario.id,
                    "nome": usuario.nome,
                    "email": usuario.email,
                },
            }
        )
    return itens


@auth_router.get("/professional-requests/pending-count", response_model=dict)
async def pending_professional_requests_count(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_gestor_user),
):
    resultado = await db.execute(
        select(func.count(ProfessionalRequest.id)).where(ProfessionalRequest.status == "PENDING")
    )
    count = int(resultado.scalar_one() or 0)
    return {"count": count}


@auth_router.post("/professional-requests/{request_id}/approve", response_model=dict)
async def approve_professional_request(
    request_id: int,
    payload: ProfessionalRequestApprove,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_gestor_user),
):
    resultado = await db.execute(select(ProfessionalRequest).where(ProfessionalRequest.id == request_id))
    solicitacao = resultado.scalar_one_or_none()
    if not solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if solicitacao.status != "PENDING":
        raise HTTPException(status_code=400, detail="Solicitação não está pendente")

    # Carrega usuário alvo
    resultado = await db.execute(select(Usuario).where(Usuario.id == solicitacao.user_id))
    usuario = resultado.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Garante profissional
    resultado = await db.execute(select(ProfissionalUbs).where(ProfissionalUbs.usuario_id == usuario.id))
    profissional = resultado.scalar_one_or_none()
    if not profissional:
        profissional = ProfissionalUbs(
            usuario_id=usuario.id,
            cargo=solicitacao.cargo,
            registro_profissional=solicitacao.registro_profissional,
        )
        db.add(profissional)

    usuario.role = payload.role
    solicitacao.status = "APPROVED"
    solicitacao.reviewed_at = datetime.utcnow()
    solicitacao.reviewed_by_user_id = current_user.id
    solicitacao.rejection_reason = None

    await db.commit()
    return {"message": "Solicitação aprovada", "role": usuario.role}


@auth_router.post("/professional-requests/{request_id}/reject", response_model=dict)
async def reject_professional_request(
    request_id: int,
    payload: ProfessionalRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_gestor_user),
):
    resultado = await db.execute(select(ProfessionalRequest).where(ProfessionalRequest.id == request_id))
    solicitacao = resultado.scalar_one_or_none()
    if not solicitacao:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    if solicitacao.status != "PENDING":
        raise HTTPException(status_code=400, detail="Solicitação não está pendente")

    solicitacao.status = "REJECTED"
    solicitacao.reviewed_at = datetime.utcnow()
    solicitacao.reviewed_by_user_id = current_user.id
    solicitacao.rejection_reason = payload.rejection_reason

    await db.commit()
    return {"message": "Solicitação reprovada"}


@auth_router.get("/users/pending-welcome", response_model=list[UserSummaryOut])
async def list_pending_welcome_users(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.role not in ("RECEPCAO", "GESTOR"):
        raise HTTPException(status_code=403, detail="Acesso restrito à Recepção ou Gestão")
    
    resultado = await db.execute(
        select(Usuario)
        .where(
            (Usuario.welcome_email_sent.is_(False)) | (Usuario.welcome_email_sent.is_(None)),
            Usuario.ativo.is_(True)
        )
        .order_by(Usuario.created_at.desc())
    )
    return resultado.scalars().all()


@auth_router.patch("/users/{user_id}/confirm-welcome")
async def confirm_welcome_email_sent(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if current_user.role not in ("RECEPCAO", "GESTOR"):
        raise HTTPException(status_code=403, detail="Acesso restrito à Recepção ou Gestão")
        
    resultado = await db.execute(select(Usuario).where(Usuario.id == user_id))
    usuario = resultado.scalar_one_or_none()
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    usuario.welcome_email_sent = True
    await db.commit()
    
    return {"message": "Status de boas-vindas atualizado"}
