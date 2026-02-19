"""Insere a UBS Adalto Parentes Sampaio no banco de dados (Supabase/PostgreSQL).

Uso:
    python creates/seed_ubs_adalto.py

Requer a variavel de ambiente DATABASE_URL apontando para o Supabase.
"""
from __future__ import annotations

import os
import sys
from datetime import date

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# Adiciona o diretorio raiz ao path para importar os modelos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.auth_models import Usuario
from models.diagnostico_models import (
    Indicator,
    ProfessionalGroup,
    Service,
    UBS,
    UBSNeeds,
    UBSService,
    TerritoryProfile,
)

OWNER_EMAIL = "caiovictornascimento2004@gmail.com"


def _get_sync_database_url() -> str:
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    if not url:
        print("ERRO: DATABASE_URL nao definida. Configure no .env ou como variavel de ambiente.")
        sys.exit(1)
    # Normaliza para usar o driver psycopg (v3) sincrono
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    # Remove drivers async caso presente
    for driver in ["+asyncpg", "+aiosqlite"]:
        url = url.replace(driver, "+psycopg")
    return url


def _find_owner(session: Session) -> Usuario:
    owner = session.execute(
        select(Usuario).where(Usuario.email == OWNER_EMAIL)
    ).scalar_one_or_none()

    if not owner:
        print(f"ERRO: Usuario com email '{OWNER_EMAIL}' nao encontrado no banco.")
        print("Usuarios disponiveis:")
        users = session.execute(select(Usuario.id, Usuario.email, Usuario.nome)).all()
        for u in users:
            print(f"  ID={u[0]}  email={u[1]}  nome={u[2]}")
        sys.exit(1)

    print(f"Usuario encontrado: ID={owner.id}, nome={owner.nome}, email={owner.email}")
    return owner


def _check_existing(session: Session) -> bool:
    existing = session.execute(
        select(UBS).where(
            UBS.nome_ubs == "ESF 41 - Adalto Parentes Sampaio",
            UBS.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if existing:
        print(f"UBS ja existe no banco com ID={existing.id}. Nenhuma acao necessaria.")
        return True
    return False


def seed(session: Session) -> int:
    if _check_existing(session):
        sys.exit(0)

    owner = _find_owner(session)

    # --- UBS principal ---
    ubs = UBS(
        tenant_id=1,
        owner_user_id=owner.id,
        nome_ubs="ESF 41 - Adalto Parentes Sampaio",
        nome_relatorio="Diagnostico Situacional ESF 41 - Q1/2025",
        cnes="0000000",
        area_atuacao="Baixa do Aragao, Parnaiba - PI",
        numero_habitantes_ativos=4500,
        numero_microareas=8,
        numero_familias_cadastradas=1000,
        numero_domicilios=2000,
        domicilios_rurais=15,
        data_inauguracao=date(2017, 6, 1),
        data_ultima_reforma=date(2023, 8, 15),
        descritivos_gerais="Perfil socioeconomico heterogeneo, com areas de vulnerabilidade.",
        observacoes_gerais="Relatorio criado para diagnostico situacional da UBS.",
        outros_servicos="Atendimento multiprofissional e grupos operativos.",
        periodo_referencia="Q1/2025",
        identificacao_equipe="ESF 41",
        responsavel_nome="Maria da Silva",
        responsavel_cargo="Enfermeira",
        responsavel_contato="maria.silva@exemplo.com",
        fluxo_agenda_acesso="Acolhimento diario, com agendas programadas por microarea.",
        status="DRAFT",
    )
    session.add(ubs)
    session.flush()  # Gera o ID
    print(f"UBS criada com ID={ubs.id}")

    # --- Perfil do territorio ---
    territory = TerritoryProfile(
        ubs_id=ubs.id,
        descricao_territorio="Territorio urbano com areas de risco e baixa cobertura de saneamento.",
        potencialidades_territorio="Presenca de escolas e liderancas comunitarias ativas.",
        riscos_vulnerabilidades="Alagamentos e areas de descarte irregular.",
    )
    session.add(territory)
    print("  TerritoryProfile criado")

    # --- Necessidades ---
    needs = UBSNeeds(
        ubs_id=ubs.id,
        problemas_identificados="Falta de insumos e alta rotatividade de profissionais.",
        necessidades_equipamentos_insumos="Computadores, balancas e oximetros.",
        necessidades_especificas_acs="EPI e tablets para visitas domiciliares.",
        necessidades_infraestrutura_manutencao="Reforma de telhado e adequacao eletrica.",
    )
    session.add(needs)
    print("  UBSNeeds criado")

    # --- Indicadores ---
    indicators = [
        Indicator(
            ubs_id=ubs.id,
            nome_indicador="Gestantes com 6 consultas (1a ate 20a semana)",
            valor=67,
            meta=90,
            tipo_valor="PERCENTUAL",
            periodo_referencia="Q1/2025",
            observacoes="Dados e-SUS.",
        ),
        Indicator(
            ubs_id=ubs.id,
            nome_indicador="Cobertura vacinal Polio < 1 ano",
            valor=19,
            meta=95,
            tipo_valor="PERCENTUAL",
            periodo_referencia="Q1/2025",
            observacoes="Baixa cobertura em area rural.",
        ),
    ]
    session.add_all(indicators)
    print(f"  {len(indicators)} indicadores criados")

    # --- Profissionais ---
    groups = [
        ProfessionalGroup(
            ubs_id=ubs.id,
            cargo_funcao="Enfermeiro da Familia",
            quantidade=2,
            tipo_vinculo="concursado",
            observacoes="Equipe fixa.",
        ),
        ProfessionalGroup(
            ubs_id=ubs.id,
            cargo_funcao="Medico da Familia",
            quantidade=1,
            tipo_vinculo="contratado",
            observacoes="Atende 3 dias por semana.",
        ),
        ProfessionalGroup(
            ubs_id=ubs.id,
            cargo_funcao="Agente Comunitario de Saude",
            quantidade=6,
            tipo_vinculo="concursado",
            observacoes="Microareas prioritarias.",
        ),
    ]
    session.add_all(groups)
    print(f"  {len(groups)} grupos profissionais criados")

    # --- Servicos ---
    service_names = [
        "Atendimento medico",
        "Atendimento de enfermagem",
        "Sala de vacina",
        "Pre-natal",
        "Atendimento multiprofissional",
    ]

    for name in service_names:
        # Busca ou cria o servico no catalogo
        service = session.execute(
            select(Service).where(Service.name == name)
        ).scalar_one_or_none()

        if not service:
            service = Service(name=name)
            session.add(service)
            session.flush()

        # Vincula a UBS ao servico
        session.add(UBSService(ubs_id=ubs.id, service_id=service.id))

    print(f"  {len(service_names)} servicos vinculados")

    session.commit()
    return ubs.id


def main() -> None:
    url = _get_sync_database_url()
    print(f"Conectando ao banco: {url[:30]}...")
    engine = create_engine(url, future=True)

    with Session(engine) as session:
        ubs_id = seed(session)

    print(f"\nUBS 'ESF 41 - Adalto Parentes Sampaio' inserida com sucesso! (ID={ubs_id})")
    print("Ela aparecera na pagina Relatorios Situacionais da plataforma.")


if __name__ == "__main__":
    main()
