from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.auth_models import Usuario
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
        raise excecao_credenciais

    id_usuario = carga_util.get("sub")
    if id_usuario is None:
        raise excecao_credenciais

    resultado = await db.execute(select(Usuario).where(Usuario.id == int(id_usuario)))
    usuario = resultado.scalar_one_or_none()
    if not usuario or not usuario.ativo:
        raise excecao_credenciais

    return usuario


async def get_current_active_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if not current_user.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
    return current_user
