from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sqlfunc, update, or_
from typing import List, Optional

from app.database import get_db
from app.models.auth_models import Usuario
from app.models.gestao_equipes_models import Microarea, AgenteSaude
from app.schemas.gestao_equipes_schemas import (
    MicroareaCreate,
    MicroareaUpdate,
    MicroareaOut,
    AgenteSaudeCreate,
    AgenteSaudeUpdate,
    AgenteSaudeOut,
    MicroareaAgentesUpdate,
    KpisTerritorioOut,
    AcsUserOut,
)
from app.utils.deps import get_current_user
from app.models.diagnostico_models import UBS

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
    ubs_id: Optional[int] = Query(None, ge=1),
):
    """Retorna KPIs calculados dinamicamente a partir das microáreas."""
    _ensure_allowed(current_user)

    stmt = select(
        sqlfunc.coalesce(sqlfunc.sum(Microarea.populacao), 0).label("populacao"),
        sqlfunc.coalesce(sqlfunc.sum(Microarea.familias), 0).label("familias"),
        sqlfunc.count(Microarea.id).label("total"),
        sqlfunc.count(sqlfunc.nullif(Microarea.status, "COBERTA")).label("descobertas"),
    )

    if ubs_id:
        stmt = stmt.where(Microarea.ubs_id == ubs_id)

    result = await db.execute(stmt)
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
    ubs_id: Optional[int] = Query(None, ge=1),
):
    """Lista todos os agentes de saúde com dados da microárea."""
    _ensure_allowed(current_user)

    stmt = select(AgenteSaude)
    if ubs_id:
        stmt = (
            stmt.outerjoin(Microarea, AgenteSaude.microarea_id == Microarea.id)
            .where(
                or_(
                    Microarea.ubs_id == ubs_id,
                    AgenteSaude.microarea_id.is_(None),
                )
            )
        )
    result = await db.execute(stmt.order_by(AgenteSaude.id))
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
    ubs_id: Optional[int] = Query(None, ge=1),
):
    """Lista todas as microáreas."""
    _ensure_allowed(current_user)

    stmt = select(Microarea)
    if ubs_id:
        stmt = stmt.where(Microarea.ubs_id == ubs_id)
    result = await db.execute(stmt.order_by(Microarea.id))
    return result.scalars().all()


