'use client';

import { create } from 'zustand';
import { AuthUser } from '@/types';
import { authStorage, decodeToken } from '@/lib/auth';
import { api } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  initialize: () => {
    const token = authStorage.getAccessToken();
    if (token) {
      const user = decodeToken(token);
      if (user) {
        set({ user, isAuthenticated: true });
      } else {
        authStorage.clearTokens();
      }
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
      set({ user: res.data.user, isAuthenticated: true });
      return res.data.user;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    authStorage.clearTokens();
    set({ user: null, isAuthenticated: false });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
}));
