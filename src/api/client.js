// HTTP client for the Night Ops Scheduler API.
// - Same-origin by default ("/api"); set VITE_API_URL when the API lives on another origin.
// - Cookies carry the session (httpOnly — JavaScript never sees the token).
// - Every request sends the client header the server requires for CSRF protection.

const configured = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '');
const base = () => (globalThis.__NOS_API__ ?? configured) + '/api';

export class ApiError extends Error {
  constructor({ status, code, message, fields }) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields || {};
  }
}

const listeners = new Set();
/** Subscribe to auth loss (401 on a call that needed a session). Returns an unsubscribe function. */
export const onAuthLost = (fn) => (listeners.add(fn), () => listeners.delete(fn));

export async function api(path, { method = 'GET', body, signal, authCheck = true } = {}) {
  let res;
  try {
    res = await fetch(base() + path, {
      method,
      credentials: 'include',
      signal,
      headers: { 'X-Requested-With': 'NightOps', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError({ status: 0, code: 'network', message: 'Cannot reach the server. Check your connection and try again.' });
  }
  if (res.status === 204) return null;
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    const e = data?.error || {};
    const err = new ApiError({
      status: res.status,
      code: e.code || (res.status >= 500 ? 'server' : 'unknown'),
      message: e.message || 'Something went wrong. Please try again.',
      fields: e.details?.fields,
    });
    if (res.status === 401 && authCheck) listeners.forEach((fn) => fn(err));
    throw err;
  }
  return data;
}

export const API = {
  config: () => api('/config', { authCheck: false }),
  me: () => api('/auth/me', { authCheck: false }),
  register: (body) => api('/auth/register', { method: 'POST', body, authCheck: false }),
  login: (body) => api('/auth/login', { method: 'POST', body, authCheck: false }),
  logout: () => api('/auth/logout', { method: 'POST', authCheck: false }),
  forgot: (email) => api('/auth/forgot-password', { method: 'POST', body: { email }, authCheck: false }),
  reset: (token, password) => api('/auth/reset-password', { method: 'POST', body: { token, password }, authCheck: false }),
  changePassword: (currentPassword, newPassword) => api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  state: () => api('/state'),
  updateMe: (body) => api('/me', { method: 'PATCH', body }),
  createProject: (body) => api('/projects', { method: 'POST', body }),
  updateProject: (id, body) => api(`/projects/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteProject: (id) => api(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  join: (code) => api('/projects/join', { method: 'POST', body: { code } }),
  invite: (id, email) => api(`/projects/${encodeURIComponent(id)}/invite`, { method: 'POST', body: { email } }),
  lookupInvite: (code) => api(`/invites/${encodeURIComponent(code)}`, { authCheck: false }),
  createTask: (body) => api('/tasks', { method: 'POST', body }),
  updateTask: (id, body) => api(`/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body }),
  deleteTask: (id) => api(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setStatus: (id, status) => api(`/tasks/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }),
  exportData: () => api('/export'),
  importData: (data) => api('/import', { method: 'POST', body: { data } }),
};
