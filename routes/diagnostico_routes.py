from typing import List, Optional
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status, UploadFile, File, Form
import logging
from fastapi.responses import Response as FastAPIResponse
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.diagnostico_models import (
    UBS,
    Service,
    UBSService,
    Indicator,
    ProfessionalGroup,
    TerritoryProfile,
    UBSNeeds,
    UBSAttachment,
    UBSProblem,
    UBSIntervention,
    UBSInterventionAction,
)
from models.auth_models import Usuario
from schemas.diagnostico_schemas import (
    UBSCreate,
    UBSUpdate,
    UBSOut,
    PaginatedUBS,
    UBSServicesPayload,
    UBSServicesOut,
    ServicesCatalogItem,
    IndicatorCreate,
    IndicatorUpdate,
    IndicatorOut,
    ProfessionalGroupCreate,
    ProfessionalGroupUpdate,
    ProfessionalGroupOut,
    TerritoryProfileCreate,
    TerritoryProfileUpdate,
    TerritoryProfileOut,
    UBSNeedsCreate,
    UBSNeedsUpdate,
    UBSNeedsOut,
    UBSAttachmentOut,
    UBSProblemCreate,
    UBSProblemUpdate,
    UBSProblemOut,
    UBSInterventionCreate,
    UBSInterventionUpdate,
    UBSInterventionOut,
    UBSInterventionActionCreate,
    UBSInterventionActionUpdate,
    UBSInterventionActionOut,
    UBSStatus,
    FullDiagnosisOut,
    UBSSubmissionMetadata,
    ValidationErrorResponse,
    ErrorDetail,
    UBSSubmitRequest,
)
from utils.deps import get_current_professional_user, get_current_active_user
from services.reporting.simple_situational_report_pdf import (
    generate_situational_report_pdf_simple,
)


diagnostico_router = APIRouter(prefix="/ubs", tags=["diagnostico"])

logger = logging.getLogger(__name__)

_UPLOADS_BASE_DIR = Path(__file__).resolve().parents[1] / "uploads"


def _sanitize_filename(name: str) -> str:
    allowed = []
    for ch in (name or ""):
        if ch.isalnum() or ch in ("-", "_", ".", " "):
            allowed.append(ch)
        else:
            allowed.append("_")
    cleaned = "".join(allowed).strip().replace(" ", "_")
    return cleaned or "arquivo"


def _gut_score(gravidade: int, urgencia: int, tendencia: int) -> int:
    return gravidade * urgencia * tendencia


async def _get_ubs_or_404(
    ubs_id: int,
    current_user: Usuario,
    db: AsyncSession,
) -> UBS:
    resultado = await db.execute(
        select(UBS).where(
            UBS.id == ubs_id,
            UBS.is_deleted.is_(False),
        )
    )
    ubs = resultado.scalar_one_or_none()
    if not ubs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UBS não encontrada")
    return ubs


# ----------------------- Informações gerais da UBS -----------------------


