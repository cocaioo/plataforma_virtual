import React, { useState, useEffect } from 'react';
import { agendamentoService } from '../../services/agendamentoService';
import { TrashIcon } from '@heroicons/react/24/outline';

const BlockScheduleModal = ({ onClose, onSuccess }) => {
  const [bloqueios, setBloqueios] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    profissional_id: '',
    data_inicio: '',
    data_fim: '',
    motivo: ''
  });

  useEffect(() => {
    loadProfissionais();
  }, []);

  // Recarrega bloqueios quando o profissional selecionado muda
  useEffect(() => {
    if (formData.profissional_id) {
      loadBloqueios(formData.profissional_id);
    } else {
      setBloqueios([]);
    }
  }, [formData.profissional_id]);

  const loadProfissionais = async () => {
    try {
      const data = await agendamentoService.getProfissionais();
      setProfissionais(data || []);
    } catch (err) {
      console.error("Erro ao carregar profissionais", err);
    }
  };

  const loadBloqueios = async (profId) => {
    try {
      const data = await agendamentoService.getBloqueios(profId);
      setBloqueios(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.profissional_id) {
         alert("Selecione um profissional.");
         setLoading(false);
         return;
      }

      const start = new Date(formData.data_inicio + 'T00:00:00');
      const end = new Date(formData.data_fim + 'T23:59:59');

      if (end < start) {
        alert("A data final deve ser igual ou posterior à data inicial.");
        setLoading(false);
        return;
      }

      await agendamentoService.criarBloqueio({
        profissional_id: parseInt(formData.profissional_id),
        data_inicio: start.toISOString(),
        data_fim: end.toISOString(),
        motivo: formData.motivo
      });

      // Limpa datas mas mantem o profissional
      setFormData(prev => ({ ...prev, data_inicio: '', data_fim: '', motivo: '' }));
      
      loadBloqueios(formData.profissional_id);
      if (onSuccess) onSuccess(); 
    } catch (err) {
      alert("Erro ao criar bloqueio: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente desbloquear estes dias?")) return;
    try {
      await agendamentoService.deleteBloqueio(id);
      loadBloqueios(formData.profissional_id);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("Erro ao excluir bloqueio.");
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Gerenciar Bloqueios de Agenda</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
          <span className="sr-only">Fechar</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6 overflow-y-auto">
        {/* Formulário de Novo Bloqueio */}
        <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h4 className="text-sm font-semibold text-blue-800 mb-3 uppercase tracking-wide">Novo Bloqueio</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Seleção de Profissional */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Profissional</label>
              <select
                name="profissional_id"
                value={formData.profissional_id}
                onChange={handleChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                required
              >
                <option value="">Selecione um profissional...</option>
                {profissionais.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.cargo} - {p.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Início</label>
                <input
                  type="date"
                  name="data_inicio"
                  min={today}
                  value={formData.data_inicio}
                  onChange={handleChange}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Data Fim</label>
                <input
                  type="date"
                  name="data_fim"
                  min={formData.data_inicio || today}
                  value={formData.data_fim}
                  onChange={handleChange}
                  className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Motivo (Opcional)</label>
              <input
                type="text"
                name="motivo"
                placeholder="Ex: Férias, Conferência, Feriado..."
                value={formData.motivo}
                onChange={handleChange}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Adicionar Bloqueio'}
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Bloqueios Existentes */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 border-b pb-2">
            Bloqueios Ativos {formData.profissional_id ? '' : '(Selecione um profissional para ver)'}
          </h4>
          {bloqueios.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
                {formData.profissional_id ? 'Nenhum bloqueio encontrado para este profissional.' : 'Aguardando seleção...'}
            </p>
          ) : (
            <div className="space-y-3">
              {bloqueios.map((b) => (
                <div key={b.id} className="flex justify-between items-center bg-white border border-gray-200 p-3 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(b.data_inicio).toLocaleDateString('pt-BR')} até {new Date(b.data_fim).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {b.motivo || 'Sem motivo especificado'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Desbloquear (Excluir)"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default BlockScheduleModal;
