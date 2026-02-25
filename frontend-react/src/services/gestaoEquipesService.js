import { api } from './api';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

export const gestaoEquipesService = {
  getKpis: (params = {}) =>
    api.request(`/gestao-equipes/kpis${buildQuery(params)}`, { requiresAuth: true }),

  getAgentes: (params = {}) =>
    api.request(`/gestao-equipes/agentes${buildQuery(params)}`, { requiresAuth: true }),

  getMicroareas: (params = {}) =>
    api.request(`/gestao-equipes/microareas${buildQuery(params)}`, { requiresAuth: true }),

  getAcsUsers: () =>
    api.request('/gestao-equipes/acs-users', { requiresAuth: true }),

  getUbsList: async () => {
    const data = await api.request('/ubs?page=1&page_size=100', { requiresAuth: true });
    return data?.items || [];
  },

  createMicroarea: (payload) =>
    api.request('/gestao-equipes/microareas', {
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),

  updateMicroarea: (microareaId, payload) =>
    api.request(`/gestao-equipes/microareas/${microareaId}`, {
      method: 'PATCH',
      body: payload,
      requiresAuth: true,
    }),

  createAgente: (payload) =>
    api.request('/gestao-equipes/agentes', {
      method: 'POST',
      body: payload,
      requiresAuth: true,
    }),

  updateAgente: (agenteId, payload) =>
    api.request(`/gestao-equipes/agentes/${agenteId}`, {
      method: 'PATCH',
      body: payload,
      requiresAuth: true,
    }),
};
