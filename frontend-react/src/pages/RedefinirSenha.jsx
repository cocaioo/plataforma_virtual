import { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../components/ui/Notifications';
import { api } from '../services/api';
import { isValidEmail, validatePassword } from '../utils/validators';

const RedefinirSenha = () => {
  const { notify } = useNotifications();
  const [form, setForm] = useState({ email: '', senha: '', confirmar_senha: '' });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email || !form.senha || !form.confirmar_senha) {
      notify({ type: 'warning', message: 'Preencha email, senha e confirmação.' });
      return;
    }

    if (!isValidEmail(form.email)) {
      notify({ type: 'warning', message: 'Informe um email valido.' });
      return;
    }

    const senhaError = validatePassword(form.senha);
    if (senhaError) {
      notify({ type: 'warning', message: senhaError });
      return;
    }

    if (form.senha !== form.confirmar_senha) {
      notify({ type: 'warning', message: 'As senhas não conferem.' });
      return;
    }

    try {
      setSaving(true);
      await api.request('/auth/reset-password', {
        method: 'POST',
        requiresAuth: true,
        body: {
          email: form.email,
          senha: form.senha,
        },
      });
      notify({ type: 'success', message: 'Senha redefinida com sucesso.' });
      setForm((prev) => ({ ...prev, senha: '', confirmar_senha: '' }));
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao redefinir senha.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Redefinir senha</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
          Redefinição interna de senha para qualquer usuário.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Email do usuário</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            placeholder="email@dominio.com"
          />
          <p className="mt-2 text-xs text-slate-500">Use o email do usuário cadastrado.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Nova senha</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              name="senha"
              value={form.senha}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pr-10 text-gray-900 dark:text-slate-100"
              placeholder="Mínimo 8 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Mínimo 8 caracteres, com letra maiúscula, minúscula e número.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Confirmar senha</label>
          <div className="relative mt-1">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmar_senha"
              value={form.confirmar_senha}
              onChange={handleChange}
              className="block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 pr-10 text-gray-900 dark:text-slate-100"
              placeholder="Repita a senha"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="absolute inset-y-0 right-2 flex items-center text-slate-500 hover:text-slate-700"
              aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Repita exatamente a mesma senha.</p>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-900 disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RedefinirSenha;
