import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { validarCadastro } from "../utils/validation";

export function Register() {
  const [formulario, setFormulario] = useState({
    nome: "",
    email: "",
    cpf: "",
    senha: "",
    confirmarSenha: "",
  });
  const [estado, setEstado] = useState({ carregando: false, erro: "", sucesso: "" });
  const navigate = useNavigate();

  const aoAlterar = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const lidarComCadastro = async (e) => {
    e.preventDefault();
    const erros = validarCadastro(formulario);
    if (Object.keys(erros).length) {
      setEstado({ carregando: false, erro: Object.values(erros)[0], sucesso: "" });
      return;
    }

    try {
      setEstado({ carregando: true, erro: "", sucesso: "" });
      await api.signUp({
        nome: formulario.nome,
        email: formulario.email,
        cpf: formulario.cpf,
        senha: formulario.senha,
      });
      setEstado({ carregando: false, erro: "", sucesso: "Cadastro realizado com sucesso!" });
      setTimeout(() => navigate("/"), 1500);
    } catch (err) {
      setEstado({ carregando: false, erro: err.message, sucesso: "" });
    }
  };

  return (
    <div className="page narrow-page">
      <div className="auth-card">
        <h2 className="auth-title">Crie sua Conta</h2>
        <p className="auth-subtitle">Preencha os dados para se cadastrar na plataforma.</p>
        <form onSubmit={lidarComCadastro} className="form">
          <div className="form-group">
            <label htmlFor="nome">Nome Completo</label>
            <input id="nome" name="nome" value={formulario.nome} onChange={aoAlterar} required className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={formulario.email} onChange={aoAlterar} required className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="cpf">CPF</label>
            <input id="cpf" name="cpf" value={formulario.cpf} onChange={aoAlterar} required className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" value={formulario.senha} onChange={aoAlterar} required className="form-control" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmarSenha">Confirmar Senha</label>
            <input id="confirmarSenha" name="confirmarSenha" type="password" value={formulario.confirmarSenha} onChange={aoAlterar} required className="form-control" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={estado.carregando}>
            {estado.carregando ? "Criando Conta..." : "Criar Conta"}
          </button>
          {estado.erro && <p className="text-danger">{estado.erro}</p>}
          {estado.sucesso && <p className="text-success">{estado.sucesso}</p>}
        </form>
        <div className="auth-footer">
          <p>Já tem uma conta? <Link to="/">Faça login</Link></p>
        </div>
      </div>
    </div>
  );
}