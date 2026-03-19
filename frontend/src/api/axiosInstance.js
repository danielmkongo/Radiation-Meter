import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → clear session
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rm_token');
      localStorage.removeItem('rm_user');
      // Let auth context handle the redirect
      window.dispatchEvent(new Event('rm:unauthorized'));
    }
    return Promise.reject(err);
  }
);

export default api;
