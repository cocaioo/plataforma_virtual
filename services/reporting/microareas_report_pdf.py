from io import BytesIO
from datetime import datetime
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _safe_filename(value: str, default: str = "relatorio_microareas") -> str:
    base = value.strip() if value else default
    base = re.sub(r"[^a-zA-Z0-9_-]+", "_", base).strip("_")
    return base or default


def generate_microareas_report_pdf(ubs, microareas, agentes_por_microarea, emitted_by=None):
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    style_title = styles["Title"]
    style_subtitle = styles["Normal"]
    style_subtitle.fontSize = 10
    style_subtitle.leading = 12

    elements = []
    elements.append(Paragraph("Relatorio de Microareas", style_title))
    elements.append(Spacer(1, 0.2 * cm))

    nome_ubs = getattr(ubs, "nome_ubs", "-")
    data_emissao = datetime.now().strftime("%d/%m/%Y %H:%M")
    elements.append(Paragraph(f"UBS: {nome_ubs}", style_subtitle))
    elements.append(Paragraph(f"Emissao: {data_emissao}", style_subtitle))
    if emitted_by:
        elements.append(Paragraph(f"Emitido por: {emitted_by}", style_subtitle))
    elements.append(Spacer(1, 0.4 * cm))

    total_microareas = len(microareas)
    cobertas = sum(1 for m in microareas if (m.status or "").upper() == "COBERTA")
    descobertas = total_microareas - cobertas
    cobertura_pct = round((cobertas / total_microareas) * 100, 1) if total_microareas else 0

    resumo_data = [
        [
            "Total",
            "Cobertas",
            "Descobertas",
            "Cobertura (%)",
        ],
        [
            str(total_microareas),
            str(cobertas),
            str(descobertas),
            f"{cobertura_pct}%",
        ],
    ]

    resumo_table = Table(resumo_data, colWidths=[4 * cm, 4 * cm, 4 * cm, 4 * cm])
    resumo_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5F5")),
            ]
        )
    )

    elements.append(resumo_table)
    elements.append(Spacer(1, 0.4 * cm))

    table_data = [
        [
            "Microarea",
            "Status",
            "Familias",
            "Populacao",
            "Agentes",
        ]
    ]

    for microarea in microareas:
        agentes = agentes_por_microarea.get(microarea.id, [])
        agentes_texto = ", ".join(agentes) if agentes else "-"
        table_data.append(
            [
                microarea.nome,
                microarea.status,
                str(microarea.familias or 0),
                str(microarea.populacao or 0),
                Paragraph(agentes_texto, styles["BodyText"]),
            ]
        )

    table = Table(
        table_data,
        colWidths=[6 * cm, 2.2 * cm, 2.2 * cm, 2.5 * cm, 5 * cm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("ALIGN", (2, 1), (3, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5F5")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ]
        )
    )

    elements.append(table)
    doc.build(elements)

    pdf_bytes = buffer.getvalue()
    filename_base = _safe_filename(f"microareas_{nome_ubs}")
    return pdf_bytes, filename_base
