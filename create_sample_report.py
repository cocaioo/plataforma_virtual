from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from io import BytesIO
import os
from pathlib import Path
from typing import Iterable, Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image as PilImage
from passlib.context import CryptContext
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from models.auth_models import Usuario
from models.diagnostico_models import (
    Indicator,
    ProfessionalGroup,
    Service,
    UBS,
    UBSAttachment,
    UBSNeeds,
    UBSService,
    TerritoryProfile,
)

SUS_BLUE = colors.HexColor("#004F92")
SUS_GREEN = colors.HexColor("#00A859")
LIGHT_GRAY = colors.HexColor("#F3F4F6")
MID_GRAY = colors.HexColor("#D1D5DB")
TEXT_MUTED = colors.HexColor("#6B7280")

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


@dataclass
class ReportData:
    ubs: UBS
    indicators: list[Indicator]
    professionals: list[ProfessionalGroup]
    services: list[str]
    territory: Optional[TerritoryProfile]
    needs: Optional[UBSNeeds]
    attachments: list[UBSAttachment]


@dataclass
class ChartFiles:
    indicators: Path
    professionals: Path


VALUE_TYPE_LABELS = {
    "PERCENTUAL": "%",
    "ABSOLUTO": "",
    "POR_1000": "/ 1000 hab.",
}


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


def _seed_data(session: Session) -> int:
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

    service_names = [
        "Atendimento medico",
        "Atendimento de enfermagem",
        "Sala de vacina",
        "Pre-natal",
        "Atendimento multiprofissional",
    ]
    services = session.execute(select(Service).where(Service.name.in_(service_names))).scalars().all()
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
    return ubs.id


def _load_report_data(session: Session, ubs_id: int) -> ReportData:
    ubs = session.execute(select(UBS).where(UBS.id == ubs_id)).scalar_one()

    indicators = (
        session.execute(select(Indicator).where(Indicator.ubs_id == ubs_id).order_by(Indicator.nome_indicador))
        .scalars()
        .all()
    )
    professionals = (
        session.execute(
            select(ProfessionalGroup)
            .where(ProfessionalGroup.ubs_id == ubs_id)
            .order_by(ProfessionalGroup.cargo_funcao)
        )
        .scalars()
        .all()
    )
    services = (
        session.execute(
            select(Service.name)
            .join(UBSService, UBSService.service_id == Service.id)
            .where(UBSService.ubs_id == ubs_id)
            .order_by(Service.name)
        )
        .scalars()
        .all()
    )
    territory = session.execute(
        select(TerritoryProfile).where(TerritoryProfile.ubs_id == ubs_id)
    ).scalar_one_or_none()
    needs = session.execute(select(UBSNeeds).where(UBSNeeds.ubs_id == ubs_id)).scalar_one_or_none()
    attachments = (
        session.execute(
            select(UBSAttachment).where(UBSAttachment.ubs_id == ubs_id).order_by(UBSAttachment.created_at)
        )
        .scalars()
        .all()
    )

    return ReportData(
        ubs=ubs,
        indicators=indicators,
        professionals=professionals,
        services=list(services),
        territory=territory,
        needs=needs,
        attachments=attachments,
    )


def _format_value(value: Optional[float], tipo_valor: Optional[str]) -> str:
    if value is None:
        return "-"
    label = VALUE_TYPE_LABELS.get(tipo_valor or "PERCENTUAL", "")
    formatted = f"{value:.2f}".rstrip("0").rstrip(".")
    if label == "%":
        return f"{formatted}%"
    if label:
        return f"{formatted} {label}"
    return formatted


def _save_chart(fig: plt.Figure, path: Path, max_width_px: int = 1200) -> Path:
    fig.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    image = PilImage.open(path)
    if image.width > max_width_px:
        ratio = max_width_px / float(image.width)
        new_size = (max_width_px, int(image.height * ratio))
        image = image.resize(new_size)
        image.save(path)
    return path


