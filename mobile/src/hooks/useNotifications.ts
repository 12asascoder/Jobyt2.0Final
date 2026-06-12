import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationService } from '../services/notification.service';
import { useAuthStore } from '../store/auth.store';

// Configure notification presentation when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const user = useAuthStore((state) => state.user);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && user) {
      registerForPushNotificationsAsync()
        .then(async (token) => {
          if (token) {
            setExpoPushToken(token);
            try {
              // 1. Send token to backend
              await notificationService.registerDeviceToken(token);
              // 2. Enable push alerts preference in user store
              await updatePreferences({ push_alerts_enabled: true });
              console.log('[useNotifications] Device push token registered successfully:', token);
            } catch (err) {
              console.error('[useNotifications] Failed to send device token to backend:', err);
            }
          }
        })
        .catch((err) => console.error('[useNotifications] Push registration failed:', err));
    }
  }, [isAuthenticated, user?.id]);

  return {
    expoPushToken,
  };
};

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.warn('[useNotifications] Must use physical device for Push Notifications. Fallbacking to mock ExponentPushToken for local testing.');
    return 'ExponentPushToken[MockTokenForLocalTesting]';
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[useNotifications] Permission not granted for push notifications!');
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    return token;
  } catch (e) {
    console.error('[useNotifications] Error getting Expo push token:', e);
    return null;
  }
}
export default useNotifications;
