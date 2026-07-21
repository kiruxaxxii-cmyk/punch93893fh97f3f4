'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getToken, setToken, clearToken, getProfile } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTokenState(null);
      setLoading(false);
      return null;
    }
    setTokenState(t);
    try {
      const profile = await getProfile();
      setUser(profile);
      return profile;
    } catch {
      clearToken();
      setUser(null);
      setTokenState(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((newToken, newUser) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setTokenState(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
