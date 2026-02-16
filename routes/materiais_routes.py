from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models.materiais_models import EducationalMaterial, EducationalMaterialFile
from models.diagnostico_models import UBS
from models.auth_models import Usuario
from schemas.materiais_schemas import (
    EducationalMaterialUpdate,
    EducationalMaterialOut,
    EducationalMaterialFileOut,
)
from utils.deps import get_current_active_user
from utils.jwt_handler import verify_token

materiais_router = APIRouter(prefix="/materiais", tags=["materiais"])

EDIT_ROLES = {"GESTOR", "PROFISSIONAL"}

_UPLOADS_BASE_DIR = Path(__file__).resolve().parents[1] / "uploads" / "materials"
_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024


def _sanitize_filename(name: str) -> str:
    allowed = []
    for ch in (name or ""):
        if ch.isalnum() or ch in ("-", "_", ".", " "):
            allowed.append(ch)
        else:
            allowed.append("_")
    cleaned = "".join(allowed).strip().replace(" ", "_")
    return cleaned or "arquivo"


def _ensure_role(current_user: Usuario) -> None:
    role = (current_user.role or "USER").upper()
    if role not in EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito")


def _resolve_path(storage_path: str) -> Path:
    resolved = Path(storage_path)
    if resolved.is_absolute():
        base = _UPLOADS_BASE_DIR.resolve()
        resolved = resolved.resolve()
        if base not in resolved.parents:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo nao localizado")
        return resolved
    return (_UPLOADS_BASE_DIR / resolved).resolve()


async def _get_user_from_token(raw_token: str, db: AsyncSession) -> Usuario:
    payload = verify_token(raw_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido")

    resultado = await db.execute(select(Usuario).where(Usuario.id == int(user_id)))
    usuario = resultado.scalar_one_or_none()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado")

    if not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inativo")

    return usuario


async def _get_ubs_or_404(ubs_id: int, db: AsyncSession) -> UBS:
    resultado = await db.execute(
        select(UBS).where(UBS.id == ubs_id, UBS.is_deleted.is_(False))
    )
    ubs = resultado.scalar_one_or_none()
    if not ubs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UBS não encontrada")
    return ubs


@materiais_router.get("", response_model=list[EducationalMaterialOut])
async def list_materials(
    ubs_id: int = Query(..., ge=1),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)
    await _get_ubs_or_404(ubs_id, db)

    resultado = await db.execute(
        select(EducationalMaterial)
        .where(EducationalMaterial.ubs_id == ubs_id)
        .options(selectinload(EducationalMaterial.files))
        .order_by(EducationalMaterial.created_at.desc())
    )
    return resultado.scalars().all()


@materiais_router.post("", response_model=EducationalMaterialOut, status_code=status.HTTP_201_CREATED)
async def create_material(
    ubs_id: int = Form(...),
    titulo: str = Form(...),
    descricao: str | None = Form(None),
    categoria: str | None = Form(None),
    publico_alvo: str | None = Form(None),
    ativo: bool = Form(True),
    file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)
    await _get_ubs_or_404(ubs_id, db)

    material = EducationalMaterial(
        ubs_id=ubs_id,
        titulo=titulo,
        descricao=descricao,
        categoria=categoria,
        publico_alvo=publico_alvo,
        ativo=ativo,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(material)
    await db.commit()

    if file is not None:
        safe_name = _sanitize_filename(file.filename)
        filename = f"{uuid.uuid4().hex}_{safe_name}"
        dest_dir = _UPLOADS_BASE_DIR / str(material.ubs_id) / str(material.id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        storage_path = dest_dir / filename

        content = await file.read()
        if len(content) > _MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Arquivo excede o limite de 20MB",
            )
        storage_path.write_bytes(content)

        file_entry = EducationalMaterialFile(
            material_id=material.id,
            original_filename=file.filename,
            content_type=file.content_type,
            size_bytes=len(content),
            storage_path=str(storage_path),
        )
        db.add(file_entry)
        await db.commit()

    result = await db.execute(
        select(EducationalMaterial)
        .where(EducationalMaterial.id == material.id)
        .options(selectinload(EducationalMaterial.files))
    )
    return result.scalar_one()


@materiais_router.patch("/{material_id}", response_model=EducationalMaterialOut)
async def update_material(
    material_id: int,
    payload: EducationalMaterialUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)

    material = await db.get(EducationalMaterial, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    dados_atualizacao = payload.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(material, campo, valor)
    material.updated_by = current_user.id

    await db.commit()
    result = await db.execute(
        select(EducationalMaterial)
        .where(EducationalMaterial.id == material.id)
        .options(selectinload(EducationalMaterial.files))
    )
    return result.scalar_one()


@materiais_router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)

    material = await db.get(EducationalMaterial, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    resultado = await db.execute(
        select(EducationalMaterialFile).where(EducationalMaterialFile.material_id == material_id)
    )
    for file_row in resultado.scalars().all():
        storage_path = _resolve_path(file_row.storage_path)
        if storage_path.exists():
            storage_path.unlink()

    await db.delete(material)
    await db.commit()
    return None


@materiais_router.post("/{material_id}/files", response_model=EducationalMaterialFileOut)
async def upload_material_file(
    material_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)

    material = await db.get(EducationalMaterial, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material não encontrado")

    safe_name = _sanitize_filename(file.filename)
    filename = f"{uuid.uuid4().hex}_{safe_name}"
    dest_dir = _UPLOADS_BASE_DIR / str(material.ubs_id) / str(material.id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    storage_path = dest_dir / filename

    content = await file.read()
    if len(content) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Arquivo excede o limite de 20MB",
        )
    storage_path.write_bytes(content)

    file_entry = EducationalMaterialFile(
        material_id=material.id,
        original_filename=file.filename,
        content_type=file.content_type,
        size_bytes=len(content),
        storage_path=str(storage_path),
    )
    db.add(file_entry)
    await db.commit()
    await db.refresh(file_entry)
    return file_entry


@materiais_router.get("/files/{file_id}/download")
async def download_material_file(
    file_id: int,
    request: Request,
    token: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    header_auth = request.headers.get("authorization")
    raw_token = None
    if header_auth and header_auth.lower().startswith("bearer "):
        raw_token = header_auth.split(" ", 1)[1].strip()
    if not raw_token and token:
        raw_token = token

    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Não autenticado")

    usuario = await _get_user_from_token(raw_token, db)
    _ensure_role(usuario)

    file_entry = await db.get(EducationalMaterialFile, file_id)
    if not file_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")

    storage_path = _resolve_path(file_entry.storage_path)
    if not storage_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não localizado")

    return FileResponse(
        path=str(storage_path),
        filename=file_entry.original_filename,
        media_type=file_entry.content_type or "application/octet-stream",
    )


@materiais_router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)

    file_entry = await db.get(EducationalMaterialFile, file_id)
    if not file_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo não encontrado")

    storage_path = _resolve_path(file_entry.storage_path)
    if storage_path.exists():
        storage_path.unlink()

    await db.delete(file_entry)
    await db.commit()
    return None
