import { request } from './client';

export const analysesApi = {
  run: (datasetId, config) => request('/analyses/run', { method: 'POST', body: { datasetId, config } }),
  list: (params) => request('/analyses', { params }),
  get: (id) => request(`/analyses/${id}`),
  create: (data) => request('/analyses', { method: 'POST', body: data }),
  update: (id, data) => request(`/analyses/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/analyses/${id}`, { method: 'DELETE' }),
};
