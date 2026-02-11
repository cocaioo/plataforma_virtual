from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PRIMARY = colors.HexColor("#0B1F2A")
ACCENT = colors.HexColor("#2A9D8F")
MUTED = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#F3F4F6")
TABLE_HEADER = colors.HexColor("#E5E7EB")
TABLE_GRID = colors.HexColor("#D1D5DB")


def _escape_xml(text: str) -> str:
    if not text:
        return ""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
    )


def _fmt(value: Any) -> str:
    if value is None:
        return "-"
    try:
        return f"{float(value):.2f}".rstrip("0").rstrip(".")
    except Exception:
        return str(value)


def _fmt_percent(value: Any) -> str:
    formatted = _fmt(value)
    return "-" if formatted == "-" else f"{formatted}%"


def _safe_filename(value: str, default: str = "relatorio_situacional") -> str:
    if not value:
        return default
    allowed = []
    for ch in value:
        if ch.isalnum() or ch in ("-", "_", ".", " "):
            allowed.append(ch)
        else:
            allowed.append("_")
    name = "".join(allowed).strip().replace("  ", " ").replace(" ", "_")
    return name or default


def _chunk(items: list[str], size: int) -> list[list[str]]:
    return [items[i:i + size] for i in range(0, len(items), size)]


def _zebra_style(row_count: int) -> TableStyle:
    style = TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (-1, 0), PRIMARY),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.25, TABLE_GRID),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ]
    )
    for row in range(1, row_count):
        if row % 2 == 0:
            style.add("BACKGROUND", (0, row), (-1, row), LIGHT)
    return style


