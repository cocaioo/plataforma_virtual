import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export function GestorSolicitacoes() {
  const [estado, setEstado] = useState({ carregando: true, erro: "" });
  const [lista, setLista] = useState([]);
  const [roleSelecionado, setRoleSelecionado] = useState({});

  const usuarioAtual = api.getCurrentUser();
  const papel = `${usuarioAtual?.role || ""}`.toLowerCase();

  async function carregar() {
    setEstado({ carregando: true, erro: "" });
    try {
      await api.me();
      const user = api.getCurrentUser();
      if (`${user?.role || ""}`.toLowerCase() !== "gestor") {
        window.location.href = "/dashboard";
        return;
      }

      const dados = await api.listProfessionalRequests({ status: "PENDING" });
      setLista(dados || []);
      setEstado({ carregando: false, erro: "" });
    } catch (err) {
      setEstado({ carregando: false, erro: err.message });
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const pendentes = useMemo(() => lista.filter((x) => `${x.status}`.toUpperCase() === "PENDING"), [lista]);

  async function aprovar(id) {
    const role = roleSelecionado[id] || "PROFISSIONAL";
    if (!confirm("Aprovar esta solicitação?")) return;
    setEstado((e) => ({ ...e, carregando: true, erro: "" }));
    try {
      await api.approveProfessionalRequest(id, { role });
      await carregar();
    } catch (err) {
      setEstado({ carregando: false, erro: err.message });
    }
  }

  async function rejeitar(id) {
    const motivo = prompt("Motivo da reprovação (obrigatório):");
    if (!motivo || !motivo.trim()) return;
    setEstado((e) => ({ ...e, carregando: true, erro: "" }));
    try {
      await api.rejectProfessionalRequest(id, { rejection_reason: motivo.trim() });
      await carregar();
    } catch (err) {
      setEstado({ carregando: false, erro: err.message });
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Gestão</p>
          <h1>Solicitações profissionais</h1>
          <p className="muted">Aprove ou rejeite solicitações pendentes.</p>
          {papel && <p className="muted">Logado como: <strong>{papel}</strong></p>}
        </div>
      </section>

      {estado.erro && <p className="text-error">❌ {estado.erro}</p>}

      {estado.carregando ? (
        <p className="muted">Carregando…</p>
      ) : pendentes.length === 0 ? (
        <div className="card" style={{ padding: "16px" }}>
          <p style={{ margin: 0 }}>Nenhuma solicitação pendente.</p>
        </div>
      ) : (
        <section className="card-grid">
          {pendentes.map((s) => (
            <article className="card" key={s.id}>
              <h3>Solicitação #{s.id}</h3>
              <p className="muted" style={{ marginTop: "8px" }}>
                Solicitante: <strong>{s.user?.nome || "(sem nome)"}</strong>
              </p>
              <p className="muted" style={{ marginTop: "8px" }}>
                Email: <strong>{s.user?.email || "(sem email)"}</strong>
              </p>
              <p className="muted" style={{ marginTop: "8px" }}>
                Usuário ID: <strong>{s.user_id}</strong>
              </p>
              <p className="muted" style={{ marginTop: "8px" }}>
                Cargo: <strong>{s.cargo}</strong>
              </p>
              <p className="muted" style={{ marginTop: "8px" }}>
                Registro: <strong>{s.registro_profissional}</strong>
              </p>
              <label style={{ display: "block", marginTop: "12px" }}>
                Aprovar como
                <select
                  value={roleSelecionado[s.id] || "PROFISSIONAL"}
                  onChange={(e) => setRoleSelecionado((m) => ({ ...m, [s.id]: e.target.value }))}
                  style={{ marginTop: "6px" }}
                >
                  <option value="PROFISSIONAL">Profissional da UBS</option>
                  <option value="GESTOR">Gestor</option>
                </select>
              </label>
              <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                <button className="btn btn-primary" type="button" onClick={() => aprovar(s.id)}>
                  Aprovar
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => rejeitar(s.id)}>
                  Rejeitar
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
