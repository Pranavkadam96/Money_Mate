const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE = rawApiUrl ? `${rawApiUrl.replace(/\/$/, '')}/api` : '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('moneymate_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
      localStorage.removeItem('moneymate_token');
      window.dispatchEvent(new Event('moneymate:unauthorized'));
    }
    const error = new Error(data.message || 'Something went wrong. Please try again.');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

function toQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  });
  const str = sp.toString();
  return str ? `?${str}` : '';
}

export const api = {
  auth: {
    register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    forgotPassword: (payload) =>
      request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
    resetPassword: (payload) =>
      request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
    me: () => request('/auth/me'),
    updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    changePassword: (payload) =>
      request('/auth/change-password', { method: 'PUT', body: JSON.stringify(payload) }),
  },
  transactions: {
    list: (params) => request(`/transactions${toQuery(params)}`),
    create: (payload) => request('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  },
  budgets: {
    get: (params) => request(`/budgets${toQuery(params)}`),
    save: (payload) => request('/budgets', { method: 'PUT', body: JSON.stringify(payload) }),
    remove: (id) => request(`/budgets/${id}`, { method: 'DELETE' }),
  },
  goals: {
    list: () => request('/goals'),
    create: (payload) => request('/goals', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    contribute: (id, payload) =>
      request(`/goals/${id}/contribute`, { method: 'POST', body: JSON.stringify(payload) }),
    remove: (id) => request(`/goals/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    dashboard: (params) => request(`/analytics/dashboard${toQuery(params)}`),
    reports: (params) => request(`/analytics/reports${toQuery(params)}`),
  },
  recurring: {
    list: () => request('/recurring'),
    create: (payload) => request('/recurring', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id, payload) => request(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    process: () => request('/recurring/process', { method: 'POST' }),
    remove: (id) => request(`/recurring/${id}`, { method: 'DELETE' }),
  },
  notifications: {
    list: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
    remove: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },
};
