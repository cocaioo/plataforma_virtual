from __future__ import annotations

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, PageBreak

PRIMARY = colors.HexColor("#0B1F2A")
ACCENT = colors.HexColor("#2A9D8F")
ACCENT2 = colors.HexColor("#3B82F6")
MUTED = colors.HexColor("#6B7280")
LIGHT = colors.HexColor("#F3F4F6")
TABLE_HEADER = colors.HexColor("#E5E7EB")
TABLE_GRID = colors.HexColor("#D1D5DB")
SECTION_BG = colors.HexColor("#EFF6FF")
PRIORITY_BG = colors.HexColor("#FEF3C7")
SUCCESS_BG = colors.HexColor("#D1FAE5")
WARNING_BG = colors.HexColor("#FEF9C3")


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


def _indicator_type_label(tipo_valor: Optional[str]) -> str:
    if tipo_valor == "ABSOLUTO":
        return "Absoluto"
    if tipo_valor == "POR_1000":
        return "Por 1000 hab."
    return "Porcentagem"


def _format_indicator_value(value: Any, tipo_valor: Optional[str]) -> str:
    if value is None:
        return "-"
    if tipo_valor == "ABSOLUTO":
        return _fmt(value)
    if tipo_valor == "POR_1000":
        return f"{_fmt(value)} / 1000 hab."
    return _fmt_percent(value)


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


