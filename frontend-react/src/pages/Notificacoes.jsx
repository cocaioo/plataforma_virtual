import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  EnvelopeIcon, 
  CheckCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from '../components/ui/Notifications';

const Notificacoes = () => {
  const { notify, confirm } = useNotifications();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/auth/users/pending-welcome', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Erro ao carregar usuários pendentes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleMarkAsSent = async (userId) => {
    const confirmed = await confirm({
      title: 'Confirmar envio',
      message: 'Confirmar que o e-mail foi enviado? O usuário sairá desta lista.',
      confirmLabel: 'Confirmar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`/api/auth/users/${userId}/confirm-welcome`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Remove da lista localmente
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      notify({ type: 'error', message: 'Erro ao atualizar o status do usuário.' });
    }
  };

  const generateMailtoLink = (user) => {
    const roleMap = {
      "USER": "Paciente",
      "GESTOR": "Gestor",
      "PROFISSIONAL": "Profissional de Saúde",
      "RECEPCAO": "Recepção"
    };
    const roleDisplay = roleMap[user.role] || user.role;
    
    const subject = "Bem-vindo(a) à Plataforma UBS!";
    const body = `Olá, ${user.nome}!

Ficamos muito felizes em ter você conosco. Seu cadastro foi realizado com sucesso e sua conta já está ativa.

Detalhes da Conta:
Tipo de Conta: ${roleDisplay}

Agora você pode acessar todos os recursos disponíveis para o seu perfil.

Acesse: https://plataforma-virtual.onrender.com/login

© 2026 Plataforma UBS.`;

    return `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="container mx-auto mt-10 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Notificações</h1>
        <p className="text-gray-500 mt-1">Gerenciamento de boas-vindas e pendências de novos usuários.</p>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700 flex items-center">
            <UserIcon className="w-5 h-5 mr-2" />
            Novos Usuários (Pendentes de Boas-vindas)
          </h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            Total: {users.length}
          </span>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-10">Carregando...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-10">{error}</div>
          ) : users.length === 0 ? (
            <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <CheckCircleIcon className="w-12 h-12 mx-auto text-green-400 mb-2" />
              <p>Todos os novos usuários já foram notificados!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Perfil</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.nome}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'USER' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-center space-x-4">
                          <a 
                            href={generateMailtoLink(user)}
                            className="text-blue-600 hover:text-blue-900 flex items-center border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EnvelopeIcon className="w-4 h-4 mr-1" />
                            Enviar E-mail
                          </a>
                          <button 
                            onClick={() => handleMarkAsSent(user.id)}
                            className="text-green-600 hover:text-green-900 flex items-center border border-green-200 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                            title="Marcar como enviado e remover da lista"
                          >
                            <CheckCircleIcon className="w-4 h-4 mr-1" />
                            Marcar Enviado
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notificacoes;
