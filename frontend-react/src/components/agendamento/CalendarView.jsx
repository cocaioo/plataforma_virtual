import React, { useState, useEffect } from 'react';
import { agendamentoService } from '../../services/agendamentoService';
import AppointmentList from './AppointmentList';
import BlockScheduleModal from './BlockScheduleModal';

const CalendarView = ({ user }) => {
  const [profissionais, setProfissionais] = useState([]);
  const [selectedProfissional, setSelectedProfissional] = useState('');
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  
  // Helper to get start of week (Sunday)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = d.getDate() - day;
    const start = new Date(d);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Controle de Semana - Inicializa no domingo da semana atual
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
      setProfissionais(data || []);
      // Se for profissional, auto-seleciona (lógica simplificada)
      // Idealmente o backend diria qual ID é o meu
    } catch (err) {
      console.error(err);
    }
  };

  const loadAgenda = async () => {
    setLoading(true);
    try {
      // Calcular fim da semana (start + 6 dias, fim do dia)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Garante início do dia
      
      const end = new Date(startDate);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999); // Garante final do último dia
      
      const data = await agendamentoService.getAgendaProfissional(
        selectedProfissional,
        start.toISOString(),
        end.toISOString()
      );
      setAgendamentos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setAgendamentos([]); // Garante array vazio em caso de erro
      // alert("Erro ao carregar agenda."); // Comentado para evitar alerts excessivos
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
          alert("Confirmação enviada (simulação).");
          loadAgenda();
      } catch(err) {
          alert("Erro: " + err.message);
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
                // setIsBlockModalOpen(false); // Mantem aberto para ver a lista ou fecha? O usuario pode querer gerenciar mais.
                // Mas recarrega agenda se estivermos vendo a agenda do proprio
                loadAgenda();
            }}
          />
        </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-4 rounded-lg shadow space-y-4 xl:space-y-0">
        <div className="w-full xl:w-1/4">
          <label className="block text-sm font-medium text-gray-700">Filtrar Profissional</label>
          <select
            value={selectedProfissional}
            onChange={(e) => setSelectedProfissional(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none sm:text-sm rounded-md"
          >
            <option value="">Selecione...</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>{p.nome} - {p.cargo}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded text-gray-600">
              &lt;
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                Hoje
            </button>
            <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded text-gray-600">
              &gt;
            </button>
          </div>
          
          <div className="text-center">
            <span className="font-semibold text-gray-800">
                {startDate.toLocaleDateString('pt-BR')} - {getEndDate().toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div>
              <input 
                type="date" 
                onChange={handleDateJump}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
          </div>
        </div>
        
        <button 
            onClick={() => setIsBlockModalOpen(true)}
            className="w-full xl:w-auto bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 text-sm font-medium flex items-center justify-center"
        >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            Gerenciar Bloqueios
        </button>
      </div>

      {loading ? (
        <p className="text-center py-8">Carregando agenda...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {agendamentos.length === 0 ? (
                <p className="p-8 text-center text-gray-500">Nenhum agendamento nesta semana para este profissional.</p>
            ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paciente</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confirmação</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {agendamentos.map((apt) => (
                        <tr key={apt.id}>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(apt.data_hora).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {apt.nome_paciente}
                          </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                apt.status === 'AGENDADO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {apt.confirmacao_enviada ? (
                                  <span className="text-green-600">Enviada em {new Date(apt.confirmacao_enviada).toLocaleDateString()}</span>
                              ) : (
                                  <button 
                                    onClick={() => handleSendConfirmation(apt.id)}
                                    className="text-blue-600 hover:underline"
                                  >
                                      Enviar msg
                                  </button>
                              )}
                          </td>
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