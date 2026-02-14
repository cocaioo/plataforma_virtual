import React, { useEffect, useState } from 'react';
import CardGrid from '../components/CardGrid';
import { api } from '../services/api';

const Dashboard = () => {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const data = await api.request('/auth/me', { requiresAuth: true });
        setTelefone(data?.telefone || '');
      } catch (err) {
        setProfileError('Nao foi possivel carregar seu perfil.');
      }
    };

    if (user) {
      loadMe();
    }
  }, [user]);

  const handleSaveTelefone = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setSaving(true);

    try {
      const updated = await api.request('/auth/me/telefone', {
        method: 'PATCH',
        body: { telefone: telefone || null },
        requiresAuth: true,
      });
      localStorage.setItem('user', JSON.stringify(updated));
      setProfileSuccess('Telefone atualizado com sucesso.');
    } catch (err) {
      setProfileError(err.message || 'Erro ao atualizar telefone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Bem-vindo à Plataforma UBS</h1>
        <p className="mt-2 text-gray-600">
          Você está autenticado como <strong className="capitalize">{user?.role?.toLowerCase() || 'Usuário'}</strong>.
        </p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Meu Perfil</h2>
        <p className="text-sm text-gray-500 mb-4">
          Atualize seu celular para receber confirmacoes de consulta.
        </p>

        {profileError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
            <p className="text-sm text-red-700">{profileError}</p>
          </div>
        )}
        {profileSuccess && (
          <div className="bg-green-50 border-l-4 border-green-400 p-3 mb-4">
            <p className="text-sm text-green-700">{profileSuccess}</p>
          </div>
        )}

        <form onSubmit={handleSaveTelefone} className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="w-full sm:w-1/2">
            <label className="block text-sm font-medium text-gray-700">Celular</label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </div>
      <CardGrid />
    </div>
  );
};

export default Dashboard;