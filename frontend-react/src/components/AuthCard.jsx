import { useState } from "react";
import { api } from "../api";
import { hasSqlRisk } from "../utils/validation";

export function AuthCard() {
  const [form, setForm] = useState({ email: "", senha: "" });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", success: "" });
    if (hasSqlRisk(form.email)) {
      setStatus({ loading: false, error: "Entrada suspeita", success: "" });
      return;
    }
    try {
      const data = await api.login({ email: form.email, senha: form.senha });
      const userName = data.user?.nome || "";
      const roleLabel = data.user?.is_profissional ? "Profissional da UBS" : "Usuário";
      setStatus({
        loading: false,
        error: "",
        success: `Bem-vindo, ${userName}! Você entrou como ${roleLabel}.`,
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  return (
    <div className="auth-card">
      <h3>Entrar</h3>
      <form onSubmit={onSubmit} className="form">
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onChange} required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" value={form.senha} onChange={onChange} required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={status.loading}>
          {status.loading ? "Entrando..." : "Entrar"}
        </button>
        {status.error && <p className="text-error">{status.error}</p>}
        {status.success && <p className="text-success">{status.success}</p>}
      </form>
      <p className="muted" style={{ marginTop: "12px", fontSize: "13px" }}>
        Seu perfil (Usuário ou Profissional da UBS) é definido automaticamente pelo cadastro.
        Usuários comuns não têm acesso às áreas exclusivas de profissionais/gestores.
      </p>
    </div>
  );
}
