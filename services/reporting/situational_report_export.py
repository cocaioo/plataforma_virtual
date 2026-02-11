from __future__ import annotations

import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Optional
import shutil

from jinja2 import Environment, FileSystemLoader, select_autoescape

from schemas.diagnostico_schemas import FullDiagnosisOut


_LATEX_SPECIAL_CHARS = {
    "\\": r"\\textbackslash{}",
    "{": r"\\{",
    "}": r"\\}",
    "#": r"\\#",
    "%": r"\\%",
    "&": r"\\&",
    "$": r"\\$",
    "_": r"\\_",
    "~": r"\\textasciitilde{}",
    "^": r"\\textasciicircum{}",
}


def latex_escape(value: Any) -> str:
    """Escape básico para LaTeX.

    Mantém o output previsível e evita que caracteres especiais quebrem a compilação.
    """

    if value is None:
        return "-"
    text = str(value)
    return "".join(_LATEX_SPECIAL_CHARS.get(ch, ch) for ch in text)


def _fmt_date(value: Any) -> str:
    if not value:
        return "-"
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    # date
    try:
        return value.strftime("%d/%m/%Y")
    except Exception:
        return str(value)


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


@dataclass(frozen=True)
class LaTeXCompileResult:
    pdf_bytes: bytes
    engine: str


class LaTeXCompilationError(RuntimeError):
    pass


class LaTeXCompiler:
    """Compila um arquivo .tex para PDF usando um engine disponível.

    Prioridade:
    1) tectonic (se instalado)
    2) pdflatex (se instalado)

    Em produção, o ideal é containerizar e garantir o engine no ambiente.
    """

    def __init__(self, timeout_seconds: int = 60):
        self.timeout_seconds = timeout_seconds

    def _find_engine(self) -> str:
        if shutil.which("tectonic"):
            return "tectonic"
        if shutil.which("pdflatex"):
            return "pdflatex"
        return ""

    def compile(self, tex_source: str) -> LaTeXCompileResult:
        engine = self._find_engine()
        if not engine:
            raise LaTeXCompilationError(
                "Nenhum engine LaTeX encontrado. Instale 'tectonic' ou 'pdflatex' (TeX Live/MiKTeX) "
                "para habilitar exportação em PDF."
            )

        with tempfile.TemporaryDirectory(prefix="relatorio_ubs_") as tmp:
            workdir = Path(tmp)
            tex_path = workdir / "main.tex"
            tex_path.write_text(tex_source, encoding="utf-8")

            if engine == "tectonic":
                cmd = ["tectonic", "-X", "compile", str(tex_path), "--outdir", str(workdir)]
                try:
                    proc = subprocess.run(
                        cmd,
                        cwd=str(workdir),
                        capture_output=True,
                        text=True,
                        timeout=self.timeout_seconds,
                    )
                except subprocess.TimeoutExpired as exc:
                    raise LaTeXCompilationError(
                        "Timeout ao compilar via tectonic. "
                        "Isso pode acontecer se o engine estiver baixando dependências ou o ambiente estiver lento. "
                        "Tente novamente ou aumente o timeout."
                    ) from exc
                if proc.returncode != 0:
                    raise LaTeXCompilationError(
                        "Falha ao compilar via tectonic. Saída:\n" + (proc.stdout or "") + "\n" + (proc.stderr or "")
                    )
            else:
                cmd = ["pdflatex", "-interaction=nonstopmode", "-halt-on-error", str(tex_path)]
                # roda 2x para estabilizar referencias/TOC se forem adicionadas no futuro
                for _ in range(2):
                    try:
                        proc = subprocess.run(
                            cmd,
                            cwd=str(workdir),
                            capture_output=True,
                            text=True,
                            timeout=self.timeout_seconds,
                        )
                    except subprocess.TimeoutExpired as exc:
                        raise LaTeXCompilationError(
                            "Timeout ao compilar via pdflatex. Em Windows com MiKTeX isso normalmente ocorre "
                            "quando o MiKTeX abre um prompt para baixar pacotes (.sty) e o processo fica esperando. "
                            "Soluções: instale o 'tectonic' (recomendado) ou configure o MiKTeX para 'Always install missing packages' "
                            "sem perguntar."
                        ) from exc
                    if proc.returncode != 0:
                        raise LaTeXCompilationError(
                            "Falha ao compilar via pdflatex. Saída:\n" + (proc.stdout or "") + "\n" + (proc.stderr or "")
                        )

            pdf_path = workdir / "main.pdf"
            if not pdf_path.exists():
                raise LaTeXCompilationError("Compilação terminou sem gerar main.pdf")

            return LaTeXCompileResult(pdf_bytes=pdf_path.read_bytes(), engine=engine)


