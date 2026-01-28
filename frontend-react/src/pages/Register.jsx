import { useState } from "react";
import { api } from "../api";
import { validarCadastro } from "../utils/validation";

export function Register() {
  const [tipoConta, setTipoConta] = useState("usuario");
  const [formulario, setFormulario] = useState({
    nome: "",
    email: "",
    cpf: "",
    senha: "",
    confirmarSenha: "",
    invite_code: "",
    cargo: "",
    registro_profissional: "",
  });
  const [estado, setEstado] = useState({ carregando: false, erro: "", sucesso: "" });

  const aoAlterar = (e) =>
    setFormulario({ ...formulario, [e.target.name]: e.target.value });

  const lidarComCadastro = async (e) => {
    e.preventDefault();
    const erros = validarCadastro(formulario);
    if (Object.keys(erros).length) {
      setEstado({ ...estado, erro: Object.values(erros)[0], sucesso: "" });
      return;
    }

    if (tipoConta === "profissional") {
      if (!formulario.invite_code?.trim()) {
        setEstado({ ...estado, erro: "Informe o código de convite", sucesso: "" });
        return;
      }
      if (!formulario.cargo?.trim()) {
        setEstado({ ...estado, erro: "Informe o cargo", sucesso: "" });
        return;
      }
      if (!formulario.registro_profissional?.trim()) {
        setEstado({ ...estado, erro: "Informe o registro profissional", sucesso: "" });
        return;
      }
    }

    try {
      setEstado({ carregando: true, erro: "", sucesso: "" });
      await api.signUp({
        nome: formulario.nome,
        email: formulario.email,
        cpf: formulario.cpf,
        senha: formulario.senha,
      });

      if (tipoConta === "profissional") {
        await api.login({ email: formulario.email, senha: formulario.senha });
        await api.claimProfessional({
          invite_code: formulario.invite_code,
          cargo: formulario.cargo,
          registro_profissional: formulario.registro_profissional,
        });
        setEstado({ carregando: false, erro: "", sucesso: "Cadastro profissional ativado!" });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1200);
        return;
      }

      setEstado({ carregando: false, erro: "", sucesso: "Cadastro concluído! Você já pode fazer login." });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setEstado({ carregando: false, erro: err.message, sucesso: "" });
    }
  };

  return (
    <main className="page narrow">
      <div className="auth-card">
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Criar Conta</h1>
        <p className="muted" style={{ marginBottom: '32px' }}>Preencha os dados abaixo para acessar a plataforma.</p>

        <form className="form" onSubmit={lidarComCadastro}>
          <label>
            Tipo de conta
            <select value={tipoConta} onChange={(e) => setTipoConta(e.target.value)}>
              <option value="usuario">Usuário</option>
              <option value="profissional">Profissional da UBS (com convite)</option>
            </select>
          </label>

          <label>
            Nome completo
            <input name="nome" value={formulario.nome} onChange={aoAlterar} required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={formulario.email} onChange={aoAlterar} required />
          </label>
          <label>
            CPF
            <input name="cpf" value={formulario.cpf} onChange={aoAlterar} required />
          </label>
          <label>
            Senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número)
            <input name="senha" type="password" value={formulario.senha} onChange={aoAlterar} required />
          </label>
          <label>
            Confirmar senha
            <input
              name="confirmarSenha"
              type="password"
              value={formulario.confirmarSenha}
              onChange={aoAlterar}
              required
            />
          </label>

          {tipoConta === "profissional" && (
            <>
              <label>
                Código de convite
                <input name="invite_code" value={formulario.invite_code} onChange={aoAlterar} required />
              </label>
              <label>
                Cargo
                <input name="cargo" value={formulario.cargo} onChange={aoAlterar} required />
              </label>
              <label>
                Registro profissional
                <input
                  name="registro_profissional"
                  value={formulario.registro_profissional}
                  onChange={aoAlterar}
                  required
                />
              </label>
            </>
          )}

          <button className="btn btn-primary" type="submit" disabled={estado.carregando}>
            {estado.carregando ? (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="spin"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Criando conta...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                Criar conta
              </>
            )}
          </button>

          {estado.erro && <p className="text-error">❌ {estado.erro}</p>}
          {estado.sucesso && <p className="text-success">✅ {estado.sucesso}</p>}
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
          Já tem conta? <a href="/" style={{ color: 'var(--primary)', fontWeight: '600' }}>Fazer login</a>
        </p>
      </div>
    </main>
  );
}
