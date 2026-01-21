import { useState } from "react";
import { api } from "../api";
import { temRiscoSql } from "../utils/validation";

export function AuthCard() {
  const [formulario, setFormulario] = useState({ email: "", senha: "" });
  const [estado, setEstado] = useState({ carregando: false, erro: "", sucesso: "" });

  const aoAlterar = (e) =>
    setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const aoEnviar = async (e) => {
    e.preventDefault();
    setEstado({ carregando: true, erro: "", sucesso: "" });
    if (temRiscoSql(formulario.email)) {
      setEstado({ carregando: false, erro: "Entrada suspeita", sucesso: "" });
      return;
    }
    try {
      const dados = await api.login({ email: formulario.email, senha: formulario.senha });
      const nomeUsuario = dados.user?.nome || "";
      const rotuloPapel = dados.user?.is_profissional ? "Profissional da UBS" : "Usuário";
      setEstado({
        carregando: false,
        erro: "",
        sucesso: `Bem-vindo, ${nomeUsuario}! Você entrou como ${rotuloPapel}.`,
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      setEstado({ carregando: false, erro: err.message, sucesso: "" });
    }
  };

  return (
    <div className="auth-card">
      <h3>Entrar</h3>
      <form onSubmit={aoEnviar} className="form">
        <label>
          Email
          <input name="email" type="email" value={formulario.email} onChange={aoAlterar} required />
        </label>
        <label>
          Senha
          <input name="senha" type="password" value={formulario.senha} onChange={aoAlterar} required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={estado.carregando}>
          {estado.carregando ? "Entrando..." : "Entrar"}
        </button>
        {estado.erro && <p className="text-error">{estado.erro}</p>}
        {estado.sucesso && <p className="text-success">{estado.sucesso}</p>}
      </form>
      <p className="muted" style={{ marginTop: "12px", fontSize: "13px" }}>
        Seu perfil (Usuário ou Profissional da UBS) é definido automaticamente pelo cadastro.
        Usuários comuns não têm acesso às áreas exclusivas de profissionais/gestores.
      </p>
    </div>
  );
}