def _boxed(text: str, style: ParagraphStyle) -> Table:
    table = Table([[Paragraph(_escape_xml(text or "-"), style)]], colWidths=[16.5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.25, TABLE_GRID),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def generate_situational_report_pdf_simple(
    diagnosis,
    municipality: str = "",
    reference_period: str = "",
    attachments: Optional[list[dict]] = None,
) -> tuple[bytes, str]:
    ubs = diagnosis.ubs
    services = [s.name for s in (diagnosis.services.services or [])]

    styles = getSampleStyleSheet()
    style_title = ParagraphStyle(
        name="Title",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        textColor=PRIMARY,
        spaceAfter=6,
    )
    style_kicker = ParagraphStyle(
        name="Kicker",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=MUTED,
        leading=12,
    )
    style_h2 = ParagraphStyle(
        name="SectionTitle",
        parent=styles["Heading2"],
        textColor=PRIMARY,
        fontSize=13,
        spaceBefore=12,
        spaceAfter=6,
    )
    style_body = ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
    )

    story = []

    header_table = Table([[Paragraph("RELATORIO SITUACIONAL", style_title)]], colWidths=[16.5 * cm])
    header_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
                ("BOX", (0, 0), (-1, -1), 0.25, TABLE_GRID),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(Paragraph(_escape_xml(municipality or "Municipio"), style_kicker))
    if reference_period:
        story.append(Paragraph(_escape_xml(reference_period), style_kicker))
    story.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", style_kicker))
    story.append(Spacer(1, 12))

    summary_data = [
        ["UBS", _escape_xml(ubs.nome_ubs or "-"), "CNES", _escape_xml(ubs.cnes or "-")],
        ["Equipe", _escape_xml(ubs.identificacao_equipe or "-"), "Area", _escape_xml(ubs.area_atuacao or "-")],
    ]
    summary_table = Table(summary_data, colWidths=[1.6 * cm, 6.4 * cm, 1.6 * cm, 6.9 * cm])
    summary_table.setStyle(
        TableStyle(
            [
                ("TEXTCOLOR", (0, 0), (-1, -1), PRIMARY),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(summary_table)

    story.append(Paragraph("1. Identificacao e Caracterizacao", style_h2))
    table_data = [
        ["Campo", "Valor"],
        ["Nome do relatorio", _escape_xml(ubs.nome_relatorio or "-")],
        ["Periodo de referencia", _escape_xml(ubs.periodo_referencia or "-")],
        ["Habitantes ativos", _fmt(ubs.numero_habitantes_ativos)],
        ["Microareas", _fmt(ubs.numero_microareas)],
        ["Familias cadastradas", _fmt(ubs.numero_familias_cadastradas)],
        ["Domicilios", _fmt(ubs.numero_domicilios)],
        ["Domicilios rurais", _fmt(ubs.domicilios_rurais)],
        ["Data de inauguracao", _fmt(ubs.data_inauguracao)],
        ["Data da ultima reforma", _fmt(ubs.data_ultima_reforma)],
    ]
    info_table = Table(table_data, colWidths=[5.4 * cm, 10.6 * cm])
    info_table.setStyle(_zebra_style(len(table_data)))
    story.append(info_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Descritivos gerais", style_h2))
    story.append(_boxed(ubs.descritivos_gerais or "-", style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Observacoes gerais", style_h2))
    story.append(_boxed(ubs.observacoes_gerais or "-", style_body))

    story.append(Paragraph("2. Servicos Oferecidos", style_h2))
    if services:
        rows = _chunk(services, 2)
        services_data = [[_escape_xml(item) for item in row] + [""] * (2 - len(row)) for row in rows]
        services_table = Table(services_data, colWidths=[8.0 * cm, 8.0 * cm])
        services_table.setStyle(
            TableStyle(
                [
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("TEXTCOLOR", (0, 0), (-1, -1), PRIMARY),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        story.append(services_table)
    else:
        story.append(Paragraph("-", style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Outros servicos: {_escape_xml(ubs.outros_servicos or '-')} ", style_body))

    story.append(Paragraph("3. Indicadores Epidemiologicos", style_h2))
    indicators = diagnosis.indicators_latest or []
    if indicators:
        ind_data = [["Indicador", "Valor (%)", "Meta (%)", "Periodo"]]
        for i in indicators:
            ind_data.append([
                _escape_xml(str(i.nome_indicador)),
                _fmt_percent(i.valor),
                _fmt_percent(i.meta) if i.meta is not None else "-",
                _escape_xml(str(i.periodo_referencia)),
            ])
        ind_table = Table(ind_data, colWidths=[7.2 * cm, 2.2 * cm, 2.2 * cm, 3.4 * cm])
        ind_table.setStyle(_zebra_style(len(ind_data)))
        story.append(ind_table)
    else:
        story.append(Paragraph("-", style_body))

    story.append(Paragraph("4. Recursos Humanos", style_h2))
    groups = diagnosis.professional_groups or []
    if groups:
        g_data = [["Cargo/Funcao", "Qtd.", "Vinculo"]]
        for g in groups:
            g_data.append([
                _escape_xml(str(g.cargo_funcao)),
                _escape_xml(str(g.quantidade)),
                _escape_xml(str(g.tipo_vinculo or "-")),
            ])
        g_table = Table(g_data, colWidths=[8.0 * cm, 2.0 * cm, 5.0 * cm])
        g_table.setStyle(_zebra_style(len(g_data)))
        story.append(g_table)
    else:
        story.append(Paragraph("-", style_body))

    story.append(Paragraph("5. Perfil do Territorio", style_h2))
    territory = diagnosis.territory_profile
    story.append(Paragraph("Descricao do territorio", style_kicker))
    story.append(_boxed(getattr(territory, "descricao_territorio", "-"), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Potencialidades", style_kicker))
    story.append(_boxed(getattr(territory, "potencialidades_territorio", "-"), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Riscos e vulnerabilidades", style_kicker))
    story.append(_boxed(getattr(territory, "riscos_vulnerabilidades", "-"), style_body))

    story.append(Paragraph("6. Problemas Identificados e Necessidades", style_h2))
    needs = diagnosis.needs
    story.append(Paragraph("Problemas identificados", style_kicker))
    story.append(_boxed(getattr(needs, "problemas_identificados", "-"), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Necessidades (equipamentos e insumos)", style_kicker))
    story.append(_boxed(getattr(needs, "necessidades_equipamentos_insumos", "-"), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Necessidades especificas dos ACS", style_kicker))
    story.append(_boxed(getattr(needs, "necessidades_especificas_acs", "-"), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Infraestrutura e manutencao", style_kicker))
    story.append(_boxed(getattr(needs, "necessidades_infraestrutura_manutencao", "-"), style_body))

    if attachments:
        story.append(Paragraph("7. Anexos", style_h2))
        a_data = [["Arquivo", "Secao", "Descricao"]]
        for a in attachments:
            a_data.append([
                _escape_xml(str(a.get("original_filename") or "-")),
                _escape_xml(str(a.get("section") or "-")),
                _escape_xml(str(a.get("description") or "-")),
            ])
        a_table = Table(a_data, colWidths=[6.4 * cm, 3.0 * cm, 6.2 * cm])
        a_table.setStyle(_zebra_style(len(a_data)))
        story.append(a_table)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="Relatorio Situacional UBS",
        author="Plataforma Digital",
    )
    doc.build(story)
    pdf_bytes = buffer.getvalue()

    filename_base = (ubs.nome_relatorio or ubs.nome_ubs or "relatorio_situacional").strip()
    return pdf_bytes, _safe_filename(filename_base)
