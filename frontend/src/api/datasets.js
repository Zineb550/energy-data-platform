import { request } from './client';

export const datasetsApi = {
  categories: () => request('/datasets/categories'),
  list: (params) => request('/datasets', { params }),
  get: (id) => request(`/datasets/${id}`),
  create: (formData) => request('/datasets', { method: 'POST', body: formData }),
  update: (id, data) => request(`/datasets/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/datasets/${id}`, { method: 'DELETE' }),
  rows: (id, params) => request(`/datasets/${id}/rows`, { params }),
  stats: (id) => request(`/datasets/${id}/stats`),
  quality: (id) => request(`/datasets/${id}/quality`),
  outliers: (id, column) => request(`/datasets/${id}/outliers`, { params: { column } }),
};
