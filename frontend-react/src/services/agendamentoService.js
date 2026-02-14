import { api } from './api';

export const agendamentoService = {
  // Histórico / Meus Agendamentos
  getMeusAgendamentos: () => 
    api.request('/agendamentos/meus', { requiresAuth: true }),

  // Criar Agendamento
  criarAgendamento: (payload) => 
    api.request('/agendamentos', { method: 'POST', body: payload, requiresAuth: true }),

  // Atualizar (Cancelar/Reagendar)
  atualizarAgendamento: (id, payload) => 
    api.request(`/agendamentos/${id}`, { method: 'PATCH', body: payload, requiresAuth: true }),

  // Confirmar (Recepcionista)
  confirmarAgendamento: (id) => 
    api.request(`/agendamentos/${id}/confirmar`, { method: 'POST', requiresAuth: true }),

  // Agenda Profissional (Staff)
  getAgendaProfissional: (profissionalId, start, end) => 
    api.request(`/agenda/profissional/${profissionalId}?start_date=${start}&end_date=${end}`, { requiresAuth: true }),

  // Bloqueio de Agenda (Staff)
  criarBloqueio: (payload) => 
    api.request('/agenda/bloqueios', { method: 'POST', body: payload, requiresAuth: true }),

  getBloqueios: (profissionalId = null) => {
    const query = profissionalId ? `?profissional_id=${profissionalId}` : '';
    return api.request(`/agenda/bloqueios${query}`, { requiresAuth: true });
  },

  deleteBloqueio: (id) => 
    api.request(`/agenda/bloqueios/${id}`, { method: 'DELETE', requiresAuth: true }),

  // Listar Profissionais
  getProfissionais: (cargo = null) => {
    const query = cargo ? `?cargo=${encodeURIComponent(cargo)}` : '';
    return api.request(`/agendamentos/profissionais${query}`, { requiresAuth: true });
  },

  // Listar Especialidades
  getEspecialidades: () =>
    api.request('/agendamentos/especialidades', { requiresAuth: true }),
};
