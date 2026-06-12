import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { authStorage } from '../lib/auth';
import { User, UserPreferences } from '../types';
import { disconnectSocket } from '../lib/socket';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  user: User | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricsEnabled: boolean;
  
  initialize: () => Promise<void>;
  login: (payload: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
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
    biometricsEnabled: false,

    initialize: async () => {
      set({ isLoading: true, error: null });
      try {
        // Load biometrics preferences
        const biometricsVal = await AsyncStorage.getItem('jobyt_biometrics_enabled');
        set({ biometricsEnabled: biometricsVal === 'true' });

        const accessToken = await authStorage.getAccessToken();
        if (accessToken) {
          try {
            const [meRes, prefRes] = await Promise.all([
              authService.getMe(),
              authService.getPreferences(),
            ]);

            // Cache successfully retrieved details
            await AsyncStorage.setItem('jobyt_cached_user', JSON.stringify(meRes.data));
            await AsyncStorage.setItem('jobyt_cached_preferences', JSON.stringify(prefRes.data));

            set({
              user: meRes.data,
              preferences: prefRes.data,
              isAuthenticated: true,
            });
          } catch (netErr) {
            console.warn('Network auth init failed, trying local offline cache...', netErr);
            const cachedUser = await AsyncStorage.getItem('jobyt_cached_user');
            const cachedPrefs = await AsyncStorage.getItem('jobyt_cached_preferences');

            if (cachedUser && cachedPrefs) {
              set({
                user: JSON.parse(cachedUser),
                preferences: JSON.parse(cachedPrefs),
                isAuthenticated: true,
              });
            } else {
              throw netErr;
            }
          }
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

        await AsyncStorage.setItem('jobyt_cached_user', JSON.stringify(res.user));
        await AsyncStorage.setItem('jobyt_cached_preferences', JSON.stringify(prefRes.data));

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

        await AsyncStorage.setItem('jobyt_cached_user', JSON.stringify(res.user));
        await AsyncStorage.setItem('jobyt_cached_preferences', JSON.stringify(prefRes.data));

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

        await AsyncStorage.setItem('jobyt_cached_user', JSON.stringify(res.user));
        await AsyncStorage.setItem('jobyt_cached_preferences', JSON.stringify(prefRes.data));

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

        // Clear offline caches
        await AsyncStorage.multiRemove([
          'jobyt_cached_user',
          'jobyt_cached_preferences',
          'jobyt_cached_jobs',
          'jobyt_cached_saved_jobs',
          'jobyt_cached_applications',
          'jobyt_cached_stats',
        ]);

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
        await AsyncStorage.setItem('jobyt_cached_preferences', JSON.stringify(res.data));
        set({ preferences: res.data });
      } catch (err: any) {
        console.error('Failed to update preferences', err);
        throw err;
      }
    },

    setBiometricsEnabled: async (enabled: boolean) => {
      await AsyncStorage.setItem('jobyt_biometrics_enabled', enabled ? 'true' : 'false');
      set({ biometricsEnabled: enabled });
    },
  };
});
export default useAuthStore;