def _template_env() -> Environment:
    templates_dir = Path(__file__).resolve().parent
    env = Environment(
        loader=FileSystemLoader(str(templates_dir)),
        autoescape=select_autoescape(enabled_extensions=()),
    )
    env.filters["latex_escape"] = latex_escape
    return env


def _as_lines(value: Optional[str]) -> str:
    """Normaliza texto para LaTeX simples.

    Estratégia: escapa e converte quebras de linha em parágrafos.
    """

    if not value:
        return "-"
    escaped = latex_escape(value)
    # Separar parágrafos
    return escaped.replace("\r\n", "\n").replace("\n\n", "\n\\par\n").replace("\n", "\\par\n")


def generate_situational_report_pdf(
    diagnosis: FullDiagnosisOut,
    *,
    municipality: str = "Município",
    reference_period: str = "",
    compiler: Optional[LaTeXCompiler] = None,
) -> tuple[bytes, str, str]:
    """Gera PDF do relatório situacional a partir do diagnóstico agregado.

    Returns: (pdf_bytes, filename_base, latex_engine)
    """

    compiler = compiler or LaTeXCompiler()

    ubs = diagnosis.ubs

    title = "RELATÓRIO SITUACIONAL"
    ubs_name = ubs.nome_ubs or "UBS"
    report_name = ubs.nome_relatorio or "-"

    services = [s.name for s in (diagnosis.services.services or [])]

    indicators = []
    for i in diagnosis.indicators_latest or []:
        indicators.append(
            {
                "nome": latex_escape(i.nome_indicador),
                "valor": latex_escape(i.valor),
                "meta": latex_escape(i.meta) if i.meta is not None else "-",
                "periodo": latex_escape(i.periodo_referencia),
            }
        )

    professional_groups = []
    for g in diagnosis.professional_groups or []:
        professional_groups.append(
            {
                "cargo": latex_escape(g.cargo_funcao),
                "quantidade": latex_escape(g.quantidade),
                "vinculo": latex_escape(g.tipo_vinculo or "-"),
            }
        )

    territorio = diagnosis.territory_profile
    needs = diagnosis.needs

    env = _template_env()
    template = env.get_template("latex_situational_report.tex.j2")

    rendered = template.render(
        title=latex_escape(title),
        municipality=latex_escape(municipality),
        reference_period=latex_escape(reference_period) if reference_period else latex_escape(""),
        generated_at=latex_escape(datetime.now().strftime("%d/%m/%Y %H:%M")),
        ubs_name=latex_escape(ubs_name),
        cnes=latex_escape(ubs.cnes or "-"),
        report_name=latex_escape(report_name),
        area_atuacao=latex_escape(ubs.area_atuacao or "-"),
        habitantes_ativos=latex_escape(ubs.numero_habitantes_ativos),
        microareas=latex_escape(ubs.numero_microareas),
        familias=latex_escape(ubs.numero_familias_cadastradas),
        domicilios=latex_escape(ubs.numero_domicilios),
        domicilios_rurais=latex_escape(ubs.domicilios_rurais),
        data_inauguracao=latex_escape(_fmt_date(ubs.data_inauguracao)),
        data_ultima_reforma=latex_escape(_fmt_date(ubs.data_ultima_reforma)),
        descritivos_gerais=_as_lines(ubs.descritivos_gerais),
        observacoes_gerais=_as_lines(ubs.observacoes_gerais),
        services=[latex_escape(s) for s in services] if services else ["-"],
        outros_servicos=latex_escape(ubs.outros_servicos or "-"),
        indicators=indicators if indicators else [{"nome": "-", "valor": "-", "meta": "-", "periodo": "-"}],
        professional_groups=professional_groups if professional_groups else [{"cargo": "-", "quantidade": "-", "vinculo": "-"}],
        territorio_descricao=_as_lines(territorio.descricao_territorio) if territorio else "-",
        territorio_potencialidades=_as_lines(territorio.potencialidades_territorio) if territorio else "-",
        territorio_riscos=_as_lines(territorio.riscos_vulnerabilidades) if territorio else "-",
        problemas_identificados=_as_lines(needs.problemas_identificados) if needs else "-",
        necessidades_equipamentos=_as_lines(needs.necessidades_equipamentos_insumos) if needs else "-",
        necessidades_acs=_as_lines(needs.necessidades_especificas_acs) if needs else "-",
        necessidades_infraestrutura=_as_lines(needs.necessidades_infraestrutura_manutencao) if needs else "-",
        submission_status=latex_escape(diagnosis.submission.status.value if diagnosis.submission and diagnosis.submission.status else "-"),
        submitted_at=latex_escape(_fmt_date(diagnosis.submission.submitted_at) if diagnosis.submission else "-"),
    )

    result = compiler.compile(rendered)
    filename_base = _safe_filename(report_name if report_name != "-" else ubs_name)
    return result.pdf_bytes, filename_base, result.engine
