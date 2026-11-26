import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('moneymate_theme') || 'light');

  const applyTheme = useCallback((nextTheme) => {
    const resolved = nextTheme === 'dark' ? 'dark' : 'light';
    setTheme(resolved);
    localStorage.setItem('moneymate_theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('moneymate_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.auth.me();
      setUser(data.user);
      if (data.user?.theme) {
        applyTheme(data.user.theme);
      }
    } catch {
      localStorage.removeItem('moneymate_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('moneymate:unauthorized', onUnauthorized);
    return () => window.removeEventListener('moneymate:unauthorized', onUnauthorized);
  }, []);

  const login = async (credentials) => {
    const data = await api.auth.login(credentials);
    localStorage.setItem('moneymate_token', data.token);
    setUser(data.user);
    if (data.user?.theme) applyTheme(data.user.theme);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.auth.register(payload);
    localStorage.setItem('moneymate_token', data.token);
    setUser(data.user);
    if (data.user?.theme) applyTheme(data.user.theme);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('moneymate_token');
    setUser(null);
  };

  const updateProfile = async (payload) => {
    const data = await api.auth.updateProfile(payload);
    setUser(data.user);
    if (data.user?.theme) applyTheme(data.user.theme);
    return data.user;
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (user) {
      try {
        const data = await api.auth.updateProfile({ theme: next });
        setUser(data.user);
      } catch {
        // Keep local theme applied even if offline
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        theme,
        login,
        register,
        logout,
        updateProfile,
        toggleTheme,
        refreshUser: loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
