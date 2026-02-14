
import React, { useState, useEffect } from 'react';
import { useNotifications } from '../components/ui/Notifications';

const GestorSolicitacoes = () => {
  const { notify, confirm, prompt } = useNotifications();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // MOCK: Substituir com chamada de API real para /api/auth/professional-requests
    const mockSolicitacoes = [
      {
        id: 1,
        user: { nome: 'Carlos Andrade', email: 'carlos@example.com' },
        cargo: 'Enfermeiro Chefe',
        registro_professional: 'COREN-SP 123456',
        status: 'PENDING',
        submitted_at: '2024-07-28T10:00:00Z',
      },
      {
        id: 2,
        user: { nome: 'Ana Beatriz', email: 'ana.b@example.com' },
        cargo: 'Médico da Família',
        registro_profissional: 'CRM-SP 654321',
        status: 'PENDING',
        submitted_at: '2024-07-27T15:30:00Z',
      },
       {
        id: 3,
        user: { nome: 'Juliana Lima', email: 'juliana.lima@example.com' },
        cargo: 'Agente Comunitário de Saúde',
        registro_profissional: 'ACS-SP 98765',
        status: 'PENDING',
        submitted_at: '2024-07-29T09:15:00Z',
      },
    ];
    setSolicitacoes(mockSolicitacoes);
    setLoading(false);
  }, []);

  const handleApprove = async (id) => {
    const confirmed = await confirm({
      title: 'Aprovar solicitação',
      message: `Deseja aprovar a solicitação ${id}?`,
      confirmLabel: 'Aprovar',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;
    notify({ type: 'success', message: `Solicitação ${id} aprovada.` });
    // Lógica para aprovar
  };

  const handleReject = async (id) => {
    const motivo = await prompt({
      title: 'Rejeitar solicitação',
      message: 'Informe o motivo da rejeição.',
      placeholder: 'Motivo',
      confirmLabel: 'Rejeitar',
      cancelLabel: 'Cancelar',
    });
    if (motivo === null) return;
    if (!motivo.trim()) {
      notify({ type: 'warning', message: 'Informe um motivo para a rejeição.' });
      return;
    }
    notify({ type: 'info', message: `Solicitação ${id} rejeitada: ${motivo}` });
    // Lógica para rejeitar
  };

  if (loading) return <p>Carregando solicitações...</p>;
  if (error) return <p>Erro ao carregar: {error}</p>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestão de Solicitações Profissionais</h1>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Cargo Solicitado
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Registro
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Data Envio
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {solicitacoes.map((sol) => (
              <tr key={sol.id}>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{sol.user.nome}</p>
                  <p className="text-gray-600 whitespace-no-wrap">{sol.user.email}</p>
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{sol.cargo}</p>
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{sol.registro_profissional}</p>
                </td>
                 <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {new Date(sol.submitted_at).toLocaleDateString('pt-BR')}
                  </p>
                </td>
                <td className="px-5 py-4 border-b border-gray-200 bg-white text-sm text-center">
                   <button
                    onClick={() => handleApprove(sol.id)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full mr-2"
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleReject(sol.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full"
                  >
                    Rejeitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestorSolicitacoes;
