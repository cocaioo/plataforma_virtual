from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Iterable
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, Image

from schemas.diagnostico_schemas import FullDiagnosisOut


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


def _fmt(value) -> str:
    if value is None or value == "":
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    try:
        # date
        return value.strftime("%d/%m/%Y")
    except Exception:
        return str(value)


def _bullets(items: Iterable[str]) -> str:
    cleaned = [i.strip() for i in items if i and str(i).strip()]
    if not cleaned:
        return "-"
    # Simple HTML bullets for ReportLab Paragraph
    lis = "".join(f"<li>{_escape_xml(i)}</li>" for i in cleaned)
    return f"<ul>{lis}</ul>"


def _escape_xml(text: str) -> str:
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def generate_situational_report_pdf_simple(
    diagnosis: FullDiagnosisOut,
    *,
    municipality: str = "Município",
    reference_period: str = "",
    attachments: list[dict] | None = None,
) -> tuple[bytes, str]:
    """Gera um PDF simples (sem LaTeX) do relatório situacional.

    Returns: (pdf_bytes, filename_base)
    """

    styles = getSampleStyleSheet()
    style_title = styles["Title"]
    style_h2 = styles["Heading2"]
    style_h3 = styles["Heading3"]
    style_body = styles["BodyText"]

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.2 * cm,
        bottomMargin=2.2 * cm,
        title="Relatório Situacional UBS",
        author="Plataforma Digital",
    )

    ubs = diagnosis.ubs
    report_name = ubs.nome_relatorio or "-"
    filename_base = _safe_filename(report_name if report_name != "-" else (ubs.nome_ubs or "UBS"))

    story = []

    uploads_base = Path(__file__).resolve().parents[2] / "uploads"

    SECTION_LABELS: dict[str, str] = {
        "TERRITORIO": "5. Perfil do Território",
        "POTENCIALIDADES": "5. Perfil do Território",
        "RISCOS": "5. Perfil do Território",
        "PROBLEMAS": "6. Problemas Identificados e Necessidades",
        "NEC_EQUIP_INSUMOS": "6. Problemas Identificados e Necessidades",
        "NEC_ACS": "6. Problemas Identificados e Necessidades",
        "NEC_INFRA": "6. Problemas Identificados e Necessidades",
        "GERAL": "1. Identificação e Caracterização",
    }

    def _attachments_for(section_key: str) -> list[dict]:
        if not attachments:
            return []
        wanted = (section_key or "").strip().upper()
        out = []
        for a in attachments:
            sec = str(a.get("section") or "PROBLEMAS").strip().upper()
            if sec == wanted:
                out.append(a)
        return out

    def _render_attachments_block(title: str, items: list[dict]) -> None:
        if not items:
            return
        story.append(Paragraph(title, style_h3))
        story.append(Spacer(1, 6))
        for a in items:
            fname = _escape_xml(str(a.get("original_filename") or "arquivo"))
            desc = str(a.get("description") or "").strip()
            label = f"<b>{fname}</b>" + (f" — {_escape_xml(desc)}" if desc else "")
            story.append(Paragraph(label, style_body))

            ctype = str(a.get("content_type") or "")
            storage_path = a.get("storage_path")
            if storage_path and ctype.startswith("image/"):
                try:
                    img_path = uploads_base / str(storage_path)
                    if img_path.exists():
                        img = Image(str(img_path))
                        # largura máxima ~16cm, mantém proporção
                        img.drawWidth = 16 * cm
                        img.drawHeight = img.imageHeight * (img.drawWidth / img.imageWidth)
                        # limita altura para não estourar uma página
                        if img.drawHeight > 18 * cm:
                            scale = (18 * cm) / img.drawHeight
                            img.drawHeight = img.drawHeight * scale
                            img.drawWidth = img.drawWidth * scale
                        story.append(Spacer(1, 4))
                        story.append(img)
                except Exception:
                    # Se não conseguir embutir (tipo não suportado), mantém apenas a linha
                    pass
            story.append(Spacer(1, 10))

    # Cabeçalho
    story.append(Paragraph("RELATÓRIO SITUACIONAL", style_title))
    story.append(Spacer(1, 8))
    story.append(Paragraph(_escape_xml(municipality), style_body))
    if reference_period:
        story.append(Paragraph(_escape_xml(reference_period), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>UBS:</b> {_escape_xml(ubs.nome_ubs or 'UBS')}", style_body))
    story.append(Paragraph(f"<b>CNES:</b> {_escape_xml(ubs.cnes or '-')}", style_body))
    if ubs.identificacao_equipe:
        story.append(Paragraph(f"<b>Equipe:</b> {_escape_xml(ubs.identificacao_equipe)}", style_body))
    if ubs.responsavel_nome or ubs.responsavel_cargo or ubs.responsavel_contato:
        parts = [p for p in [ubs.responsavel_nome, ubs.responsavel_cargo, ubs.responsavel_contato] if p]
        story.append(Paragraph(f"<b>Responsável:</b> {_escape_xml(' - '.join(parts))}", style_body))
    story.append(Paragraph(f"<b>Gerado em:</b> {_escape_xml(datetime.now().strftime('%d/%m/%Y %H:%M'))}", style_body))
    story.append(Spacer(1, 14))

    # Seção 1
    story.append(Paragraph("1. Identificação e Caracterização", style_h2))
    story.append(Spacer(1, 6))

    table_data = [
        ["Campo", "Valor"],
        ["Nome do relatório", report_name],
        ["Período de referência", ubs.periodo_referencia or "-"],
        ["Área de atuação", ubs.area_atuacao or "-"],
        ["Habitantes ativos", _fmt(ubs.numero_habitantes_ativos)],
        ["Microáreas", _fmt(ubs.numero_microareas)],
        ["Famílias cadastradas", _fmt(ubs.numero_familias_cadastradas)],
        ["Domicílios", _fmt(ubs.numero_domicilios)],
        ["Domicílios rurais", _fmt(ubs.domicilios_rurais)],
        ["Data de inauguração", _fmt(ubs.data_inauguracao)],
        ["Data da última reforma", _fmt(ubs.data_ultima_reforma)],
    ]

    t = Table(table_data, colWidths=[5.3 * cm, 10.7 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d0d0d0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Descritivos gerais", style_h3))
    story.append(Paragraph(_escape_xml(ubs.descritivos_gerais or "-"), style_body))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Observações gerais", style_h3))
    story.append(Paragraph(_escape_xml(ubs.observacoes_gerais or "-"), style_body))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Fluxo / agenda / acesso", style_h3))
    story.append(Paragraph(_escape_xml(ubs.fluxo_agenda_acesso or "-"), style_body))
    story.append(Spacer(1, 14))

    _render_attachments_block("Anexos (identificação)", _attachments_for("GERAL"))
    story.append(Spacer(1, 6))

    # Seção 2
    story.append(Paragraph("2. Serviços Oferecidos", style_h2))
    story.append(Spacer(1, 6))
    services = [s.name for s in (diagnosis.services.services or [])]
    story.append(Paragraph(_bullets(services), style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Outros serviços:</b> {_escape_xml(ubs.outros_servicos or '-')} ", style_body))
    story.append(Spacer(1, 14))

    # Seção 3
    story.append(Paragraph("3. Indicadores Epidemiológicos (último valor)", style_h2))
    story.append(Spacer(1, 6))

    indicators = diagnosis.indicators_latest or []
    if indicators:
        ind_data = [["Indicador", "Valor", "Período", "Tipo"]]
        for i in indicators:
            ind_data.append([
                str(i.nome_indicador),
                _fmt(i.valor),
                str(i.periodo_referencia),
                str(i.tipo_dado),
            ])
        ind_table = Table(ind_data, colWidths=[6.8 * cm, 2.4 * cm, 3.0 * cm, 2.8 * cm])
        ind_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d0d0d0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(ind_table)
    else:
        story.append(Paragraph("-", style_body))

    story.append(Spacer(1, 14))

    # Seção 4
    story.append(Paragraph("4. Recursos Humanos (grupos profissionais)", style_h2))
    story.append(Spacer(1, 6))

    groups = diagnosis.professional_groups or []
    if groups:
        g_data = [["Cargo/Função", "Qtd.", "Vínculo"]]
        for g in groups:
            g_data.append([
                str(g.cargo_funcao),
                _fmt(g.quantidade),
                str(g.tipo_vinculo or "-"),
            ])
        g_table = Table(g_data, colWidths=[7.0 * cm, 2.0 * cm, 6.0 * cm])
        g_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d0d0d0")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        story.append(g_table)
    else:
        story.append(Paragraph("-", style_body))

    story.append(Spacer(1, 14))

    # Seção 5
    story.append(Paragraph("5. Perfil do Território", style_h2))
    story.append(Spacer(1, 6))
    territory = diagnosis.territory_profile
    story.append(Paragraph("Descrição do território", style_h3))
    story.append(Paragraph(_escape_xml((territory.descricao_territorio if territory else None) or "-"), style_body))
    story.append(Spacer(1, 6))
    _render_attachments_block("Anexos (território)", _attachments_for("TERRITORIO"))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Potencialidades", style_h3))
    story.append(Paragraph(_escape_xml((territory.potencialidades_territorio if territory else None) or "-"), style_body))
    story.append(Spacer(1, 6))
    _render_attachments_block("Anexos (potencialidades)", _attachments_for("POTENCIALIDADES"))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Riscos e vulnerabilidades", style_h3))
    story.append(Paragraph(_escape_xml((territory.riscos_vulnerabilidades if territory else None) or "-"), style_body))
    story.append(Spacer(1, 14))

    _render_attachments_block("Anexos (riscos e vulnerabilidades)", _attachments_for("RISCOS"))
    story.append(Spacer(1, 10))

    # Seção 6
    story.append(Paragraph("6. Problemas Identificados e Necessidades", style_h2))
    story.append(Spacer(1, 6))
    needs = diagnosis.needs
    story.append(Paragraph("Problemas identificados", style_h3))
    story.append(Paragraph(_escape_xml((needs.problemas_identificados if needs else None) or "-"), style_body))
    story.append(Spacer(1, 6))
    _render_attachments_block("Anexos (problemas)", _attachments_for("PROBLEMAS"))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Necessidades (equipamentos e insumos)", style_h3))
    story.append(Paragraph(_escape_xml((needs.necessidades_equipamentos_insumos if needs else None) or "-"), style_body))
    story.append(Spacer(1, 6))
    _render_attachments_block("Anexos (equipamentos e insumos)", _attachments_for("NEC_EQUIP_INSUMOS"))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Necessidades específicas dos ACS", style_h3))
    story.append(Paragraph(_escape_xml((needs.necessidades_especificas_acs if needs else None) or "-"), style_body))
    story.append(Spacer(1, 6))
    _render_attachments_block("Anexos (ACS)", _attachments_for("NEC_ACS"))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Infraestrutura e manutenção", style_h3))
    story.append(Paragraph(_escape_xml((needs.necessidades_infraestrutura_manutencao if needs else None) or "-"), style_body))
    story.append(Spacer(1, 14))

    _render_attachments_block("Anexos (infraestrutura e manutenção)", _attachments_for("NEC_INFRA"))
    story.append(Spacer(1, 10))

    # Seção 7
    story.append(Paragraph("7. Metadados de Envio", style_h2))
    story.append(Spacer(1, 6))

    submission = diagnosis.submission
    status_value = submission.status.value if submission and submission.status else "-"
    submitted_at = _fmt(submission.submitted_at) if submission else "-"

    meta_data = [
        ["Campo", "Valor"],
        ["Status", status_value],
        ["Submetido em", submitted_at],
    ]
    meta_table = Table(meta_data, colWidths=[5.3 * cm, 10.7 * cm])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#d0d0d0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(meta_table)

    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()

    return pdf_bytes, filename_base