def _section_header(text: str, style: ParagraphStyle) -> Table:
    table = Table([[Paragraph(text, style)]], colWidths=[16.5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SECTION_BG),
                ("BOX", (0, 0), (-1, -1), 1, ACCENT2),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def _resolve_attachment_path(storage_path: Optional[str], base_dir: Optional[Path]) -> Optional[Path]:
    if not storage_path:
        return None
    path = Path(storage_path)
    if not path.is_absolute():
        if not base_dir:
            return None
        path = base_dir / storage_path
    try:
        resolved = path.resolve()
    except Exception:
        return None
    if base_dir:
        base = base_dir.resolve()
        if resolved != base and base not in resolved.parents:
            return None
    if not resolved.exists():
        return None
    return resolved


def _image_flowable(path: Path, max_width_cm: float = 16.5, max_height_cm: float = 12.0) -> Optional[Image]:
    try:
        reader = ImageReader(str(path))
        width, height = reader.getSize()
    except Exception:
        return None
    if not width or not height:
        return None
    max_width = max_width_cm * cm
    max_height = max_height_cm * cm
    scale = min(max_width / width, max_height / height, 1.0)
    image = Image(str(path), width * scale, height * scale)
    image.hAlign = "CENTER"
    return image


def _fmt_date(value: Any) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if hasattr(value, "strftime"):
        return value.strftime("%d/%m/%Y")
    return str(value)


def _fmt_datetime(value: Any) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def _status_label(status: Optional[str]) -> str:
    mapping = {
        "PLANEJADO": "Planejado",
        "EM_ANDAMENTO": "Em andamento",
        "CONCLUIDO": "Concluído",
        "AGENDADO": "Agendado",
        "CANCELADO": "Cancelado",
        "REALIZADO": "Realizado",
        "REAGENDADO": "Reagendado",
        "COBERTA": "Coberta",
        "DESCOBERTA": "Descoberta",
    }
    return mapping.get(status or "", status or "-")


def _tipo_evento_label(tipo: Optional[str]) -> str:
    mapping = {
        "SALA_VACINA": "Sala de Vacina",
        "FARMACIA_BASICA": "Farmácia Básica",
        "REUNIAO_EQUIPE": "Reunião de Equipe",
        "OUTRO": "Outro",
    }
    return mapping.get(tipo or "", tipo or "-")


def _recorrencia_label(rec: Optional[str]) -> str:
    mapping = {
        "NONE": "Sem recorrência",
        "DAILY": "Diária",
        "WEEKLY": "Semanal",
        "MONTHLY": "Mensal",
    }
    return mapping.get(rec or "", rec or "-")


def generate_situational_report_pdf_simple(
    diagnosis,
    municipality: str = "",
    reference_period: str = "",
    attachments: Optional[list[dict]] = None,
    attachments_base_dir: Optional[str | Path] = None,
    extra_data: Optional[dict] = None,
) -> tuple[bytes, str]:
    ubs = diagnosis.ubs
    services = [s.name for s in (diagnosis.services.services or [])]
    base_dir = Path(attachments_base_dir) if attachments_base_dir else None
    extra = extra_data or {}

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
    style_h3 = ParagraphStyle(
        name="SubSectionTitle",
        parent=styles["Heading3"],
        textColor=ACCENT,
        fontSize=11,
        spaceBefore=8,
        spaceAfter=4,
    )
    style_body = ParagraphStyle(
        name="Body",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
    )
    style_table = ParagraphStyle(
        name="TableCell",
        parent=styles["BodyText"],
        fontSize=8,
        leading=10,
    )
    style_table_header = ParagraphStyle(
        name="TableHeader",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=PRIMARY,
    )
    style_small = ParagraphStyle(
        name="Small",
        parent=styles["BodyText"],
        fontSize=8,
        leading=10,
        textColor=MUTED,
    )

    story = []
    section_num = [0]

    def next_section(title: str):
        section_num[0] += 1
        return f"{section_num[0]}. {title}"

    # ==================== CAPA ====================
    header_table = Table([[Paragraph("RELATÓRIO SITUACIONAL", style_title)]], colWidths=[16.5 * cm])
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
    story.append(Paragraph(_escape_xml(municipality or "Município"), style_kicker))
    if reference_period:
        story.append(Paragraph(_escape_xml(reference_period), style_kicker))
    story.append(Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", style_kicker))
    story.append(Spacer(1, 12))

    summary_data = [
        ["UBS", _escape_xml(ubs.nome_ubs or "-"), "CNES", _escape_xml(ubs.cnes or "-")],
        ["Equipe", _escape_xml(ubs.identificacao_equipe or "-"), "Área", _escape_xml(ubs.area_atuacao or "-")],
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

    # ==================== 1. IDENTIFICAÇÃO ====================
    story.append(_section_header(next_section("Identificação e Caracterização"), style_h2))
    story.append(Spacer(1, 4))
    table_data = [
        ["Campo", "Valor"],
        ["Nome do relatório", _escape_xml(ubs.nome_relatorio or "-")],
        ["Período de referência", _escape_xml(ubs.periodo_referencia or "-")],
        ["Responsável", _escape_xml(getattr(ubs, "responsavel_nome", "-") or "-")],
        ["Cargo do responsável", _escape_xml(getattr(ubs, "responsavel_cargo", "-") or "-")],
        ["Contato", _escape_xml(getattr(ubs, "responsavel_contato", "-") or "-")],
        ["Habitantes ativos", _fmt(ubs.numero_habitantes_ativos)],
        ["Microáreas", _fmt(ubs.numero_microareas)],
        ["Famílias cadastradas", _fmt(ubs.numero_familias_cadastradas)],
        ["Domicílios", _fmt(ubs.numero_domicilios)],
        ["Domicílios rurais", _fmt(ubs.domicilios_rurais)],
        ["Data de inauguração", _fmt_date(ubs.data_inauguracao)],
        ["Data da última reforma", _fmt_date(ubs.data_ultima_reforma)],
        ["Modelo de atenção", _escape_xml(getattr(ubs, "gestao_modelo_atencao", "-") or "-")],
    ]
    info_table = Table(table_data, colWidths=[5.4 * cm, 10.6 * cm])
    info_table.setStyle(_zebra_style(len(table_data)))
    story.append(info_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Descritivos gerais", style_h3))
    story.append(_boxed(ubs.descritivos_gerais or "-", style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Fluxo, agenda e acesso", style_h3))
    story.append(_boxed(getattr(ubs, "fluxo_agenda_acesso", "-") or "-", style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Observações gerais", style_h3))
    story.append(_boxed(ubs.observacoes_gerais or "-", style_body))

    # ==================== 2. SERVIÇOS ====================
    story.append(_section_header(next_section("Serviços Oferecidos"), style_h2))
    story.append(Spacer(1, 4))
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
        story.append(Paragraph("Nenhum serviço registrado.", style_body))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"Outros serviços: {_escape_xml(ubs.outros_servicos or '-')}", style_body))

    # ==================== 3. INDICADORES ====================
    story.append(_section_header(next_section("Indicadores Epidemiológicos"), style_h2))
    story.append(Spacer(1, 4))
    indicators = diagnosis.indicators_latest or []
    if indicators:
        ind_data = [[
            Paragraph("Indicador", style_table_header),
            Paragraph("Tipo", style_table_header),
            Paragraph("Valor", style_table_header),
            Paragraph("Meta", style_table_header),
            Paragraph("Período", style_table_header),
        ]]
        for i in indicators:
            ind_data.append([
                Paragraph(_escape_xml(str(i.nome_indicador)), style_table),
                Paragraph(_escape_xml(_indicator_type_label(getattr(i, "tipo_valor", None))), style_table),
                Paragraph(_escape_xml(_format_indicator_value(i.valor, getattr(i, "tipo_valor", None))), style_table),
                Paragraph(_escape_xml(_format_indicator_value(i.meta, getattr(i, "tipo_valor", None))), style_table),
                Paragraph(_escape_xml(str(i.periodo_referencia)), style_table),
            ])
        ind_table = Table(ind_data, colWidths=[6.8 * cm, 2.2 * cm, 1.9 * cm, 1.9 * cm, 3.7 * cm])
        ind_table.setStyle(_zebra_style(len(ind_data)))
        ind_table.setStyle(TableStyle([
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(ind_table)
    else:
        story.append(Paragraph("Nenhum indicador registrado.", style_body))

    # ==================== 4. RECURSOS HUMANOS ====================
    story.append(_section_header(next_section("Recursos Humanos"), style_h2))
    story.append(Spacer(1, 4))
    groups = diagnosis.professional_groups or []
    if groups:
        g_data = [["Cargo/Função", "Qtd.", "Vínculo", "Observações"]]
        for g in groups:
            g_data.append([
                _escape_xml(str(g.cargo_funcao)),
                _escape_xml(str(g.quantidade)),
                _escape_xml(str(g.tipo_vinculo or "-")),
                _escape_xml(str(g.observacoes or "-")),
            ])
        g_table = Table(g_data, colWidths=[5.0 * cm, 1.5 * cm, 3.5 * cm, 6.5 * cm])
        g_table.setStyle(_zebra_style(len(g_data)))
        story.append(g_table)
    else:
        story.append(Paragraph("Nenhum profissional registrado.", style_body))

    # ==================== 5. PERFIL DO TERRITÓRIO ====================
    story.append(_section_header(next_section("Perfil do Território"), style_h2))
    story.append(Spacer(1, 4))
    territory = diagnosis.territory_profile
    story.append(Paragraph("Descrição do território", style_h3))
    story.append(_boxed(getattr(territory, "descricao_territorio", "-"), style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Potencialidades", style_h3))
    story.append(_boxed(getattr(territory, "potencialidades_territorio", "-"), style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Riscos e vulnerabilidades", style_h3))
    story.append(_boxed(getattr(territory, "riscos_vulnerabilidades", "-"), style_body))

    # ==================== 6. NECESSIDADES ====================
    story.append(_section_header(next_section("Necessidades Identificadas"), style_h2))
    story.append(Spacer(1, 4))
    needs = diagnosis.needs
    story.append(Paragraph("Problemas identificados", style_h3))
    story.append(_boxed(getattr(needs, "problemas_identificados", "-"), style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Necessidades de equipamentos e insumos", style_h3))
    story.append(_boxed(getattr(needs, "necessidades_equipamentos_insumos", "-"), style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Necessidades específicas dos ACS", style_h3))
    story.append(_boxed(getattr(needs, "necessidades_especificas_acs", "-"), style_body))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Infraestrutura e manutenção", style_h3))
    story.append(_boxed(getattr(needs, "necessidades_infraestrutura_manutencao", "-"), style_body))

    # ==================== 7. MAPA DE PROBLEMAS E INTERVENÇÕES (GUT) ====================
    problems = extra.get("problems") or []
    story.append(PageBreak())
    story.append(_section_header(next_section("Mapa de Problemas e Intervenções (Matriz GUT)"), style_h2))
    story.append(Spacer(1, 4))

    if problems:
        # Tabela resumo dos problemas
        p_data = [[
            Paragraph("Problema", style_table_header),
            Paragraph("G", style_table_header),
            Paragraph("U", style_table_header),
            Paragraph("T", style_table_header),
            Paragraph("Score", style_table_header),
            Paragraph("Prioritário", style_table_header),
        ]]
        for p in problems:
            p_data.append([
                Paragraph(_escape_xml(p["titulo"]), style_table),
                Paragraph(str(p["gut_gravidade"]), style_table),
                Paragraph(str(p["gut_urgencia"]), style_table),
                Paragraph(str(p["gut_tendencia"]), style_table),
                Paragraph(str(p["gut_score"]), style_table),
                Paragraph("Sim" if p.get("is_prioritario") else "Não", style_table),
            ])
        p_table = Table(p_data, colWidths=[6.5 * cm, 1.5 * cm, 1.5 * cm, 1.5 * cm, 2.0 * cm, 3.5 * cm])
        p_table.setStyle(_zebra_style(len(p_data)))
        story.append(p_table)
        story.append(Spacer(1, 8))

        # Detalhes de cada problema com intervenções e ações
        for idx, p in enumerate(problems):
            story.append(Paragraph(
                f"<b>{idx + 1}. {_escape_xml(p['titulo'])}</b>"
                f" &nbsp;(Score GUT: {p['gut_score']}"
                f"{' — Prioritário' if p.get('is_prioritario') else ''})",
                style_body,
            ))
            if p.get("descricao"):
                story.append(Paragraph(_escape_xml(p["descricao"]), style_small))
            story.append(Spacer(1, 4))

            interventions = p.get("interventions") or []
            if interventions:
                for iv in interventions:
                    story.append(Paragraph(
                        f"<b>Intervenção:</b> {_escape_xml(iv['objetivo'])} "
                        f"[{_escape_xml(_status_label(iv.get('status')))}]",
                        style_body,
                    ))
                    if iv.get("metas"):
                        story.append(Paragraph(f"Metas: {_escape_xml(iv['metas'])}", style_small))
                    if iv.get("responsavel"):
                        story.append(Paragraph(f"Responsável: {_escape_xml(iv['responsavel'])}", style_small))

                    actions = iv.get("actions") or []
                    if actions:
                        a_data = [[
                            Paragraph("Ação", style_table_header),
                            Paragraph("Prazo", style_table_header),
                            Paragraph("Status", style_table_header),
                            Paragraph("Observações", style_table_header),
                        ]]
                        for a in actions:
                            a_data.append([
                                Paragraph(_escape_xml(a.get("acao") or "-"), style_table),
                                Paragraph(_escape_xml(_fmt_date(a.get("prazo"))), style_table),
                                Paragraph(_escape_xml(_status_label(a.get("status"))), style_table),
                                Paragraph(_escape_xml(a.get("observacoes") or "-"), style_table),
                            ])
                        a_table = Table(a_data, colWidths=[5.0 * cm, 2.5 * cm, 2.5 * cm, 6.5 * cm])
                        a_table.setStyle(_zebra_style(len(a_data)))
                        story.append(Spacer(1, 2))
                        story.append(a_table)
                    story.append(Spacer(1, 4))
            else:
                story.append(Paragraph("Sem intervenções registradas.", style_small))
            story.append(Spacer(1, 6))
    else:
        story.append(Paragraph("Nenhum problema registrado no Mapa de Problemas e Intervenções.", style_body))

    # ==================== 8. GESTÃO DE EQUIPES E MICROÁREAS ====================
    microareas = extra.get("microareas") or []
    story.append(_section_header(next_section("Gestão de Equipes e Microáreas"), style_h2))
    story.append(Spacer(1, 4))

    if microareas:
        m_data = [[
            Paragraph("Microárea", style_table_header),
            Paragraph("Bairro", style_table_header),
            Paragraph("Status", style_table_header),
            Paragraph("População", style_table_header),
            Paragraph("Famílias", style_table_header),
            Paragraph("ACS Vinculado(s)", style_table_header),
        ]]
        total_pop = 0
        total_fam = 0
        cobertas = 0
        for m in microareas:
            pop = m.get("populacao") or 0
            fam = m.get("familias") or 0
            total_pop += pop
            total_fam += fam
            if m.get("status") == "COBERTA":
                cobertas += 1
            agentes = m.get("agentes") or []
            agentes_str = ", ".join(a.get("nome", "-") for a in agentes) if agentes else "Sem ACS"
            m_data.append([
                Paragraph(_escape_xml(m["nome"]), style_table),
                Paragraph(_escape_xml(m.get("bairro") or "-"), style_table),
                Paragraph(_escape_xml(_status_label(m.get("status"))), style_table),
                Paragraph(str(pop), style_table),
                Paragraph(str(fam), style_table),
                Paragraph(_escape_xml(agentes_str), style_table),
            ])
        m_table = Table(m_data, colWidths=[2.8 * cm, 2.5 * cm, 2.0 * cm, 2.2 * cm, 2.0 * cm, 5.0 * cm])
        m_table.setStyle(_zebra_style(len(m_data)))
        story.append(m_table)
        story.append(Spacer(1, 6))

        # KPIs resumidos
        total = len(microareas)
        story.append(Paragraph(
            f"<b>Resumo:</b> {total} microáreas | {cobertas} cobertas | "
            f"{total - cobertas} descobertas | "
            f"População total: {total_pop} | Famílias: {total_fam}",
            style_body,
        ))
    else:
        story.append(Paragraph("Nenhuma microárea registrada.", style_body))

    # ==================== 9. AGENDAMENTOS ====================
    agendamentos = extra.get("agendamentos") or []
    story.append(_section_header(next_section("Agendamento de Consultas"), style_h2))
    story.append(Spacer(1, 4))

    if agendamentos:
        # Resumo por status
        status_counts = {}
        for ag in agendamentos:
            s = ag.get("status") or "DESCONHECIDO"
            status_counts[s] = status_counts.get(s, 0) + 1
        status_parts = [f"{_status_label(k)}: {v}" for k, v in sorted(status_counts.items())]
        story.append(Paragraph(
            f"<b>Total de agendamentos:</b> {len(agendamentos)} &nbsp;|&nbsp; " + " &nbsp;|&nbsp; ".join(status_parts),
            style_body,
        ))
        story.append(Spacer(1, 6))

        ag_data = [[
            Paragraph("Data/Hora", style_table_header),
            Paragraph("Paciente", style_table_header),
            Paragraph("Profissional", style_table_header),
            Paragraph("Status", style_table_header),
            Paragraph("Observações", style_table_header),
        ]]
        for ag in agendamentos[:50]:  # limitar a 50 para não estourar o PDF
            ag_data.append([
                Paragraph(_escape_xml(_fmt_datetime(ag.get("data_hora"))), style_table),
                Paragraph(_escape_xml(ag.get("paciente_nome") or "-"), style_table),
                Paragraph(_escape_xml(ag.get("profissional_nome") or "-"), style_table),
                Paragraph(_escape_xml(_status_label(ag.get("status"))), style_table),
                Paragraph(_escape_xml(ag.get("observacoes") or "-"), style_table),
            ])
        ag_table = Table(ag_data, colWidths=[3.0 * cm, 3.5 * cm, 3.5 * cm, 2.5 * cm, 4.0 * cm])
        ag_table.setStyle(_zebra_style(len(ag_data)))
        story.append(ag_table)
        if len(agendamentos) > 50:
            story.append(Paragraph(f"Exibindo 50 de {len(agendamentos)} agendamentos.", style_small))
    else:
        story.append(Paragraph("Nenhum agendamento registrado.", style_body))

    # ==================== 10. CRONOGRAMA ====================
    cronograma = extra.get("cronograma") or []
    story.append(_section_header(next_section("Cronograma de Atividades"), style_h2))
    story.append(Spacer(1, 4))

    if cronograma:
        c_data = [[
            Paragraph("Título", style_table_header),
            Paragraph("Tipo", style_table_header),
            Paragraph("Local", style_table_header),
            Paragraph("Início", style_table_header),
            Paragraph("Fim", style_table_header),
            Paragraph("Recorrência", style_table_header),
        ]]
        for ev in cronograma:
            c_data.append([
                Paragraph(_escape_xml(ev.get("titulo") or "-"), style_table),
                Paragraph(_escape_xml(_tipo_evento_label(ev.get("tipo"))), style_table),
                Paragraph(_escape_xml(ev.get("local") or "-"), style_table),
                Paragraph(_escape_xml(_fmt_datetime(ev.get("inicio"))), style_table),
                Paragraph(_escape_xml(_fmt_datetime(ev.get("fim"))), style_table),
                Paragraph(_escape_xml(_recorrencia_label(ev.get("recorrencia"))), style_table),
            ])
        c_table = Table(c_data, colWidths=[4.0 * cm, 2.5 * cm, 2.5 * cm, 2.8 * cm, 2.8 * cm, 1.9 * cm])
        c_table.setStyle(_zebra_style(len(c_data)))
        story.append(c_table)
    else:
        story.append(Paragraph("Nenhum evento registrado no cronograma.", style_body))

    # ==================== 11. MATERIAIS EDUCATIVOS ====================
    materiais = extra.get("materiais") or []
    story.append(_section_header(next_section("Materiais Educativos"), style_h2))
    story.append(Spacer(1, 4))

    if materiais:
        mat_data = [[
            Paragraph("Título", style_table_header),
            Paragraph("Categoria", style_table_header),
            Paragraph("Público-alvo", style_table_header),
            Paragraph("Descrição", style_table_header),
            Paragraph("Arquivos", style_table_header),
        ]]
        for mat in materiais:
            files = mat.get("files") or []
            files_str = ", ".join(f.get("original_filename", "-") for f in files) if files else "Sem arquivos"
            mat_data.append([
                Paragraph(_escape_xml(mat.get("titulo") or "-"), style_table),
                Paragraph(_escape_xml(mat.get("categoria") or "-"), style_table),
                Paragraph(_escape_xml(mat.get("publico_alvo") or "-"), style_table),
                Paragraph(_escape_xml(mat.get("descricao") or "-"), style_table),
                Paragraph(_escape_xml(files_str), style_table),
            ])
        mat_table = Table(mat_data, colWidths=[3.5 * cm, 2.5 * cm, 2.5 * cm, 4.5 * cm, 3.5 * cm])
        mat_table.setStyle(_zebra_style(len(mat_data)))
        story.append(mat_table)
    else:
        story.append(Paragraph("Nenhum material educativo registrado.", style_body))

    # ==================== 12. ANEXOS ====================
    if attachments:
        story.append(PageBreak())
        story.append(_section_header(next_section("Anexos"), style_h2))
        story.append(Spacer(1, 4))
        image_attachments = []
        other_attachments = []
        for a in attachments:
            content_type = str(a.get("content_type") or "").lower()
            if content_type.startswith("image/"):
                image_attachments.append(a)
            else:
                other_attachments.append(a)

        for a in image_attachments:
            section = str(a.get("section") or "-")
            description = str(a.get("description") or "-")
            storage_path = str(a.get("storage_path") or "")
            resolved = _resolve_attachment_path(storage_path, base_dir)

            story.append(Paragraph(_escape_xml(f"Seção: {section}"), style_kicker))
            if description and description != "-":
                story.append(Paragraph(_escape_xml(f"Descrição: {description}"), style_body))

            if resolved:
                image = _image_flowable(resolved)
                if image:
                    story.append(Spacer(1, 4))
                    story.append(image)
                else:
                    story.append(Paragraph("Imagem inválida para renderização.", style_body))
            else:
                story.append(Paragraph("Imagem não encontrada no servidor.", style_body))
            story.append(Spacer(1, 8))

        if other_attachments:
            story.append(Paragraph("Outros anexos", style_h3))
            for a in other_attachments:
                section = _escape_xml(str(a.get("section") or "-"))
                description = _escape_xml(str(a.get("description") or "-"))
                filename = _escape_xml(str(a.get("original_filename") or "-"))
                story.append(Paragraph(f"<b>{filename}</b> — Seção: {section}", style_body))
                if description and description != "-":
                    story.append(Paragraph(f"Descrição: {description}", style_small))
                story.append(Spacer(1, 4))

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2.0 * cm,
        rightMargin=2.0 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm,
        title="Relatório Situacional UBS",
        author="Plataforma Digital",
    )
    doc.build(story)
    pdf_bytes = buffer.getvalue()

    filename_base = (ubs.nome_relatorio or ubs.nome_ubs or "relatorio_situacional").strip()
    return pdf_bytes, _safe_filename(filename_base)
