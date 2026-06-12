import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { authStorage } from '../lib/auth';
import { User, UserPreferences } from '../types';
import { disconnectSocket } from '../lib/socket';

interface AuthState {
  user: User | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  initialize: () => Promise<void>;
  login: (payload: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Listen for the interceptor unauthorized event to clean up store state
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:unauthorized', () => {
      set({ user: null, isAuthenticated: false, preferences: null, error: 'Session expired' });
      disconnectSocket();
    });
  }

  return {
    user: null,
    preferences: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    initialize: async () => {
      set({ isLoading: true, error: null });
      try {
        const accessToken = await authStorage.getAccessToken();
        if (accessToken) {
          const [meRes, prefRes] = await Promise.all([
            authService.getMe(),
            authService.getPreferences(),
          ]);
          set({
            user: meRes.data,
            preferences: prefRes.data,
            isAuthenticated: true,
          });
        }
      } catch (err: any) {
        console.error('Auth initialization failed', err);
        await authStorage.clearTokens();
        disconnectSocket();
        set({ user: null, isAuthenticated: false, preferences: null });
      } finally {
        set({ isLoading: false });
      }
    },

    login: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.login(payload);
        await authStorage.setTokens(res.accessToken, res.refreshToken);
        const prefRes = await authService.getPreferences();
        set({
          user: res.user,
          preferences: prefRes.data,
          isAuthenticated: true,
        });
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Login failed';
        set({ error: msg });
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    register: async (payload) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.register(payload);
        await authStorage.setTokens(res.accessToken, res.refreshToken);
        const prefRes = await authService.getPreferences();
        set({
          user: res.user,
          preferences: prefRes.data,
          isAuthenticated: true,
        });
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Registration failed';
        set({ error: msg });
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    googleLogin: async (idToken) => {
      set({ isLoading: true, error: null });
      try {
        const res = await authService.googleLogin(idToken);
        await authStorage.setTokens(res.accessToken, res.refreshToken);
        const prefRes = await authService.getPreferences();
        set({
          user: res.user,
          preferences: prefRes.data,
          isAuthenticated: true,
        });
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Google login failed';
        set({ error: msg });
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        const refreshToken = await authStorage.getRefreshToken();
        if (refreshToken) {
          await authService.logout(refreshToken);
        }
      } catch (err) {
        console.error('Logout request failed', err);
      } finally {
        await authStorage.clearTokens();
        disconnectSocket();
        set({
          user: null,
          preferences: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    },

    updatePreferences: async (prefs) => {
      try {
        const res = await authService.updatePreferences(prefs);
        set({ preferences: res.data });
      } catch (err: any) {
        console.error('Failed to update preferences', err);
        throw err;
      }
    },
  };
});
