import { api } from './api';

export const suporteFeedbackService = {
  enviarFeedback: (payload) =>
    api.request('/suporte-feedback', { method: 'POST', body: payload, requiresAuth: true }),

  listarFeedbacks: () =>
    api.request('/suporte-feedback', { requiresAuth: true }),

  atualizarStatus: (id, status) =>
    api.request(`/suporte-feedback/${id}`, { method: 'PATCH', body: { status }, requiresAuth: true }),
};
