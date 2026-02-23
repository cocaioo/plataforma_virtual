import { api } from './api';

export const gestaoEquipesService = {
  getKpis: () =>
    api.request('/gestao-equipes/kpis', { requiresAuth: true }),

  getAgentes: () =>
    api.request('/gestao-equipes/agentes', { requiresAuth: true }),

  getMicroareas: () =>
    api.request('/gestao-equipes/microareas', { requiresAuth: true }),
};
