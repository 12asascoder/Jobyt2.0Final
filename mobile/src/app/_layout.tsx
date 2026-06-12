import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/auth.store';
import { useJobsStore } from '../store/jobs.store';
import { useApplicationsStore } from '../store/applications.store';
import { useNotifications } from '../hooks/useNotifications';
import { registerReconnectHandler } from '../hooks/useNetworkStatus';
import { LockScreen } from '../components/common/LockScreen';
import { OfflineBanner } from '../components/common/OfflineBanner';
import '../global.css';

export default function RootLayout() {
  const { isAuthenticated, isLoading, initialize, biometricsEnabled } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Track if the app is currently locked by biometrics
  const [isAppLocked, setIsAppLocked] = useState(false);

  // Initialize notifications hook
  useNotifications();

  useEffect(() => {
    initialize().then(() => {
      // If user is authenticated on mount and biometrics is enabled, lock the app
      const state = useAuthStore.getState();
      if (state.isAuthenticated && state.biometricsEnabled) {
        setIsAppLocked(true);
      }
    });
  }, []);

  // Monitor AppState to lock app on resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const state = useAuthStore.getState();
      if (nextAppState === 'active' && state.isAuthenticated && state.biometricsEnabled) {
        console.log('[AppState] App fore-grounded. Locking app with biometrics...');
        setIsAppLocked(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Setup sync-on-reconnect
  useEffect(() => {
    const unsubscribe = registerReconnectHandler(async () => {
      const state = useAuthStore.getState();
      if (state.isAuthenticated) {
        console.log('[Sync] Network reconnected, refreshing cache from server...');
        // Refresh stores to sync with the server (server is source of truth)
        await Promise.all([
          state.initialize(),
          useJobsStore.getState().fetchJobs({ limit: 10 }),
          useJobsStore.getState().fetchSavedJobs(),
          useApplicationsStore.getState().fetchApplications(),
          useApplicationsStore.getState().fetchStats(),
        ]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to tabs/home if authenticated and in auth group
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  // Render the lock screen if biometrics is active and the app is currently locked
  if (isAuthenticated && biometricsEnabled && isAppLocked) {
    return (
      <>
        <StatusBar style="light" />
        <LockScreen onUnlock={() => setIsAppLocked(false)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
