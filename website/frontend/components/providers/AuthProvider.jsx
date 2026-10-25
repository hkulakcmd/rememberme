'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import * as api from '@/lib/api';
import { AUTH_STATUS } from '@/lib/auth';
import { removePushSubscriptionBeforeLogout } from '@/lib/push';

const AuthContext = createContext(null);

// Deduplicate the bootstrap call between React StrictMode mounts.
let bootstrapPromise = null;

function bootstrapSession() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const token = await api.refreshAccessToken();
      if (!token) {
        throw new api.ApiError('Sesja wygasła.', {
          status: 401,
          code: 'token_invalid',
        });
      }
      return api.fetchMe();
    })().finally(() => {
      bootstrapPromise = null;
    });
  }
  return bootstrapPromise;
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(AUTH_STATUS.loading);

  const clearSession = useCallback(() => {
    api.setAccessToken(null);
    setUser(null);
    setStatus(AUTH_STATUS.anonymous);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  useEffect(() => {
    let active = true;

    bootstrapSession()
      .then((me) => {
        if (!active) return;
        setUser(me);
        setStatus(AUTH_STATUS.authenticated);
      })
      .catch(() => {
        if (!active) return;
        clearSession();
      });

    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      clearSession();

      const current =
        typeof window === 'undefined'
          ? '/dashboard'
          : `${window.location.pathname}${window.location.search}`;
      const next = current.startsWith('/login') ? '/dashboard' : current;
      router.replace(
        `/login?reason=session&next=${encodeURIComponent(next)}`
      );
    });

    return () => api.setUnauthorizedHandler(null);
  }, [clearSession, router]);

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    setUser(data.user);
    setStatus(AUTH_STATUS.authenticated);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const created = await api.register(payload);
    const me = created || (await api.fetchMe());
    setUser(me);
    setStatus(AUTH_STATUS.authenticated);
    return me;
  }, []);

  const loginWithSocial = useCallback(async (provider, payload) => {
    const data = await api.socialLogin(provider, payload);
    setUser(data.user);
    setStatus(AUTH_STATUS.authenticated);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await removePushSubscriptionBeforeLogout();
    try {
      await api.logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === AUTH_STATUS.authenticated,
      login,
      register,
      loginWithSocial,
      logout,
      clearSession,
      updateUser,
    }),
    [
      user,
      status,
      login,
      register,
      loginWithSocial,
      logout,
      clearSession,
      updateUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
