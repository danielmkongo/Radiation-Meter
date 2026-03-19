import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('rm_user')); } catch { return null; }
  });
  const [token, setToken]     = useState(() => localStorage.getItem('rm_token'));
  const [loading, setLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    if (token) {
      authApi.me()
        .then((res) => { setUser(res.data.data); setLoading(false); })
        .catch(() => { clearSession(); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  // Listen for 401 events from axios interceptor
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener('rm:unauthorized', handler);
    return () => window.removeEventListener('rm:unauthorized', handler);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token: t, user: u } = res.data.data;
    localStorage.setItem('rm_token', t);
    localStorage.setItem('rm_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    clearSession();
  }, []);

  function clearSession() {
    localStorage.removeItem('rm_token');
    localStorage.removeItem('rm_user');
    setToken(null);
    setUser(null);
  }

  const isAuthenticated = !!token && !!user;
  const hasRole = (...roles) => roles.includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, hasRole, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