@gestao_equipes_router.get("/gestao-equipes/microareas/export/pdf")
async def export_microareas_pdf(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ubs_id: Optional[int] = Query(None, ge=1),
):
    """Exporta um PDF com a situacao atual das microareas."""
    _ensure_allowed(current_user)

    if not ubs_id:
        raise HTTPException(status_code=400, detail="Informe o ubs_id.")

    ubs = await db.get(UBS, ubs_id)
    if not ubs or ubs.is_deleted:
        raise HTTPException(status_code=404, detail="UBS nao encontrada.")

    microareas = (
        await db.execute(
            select(Microarea).where(Microarea.ubs_id == ubs_id).order_by(Microarea.id)
        )
    ).scalars().all()

    agentes_stmt = (
        select(AgenteSaude, Usuario)
        .join(Usuario, Usuario.id == AgenteSaude.usuario_id)
        .join(Microarea, Microarea.id == AgenteSaude.microarea_id)
        .where(Microarea.ubs_id == ubs_id)
        .order_by(AgenteSaude.id)
    )
    agentes_rows = (await db.execute(agentes_stmt)).all()

    agentes_por_microarea = {}
    for agente, usuario in agentes_rows:
        agentes_por_microarea.setdefault(agente.microarea_id, []).append(usuario.nome)

    try:
        from app.services.reporting.microareas_report_pdf import generate_microareas_report_pdf

        pdf_bytes, filename_base = generate_microareas_report_pdf(
            ubs=ubs,
            microareas=microareas,
            agentes_por_microarea=agentes_por_microarea,
            emitted_by=(current_user.nome or None),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {exc}") from exc

    headers = {
        "Content-Disposition": f'attachment; filename="{filename_base}.pdf"',
        "X-Report-Engine": "reportlab",
    }
    return FastAPIResponse(content=pdf_bytes, media_type="application/pdf", headers=headers)


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

    if not payload.descricao.strip():
        raise HTTPException(status_code=400, detail="Descricao e obrigatoria.")

    if not payload.localidades:
        raise HTTPException(status_code=400, detail="Informe ao menos uma localidade.")

    ubs = await db.get(UBS, payload.ubs_id)
    if not ubs:
        raise HTTPException(status_code=404, detail="UBS não encontrada.")

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

    if "descricao" in dados and not (dados["descricao"] or "").strip():
        raise HTTPException(status_code=400, detail="Descricao e obrigatoria.")

    if "localidades" in dados and not dados["localidades"]:
        raise HTTPException(status_code=400, detail="Informe ao menos uma localidade.")

    for campo, valor in dados.items():
        setattr(microarea, campo, valor)

    await db.commit()
    await db.refresh(microarea)
    return microarea


@gestao_equipes_router.delete(
    "/gestao-equipes/microareas/{microarea_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def deletar_microarea(
    microarea_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove uma microárea (e seus vínculos)."""
    _ensure_allowed(current_user)

    microarea = await db.get(Microarea, microarea_id)
    if not microarea:
        raise HTTPException(status_code=404, detail="Microárea não encontrada.")

    await db.execute(
        update(AgenteSaude)
        .where(AgenteSaude.microarea_id == microarea_id)
        .values(microarea_id=None)
    )
    await db.delete(microarea)
    await db.commit()
    return None


@gestao_equipes_router.post(
    "/gestao-equipes/microareas/{microarea_id}/agentes",
    response_model=List[AgenteSaudeOut],
    status_code=status.HTTP_201_CREATED,
)
async def associar_agentes_microarea(
    microarea_id: int,
    payload: MicroareaAgentesUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Associa varios agentes a uma microarea em uma unica operacao."""
    _ensure_allowed(current_user)

    microarea = await db.get(Microarea, microarea_id)
    if not microarea:
        raise HTTPException(status_code=404, detail="Microarea nao encontrada.")

    usuario_ids = list(dict.fromkeys(payload.usuario_ids))
    if not usuario_ids:
        raise HTTPException(status_code=400, detail="Informe ao menos um usuario.")

    result = await db.execute(select(Usuario).where(Usuario.id.in_(usuario_ids)))
    usuarios = {usuario.id: usuario for usuario in result.scalars().all()}
    faltantes = [uid for uid in usuario_ids if uid not in usuarios]
    if faltantes:
        raise HTTPException(
            status_code=404,
            detail=f"Usuarios nao encontrados: {', '.join(map(str, faltantes))}.",
        )

    invalidos = [
        usuario for usuario in usuarios.values() if (usuario.role or "USER").upper() != "ACS"
    ]
    if invalidos:
        raise HTTPException(status_code=400, detail="Usuarios devem ter role ACS.")

    result = await db.execute(
        select(AgenteSaude).where(
            AgenteSaude.microarea_id == microarea_id,
            AgenteSaude.usuario_id.in_(usuario_ids),
        )
    )
    existentes = {agente.usuario_id: agente for agente in result.scalars().all()}

    novos = []
    for usuario_id in usuario_ids:
        if usuario_id in existentes:
            continue
        agente = AgenteSaude(usuario_id=usuario_id, microarea_id=microarea_id, ativo=True)
        db.add(agente)
        novos.append(agente)

    await db.commit()
    for agente in novos:
        await db.refresh(agente)

    response = []
    for usuario_id in usuario_ids:
        agente = existentes.get(usuario_id)
        if not agente:
            agente = next((novo for novo in novos if novo.usuario_id == usuario_id), None)
        if not agente:
            continue

        usuario = usuarios.get(usuario_id)
        resp = AgenteSaudeOut.model_validate(agente)
        resp.nome = usuario.nome if usuario else None
        resp.microarea_nome = microarea.nome
        resp.familias = microarea.familias
        resp.pacientes = microarea.populacao
        response.append(resp)

    return response


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

    microarea = None
    if payload.microarea_id:
        microarea = await db.get(Microarea, payload.microarea_id)
        if not microarea:
            raise HTTPException(status_code=404, detail="Microárea não encontrada.")

    usuario = await db.get(Usuario, payload.usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if (usuario.role or "USER").upper() != "ACS":
        raise HTTPException(status_code=400, detail="Usuário deve ter role ACS.")

    novo = AgenteSaude(**payload.model_dump())
    db.add(novo)
    await db.commit()
    await db.refresh(novo)

    resp = AgenteSaudeOut.model_validate(novo)
    resp.nome = usuario.nome
    resp.microarea_nome = microarea.nome if microarea else None
    resp.familias = microarea.familias if microarea else 0
    resp.pacientes = microarea.populacao if microarea else 0
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
    if "usuario_id" in dados:
        usuario = await db.get(Usuario, dados["usuario_id"])
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        if (usuario.role or "USER").upper() != "ACS":
            raise HTTPException(status_code=400, detail="Usuário deve ter role ACS.")
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


@gestao_equipes_router.delete(
    "/gestao-equipes/agentes/{agente_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def deletar_agente(
    agente_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Desassocia um agente removendo o vínculo com a microárea."""
    _ensure_allowed(current_user)

    agente = await db.get(AgenteSaude, agente_id)
    if not agente:
        raise HTTPException(status_code=404, detail="Agente não encontrado.")

    await db.delete(agente)
    await db.commit()
    return None


@gestao_equipes_router.get(
    "/gestao-equipes/acs-users",
    response_model=List[AcsUserOut],
)
async def listar_acs_users(
    current_user: Usuario = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista usuarios ACS ativos para vinculo nas microareas."""
    _ensure_allowed(current_user)

    result = await db.execute(
        select(Usuario).where(
            sqlfunc.upper(Usuario.role) == "ACS",
            Usuario.ativo.is_(True),
        ).order_by(Usuario.nome)
    )
    usuarios = result.scalars().all()
    return [AcsUserOut(id=u.id, nome=u.nome, email=u.email) for u in usuarios]
