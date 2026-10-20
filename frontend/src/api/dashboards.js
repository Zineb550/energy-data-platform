import { request } from './client';

export const dashboardsApi = {
  list: (params) => request('/dashboards', { params }),
  get: (id) => request(`/dashboards/${id}`),
  data: (id, filters) => request(`/dashboards/${id}/data`, { method: 'POST', body: { filters } }),
  create: (data) => request('/dashboards', { method: 'POST', body: data }),
  update: (id, data) => request(`/dashboards/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/dashboards/${id}`, { method: 'DELETE' }),
};

// Visitors (no login needed)
export const publicApi = {
  dashboards: () => request('/public/dashboards'),
  dashboard: (slug) => request(`/public/dashboards/${slug}`),
  data: (slug, filters) => request(`/public/dashboards/${slug}/data`, { method: 'POST', body: { filters } }),
};
