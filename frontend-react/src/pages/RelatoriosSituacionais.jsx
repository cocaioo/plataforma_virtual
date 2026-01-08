import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

// Tela intermediária para gestão de relatórios situacionais (rascunhos e finalizados)
// Nesta versão, usamos dados apenas em memória, apenas para navegação e visão geral.
export function RelatoriosSituacionais() {
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [relatorios, setRelatorios] = useState([]);

  const obterStatusBackend = (statusTela) => {
    if (statusTela === "rascunho") return "DRAFT";
    if (statusTela === "finalizado") return "SUBMITTED";
    return null;
  };

  const mensagemErroAmigavel = (err, contexto) => {
    if (!err) return `Erro ao ${contexto}`;

    if (err.type === "NETWORK_ERROR") {
      return "Não foi possível conectar ao servidor. Verifique se o backend está rodando em http://localhost:8000 e se o CORS está liberado.";
    }

    const msg = err.message || "";
    if (msg.includes("HTTP 401")) {
      return "Sessão expirada. Faça login novamente.";
    }

    return `Erro ao ${contexto}: ${msg || "tente novamente"}`;
  };

  const carregarRelatorios = async (status) => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await api.listReports({ status });
      const items = resposta.items || [];
      const normalizados = items.map((r) => {
        const atualizadoEm = r.updated_at || r.created_at || "";
        const statusNormalizado = r.status === "SUBMITTED" ? "finalizado" : "rascunho";
        return {
          id: r.id,
          nomeUbs: r.nome_ubs,
          atualizadoEm,
          status: statusNormalizado,
          statusBackend: r.status,
          nomeRelatorio: r.nome_relatorio,
        };
      });
      setRelatorios(normalizados);
    } catch (e) {
      console.error("Erro ao listar relatórios:", e);
      setErro(mensagemErroAmigavel(e, "carregar relatórios"));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const statusBackend = obterStatusBackend(filtroStatus);
    carregarRelatorios(statusBackend);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus]);

  const relatoriosFiltrados = useMemo(() => {
    if (filtroStatus === "todos") return relatorios;
    return relatorios.filter((relatorio) => relatorio.status === filtroStatus);
  }, [filtroStatus, relatorios]);

  const rotuloStatus = (status) => {
    if (status === "rascunho") return "Rascunho";
    if (status === "finalizado") return "Finalizado";
    return status;
  };

  const lidarComExclusao = (id) => {
    const confirmarExclusao = window.confirm(
      "Tem certeza que deseja excluir este relatório? Essa ação não poderá ser desfeita."
    );
    if (!confirmarExclusao) return;
    (async () => {
      try {
        await api.deleteReport(id);
        setRelatorios((anterior) => anterior.filter((relatorio) => relatorio.id !== id));
      } catch (e) {
        console.error("Erro ao excluir relatório:", e);
        window.alert(mensagemErroAmigavel(e, "excluir relatório"));
      }
    })();
  };

  const lidarComExportacaoPdf = async (id, nomeRelatorio) => {
    try {
      const { blob, contentDisposition } = await api.exportReportPdf(id);
      const match = /filename="?([^";]+)"?/i.exec(contentDisposition);
      const nomeArquivo = match?.[1] || (nomeRelatorio ? `${nomeRelatorio}.pdf` : `relatorio_${id}.pdf`);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
      window.alert(mensagemErroAmigavel(e, "exportar PDF"));
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Relatórios situacionais</p>
          <h1>Gerenciar relatórios da UBS</h1>
          <p className="muted">
            Use esta tela como um painel intermediário para visualizar diagnósticos em rascunho ou já
            finalizados.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/diagnostico">
            Novo relatório
          </Link>
        </div>
      </section>

      <section className="diagnostico-card" style={{ marginTop: 24 }}>
        <div className="form-section-header" style={{ marginBottom: 16 }}>
          <h2>Relatórios cadastrados</h2>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <label className="field-label" style={{ marginRight: 8 }}>
              Filtrar por status:
            </label>
            <select
              className="field-input"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ width: 220 }}
            >
              <option value="todos">Todos</option>
              <option value="rascunho">Rascunho</option>
              <option value="finalizado">Finalizado</option>
            </select>
          </div>
        </div>

        {erro ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <p className="muted" style={{ margin: 0 }}>
              {erro}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => carregarRelatorios(obterStatusBackend(filtroStatus))}
            >
              Tentar novamente
            </button>
          </div>
        ) : carregando ? (
          <p className="muted">Carregando relatórios...</p>
        ) : relatoriosFiltrados.length === 0 ? (
          <p className="muted">Nenhum relatório encontrado para o filtro selecionado.</p>
        ) : (
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px" }}>UBS</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Última atualização</th>
                <th style={{ textAlign: "left", padding: "8px" }}>Status</th>
                <th style={{ textAlign: "right", padding: "8px" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {relatoriosFiltrados.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "8px" }}>{r.nomeUbs}</td>
                  <td style={{ padding: "8px" }}>{r.atualizadoEm}</td>
                  <td style={{ padding: "8px" }}>
                    <span className="pill-badge">{rotuloStatus(r.status)}</span>
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => lidarComExportacaoPdf(r.id, r.nomeRelatorio || r.nomeUbs)}
                      >
                        Exportar PDF
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => lidarComExclusao(r.id)}
                        title="Excluir relatório"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
