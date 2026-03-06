import React, { useState, useEffect } from 'react';
import { agendamentoService } from '../../services/agendamentoService';
import BlockScheduleModal from './BlockScheduleModal';
import BookingForm from './BookingForm';
import { useNotifications } from '../ui/Notifications';

const CalendarView = ({ user }) => {
  const { notify, confirm } = useNotifications();
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProfissional, setSelectedProfissional] = useState('');
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);

  const canManage = ['PROFISSIONAL', 'GESTOR'].includes(user?.role);
  const canConfirm = user?.role === 'GESTOR' || user?.cargo === 'Recepcionista';

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    const start = new Date(d);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const [startDate, setStartDate] = useState(getStartOfWeek(new Date()));

  useEffect(() => {
    loadProfissionais();
  }, []);

  useEffect(() => {
    if (selectedProfissional) {
      loadAgenda();
    }
  }, [selectedProfissional, startDate]);

  const loadProfissionais = async () => {
    try {
      const data = await agendamentoService.getProfissionais();
      setProfissionais(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAgenda = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(startDate);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const data = await agendamentoService.getAgendaProfissional(
        selectedProfissional,
        start.toISOString(),
        end.toISOString()
      );
      setAgendamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    setStartDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    setStartDate(newDate);
  };

  const handleDateJump = (e) => {
    if (e.target.value) {
        setStartDate(getStartOfWeek(new Date(e.target.value)));
    }
  };

  const handleToday = () => {
      setStartDate(getStartOfWeek(new Date()));
  };

  const getEndDate = () => {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 6);
      return end;
  };

  const handleSendConfirmation = async (id) => {
      try {
          await agendamentoService.confirmarAgendamento(id);
        notify({ type: 'success', message: 'Confirmação enviada.' });
          loadAgenda();
      } catch(err) {
          notify({ type: 'error', message: `Erro: ${err.message}` });
      }
  };

  const handleCancel = async (id) => {
    const confirmed = await confirm({
      title: 'Cancelar agendamento',
      message: 'Deseja realmente cancelar este agendamento?',
      confirmLabel: 'Cancelar',
      cancelLabel: 'Voltar',
    });
    if (!confirmed) return;
    try {
      await agendamentoService.atualizarAgendamento(id, { status: 'CANCELADO' });
      loadAgenda();
    } catch (err) {
      notify({ type: 'error', message: `Erro ao cancelar: ${err.message}` });
    }
  };

  const handleRescheduleClick = (apt) => {
    setSelectedApt(apt);
    setIsRescheduleModalOpen(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'AGENDADO': return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'REAGENDADO': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
      case 'CANCELADO': return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
      case 'REALIZADO': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Modal de Bloqueio */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <BlockScheduleModal
            onClose={() => setIsBlockModalOpen(false)}
            onSuccess={() => {
                loadAgenda();
            }}
          />
        </div>
      )}

      {isRescheduleModalOpen && selectedApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-lg">
            <BookingForm
              initialData={selectedApt}
              title="Reagendar Consulta"
              submitLabel="Confirmar Reagendamento"
              onSuccess={() => {
                setIsRescheduleModalOpen(false);
                setSelectedApt(null);
                loadAgenda();
              }}
              onCancel={() => {
                setIsRescheduleModalOpen(false);
                setSelectedApt(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg shadow dark:shadow-slate-800 space-y-4 xl:space-y-0">
        <div className="w-full xl:w-1/4">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Filtrar Profissional</label>
          <select
            value={selectedProfissional}
            onChange={(e) => setSelectedProfissional(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:outline-none sm:text-sm rounded-md"
          >
            <option value="">Selecione...</option>
            {Array.isArray(profissionais) && profissionais.map(p => (
              <option key={p.id} value={p.id}>{p.nome} - {p.cargo}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-slate-400">
              &lt;
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50">
                Hoje
            </button>
            <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-slate-400">
              &gt;
            </button>
          </div>

          <div className="text-center">
            <span className="font-semibold text-gray-800 dark:text-white">
                {startDate.toLocaleDateString('pt-BR')} - {getEndDate().toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div>
              <input
                type="date"
                onChange={handleDateJump}
                className="text-sm border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
          </div>
        </div>

        {canManage && (
          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="w-full xl:w-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Gerenciar Bloqueios
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-center py-8 dark:text-slate-400">Carregando agenda...</p>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow dark:shadow-slate-800 overflow-hidden">
            {agendamentos.length === 0 ? (
                <p className="p-8 text-center text-gray-500 dark:text-slate-400">Nenhum agendamento nesta semana para este profissional.</p>
            ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Data/Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Paciente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Status</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Confirmação</th>
                         {canManage && (
                           <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">Ações</th>
                         )}
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
                      {Array.isArray(agendamentos) && agendamentos.map((apt) => (
                        <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(apt.data_hora).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {apt.nome_paciente}
                          </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(apt.status)}`}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                              {apt.confirmacao_enviada ? (
                                  <span className="text-green-600 dark:text-green-400">Enviada em {new Date(apt.confirmacao_enviada).toLocaleDateString()}</span>
                              ) : canConfirm ? (
                                  <button
                                    onClick={() => handleSendConfirmation(apt.id)}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                        Enviar mensagem
                                  </button>
                              ) : (
                                      <span className="text-gray-400 dark:text-slate-500">Não enviada</span>
                              )}
                          </td>
                          {canManage && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {['AGENDADO', 'REAGENDADO'].includes(apt.status) && (
                                <>
                                  <button
                                    onClick={() => handleRescheduleClick(apt)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                                  >
                                    Reagendar
                                  </button>
                                  <button
                                    onClick={() => handleCancel(apt.id)}
                                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
