import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User } from '../api/types';
import { setAccessToken, clearAccessToken } from './token-store';
import {
  getMeApi,
  loginApi,
  logoutAllApi,
  logoutApi,
  refreshApi,
  registerApi,
} from '../api/auth';
import { isApiError } from '../api/errors';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUserDirectly: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const initialized = useRef(false);

  const getSafeRedirect = useCallback(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next');
      if (next && next.startsWith('/app')) {
        return next;
      }
    } catch {
      // ignore
    }
    return '/app';
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function initSession() {
      try {
        const res = await refreshApi();
        setAccessToken(res.accessToken);
        setUser(res.user);
        setStatus('authenticated');
      } catch {
        clearAccessToken();
        setUser(null);
        setStatus('anonymous');
      }
    }

    initSession();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await loginApi({ email, password });
      setAccessToken(res.accessToken);
      setUser(res.user);
      setStatus('authenticated');
      queryClient.clear();
      window.location.assign(getSafeRedirect());
    },
    [getSafeRedirect, queryClient]
  );

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      const res = await registerApi(input);
      setAccessToken(res.accessToken);
      setUser(res.user);
      setStatus('authenticated');
      queryClient.clear();
      window.location.assign(getSafeRedirect());
    },
    [getSafeRedirect, queryClient]
  );

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      clearAccessToken();
      queryClient.clear();
      setUser(null);
      setStatus('anonymous');
      window.location.assign('/login');
    }
  }, [queryClient]);

  const logoutAll = useCallback(async () => {
    try {
      await logoutAllApi();
    } catch {
      // ignore
    } finally {
      clearAccessToken();
      queryClient.clear();
      setUser(null);
      setStatus('anonymous');
      window.location.assign('/login');
    }
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const updated = await getMeApi();
      setUser(updated);
    } catch (err) {
      if (isApiError(err) && err.code === 'UNAUTHENTICATED') {
        setStatus('anonymous');
        setUser(null);
      }
    }
  }, []);

  const setUserDirectly = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg">
        <div className="flex items-center text-[22px] font-[650] tracking-[-0.02em] font-display text-ink">
          <span>kolo</span>
          <span className="ml-1 inline-block h-[6px] w-[6px] rounded-full bg-accent" />
        </div>
        <div className="mt-4 h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        register,
        logout,
        logoutAll,
        refreshUser,
        setUserDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
