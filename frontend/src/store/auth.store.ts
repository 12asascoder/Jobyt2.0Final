'use client';

import { create } from 'zustand';
import { AuthUser } from '@/types';
import { authStorage, decodeToken } from '@/lib/auth';
import { api, tokenStore } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: AuthUser | null) => void;
  setTokens: (accessToken: string | null, refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  logoutWithApi: () => Promise<void>;
  initialize: () => Promise<void>;
}

type AuthMePayload = {
  id: string;
  email: string | null;
  role: AuthUser['role'];
  email_verified?: boolean;
};

const isAuthMePayload = (value: unknown): value is AuthMePayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AuthMePayload>;
  const hasValidEmail = candidate.email === null || typeof candidate.email === 'string';

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.role === 'string' &&
    hasValidEmail
  );
};

const extractAuthUser = (payload: unknown): AuthUser | null => {
  // Supports both: { data: { user } } and { user } backend shapes.
  const wrapped = payload as { data?: { user?: unknown }; user?: unknown };
  const candidate = wrapped?.data?.user ?? wrapped?.user;
  if (!isAuthMePayload(candidate)) return null;

  return {
    id: candidate.id,
    email: candidate.email,
    role: candidate.role,
    email_verified: candidate.email_verified,
  };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: true,
  isLoading: false,
  isAuthenticated: false,

  setUser: (user) => {
    set({ user, isAuthenticated: Boolean(user) });
  },

  setTokens: (accessToken, refreshToken) => {
    tokenStore.set(accessToken);
    set({ accessToken, refreshToken });
  },

  setLoading: (loading) => {
    set({ loading });
  },

  setSession: (accessToken, refreshToken, user) => {
    authStorage.saveTokens({ accessToken, refreshToken });
    tokenStore.set(accessToken);
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  initialize: async () => {
    const { setUser, setTokens, logout, setLoading } = useAuthStore.getState();
    setLoading(true);

    try {
      const accessToken = authStorage.getAccessToken();
      const refreshToken = authStorage.getRefreshToken();

      if (!accessToken) {
        setTokens(null, refreshToken);
        setUser(null);
        return;
      }

      setTokens(accessToken, refreshToken);

      const fallbackUser = decodeToken(accessToken);
      if (fallbackUser) {
        setUser({
          id: fallbackUser.id,
          email: fallbackUser.email ?? null,
          role: fallbackUser.role,
          email_verified: fallbackUser.email_verified,
        });
      }

      const res = await api.get<{ user: AuthUser }>('/auth/me');
      const hydratedUser = extractAuthUser(res);

      if (!hydratedUser) {
        throw new Error('Invalid /auth/me response');
      }

      setUser(hydratedUser);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/login',
        { email, password }
      );
      authStorage.saveTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      tokenStore.set(res.data.accessToken);
      set({
        user: res.data.user,
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        isAuthenticated: true,
      });
      return res.data.user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    authStorage.clearTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  logoutWithApi: async () => {
    const refreshToken = authStorage.getRefreshToken();

    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Local logout should still proceed if API logout fails.
    } finally {
      useAuthStore.getState().logout();
    }
  },
}));
