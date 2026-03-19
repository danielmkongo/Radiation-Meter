import api from './axiosInstance';

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login:          (credentials) => api.post('/auth/login', credentials),
  me:             ()            => api.get('/auth/me'),
  logout:         ()            => api.post('/auth/logout'),
  changePassword: (data)        => api.post('/auth/change-password', data),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  get:       ()       => api.get('/dashboard'),
  chartData: (params) => api.get('/dashboard/chart', { params }),
};

// ─── Exposure ────────────────────────────────────────────────────────────────
export const exposureApi = {
  list:      (params)       => api.get('/exposure', { params }),
  get:       (id)           => api.get(`/exposure/${id}`),
  summary:   (cardNumber)   => api.get(`/exposure/summary/${cardNumber}`),
  delete:    (id)           => api.delete(`/exposure/${id}`),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const alertsApi = {
  list:         (params) => api.get('/alerts', { params }),
  get:          (id)     => api.get(`/alerts/${id}`),
  acknowledge:  (id)     => api.patch(`/alerts/${id}/acknowledge`),
  unreadCount:  ()       => api.get('/alerts/unread-count'),
};

// ─── Devices ─────────────────────────────────────────────────────────────────
export const devicesApi = {
  list:           (params) => api.get('/devices', { params }),
  get:            (id)     => api.get(`/devices/${id}`),
  getUsers:       (id)     => api.get(`/devices/${id}/users`),
  create:         (data)   => api.post('/devices', data),
  update:         (id, d)  => api.put(`/devices/${id}`, d),
  regenerateKey:  (id)     => api.post(`/devices/${id}/regenerate-key`),
  delete:         (id)     => api.delete(`/devices/${id}`),
};

// ─── Hospitals ───────────────────────────────────────────────────────────────
export const hospitalsApi = {
  list:    ()     => api.get('/hospitals'),
  details: (name) => api.get(`/hospitals/${encodeURIComponent(name)}/details`),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersApi = {
  list:   (params) => api.get('/users', { params }),
  get:    (id)     => api.get(`/users/${id}`),
  create: (data)   => api.post('/users', data),
  update: (id, d)  => api.put(`/users/${id}`, d),
  delete: (id)     => api.delete(`/users/${id}`),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  exposureCsv:   (params) => api.get('/reports/exposure',   { params, responseType: 'blob' }),
  complianceCsv: ()       => api.get('/reports/compliance', { responseType: 'blob' }),
};

// ─── Audit ───────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params) => api.get('/audit', { params }),
};

// ─── Helper ──────────────────────────────────────────────────────────────────
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
