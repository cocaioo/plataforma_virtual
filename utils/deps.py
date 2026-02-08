from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.auth_models import Usuario, ProfissionalUbs
from utils.jwt_handler import verify_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    excecao_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    carga_util = verify_token(token)
    if not carga_util:
        print(f"DEBUG: Token inválido ou expirado: {token[:10]}...")
        raise excecao_credenciais

    id_usuario = carga_util.get("sub")
    if id_usuario is None:
        print("DEBUG: Token sem campo 'sub'")
        raise excecao_credenciais

    resultado = await db.execute(select(Usuario).where(Usuario.id == int(id_usuario)))
    usuario = resultado.scalar_one_or_none()
    if not usuario:
        print(f"DEBUG: Usuário ID {id_usuario} não encontrado no banco")
        raise excecao_credenciais
    
    if not usuario.ativo:
        print(f"DEBUG: Usuário ID {id_usuario} está inativo")
        raise excecao_credenciais

    return usuario


async def get_current_active_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if not current_user.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
    return current_user


async def get_current_professional_user(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    role = (current_user.role or "USER").upper()
    if role in ("PROFISSIONAL", "GESTOR"):
        return current_user

    # Compatibilidade: se existir registro ativo em profissionais, também permite
    resultado = await db.execute(
        select(ProfissionalUbs).where(
            ProfissionalUbs.usuario_id == current_user.id,
            ProfissionalUbs.ativo.is_(True),
        )
    )
    if resultado.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito a profissionais")
    return current_user


async def get_current_gestor_user(
    current_user: Usuario = Depends(get_current_professional_user),
) -> Usuario:
    role = (current_user.role or "USER").upper()
    if role != "GESTOR":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao gestor")
    return current_user
