import { useEffect, useState } from "react";
import { api } from "../api";

export function SolicitacaoProfissional() {
  const [estado, setEstado] = useState({ carregando: true, erro: "" });
  const [solicitacao, setSolicitacao] = useState(null);
  const [form, setForm] = useState({ cargo: "", registro_profissional: "" });

  const usuarioAtual = api.getCurrentUser();
  const papel = (usuarioAtual?.role || (usuarioAtual?.is_profissional ? "profissional" : "usuario")).toLowerCase();

  async function carregar() {
    setEstado({ carregando: true, erro: "" });
    try {
      await api.me();
      const user = api.getCurrentUser();
      const isProf = !!user?.is_profissional;
      const isGestor = `${user?.role || ""}`.toLowerCase() === "gestor";
      if (isProf || isGestor) {
        window.location.href = "/dashboard";
        return;
      }

      const dados = await api.getMyProfessionalRequest();
      setSolicitacao(dados);
      setForm({ cargo: dados.cargo || "", registro_profissional: dados.registro_profissional || "" });
      setEstado({ carregando: false, erro: "" });
    } catch (err) {
      // Se ainda não existe solicitação, mostramos o formulário
      if (`${err.message}`.includes("404")) {
        setSolicitacao(null);
        setEstado({ carregando: false, erro: "" });
        return;
      }
      setEstado({ carregando: false, erro: err.message });
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const aoAlterar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    if (!form.cargo.trim()) {
      setEstado({ carregando: false, erro: "Informe o cargo" });
      return;
    }
    if (!form.registro_profissional.trim()) {
      setEstado({ carregando: false, erro: "Informe o registro profissional" });
      return;
    }

    setEstado({ carregando: true, erro: "" });
    try {
      const dados = await api.createProfessionalRequest({
        cargo: form.cargo,
        registro_profissional: form.registro_profissional,
      });
      setSolicitacao(dados);
      setEstado({ carregando: false, erro: "" });
    } catch (err) {
      setEstado({ carregando: false, erro: err.message });
    }
  }

  const status = `${solicitacao?.status || ""}`.toUpperCase();

  return (
    <main className="page narrow">
      <div className="auth-card">
        <h1 style={{ fontSize: "26px", marginBottom: "8px" }}>Solicitar acesso profissional</h1>
        <p className="muted" style={{ marginBottom: "24px" }}>
          Envie sua solicitação para avaliação do gestor da UBS.
        </p>

        {papel !== "usuario" && (
          <p className="muted" style={{ marginBottom: "16px" }}>
            Papel atual: <strong>{papel}</strong>
          </p>
        )}

        {estado.erro && <p className="text-error">❌ {estado.erro}</p>}

        {estado.carregando ? (
          <p className="muted">Carregando…</p>
        ) : solicitacao ? (
          <>
            <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
              <p style={{ margin: 0 }}>
                Status: <strong>{status === "PENDING" ? "PENDENTE" : status === "APPROVED" ? "APROVADA" : "REPROVADA"}</strong>
              </p>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                Cargo: <strong>{solicitacao.cargo}</strong>
              </p>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                Registro: <strong>{solicitacao.registro_profissional}</strong>
              </p>
              {status === "REJECTED" && solicitacao.rejection_reason && (
                <p className="text-error" style={{ margin: "12px 0 0" }}>
                  Motivo: {solicitacao.rejection_reason}
                </p>
              )}
              {status === "APPROVED" && (
                <p className="text-success" style={{ margin: "12px 0 0" }}>
                  Seu acesso foi aprovado. Faça logout e login novamente para atualizar sua permissão.
                </p>
              )}
            </div>

            {status === "REJECTED" && (
              <>
                <p className="muted" style={{ marginBottom: "12px" }}>
                  Você pode ajustar os dados e reenviar.
                </p>
                <form className="form" onSubmit={enviar}>
                  <label>
                    Cargo
                    <input name="cargo" value={form.cargo} onChange={aoAlterar} />
                  </label>
                  <label>
                    Registro profissional
                    <input name="registro_profissional" value={form.registro_profissional} onChange={aoAlterar} />
                  </label>
                  <button className="btn btn-primary" type="submit" disabled={estado.carregando}>
                    Reenviar solicitação
                  </button>
                </form>
              </>
            )}
          </>
        ) : (
          <form className="form" onSubmit={enviar}>
            <label>
              Cargo
              <input name="cargo" value={form.cargo} onChange={aoAlterar} required />
            </label>
            <label>
              Registro profissional
              <input name="registro_profissional" value={form.registro_profissional} onChange={aoAlterar} required />
            </label>

            <button className="btn btn-primary" type="submit" disabled={estado.carregando}>
              Enviar solicitação
            </button>
          </form>
        )}

        <p style={{ marginTop: "18px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
          <a href="/dashboard" style={{ color: "var(--primary)", fontWeight: "600" }}>
            Voltar ao dashboard
          </a>
        </p>
      </div>
    </main>
  );
}