def _chart_indicators(indicators: Iterable[Indicator], output_dir: Path) -> Path:
    sns.set_theme(style="whitegrid")
    data = [i for i in indicators if i.meta is not None]
    if not data:
        fig, ax = plt.subplots(figsize=(6, 2.8))
        ax.text(0.5, 0.5, "Sem dados de metas", ha="center", va="center", color="#6B7280")
        ax.axis("off")
        return _save_chart(fig, output_dir / "indicadores.png")

    data = data[:6]
    labels = [i.nome_indicador for i in data]
    values = [float(i.valor) for i in data]
    metas = [float(i.meta or 0) for i in data]

    fig, ax = plt.subplots(figsize=(7, 3.6))
    x = range(len(labels))
    ax.bar(x, values, color="#004F92", alpha=0.8, label="Valor")
    ax.bar(x, metas, color="#00A859", alpha=0.7, label="Meta")
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels, rotation=25, ha="right", fontsize=8)
    ax.set_title("Indicadores: valor vs meta", fontsize=11)
    ax.legend(fontsize=8)
    return _save_chart(fig, output_dir / "indicadores.png")


def _chart_professionals(groups: Iterable[ProfessionalGroup], output_dir: Path) -> Path:
    sns.set_theme(style="whitegrid")
    labels = [g.cargo_funcao for g in groups]
    values = [int(g.quantidade) for g in groups]

    fig, ax = plt.subplots(figsize=(6, 3.4))
    ax.barh(labels, values, color="#004F92")
    ax.set_xlabel("Quantidade", fontsize=9)
    ax.set_title("Distribuicao por cargo", fontsize=11)
    ax.invert_yaxis()
    return _save_chart(fig, output_dir / "profissionais.png")


def _generate_charts(data: ReportData, output_dir: Path) -> ChartFiles:
    output_dir.mkdir(parents=True, exist_ok=True)
    indicators_path = _chart_indicators(data.indicators, output_dir)
    professionals_path = _chart_professionals(data.professionals, output_dir)
    return ChartFiles(indicators=indicators_path, professionals=professionals_path)


def _logo_placeholder() -> Table:
    table = Table([["LOGO"]], colWidths=[3.2 * cm], rowHeights=[1.6 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
                ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
                ("TEXTCOLOR", (0, 0), (-1, -1), SUS_BLUE),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ]
        )
    )
    return table


