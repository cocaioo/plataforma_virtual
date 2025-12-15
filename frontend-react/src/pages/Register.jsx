import { useState } from "react";
import { api } from "../api";
import { validateRegister } from "../utils/validation";

export function Register() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    cpf: "",
    senha: "",
    confirmarSenha: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignUp = async (e) => {
    e.preventDefault();
    const errors = validateRegister(form);
    if (Object.keys(errors).length) {
      setStatus({ ...status, error: Object.values(errors)[0], success: "" });
      return;
    }
    try {
      setStatus({ loading: true, error: "", success: "" });
      await api.signUp({
        nome: form.nome,
        email: form.email,
        cpf: form.cpf,
        senha: form.senha,
      });
      setStatus({ loading: false, error: "", success: "Cadastro concluído! Você já pode fazer login." });
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  return (
    <main className="page narrow">
      <div className="auth-card">
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Criar Conta</h1>
        <p className="muted" style={{ marginBottom: '32px' }}>Preencha os dados abaixo para acessar a plataforma.</p>

        <form className="form" onSubmit={handleSignUp}>
        <label>
          Nome completo
          <input name="nome" value={form.nome} onChange={onChange} required />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={onChange} required />
        </label>
        <label>
          CPF
          <input name="cpf" value={form.cpf} onChange={onChange} required />
        </label>
        <label>
          Senha (mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número)
          <input name="senha" type="password" value={form.senha} onChange={onChange} required />
        </label>
        <label>
          Confirmar senha
          <input name="confirmarSenha" type="password" value={form.confirmarSenha} onChange={onChange} required />
        </label>

        <button className="btn btn-primary" type="submit" disabled={status.loading}>
          {status.loading ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Criando conta...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Criar conta
            </>
          )}
        </button>

          {status.error && <p className="text-error">❌ {status.error}</p>}
          {status.success && <p className="text-success">✅ {status.success}</p>}
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
          Já tem conta? <a href="/" style={{ color: 'var(--primary)', fontWeight: '600' }}>Fazer login</a>
        </p>
      </div>
    </main>
  );
}
