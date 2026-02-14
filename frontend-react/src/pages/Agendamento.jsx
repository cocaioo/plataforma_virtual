import React, { useState, useEffect } from 'react';
import { agendamentoService } from '../services/agendamentoService';
import AppointmentList from '../components/agendamento/AppointmentList';
import BookingForm from '../components/agendamento/BookingForm';
import CalendarView from '../components/agendamento/CalendarView';

const Agendamento = () => {
  const [activeTab, setActiveTab] = useState('meus'); // meus, novo, agenda_geral
  const [meusAgendamentos, setMeusAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal para Reagendamento
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  
  // Recupera usuário do localStorage (mockado ou real)
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  
  const isStaff = ['PROFISSIONAL', 'GESTOR', 'RECEPCAO', 'ACS'].includes(user?.role);

  useEffect(() => {
    if (activeTab === 'meus') {
      loadMeusAgendamentos();
    }
  }, [activeTab]);

  const loadMeusAgendamentos = async () => {
    setLoading(true);
    try {
      const data = await agendamentoService.getMeusAgendamentos();
      setMeusAgendamentos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Tem certeza que deseja cancelar?")) return;
    try {
      await agendamentoService.atualizarAgendamento(id, { status: 'CANCELADO' });
      loadMeusAgendamentos();
    } catch (err) {
      alert("Erro ao cancelar: " + err.message);
    }
  };

  const handleRescheduleClick = (apt) => {
    setSelectedApt(apt);
    setIsRescheduleModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 sm:p-8">
      {/* Modal de Reagendamento */}
      {isRescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="relative w-full max-w-lg">
            <BookingForm 
              initialData={selectedApt}
              title="Reagendar Consulta"
              submitLabel="Confirmar Reagendamento"
              onSuccess={() => {
                setIsRescheduleModalOpen(false);
                loadMeusAgendamentos();
              }}
              onCancel={() => setIsRescheduleModalOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="mb-8 border-b border-gray-200">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Agendamento de Consultas</h1>
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('meus')}
            className={`${
              activeTab === 'meus'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors`}
          >
            Meus Agendamentos
          </button>
          
          <button
            onClick={() => setActiveTab('novo')}
            className={`${
              activeTab === 'novo'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors`}
          >
            Agendar Consulta
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab('agenda_geral')}
              className={`${
                activeTab === 'agenda_geral'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-colors`}
            >
              Visualizar Agenda (Staff)
            </button>
          )}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'meus' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Seu Histórico de Consultas</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <AppointmentList 
                appointments={meusAgendamentos} 
                onCancel={handleCancel}
                onReschedule={handleRescheduleClick}
              />
            )}
          </div>
        )}

        {activeTab === 'novo' && (
          <div className="max-w-2xl mx-auto animate-fade-in">
             <BookingForm 
                onSuccess={() => setActiveTab('meus')}
                onCancel={() => setActiveTab('meus')}
             />
          </div>
        )}

        {activeTab === 'agenda_geral' && isStaff && (
          <div className="animate-fade-in">
            <CalendarView user={user} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Agendamento;
