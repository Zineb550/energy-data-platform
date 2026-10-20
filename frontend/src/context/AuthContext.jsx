// Keeps the logged-in user available to every component: const { user } = useAuth();
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import { tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load: if a token is saved, ask the API who it belongs to.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  // The API client fires this event when the token is rejected.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const saveSession = ({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
    return user;
  };

  const login = useCallback(async (credentials) => saveSession(await authApi.login(credentials)), []);
  const register = useCallback(async (data) => saveSession(await authApi.register(data)), []);
  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
