from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc
from typing import List

from database import get_db
from models.auth_models import Usuario
from models.gestao_equipes_models import Microarea, AgenteSaude
from schemas.gestao_equipes_schemas import (
    MicroareaCreate,
    MicroareaUpdate,
    MicroareaOut,
    AgenteSaudeCreate,
    AgenteSaudeUpdate,
    AgenteSaudeOut,
    KpisTerritorioOut,
)
from utils.deps import get_current_user

gestao_equipes_router = APIRouter(tags=["Gestão de Equipes e Microáreas"])

ALLOWED_ROLES = {"GESTOR", "RECEPCAO"}


def _ensure_allowed(current_user: Usuario):
    role = (current_user.role or "USER").upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Acesso restrito a gestores e recepção.")


# ─── KPIs ─────────────────────────────────────────────────────────────

@gestao_equipes_router.get(
    "/gestao-equipes/kpis",
    response_model=KpisTerritorioOut,
)
async def get_kpis(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna KPIs calculados dinamicamente a partir das microáreas."""
    _ensure_allowed(current_user)

    result = await db.execute(
        select(
            sqlfunc.coalesce(sqlfunc.sum(Microarea.populacao), 0).label("populacao"),
            sqlfunc.coalesce(sqlfunc.sum(Microarea.familias), 0).label("familias"),
            sqlfunc.count(Microarea.id).label("total"),
            sqlfunc.count(sqlfunc.nullif(Microarea.status, "COBERTA")).label("descobertas"),
        )
    )
    row = result.one()

    total = row.total or 0
    descobertas = row.descobertas or 0
    cobertas = total - descobertas
    cobertura = round((cobertas / total) * 100, 1) if total > 0 else 0

    return KpisTerritorioOut(
        populacao_adscrita=row.populacao,
        familias_cadastradas=row.familias,
        microareas_descobertas=descobertas,
        cobertura_esf=cobertura,
    )


# ─── Agentes ──────────────────────────────────────────────────────────

@gestao_equipes_router.get(
    "/gestao-equipes/agentes",
    response_model=List[AgenteSaudeOut],
)
async def listar_agentes(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todos os agentes de saúde com dados da microárea."""
    _ensure_allowed(current_user)

    result = await db.execute(
        select(AgenteSaude).order_by(AgenteSaude.id)
    )
    agentes = result.scalars().all()

    response = []
    for agente in agentes:
        usuario = await db.get(Usuario, agente.usuario_id)
        microarea = await db.get(Microarea, agente.microarea_id)

        resp = AgenteSaudeOut.model_validate(agente)
        resp.nome = usuario.nome if usuario else None
        resp.microarea_nome = microarea.nome if microarea else None
        resp.familias = microarea.familias if microarea else 0
        resp.pacientes = microarea.populacao if microarea else 0
        response.append(resp)

    return response


# ─── Microáreas ───────────────────────────────────────────────────────

@gestao_equipes_router.get(
    "/gestao-equipes/microareas",
    response_model=List[MicroareaOut],
)
async def listar_microareas(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as microáreas."""
    _ensure_allowed(current_user)

    result = await db.execute(
        select(Microarea).order_by(Microarea.id)
    )
    return result.scalars().all()


@gestao_equipes_router.post(
    "/gestao-equipes/microareas",
    response_model=MicroareaOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_microarea(
    payload: MicroareaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria uma nova microárea."""
    _ensure_allowed(current_user)

    if payload.status not in ("COBERTA", "DESCOBERTA"):
        raise HTTPException(status_code=400, detail="Status deve ser COBERTA ou DESCOBERTA.")

    nova = Microarea(**payload.model_dump())
    db.add(nova)
    await db.commit()
    await db.refresh(nova)
    return nova


@gestao_equipes_router.patch(
    "/gestao-equipes/microareas/{microarea_id}",
    response_model=MicroareaOut,
)
async def atualizar_microarea(
    microarea_id: int,
    payload: MicroareaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza uma microárea existente."""
    _ensure_allowed(current_user)

    microarea = await db.get(Microarea, microarea_id)
    if not microarea:
        raise HTTPException(status_code=404, detail="Microárea não encontrada.")

    dados = payload.model_dump(exclude_unset=True)
    if "status" in dados and dados["status"] not in ("COBERTA", "DESCOBERTA"):
        raise HTTPException(status_code=400, detail="Status deve ser COBERTA ou DESCOBERTA.")

    for campo, valor in dados.items():
        setattr(microarea, campo, valor)

    await db.commit()
    await db.refresh(microarea)
    return microarea


# ─── Agentes CRUD ─────────────────────────────────────────────────────

@gestao_equipes_router.post(
    "/gestao-equipes/agentes",
    response_model=AgenteSaudeOut,
    status_code=status.HTTP_201_CREATED,
)
async def criar_agente(
    payload: AgenteSaudeCreate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria um novo agente de saúde."""
    _ensure_allowed(current_user)

    microarea = await db.get(Microarea, payload.microarea_id)
    if not microarea:
        raise HTTPException(status_code=404, detail="Microárea não encontrada.")

    usuario = await db.get(Usuario, payload.usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    novo = AgenteSaude(**payload.model_dump())
    db.add(novo)
    await db.commit()
    await db.refresh(novo)

    resp = AgenteSaudeOut.model_validate(novo)
    resp.nome = usuario.nome
    resp.microarea_nome = microarea.nome
    resp.familias = microarea.familias
    resp.pacientes = microarea.populacao
    return resp


@gestao_equipes_router.patch(
    "/gestao-equipes/agentes/{agente_id}",
    response_model=AgenteSaudeOut,
)
async def atualizar_agente(
    agente_id: int,
    payload: AgenteSaudeUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Atualiza um agente de saúde."""
    _ensure_allowed(current_user)

    agente = await db.get(AgenteSaude, agente_id)
    if not agente:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(agente, campo, valor)

    await db.commit()
    await db.refresh(agente)

    usuario = await db.get(Usuario, agente.usuario_id)
    microarea = await db.get(Microarea, agente.microarea_id)

    resp = AgenteSaudeOut.model_validate(agente)
    resp.nome = usuario.nome if usuario else None
    resp.microarea_nome = microarea.nome if microarea else None
    resp.familias = microarea.familias if microarea else 0
    resp.pacientes = microarea.populacao if microarea else 0
    return resp
