import { request } from './client';

export const adminApi = {
  stats: () => request('/admin/stats'),
  users: (search) => request('/admin/users', { params: { search } }),
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  datasets: () => request('/admin/datasets'),
  activity: (params) => request('/admin/activity', { params }),
};
