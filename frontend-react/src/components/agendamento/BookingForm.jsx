import React, { useState, useEffect } from 'react';
import { agendamentoService } from '../../services/agendamentoService';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const BookingForm = ({ onSuccess, onCancel, initialData = null, title = "Agendar Nova Consulta", submitLabel = "Confirmar Agendamento" }) => {
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Se for reagendamento, extrai data e hora da data_hora original
  const getInitialState = () => {
    if (initialData) {
      const d = new Date(initialData.data_hora);
      return {
        id: initialData.id,
        profissional_id: initialData.profissional_id,
        data: d.toISOString().split('T')[0],
        hora: d.toTimeString().slice(0, 5),
        observacoes: initialData.observacoes || ''
      };
    }
    return {
      profissional_id: '',
      data: '',
      hora: '',
      observacoes: ''
    };
  };

  const [formData, setFormData] = useState(getInitialState());
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    loadProfissionais();
  }, []);

  const loadProfissionais = async () => {
    try {
      const data = await agendamentoService.getProfissionais();
      setProfissionais(data || []);
    } catch (err) {
      setError("Erro ao carregar profissionais.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null); // Limpa erro ao digitar
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.profissional_id || !formData.data || !formData.hora) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const dataHora = new Date(`${formData.data}T${formData.hora}:00`);
      
      if (initialData) {
        // Lógica de Reagendamento
        await agendamentoService.atualizarAgendamento(initialData.id, {
          profissional_id: parseInt(formData.profissional_id),
          data_hora: dataHora.toISOString(),
          observacoes: formData.observacoes,
          status: 'AGENDADO'
        });
        setSuccessMsg("Consulta reagendada com sucesso!");
      } else {
        // Lógica de Novo Agendamento
        await agendamentoService.criarAgendamento({
          profissional_id: parseInt(formData.profissional_id),
          data_hora: dataHora.toISOString(),
          observacoes: formData.observacoes
        });
        setSuccessMsg("Consulta agendada com sucesso!");
      }
      
      // Aguarda um pouco para mostrar a mensagem de sucesso antes de fechar/redirecionar
      setTimeout(() => {
          onSuccess();
      }, 1500);

    } catch (err) {
      setError(err.message || "Erro ao processar agendamento.");
    }
  };

  // Calcula data mínima (hoje)
  const today = new Date().toISOString().split('T')[0];

  if (loading) return <p className="p-4 text-center">Carregando...</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-100 relative">
      <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">{title}</h3>
      
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
                <p className="text-sm text-red-700 font-medium">Não foi possível realizar o agendamento</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
        </div>
      )}

      {successMsg && (
        <div className="absolute inset-0 z-10 bg-white/90 flex flex-col items-center justify-center rounded-lg">
             <CheckCircleIcon className="h-16 w-16 text-green-500 mb-4 animate-bounce" />
             <p className="text-xl font-bold text-gray-800">{successMsg}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Profissional / Especialidade</label>
          <select
            name="profissional_id"
            value={formData.profissional_id}
            onChange={handleChange}
            disabled={!!initialData} // Geralmente não se muda o profissional no reagendamento, mas se quiser permitir, remova isso
            className={`mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg ${initialData ? 'bg-gray-50' : ''}`}
            required
          >
            <option value="">Selecione um profissional</option>
            {profissionais.map(p => (
              <option key={p.id} value={p.id}>
                {p.cargo} - {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Data</label>
            <input
              type="date"
              name="data"
              min={today}
              value={formData.data}
              onChange={handleChange}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Hora</label>
            <input
              type="time"
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Observações (Opcional)</label>
          <textarea
            name="observacoes"
            rows={3}
            value={formData.observacoes}
            onChange={handleChange}
            placeholder="Alguma observação importante para o profissional..."
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white py-2.5 px-6 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;
