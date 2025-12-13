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
    codigo: "",
  });
  const [status, setStatus] = useState({ loading: false, error: "", success: "", step: 1 });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRequestCode = async () => {
    const errors = validateRegister(form);
    if (Object.keys(errors).length) {
      setStatus({ ...status, error: Object.values(errors)[0] });
      return;
    }
    try {
      setStatus({ loading: true, error: "", success: "", step: 1 });
      await api.requestCode(form.email); // requer endpoint no backend
      setStatus({ loading: false, error: "", success: "Código enviado para seu email", step: 2 });
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: "", step: 1 });
    }
  };

  const handleConfirmAndSignUp = async (e) => {
    e.preventDefault();
    const errors = validateRegister(form);
    if (Object.keys(errors).length) {
      setStatus({ ...status, error: Object.values(errors)[0], success: "" });
      return;
    }
    if (!form.codigo) {
      setStatus({ ...status, error: "Informe o código recebido por email" });
      return;
    }
    try {
      setStatus({ loading: true, error: "", success: "", step: 2 });
      await api.confirmCode(form.email, form.codigo); // requer endpoint no backend
      await api.signUp({
        nome: form.nome,
        email: form.email,
        cpf: form.cpf,
        senha: form.senha,
      });
      setStatus({ loading: false, error: "", success: "Cadastro concluído!", step: 3 });
    } catch (err) {
      setStatus({ loading: false, error: err.message, success: "", step: 2 });
    }
  };

  return (
    <main className="page narrow">
      <h1>Cadastro</h1>
      <p className="muted">Crie sua conta para acessar a plataforma.</p>

      <form className="form" onSubmit={handleConfirmAndSignUp}>
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
          Senha
          <input name="senha" type="password" value={form.senha} onChange={onChange} required />
        </label>
        <label>
          Confirmar senha
          <input name="confirmarSenha" type="password" value={form.confirmarSenha} onChange={onChange} required />
        </label>

        <div className="code-row">
          <label className="code-input">
            Código de confirmação
            <input name="codigo" value={form.codigo} onChange={onChange} placeholder="Digite o código enviado" />
          </label>
          <button className="btn btn-secondary" type="button" disabled={status.loading} onClick={handleRequestCode}>
            Enviar código
          </button>
        </div>

        <button className="btn btn-primary" type="submit" disabled={status.loading || status.step < 2}>
          {status.loading ? "Enviando..." : "Finalizar cadastro"}
        </button>

        {status.error && <p className="text-error">{status.error}</p>}
        {status.success && <p className="text-success">{status.success}</p>}
      </form>
    </main>
  );
}
