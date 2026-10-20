// Single place where the app talks to the REST API.
// - adds the JWT token to every request
// - turns API errors into a JavaScript Error with a readable message
const TOKEN_KEY = 'energyinsight_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || [];
  }
}

export async function request(path, { method = 'GET', body, params } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // the browser sets the multipart Content-Type itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let url = `/api${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      qs.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
    });
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  let res;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Session expired: forget the token, the AuthContext will redirect to login.
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    throw new ApiError(res.status, data.error?.message || 'Something went wrong', data.error?.details);
  }
  return data;
}
