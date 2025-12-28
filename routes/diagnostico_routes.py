from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    UBSStatus,
    FullDiagnosisOut,
    UBSSubmissionMetadata,
    ValidationErrorResponse,
    ErrorDetail,
    UBSSubmitRequest,
)
from utils.deps import get_current_active_user


diagnostico_router = APIRouter(prefix="/ubs", tags=["diagnostico"])


async def _get_ubs_or_404(
    ubs_id: int,
    current_user: Usuario,
    db: AsyncSession,
) -> UBS:
    resultado = await db.execute(
        select(UBS).where(
            UBS.id == ubs_id,
            UBS.tenant_id == current_user.id,
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
    current_user: Usuario = Depends(get_current_active_user),
):
    ubs = UBS(
        tenant_id=current_user.id,
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
        status=UBSStatus.DRAFT.value,
    )
    db.add(ubs)
    await db.commit()
    await db.refresh(ubs)
    return ubs


@diagnostico_router.get("", response_model=PaginatedUBS)
# ----------------------- Grupos profissionais -----------------------


@diagnostico_router.get("/{ubs_id}/professionals", response_model=List[ProfessionalGroupOut])
async def list_professional_groups(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
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
    current_user: Usuario = Depends(get_current_active_user),
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
    current_user: Usuario = Depends(get_current_active_user),
):
    resultado = await db.execute(
        select(ProfessionalGroup).join(UBS).where(
            ProfessionalGroup.id == group_id,
            UBS.tenant_id == current_user.id,
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
    current_user: Usuario = Depends(get_current_active_user),
):
    resultado = await db.execute(
        select(ProfessionalGroup).join(UBS).where(
            ProfessionalGroup.id == group_id,
            UBS.tenant_id == current_user.id,
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


# ----------------------- Perfil do território -----------------------


@diagnostico_router.get("/{ubs_id}/territory", response_model=TerritoryProfileOut)
async def get_territory_profile(
    ubs_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
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
    current_user: Usuario = Depends(get_current_active_user),
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
    current_user: Usuario = Depends(get_current_active_user),
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
    current_user: Usuario = Depends(get_current_active_user),
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


# ----------------------- Fluxo de envio -----------------------


def _validate_before_submit(ubs: UBS) -> list[ErrorDetail]:
    erros: list[ErrorDetail] = []

    def adicionar(campo: str, mensagem: str, codigo: str = "invalid") -> None:
        erros.append(ErrorDetail(field=campo, message=mensagem, code=codigo))

    # Informao geral obrigatria
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

    # Checagem simples de consist
        return perfil
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
    current_user: Usuario = Depends(get_current_active_user),
):
    ubs = await _get_ubs_or_404(ubs_id, current_user, db)

    # Carrega entidades relacionadas para validao e resposta
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

    # Reaproveita a implementao do endpoint de agregao
    return await get_full_diagnosis(ubs_id=ubs.id, db=db, current_user=current_user)


# ----------------------- Modelo agregado de leitura do diagnstico -----------------------


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
        )
        .where(UBS.id == ubs.id)
    )
    ubs_obj: UBS = resultado.scalar_one()

    # Servios
    itens_servicos: List[ServicesCatalogItem] = [
        ServicesCatalogItem(id=link.service.id, name=link.service.name)
        for link in sorted(ubs_obj.services, key=lambda l: l.service.name)
    ]
    saida_servicos = UBSServicesOut(services=itens_servicos, outros_servicos=ubs_obj.outros_servicos)

    # 

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
            tipo_dado=ind.tipo_dado,
            grau_precisao_valor=ind.grau_precisao_valor,
            valor=float(ind.valor),
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

    # Territrio e necessidades
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

    return FullDiagnosisOut(
        ubs=saida_ubs,
        services=saida_servicos,
        indicators_latest=indicators_latest,
        professional_groups=saida_profissionais,
        territory_profile=saida_territorio,
        needs=saida_necessidades,
        submission=metadados_envio,
    )