@diagnostico_router.post("", response_model=UBSOut, status_code=status.HTTP_201_CREATED)
async def create_ubs(
    payload: UBSCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = UBS(
        tenant_id=1,
        owner_user_id=current_user.id,
        nome_relatorio=payload.nome_relatorio,
        nome_ubs=payload.nome_ubs,
        cnes=payload.cnes,
        area_atuacao=payload.area_atuacao,
        numero_habitantes_ativos=payload.numero_habitantes_ativos or 0,
        numero_microareas=payload.numero_microareas or 0,
        numero_familias_cadastradas=payload.numero_familias_cadastradas or 0,
        numero_domicilios=payload.numero_domicilios or 0,
        domicilios_rurais=payload.domicilios_rurais,
        data_inauguracao=payload.data_inauguracao,
        data_ultima_reforma=payload.data_ultima_reforma,
        descritivos_gerais=payload.descritivos_gerais,
        observacoes_gerais=payload.observacoes_gerais,
        outros_servicos=payload.outros_servicos,

        periodo_referencia=payload.periodo_referencia,
        identificacao_equipe=payload.identificacao_equipe,
        responsavel_nome=payload.responsavel_nome,
        responsavel_cargo=payload.responsavel_cargo,
        responsavel_contato=payload.responsavel_contato,
        fluxo_agenda_acesso=payload.fluxo_agenda_acesso,

        status=UBSStatus.DRAFT.value,
    )
    db.add(ubs)
    await db.commit()
    await db.refresh(ubs)
    return ubs


@diagnostico_router.patch("/{ubs_id}", response_model=UBSOut)
async def update_ubs(
    ubs_id: int,
    payload: UBSUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    dados_atualizacao = payload.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(ubs, campo, valor)

    await db.commit()
    await db.refresh(ubs)
    return ubs


@diagnostico_router.get("", response_model=PaginatedUBS)
async def list_ubs_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[UBSStatus] = Query(None, alias="status"),
):
    """Lista relatórios (diagnósticos UBS) do usuário autenticado.

    Se USER: vê apenas relatórios criados por NÃO-USER (Gestor/Profissional).
    """

    base_stmt = select(UBS).where(UBS.is_deleted.is_(False))
    
    # Lógica de filtro para USER
    if (current_user.role or "USER") == "USER":
        # Junta com a tabela de usuarios para verificar a role do criador (owner_user_id)
        # Queremos relatórios onde o criador NÃO é USER
        base_stmt = base_stmt.join(Usuario, UBS.owner_user_id == Usuario.id).where(Usuario.role != "USER")

    if status_filter is not None:
        base_stmt = base_stmt.where(UBS.status == status_filter.value)

    # Contagem total com os filtros aplicados
    # Note que precisamos replicar os joins/wheres para o count funcionar corretamente com o filtro
    if (current_user.role or "USER") == "USER":
        count_stmt = select(func.count(UBS.id)).join(Usuario, UBS.owner_user_id == Usuario.id).where(UBS.is_deleted.is_(False), Usuario.role != "USER")
    else:
        count_stmt = select(func.count(UBS.id)).where(UBS.is_deleted.is_(False))

    if status_filter is not None:
        count_stmt = count_stmt.where(UBS.status == status_filter.value)
        
    total = (await db.execute(count_stmt)).scalar_one()

    ordering = func.coalesce(UBS.updated_at, UBS.created_at).desc()
    resultado = await db.execute(
        base_stmt.order_by(ordering)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [UBSOut.model_validate(ubs) for ubs in resultado.scalars().all()]

    return PaginatedUBS(items=items, total=total, page=page, page_size=page_size)


@diagnostico_router.delete("/{ubs_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ubs_report(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    """Soft-delete do relatório.

    Mantém o registro no banco para auditoria, mas remove da listagem do usuário.
    """

    ubs = await _get_ubs_or_404(ubs_id, current_user, db)
    ubs.is_deleted = True
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------- Grupos profissionais -----------------------


@diagnostico_router.get("/{ubs_id}/professionals", response_model=List[ProfessionalGroupOut])
async def list_professional_groups(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    resultado = await db.execute(
        select(ProfessionalGroup)
        .where(ProfessionalGroup.ubs_id == ubs.id)
        .order_by(ProfessionalGroup.cargo_funcao)
    )
    return resultado.scalars().all()


@diagnostico_router.post(
    "/{ubs_id}/professionals",
    response_model=ProfessionalGroupOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_professional_group(
    ubs_id: int,
    payload: ProfessionalGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    grupo = ProfessionalGroup(
        ubs_id=ubs.id,
        cargo_funcao=payload.cargo_funcao,
        quantidade=payload.quantidade,
        tipo_vinculo=payload.tipo_vinculo,
        observacoes=payload.observacoes,
        created_by=current_user.id,
    )
    db.add(grupo)
    await db.commit()
    await db.refresh(grupo)
    return grupo


@diagnostico_router.get("/professionals/{group_id}", response_model=ProfessionalGroupOut)
async def get_professional_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    resultado = await db.execute(
        select(ProfessionalGroup).join(UBS).where(
            ProfessionalGroup.id == group_id,
            UBS.is_deleted.is_(False),
        )
    )
    grupo = resultado.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado")
    return grupo


@diagnostico_router.patch("/professionals/{group_id}", response_model=ProfessionalGroupOut)
async def update_professional_group(
    group_id: int,
    payload: ProfessionalGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    resultado = await db.execute(
        select(ProfessionalGroup).join(UBS).where(
            ProfessionalGroup.id == group_id,
            UBS.is_deleted.is_(False),
        )
    )
    grupo = resultado.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado")

    dados_atualizacao = payload.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(grupo, campo, valor)

    grupo.updated_by = current_user.id

    await db.commit()
    await db.refresh(grupo)
    return grupo


@diagnostico_router.delete("/professionals/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_professional_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    resultado = await db.execute(
        select(ProfessionalGroup).join(UBS).where(
            ProfessionalGroup.id == group_id,
            UBS.is_deleted.is_(False),
        )
    )
    grupo = resultado.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado")

    await db.delete(grupo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------- Perfil do território -----------------------


@diagnostico_router.get("/{ubs_id}/territory", response_model=TerritoryProfileOut)
async def get_territory_profile(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    resultado = await db.execute(
        select(TerritoryProfile).where(TerritoryProfile.ubs_id == ubs.id)
    )
    perfil = resultado.scalar_one_or_none()
    if not perfil:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil de território não encontrado")
    return perfil


@diagnostico_router.put("/{ubs_id}/territory", response_model=TerritoryProfileOut)
async def upsert_territory_profile(
    ubs_id: int,
    payload: TerritoryProfileCreate | TerritoryProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    resultado = await db.execute(
        select(TerritoryProfile).where(TerritoryProfile.ubs_id == ubs.id)
    )
    perfil = resultado.scalar_one_or_none()

    dados = payload.model_dump(exclude_unset=True)

    if perfil:
        for campo, valor in dados.items():
            setattr(perfil, campo, valor)
        perfil.updated_by = current_user.id
    else:
        if "descricao_territorio" not in dados or not dados["descricao_territorio"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campo descricao_territorio é obrigatório",
            )
        perfil = TerritoryProfile(
            ubs_id=ubs.id,
            descricao_territorio=dados["descricao_territorio"],
            potencialidades_territorio=dados.get("potencialidades_territorio"),
            riscos_vulnerabilidades=dados.get("riscos_vulnerabilidades"),
            created_by=current_user.id,
        )
        db.add(perfil)

    await db.commit()
    await db.refresh(perfil)
    return perfil


# ----------------------- Necessidades da UBS -----------------------


@diagnostico_router.get("/{ubs_id}/needs", response_model=UBSNeedsOut)
async def get_ubs_needs(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    resultado = await db.execute(select(UBSNeeds).where(UBSNeeds.ubs_id == ubs.id))
    necessidades = resultado.scalar_one_or_none()
    if not necessidades:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro de necessidades não encontrado")
    return necessidades


@diagnostico_router.put("/{ubs_id}/needs", response_model=UBSNeedsOut)
async def upsert_ubs_needs(
    ubs_id: int,
    payload: UBSNeedsCreate | UBSNeedsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    resultado = await db.execute(select(UBSNeeds).where(UBSNeeds.ubs_id == ubs.id))
    necessidades = resultado.scalar_one_or_none()

    dados = payload.model_dump(exclude_unset=True)

    if necessidades:
        for campo, valor in dados.items():
            setattr(necessidades, campo, valor)
        necessidades.updated_by = current_user.id
    else:
        if "problemas_identificados" not in dados or not dados["problemas_identificados"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Campo problemas_identificados é obrigatório",
            )
        necessidades = UBSNeeds(
            ubs_id=ubs.id,
            problemas_identificados=dados["problemas_identificados"],
            necessidades_equipamentos_insumos=dados.get("necessidades_equipamentos_insumos"),
            necessidades_especificas_acs=dados.get("necessidades_especificas_acs"),
            necessidades_infraestrutura_manutencao=dados.get("necessidades_infraestrutura_manutencao"),
            created_by=current_user.id,
        )
        db.add(necessidades)

    await db.commit()
    await db.refresh(necessidades)
    return necessidades


# ----------------------- Indicadores epidemiológicos -----------------------


@diagnostico_router.get("/{ubs_id}/indicators", response_model=List[IndicatorOut])
async def list_ubs_indicators(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)
    resultado = await db.execute(
        select(Indicator)
        .where(Indicator.ubs_id == ubs.id)
        .order_by(Indicator.nome_indicador, Indicator.created_at.desc())
    )
    indicators = resultado.scalars().all()
    return [
        IndicatorOut(
            id=ind.id,
            ubs_id=ind.ubs_id,
            nome_indicador=ind.nome_indicador,
            valor=float(ind.valor),
            meta=float(ind.meta) if ind.meta is not None else None,
            tipo_valor=ind.tipo_valor,
            periodo_referencia=ind.periodo_referencia,
            observacoes=ind.observacoes,
            created_at=ind.created_at,
            updated_at=ind.updated_at,
        )
        for ind in indicators
    ]


@diagnostico_router.post("/{ubs_id}/indicators", response_model=IndicatorOut, status_code=status.HTTP_201_CREATED)
async def create_ubs_indicator(
    ubs_id: int,
    payload: IndicatorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)
    
    indicador = Indicator(
        ubs_id=ubs.id,
        nome_indicador=payload.nome_indicador,
        valor=payload.valor,
        meta=payload.meta,
        tipo_valor=payload.tipo_valor,
        periodo_referencia=payload.periodo_referencia,
        observacoes=payload.observacoes,
        created_by=current_user.id
    )
    db.add(indicador)
    await db.commit()
    await db.refresh(indicador)
    return indicador


@diagnostico_router.patch("/indicators/{indicator_id}", response_model=IndicatorOut)
async def update_indicator(
    indicator_id: int,
    payload: IndicatorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    resultado = await db.execute(
        select(Indicator).join(UBS).where(
            Indicator.id == indicator_id,
            UBS.is_deleted.is_(False)
        )
    )
    indicador = resultado.scalar_one_or_none()
    if not indicador:
        raise HTTPException(status_code=404, detail="Indicador não encontrado")
    
    dados = payload.model_dump(exclude_unset=True)
    for campo, valor in dados.items():
        setattr(indicador, campo, valor)
    
    indicador.updated_by = current_user.id
    await db.commit()
    await db.refresh(indicador)
    return indicador


@diagnostico_router.delete("/indicators/{indicator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_indicator(
    indicator_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    resultado = await db.execute(
        select(Indicator).join(UBS).where(
            Indicator.id == indicator_id,
            UBS.is_deleted.is_(False)
        )
    )
    indicador = resultado.scalar_one_or_none()
    if not indicador:
        raise HTTPException(status_code=404, detail="Indicador não encontrado")
    
    await db.delete(indicador)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------- Fluxo de envio -----------------------


def _validate_before_submit(ubs: UBS) -> list[ErrorDetail]:
    erros: list[ErrorDetail] = []

    def adicionar(campo: str, mensagem: str, codigo: str = "invalid") -> None:
        erros.append(ErrorDetail(field=campo, message=mensagem, code=codigo))

    # Informação geral obrigatória
    if not ubs.nome_ubs:
        adicionar("nome_ubs", "Nome da UBS é obrigatório", "required")
    if not ubs.cnes:
        adicionar("cnes", "CNES é obrigatório", "required")
    if not ubs.area_atuacao:
        adicionar("area_atuacao", "Área de atuação é obrigatória", "required")

    for campo in [
        "numero_habitantes_ativos",
        "numero_microareas",
        "numero_familias_cadastradas",
        "numero_domicilios",
    ]:
        if getattr(ubs, campo) is None:
            adicionar(campo, "Campo numérico obrigatório para envio", "required")
        elif getattr(ubs, campo) < 0:
            adicionar(campo, "Valor não pode ser negativo", "range")

    # Perfil do território
    if not ubs.territory_profile or not ubs.territory_profile.descricao_territorio:
        adicionar(
            "territory_profile.descricao_territorio",
            "Descrição do território é obrigatória",
            "required",
        )

    # Necessidades da UBS
    if not ubs.needs or not ubs.needs.problemas_identificados:
        adicionar(
            "needs.problemas_identificados",
            "Problemas identificados são obrigatórios",
            "required",
        )

    # Checagem simples de consistência
    if ubs.data_inauguracao and ubs.data_ultima_reforma:
        if ubs.data_ultima_reforma < ubs.data_inauguracao:
            adicionar(
                "data_ultima_reforma",
                "Data da última reforma não pode ser anterior à data de inauguração",
                "date_logic",
            )

    return erros


@diagnostico_router.post(
    "/{ubs_id}/submit",
    response_model=FullDiagnosisOut,
    responses={
        400: {"model": ValidationErrorResponse},
    },
)
async def submit_diagnosis(
    ubs_id: int,
    payload: UBSSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    # Carrega entidades relacionadas para validação e resposta
    await db.refresh(
        ubs,
        attribute_names=[
            "territory_profile",
            "needs",
            "services",
            "indicators",
            "professional_groups",
        ],
    )

    erros = _validate_before_submit(ubs)
    if erros:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "detail": "Falha na validação para envio do diagnóstico",
                "errors": [e.model_dump() for e in erros],
            },
        )

    ubs.status = UBSStatus.SUBMITTED.value
    from datetime import datetime as dt

    ubs.submitted_at = dt.utcnow()
    ubs.submitted_by = current_user.id

    await db.commit()
    await db.refresh(ubs)

    # Reaproveita a implementação do endpoint de agregação
    return await get_full_diagnosis(ubs_id=ubs.id, db=db, current_user=current_user)


# ----------------------- Modelo agregado de leitura do diagnóstico -----------------------


@diagnostico_router.get("/{ubs_id}/diagnosis", response_model=FullDiagnosisOut)
async def get_full_diagnosis(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    # Carrega relacionamentos de forma eficiente
    resultado = await db.execute(
        select(UBS)
        .options(
            selectinload(UBS.services).selectinload(UBSService.service),
            selectinload(UBS.indicators),
            selectinload(UBS.professional_groups),
            selectinload(UBS.territory_profile),
            selectinload(UBS.needs),
            selectinload(UBS.attachments),
        )
        .where(UBS.id == ubs.id)
    )
    ubs_obj: UBS = resultado.scalar_one()

    # Serviços
    itens_servicos: List[ServicesCatalogItem] = [
        ServicesCatalogItem(id=link.service.id, name=link.service.name)
        for link in sorted(ubs_obj.services, key=lambda l: l.service.name)
    ]
    saida_servicos = UBSServicesOut(services=itens_servicos, outros_servicos=ubs_obj.outros_servicos)

    # Indicadores (último valor por nome)

    indicadores_ordenados = sorted(
        ubs_obj.indicators,
        key=lambda i: (i.nome_indicador, i.created_at or i.id),
    )
    ultimo_por_nome: dict[str, Indicator] = {}
    for ind in indicadores_ordenados:
        ultimo_por_nome[ind.nome_indicador] = ind

    indicators_latest: List[IndicatorOut] = [
        IndicatorOut(
            id=ind.id,
            ubs_id=ind.ubs_id,
            nome_indicador=ind.nome_indicador,
            valor=float(ind.valor),
            meta=float(ind.meta) if ind.meta is not None else None,
            tipo_valor=ind.tipo_valor,
            periodo_referencia=ind.periodo_referencia,
            observacoes=ind.observacoes,
            created_at=ind.created_at,
            updated_at=ind.updated_at,
        )
        for ind in ultimo_por_nome.values()
    ]

    # Grupos profissionais
    saida_profissionais: List[ProfessionalGroupOut] = [
        ProfessionalGroupOut.model_validate(pg) for pg in ubs_obj.professional_groups
    ]

    # Território e necessidades
    saida_territorio = (
        TerritoryProfileOut.model_validate(ubs_obj.territory_profile)
        if ubs_obj.territory_profile
        else None
    )
    saida_necessidades = UBSNeedsOut.model_validate(ubs_obj.needs) if ubs_obj.needs else None

    metadados_envio = UBSSubmissionMetadata(
        status=UBSStatus(ubs_obj.status),
        submitted_at=ubs_obj.submitted_at,
        submitted_by=ubs_obj.submitted_by,
    )

    saida_ubs = UBSOut.model_validate(ubs_obj)

    saida_anexos: List[UBSAttachmentOut] = [
        UBSAttachmentOut.model_validate(a) for a in (ubs_obj.attachments or [])
    ]

    return FullDiagnosisOut(
        ubs=saida_ubs,
        services=saida_servicos,
        indicators_latest=indicators_latest,
        professional_groups=saida_profissionais,
        territory_profile=saida_territorio,
        needs=saida_necessidades,
        attachments=saida_anexos,
        submission=metadados_envio,
    )


# ----------------------- Priorização de Problemas (GUT) -----------------------


@diagnostico_router.get("/{ubs_id}/problems", response_model=List[UBSProblemOut])
async def list_ubs_problems(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)
    resultado = await db.execute(
        select(UBSProblem)
        .where(UBSProblem.ubs_id == ubs.id)
        .order_by(UBSProblem.gut_score.desc(), UBSProblem.created_at.desc())
    )
    return resultado.scalars().all()


@diagnostico_router.post(
    "/{ubs_id}/problems",
    response_model=UBSProblemOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_ubs_problem(
    ubs_id: int,
    payload: UBSProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)
    score = _gut_score(payload.gut_gravidade, payload.gut_urgencia, payload.gut_tendencia)
    problem = UBSProblem(
        ubs_id=ubs.id,
        titulo=payload.titulo,
        descricao=payload.descricao,
        gut_gravidade=payload.gut_gravidade,
        gut_urgencia=payload.gut_urgencia,
        gut_tendencia=payload.gut_tendencia,
        gut_score=score,
        is_prioritario=payload.is_prioritario,
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    return problem


async def _get_problem_or_404(
    problem_id: int,
    current_user: Usuario,
    db: AsyncSession,
) -> UBSProblem:
    resultado = await db.execute(
        select(UBSProblem)
        .join(UBS)
        .where(
            UBSProblem.id == problem_id,
            UBS.is_deleted.is_(False),
        )
    )
    problem = resultado.scalar_one_or_none()
    if not problem:
        raise HTTPException(status_code=404, detail="Problema não encontrado")
    return problem


@diagnostico_router.patch("/problems/{problem_id}", response_model=UBSProblemOut)
async def update_ubs_problem(
    problem_id: int,
    payload: UBSProblemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    problem = await _get_problem_or_404(problem_id, current_user, db)
    dados_atualizacao = payload.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(problem, campo, valor)

    problem.gut_score = _gut_score(
        problem.gut_gravidade,
        problem.gut_urgencia,
        problem.gut_tendencia,
    )
    await db.commit()
    await db.refresh(problem)
    return problem


@diagnostico_router.delete("/problems/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ubs_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    problem = await _get_problem_or_404(problem_id, current_user, db)
    await db.delete(problem)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------- Plano de Intervenção -----------------------


@diagnostico_router.get(
    "/problems/{problem_id}/interventions",
    response_model=List[UBSInterventionOut],
)
async def list_problem_interventions(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    problem = await _get_problem_or_404(problem_id, current_user, db)
    resultado = await db.execute(
        select(UBSIntervention)
        .where(UBSIntervention.problem_id == problem.id)
        .order_by(UBSIntervention.created_at.desc())
    )
    return resultado.scalars().all()


@diagnostico_router.post(
    "/problems/{problem_id}/interventions",
    response_model=UBSInterventionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_problem_intervention(
    problem_id: int,
    payload: UBSInterventionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    problem = await _get_problem_or_404(problem_id, current_user, db)
    intervention = UBSIntervention(
        problem_id=problem.id,
        objetivo=payload.objetivo,
        metas=payload.metas,
        responsavel=payload.responsavel,
        status=payload.status.value if hasattr(payload.status, "value") else payload.status,
    )
    db.add(intervention)
    await db.commit()
    await db.refresh(intervention)
    return intervention


async def _get_intervention_or_404(
    intervention_id: int,
    current_user: Usuario,
    db: AsyncSession,
) -> UBSIntervention:
    resultado = await db.execute(
        select(UBSIntervention)
        .join(UBSProblem)
        .join(UBS)
        .where(
            UBSIntervention.id == intervention_id,
            UBS.is_deleted.is_(False),
        )
    )
    intervention = resultado.scalar_one_or_none()
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervenção não encontrada")
    return intervention


@diagnostico_router.patch("/interventions/{intervention_id}", response_model=UBSInterventionOut)
async def update_intervention(
    intervention_id: int,
    payload: UBSInterventionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    intervention = await _get_intervention_or_404(intervention_id, current_user, db)
    dados_atualizacao = payload.model_dump(exclude_unset=True)
    if "status" in dados_atualizacao and hasattr(dados_atualizacao["status"], "value"):
        dados_atualizacao["status"] = dados_atualizacao["status"].value
    for campo, valor in dados_atualizacao.items():
        setattr(intervention, campo, valor)
    await db.commit()
    await db.refresh(intervention)
    return intervention


@diagnostico_router.delete("/interventions/{intervention_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_intervention(
    intervention_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    intervention = await _get_intervention_or_404(intervention_id, current_user, db)
    await db.delete(intervention)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@diagnostico_router.get(
    "/interventions/{intervention_id}/actions",
    response_model=List[UBSInterventionActionOut],
)
async def list_intervention_actions(
    intervention_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    intervention = await _get_intervention_or_404(intervention_id, current_user, db)
    resultado = await db.execute(
        select(UBSInterventionAction)
        .where(UBSInterventionAction.intervention_id == intervention.id)
        .order_by(UBSInterventionAction.created_at.desc())
    )
    return resultado.scalars().all()


@diagnostico_router.post(
    "/interventions/{intervention_id}/actions",
    response_model=UBSInterventionActionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_intervention_action(
    intervention_id: int,
    payload: UBSInterventionActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    intervention = await _get_intervention_or_404(intervention_id, current_user, db)
    action = UBSInterventionAction(
        intervention_id=intervention.id,
        acao=payload.acao,
        prazo=payload.prazo,
        status=payload.status.value if hasattr(payload.status, "value") else payload.status,
        observacoes=payload.observacoes,
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return action


async def _get_action_or_404(
    action_id: int,
    current_user: Usuario,
    db: AsyncSession,
) -> UBSInterventionAction:
    resultado = await db.execute(
        select(UBSInterventionAction)
        .join(UBSIntervention)
        .join(UBSProblem)
        .join(UBS)
        .where(
            UBSInterventionAction.id == action_id,
            UBS.is_deleted.is_(False),
        )
    )
    action = resultado.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Ação não encontrada")
    return action


@diagnostico_router.patch("/intervention-actions/{action_id}", response_model=UBSInterventionActionOut)
async def update_intervention_action(
    action_id: int,
    payload: UBSInterventionActionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    action = await _get_action_or_404(action_id, current_user, db)
    dados_atualizacao = payload.model_dump(exclude_unset=True)
    if "status" in dados_atualizacao and hasattr(dados_atualizacao["status"], "value"):
        dados_atualizacao["status"] = dados_atualizacao["status"].value
    for campo, valor in dados_atualizacao.items():
        setattr(action, campo, valor)
    await db.commit()
    await db.refresh(action)
    return action


@diagnostico_router.delete("/intervention-actions/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_intervention_action(
    action_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    action = await _get_action_or_404(action_id, current_user, db)
    await db.delete(action)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------- Anexos -----------------------


@diagnostico_router.get("/{ubs_id}/attachments", response_model=List[UBSAttachmentOut])
async def list_ubs_attachments(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)
    resultado = await db.execute(
        select(UBSAttachment)
        .where(UBSAttachment.ubs_id == ubs.id)
        .order_by(UBSAttachment.created_at.desc())
    )
    return resultado.scalars().all()


@diagnostico_router.post(
    "/{ubs_id}/attachments",
    response_model=List[UBSAttachmentOut],
    status_code=status.HTTP_201_CREATED,
)
async def upload_ubs_attachments(
    ubs_id: int,
    files: List[UploadFile] = File(...),
    section: str = Form("PROBLEMAS"),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    if not files:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado")

    target_dir = _UPLOADS_BASE_DIR / f"ubs_{ubs.id}"
    target_dir.mkdir(parents=True, exist_ok=True)

    created: List[UBSAttachment] = []
    for f in files:
        content = await f.read()
        size_bytes = len(content)
        if size_bytes <= 0:
            continue

        # Limite simples (10MB por arquivo)
        if size_bytes > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail=f"Arquivo muito grande: {f.filename}")

        original = _sanitize_filename(f.filename or "arquivo")
        suffix = Path(original).suffix
        stored_name = f"{uuid.uuid4().hex}{suffix}"
        stored_path = target_dir / stored_name
        stored_path.write_bytes(content)

        att = UBSAttachment(
            ubs_id=ubs.id,
            original_filename=original,
            content_type=f.content_type,
            size_bytes=size_bytes,
            storage_path=str(stored_path.relative_to(_UPLOADS_BASE_DIR)),
            section=section,
            description=description,
        )
        db.add(att)
        created.append(att)

    if not created:
        raise HTTPException(status_code=400, detail="Nenhum arquivo válido enviado")

    await db.commit()
    for att in created:
        await db.refresh(att)
    return created


async def _get_attachment_or_404(
    attachment_id: int,
    current_user: Usuario,
    db: AsyncSession,
) -> UBSAttachment:
    resultado = await db.execute(
        select(UBSAttachment)
        .join(UBS)
        .where(
            UBSAttachment.id == attachment_id,
            UBS.is_deleted.is_(False),
        )
    )
    att = resultado.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    return att


@diagnostico_router.get("/attachments/{attachment_id}/download")
async def download_ubs_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    att = await _get_attachment_or_404(attachment_id, current_user, db)
    file_path = _UPLOADS_BASE_DIR / att.storage_path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")

    return FileResponse(
        path=str(file_path),
        media_type=att.content_type or "application/octet-stream",
        filename=att.original_filename,
    )


@diagnostico_router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ubs_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_professional_user),
):
    att = await _get_attachment_or_404(attachment_id, current_user, db)
    file_path = _UPLOADS_BASE_DIR / att.storage_path

    await db.delete(att)
    await db.commit()

    try:
        if file_path.exists():
            file_path.unlink()
    except Exception:
        pass

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ----------------------- Exportação (PDF/ReportLab) -----------------------


@diagnostico_router.get("/{ubs_id}/export/pdf")
async def export_situational_report_pdf(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Exporta o relatório situacional em PDF.

    Gera o PDF a partir do diagnóstico agregado ("/diagnosis") usando ReportLab.
    """

    diagnosis = await get_full_diagnosis(ubs_id=ubs_id, db=db, current_user=current_user)

    # Busca anexos diretamente (inclui storage_path) apenas para geração do PDF
    attachments_stmt = (
        select(UBSAttachment)
        .join(UBS)
        .where(
            UBSAttachment.ubs_id == ubs_id,
            UBS.is_deleted.is_(False),
        )
        .order_by(UBSAttachment.created_at.asc())
    )
    attachments = (await db.execute(attachments_stmt)).scalars().all()
    attachments_for_pdf = [
        {
            "original_filename": a.original_filename,
            "content_type": a.content_type,
            "storage_path": a.storage_path,
            "section": a.section,
            "description": a.description,
        }
        for a in attachments
    ]
    try:
        pdf_bytes, filename_base = generate_situational_report_pdf_simple(
            diagnosis,
            municipality="Municipio",
            reference_period=(diagnosis.ubs.periodo_referencia or ""),
            attachments=attachments_for_pdf,
            attachments_base_dir=_UPLOADS_BASE_DIR,
        )
    except Exception as exc:
        logger.exception("Erro ao gerar PDF")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {exc}") from exc

    headers = {
        "Content-Disposition": f'attachment; filename="{filename_base}.pdf"',
        "X-Report-Engine": "reportlab",
    }
    return FastAPIResponse(content=pdf_bytes, media_type="application/pdf", headers=headers)
