import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { temRiscoSql } from "../utils/validation";

export function AuthCard() {
  const [formulario, setFormulario] = useState({ email: "", senha: "" });
  const [estado, setEstado] = useState({ carregando: false, erro: "", sucesso: "" });
  const navigate = useNavigate();

  const aoAlterar = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const aoEnviar = async (e) => {
    e.preventDefault();
    setEstado({ carregando: true, erro: "", sucesso: "" });

    if (temRiscoSql(formulario.email)) {
      setEstado({ carregando: false, erro: "Entrada inválida.", sucesso: "" });
      return;
    }

    try {
      await api.login({ email: formulario.email, senha: formulario.senha });
      setEstado({ carregando: false, erro: "", sucesso: "Login bem-sucedido!" });
      navigate("/dashboard");
    } catch (err) {
      setEstado({ carregando: false, erro: err.message, sucesso: "" });
    }
  };

  return (
    <div className="auth-card">
      <h2 className="auth-title">Acesse sua Conta</h2>
      <form onSubmit={aoEnviar} className="form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={formulario.email}
            onChange={aoAlterar}
            required
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            name="senha"
            type="password"
            value={formulario.senha}
            onChange={aoAlterar}
            required
            className="form-control"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={estado.carregando}>
          {estado.carregando ? "Entrando..." : "Entrar"}
        </button>
        {estado.erro && <p className="text-danger">{estado.erro}</p>}
        {estado.sucesso && <p className="text-success">{estado.sucesso}</p>}
      </form>
      <div className="auth-footer">
        <p>Não tem uma conta? <Link to="/register">Cadastre-se</Link></p>
      </div>
    </div>
  );
}