def _map_placeholder() -> Table:
    table = Table([["Mapa do Territorio"]], colWidths=[16.5 * cm], rowHeights=[4.2 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
                ("BOX", (0, 0), (-1, -1), 0.5, MID_GRAY),
                ("TEXTCOLOR", (0, 0), (-1, -1), TEXT_MUTED),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def _build_pdf(data: ReportData, charts: ChartFiles, output_path: Path) -> None:
    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        name="Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=18,
        textColor=SUS_BLUE,
        alignment=1,
        spaceAfter=6,
    )
    style_subtitle = ParagraphStyle(
        name="Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=TEXT_MUTED,
        alignment=1,
    )
    style_section = ParagraphStyle(
        name="Section",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=SUS_BLUE,
        spaceBefore=10,
        spaceAfter=4,
    )
    style_body = ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
    )

    story = []

    header = Table(
        [[_logo_placeholder(), Paragraph("Relatorio Situacional", style_title)]],
        colWidths=[3.4 * cm, 12.8 * cm],
    )
    header.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(header)
    story.append(Paragraph(f"{data.ubs.nome_ubs}", style_subtitle))
    story.append(Paragraph(datetime.now().strftime("%d/%m/%Y"), style_subtitle))
    story.append(Spacer(1, 10))

    info_table = Table(
        [
            ["UBS", data.ubs.nome_ubs or "-", "CNES", data.ubs.cnes or "-"],
            ["Area", data.ubs.area_atuacao or "-", "Equipe", data.ubs.identificacao_equipe or "-"],
        ],
        colWidths=[1.4 * cm, 7.5 * cm, 1.4 * cm, 6.2 * cm],
    )
    info_table.setStyle(
        TableStyle(
            [
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(info_table)

    story.append(Paragraph("Perfil da UBS", style_section))
    story.append(Paragraph(data.ubs.descritivos_gerais or "-", style_body))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Territorio", style_section))
    story.append(Paragraph(data.territory.descricao_territorio if data.territory else "-", style_body))
    story.append(Spacer(1, 6))
    story.append(_map_placeholder())

    story.append(Paragraph("Necessidades", style_section))
    needs_lines = [
        data.needs.problemas_identificados if data.needs else "-",
        data.needs.necessidades_equipamentos_insumos if data.needs else "-",
        data.needs.necessidades_especificas_acs if data.needs else "-",
        data.needs.necessidades_infraestrutura_manutencao if data.needs else "-",
    ]
    needs_items = [f"[ok] {line}" for line in needs_lines if line]
    story.append(Paragraph("<br/>".join(needs_items) if needs_items else "-", style_body))

    story.append(Paragraph("Indicadores", style_section))
    story.append(Image(str(charts.indicators), width=16 * cm, height=7 * cm))

    ind_table_data = [["Indicador", "Valor", "Meta", "Tipo", "Observacoes"]]
    for ind in data.indicators:
        ind_table_data.append(
            [
                ind.nome_indicador,
                _format_value(float(ind.valor), ind.tipo_valor),
                _format_value(float(ind.meta) if ind.meta is not None else None, ind.tipo_valor),
                ind.tipo_valor or "PERCENTUAL",
                ind.observacoes or "-",
            ]
        )
    ind_table = Table(ind_table_data, colWidths=[5.6 * cm, 2.2 * cm, 2.2 * cm, 2.0 * cm, 4.3 * cm])
    ind_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
                ("GRID", (0, 0), (-1, -1), 0.25, MID_GRAY),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(ind_table)

    story.append(Paragraph("Profissionais", style_section))
    story.append(Image(str(charts.professionals), width=16 * cm, height=6 * cm))

    prof_table_data = [["Cargo", "Quantidade", "Vinculo"]]
    for prof in data.professionals:
        prof_table_data.append([prof.cargo_funcao, str(prof.quantidade), prof.tipo_vinculo or "-"])
    prof_table = Table(prof_table_data, colWidths=[8.0 * cm, 2.5 * cm, 5.0 * cm])
    prof_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
                ("GRID", (0, 0), (-1, -1), 0.25, MID_GRAY),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
            ]
        )
    )
    story.append(prof_table)

    story.append(Paragraph("Servicos", style_section))
    services_text = "<br/>".join([f"- {name}" for name in data.services]) if data.services else "-"
    story.append(Paragraph(services_text, style_body))

    story.append(Paragraph("Anexos", style_section))
    if data.attachments:
        attachments_text = "<br/>".join(
            [f"- {att.original_filename} ({att.section or 'GERAL'})" for att in data.attachments]
        )
    else:
        attachments_text = "-"
    story.append(Paragraph(attachments_text, style_body))

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="Relatorio Situacional",
        author="Plataforma Digital",
    )
    doc.build(story)


def _export_charts(data: ReportData, charts_dir: Path) -> ChartFiles:
    charts = _generate_charts(data, charts_dir)
    return charts


def main() -> None:
    engine = create_engine(_get_sync_database_url(), future=True)
    output_dir = Path("./exports")
    output_dir.mkdir(parents=True, exist_ok=True)

    ubs_id = None
    with Session(engine) as session:
        ubs_id = _seed_data(session)
        data = _load_report_data(session, ubs_id)

    if ubs_id is None:
        raise RuntimeError("Falha ao criar dados de teste")

    charts = _export_charts(data, output_dir)
    pdf_path = output_dir / f"relatorio_ubs_{ubs_id}.pdf"
    _build_pdf(data, charts, pdf_path)

    print(f"Relatorio de teste criado com UBS ID: {ubs_id}")
    print(f"PDF gerado em: {pdf_path}")
    print(f"Graficos exportados em: {charts.indicators} e {charts.professionals}")


if __name__ == "__main__":
    main()
