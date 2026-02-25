import { api } from './api';

export const ubsService = {
  getSingleUbs: async () => {
    const data = await api.request('/ubs?page=1&page_size=1', { requiresAuth: true });
    const items = data?.items || [];
    return items[0] || null;
  },
};
