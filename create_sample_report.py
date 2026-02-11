from __future__ import annotations

from datetime import date
import os

from passlib.context import CryptContext
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from models.auth_models import Usuario
from models.diagnostico_models import (
    UBS,
    Indicator,
    ProfessionalGroup,
    TerritoryProfile,
    UBSNeeds,
    Service,
    UBSService,
    UBSAttachment,
)


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _get_sync_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        return "sqlite:///./dev.db"
    if url.startswith("sqlite+aiosqlite"):
        return url.replace("sqlite+aiosqlite", "sqlite", 1)
    return url


def _get_or_create_owner(session: Session) -> Usuario:
    owner = session.execute(select(Usuario).order_by(Usuario.id)).scalars().first()
    if owner:
        return owner

    owner = Usuario(
        nome="Gestor Teste",
        email="gestor.teste@exemplo.com",
        senha=pwd_context.hash("Plataforma123"),
        cpf="11144477735",
        role="GESTOR",
        ativo=True,
    )
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return owner


def main() -> None:
    engine = create_engine(_get_sync_database_url(), future=True)

    ubs_id = None
    with Session(engine) as session:
        owner = _get_or_create_owner(session)

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
            observacoes_gerais="Relatorio criado automaticamente para testes de PDF.",
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
        session.commit()
        session.refresh(ubs)

        territory = TerritoryProfile(
            ubs_id=ubs.id,
            descricao_territorio="Territorio urbano com areas de risco e baixa cobertura de saneamento.",
            potencialidades_territorio="Presenca de escolas e liderancas comunitarias ativas.",
            riscos_vulnerabilidades="Alagamentos e areas de descarte irregular.",
        )
        session.add(territory)

        needs = UBSNeeds(
            ubs_id=ubs.id,
            problemas_identificados="Falta de insumos e alta rotatividade.",
            necessidades_equipamentos_insumos="Computadores, balancas e oximentros.",
            necessidades_especificas_acs="EPI e tablets para visitas domiciliares.",
            necessidades_infraestrutura_manutencao="Reforma de telhado e adequacao eletrica.",
        )
        session.add(needs)

        indicators = [
            Indicator(
                ubs_id=ubs.id,
                nome_indicador="Gestantes com 6 consultas (1a ate 20a semana)",
                valor=67,
                meta=90,
                periodo_referencia="Q1/2025",
                observacoes="Dados e-SUS.",
            ),
            Indicator(
                ubs_id=ubs.id,
                nome_indicador="Cobertura vacinal Polio < 1 ano",
                valor=19,
                meta=95,
                periodo_referencia="Q1/2025",
                observacoes="Baixa cobertura em area rural.",
            ),
        ]
        session.add_all(indicators)

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
        ]
        session.add_all(groups)

        service_names = [
            "Atendimento medico",
            "Atendimento de enfermagem",
            "Sala de vacina",
            "Pre-natal",
        ]
        services = (
            session.execute(select(Service).where(Service.name.in_(service_names)))
            .scalars()
            .all()
        )
        existing_names = {s.name for s in services}
        for name in service_names:
            if name not in existing_names:
                new_service = Service(name=name)
                session.add(new_service)
                services.append(new_service)

        session.flush()
        for service in services:
            session.add(UBSService(ubs_id=ubs.id, service_id=service.id))

        attachment = UBSAttachment(
            ubs_id=ubs.id,
            original_filename="anexo_exemplo.pdf",
            content_type="application/pdf",
            size_bytes=0,
            storage_path="anexos/anexo_exemplo.pdf",
            section="PROBLEMAS",
            description="Anexo de exemplo para o PDF.",
        )
        session.add(attachment)

        session.commit()
        ubs_id = ubs.id

    if ubs_id is not None:
        print(f"Relatorio de teste criado com UBS ID: {ubs_id}")


if __name__ == "__main__":
    main()
