import { request } from './client';

export const authApi = {
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', body: data }),
  changePassword: (data) => request('/auth/me/password', { method: 'PUT', body: data }),
};
