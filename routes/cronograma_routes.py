from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.cronograma_models import CronogramaEvent, CronogramaTipo, RecurrenceType
from models.diagnostico_models import UBS
from models.auth_models import Usuario
from schemas.cronograma_schemas import CronogramaCreate, CronogramaUpdate, CronogramaOut
from utils.deps import get_current_active_user

cronograma_router = APIRouter(prefix="/cronograma", tags=["cronograma"])

EDIT_ROLES = {"GESTOR", "PROFISSIONAL", "ACS"}


def _ensure_role(current_user: Usuario) -> None:
    role = (current_user.role or "USER").upper()
    if role not in EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito")


def _validate_enum_value(value: str, allowed: set[str], label: str) -> str:
    cleaned = (value or "").upper().strip()
    if not cleaned:
        return ""
    if cleaned not in allowed:
        raise HTTPException(status_code=400, detail=f"{label} inválido")
    return cleaned


def _normalize_all_day(inicio: datetime, fim: datetime | None) -> tuple[datetime, datetime | None]:
    start = inicio.replace(hour=0, minute=0, second=0, microsecond=0)
    if fim is None:
        end = start.replace(hour=23, minute=59, second=59, microsecond=0)
    else:
        end = fim.replace(hour=23, minute=59, second=59, microsecond=0)
    return start, end


async def _get_ubs_or_404(ubs_id: int, db: AsyncSession) -> UBS:
    resultado = await db.execute(
        select(UBS).where(UBS.id == ubs_id, UBS.is_deleted.is_(False))
    )
    ubs = resultado.scalar_one_or_none()
    if not ubs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UBS não encontrada")
    return ubs


@cronograma_router.get("", response_model=list[CronogramaOut])
async def list_events(
    ubs_id: int = Query(..., ge=1),
    start: datetime | None = Query(None),
    end: datetime | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)
    await _get_ubs_or_404(ubs_id, db)

    query = select(CronogramaEvent).where(CronogramaEvent.ubs_id == ubs_id)
    if start:
        query = query.where(CronogramaEvent.inicio >= start)
    if end:
        query = query.where(CronogramaEvent.inicio <= end)

    resultado = await db.execute(query.order_by(CronogramaEvent.inicio))
    return resultado.scalars().all()


@cronograma_router.post("", response_model=CronogramaOut, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: CronogramaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)
    await _get_ubs_or_404(payload.ubs_id, db)

    tipo = _validate_enum_value(payload.tipo, {t.value for t in CronogramaTipo}, "Tipo")
    recorrencia = _validate_enum_value(
        payload.recorrencia, {r.value for r in RecurrenceType}, "Recorrencia"
    )

    inicio_value = payload.inicio
    fim_value = payload.fim
    if payload.dia_inteiro:
        inicio_value, fim_value = _normalize_all_day(payload.inicio, payload.fim)

    evento = CronogramaEvent(
        ubs_id=payload.ubs_id,
        titulo=payload.titulo,
        tipo=tipo or CronogramaTipo.OUTRO.value,
        local=payload.local,
        inicio=inicio_value,
        fim=fim_value,
        dia_inteiro=payload.dia_inteiro,
        observacoes=payload.observacoes,
        recorrencia=recorrencia or RecurrenceType.NONE.value,
        recorrencia_intervalo=payload.recorrencia_intervalo,
        recorrencia_fim=payload.recorrencia_fim,
        created_by=current_user.id,
        updated_by=current_user.id,
    )

    db.add(evento)
    await db.commit()
    await db.refresh(evento)
    return evento


@cronograma_router.patch("/{event_id}", response_model=CronogramaOut)
async def update_event(
    event_id: int,
    payload: CronogramaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)

    evento = await db.get(CronogramaEvent, event_id)
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")

    dados_atualizacao = payload.model_dump(exclude_unset=True)
    if "tipo" in dados_atualizacao:
        dados_atualizacao["tipo"] = _validate_enum_value(
            dados_atualizacao["tipo"], {t.value for t in CronogramaTipo}, "Tipo"
        )
    if "recorrencia" in dados_atualizacao:
        dados_atualizacao["recorrencia"] = _validate_enum_value(
            dados_atualizacao["recorrencia"], {r.value for r in RecurrenceType}, "Recorrencia"
        )

    dia_inteiro = dados_atualizacao.get("dia_inteiro", evento.dia_inteiro)
    if dia_inteiro:
        inicio_base = dados_atualizacao.get("inicio", evento.inicio)
        fim_base = dados_atualizacao.get("fim", evento.fim)
        inicio_value, fim_value = _normalize_all_day(inicio_base, fim_base)
        dados_atualizacao["inicio"] = inicio_value
        dados_atualizacao["fim"] = fim_value

    for campo, valor in dados_atualizacao.items():
        setattr(evento, campo, valor)
    evento.updated_by = current_user.id

    await db.commit()
    await db.refresh(evento)
    return evento


@cronograma_router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    _ensure_role(current_user)

    evento = await db.get(CronogramaEvent, event_id)
    if not evento:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento não encontrado")

    await db.delete(evento)
    await db.commit()
    return None
