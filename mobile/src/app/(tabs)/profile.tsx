import React, { useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { useAuthStore } from '../../store/auth.store';
import { notificationService } from '../../services/notification.service';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { User, Mail, Shield, Bookmark, Trash2, Bell, Fingerprint } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';

// Safely require expo-notifications to prevent load-time crash in Expo Go SDK 53+
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (err) {
  console.warn('[ProfileScreen] expo-notifications could not be loaded safely:', err);
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, preferences, updatePreferences, logout } = useAuth();
  const { savedJobs, fetchSavedJobs, toggleSaveJob } = useJobs();
  
  const biometricsEnabled = useAuthStore((state) => state.biometricsEnabled);
  const setBiometricsEnabled = useAuthStore((state) => state.setBiometricsEnabled);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const handlePushToggle = async (value: boolean) => {
    try {
      if (value) {
        if (!Notifications) {
          await updatePreferences({ push_alerts_enabled: true });
          Alert.alert('Push Notifications Activated', 'Push notifications enabled (Mock mode for emulator/Expo Go).');
          return;
        }

        // Request notifications permissions on the device
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable notifications for Jobyt in your device settings.');
          return;
        }

        // Fetch token and register on the server
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        const token = (
          await Notifications.getExpoPushTokenAsync({
            projectId,
          })
        ).data;

        await notificationService.registerDeviceToken(token);
        await updatePreferences({ push_alerts_enabled: true });
        Alert.alert('Push Notifications Enabled', 'You will now receive notification updates for job matches and application stages.');
      } else {
        await updatePreferences({ push_alerts_enabled: false });
        Alert.alert('Push Notifications Disabled', 'You will no longer receive push alerts on this device.');
      }
    } catch (err) {
      console.error('Failed to toggle push notifications preference:', err);
      Alert.alert('Settings Error', 'Failed to update push notifications preference.');
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    try {
      if (value) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            'Biometrics Not Enrolled',
            'Touch ID / Face ID / Fingerprint is not supported or has not been enrolled on this device.'
          );
          return;
        }

        // Test biometric authentication before committing preferences
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify identity to enable Biometric Unlock',
        });

        if (result.success) {
          await setBiometricsEnabled(true);
          Alert.alert('Biometrics Activated', 'Jobyt will now require biometric authentication when launched or resumed.');
        } else {
          Alert.alert('Verification Failed', 'Identity verification was unsuccessful.');
        }
      } else {
        await setBiometricsEnabled(false);
        Alert.alert('Biometrics Deactivated', 'Biometric unlock has been disabled.');
      }
    } catch (err) {
      console.error('Failed to toggle biometric setting:', err);
      Alert.alert('Settings Error', 'An error occurred configuring biometric preferences.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Retrieve and delete push token on logout if it exists
              if (Notifications) {
                const { status } = await Notifications.getPermissionsAsync();
                if (status === 'granted') {
                  const projectId =
                    Constants.expoConfig?.extra?.eas?.projectId ??
                    Constants.easConfig?.projectId;
                  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
                  await notificationService.removeDeviceToken(token);
                }
              }
            } catch (tokenErr) {
              console.warn('Could not deregister push token on server during logout', tokenErr);
            }
            try {
              await logout();
            } catch (err: any) {
              Alert.alert('Error', 'Failed to log out.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 px-5" style={{ backgroundColor: '#fcfcfc' }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Profile Header */}
      <View className="items-center my-6">
        <View className="p-5 rounded-full mb-4 border border-slate-200" style={{ backgroundColor: '#f0fdf4' }}>
          <User color="#1e293b" size={48} />
        </View>
        <Text className="text-slate-900 text-2xl font-black">{user?.name || 'User'}</Text>
        <Text className="text-slate-500 font-medium text-sm mt-1">{user?.email}</Text>
      </View>

      {/* Profile Details */}
      <Card className="mb-6 space-y-4 p-5">
        <Text className="text-slate-900 font-bold text-lg mb-2">Account Details</Text>
        
        <View className="flex-row items-center justify-between border-b border-slate-200 pb-3">
          <View className="flex-row items-center">
            <Mail color="#64748b" size={20} className="mr-3" />
            <Text className="text-slate-600 font-medium text-sm">Email</Text>
          </View>
          <Text className="text-slate-800 font-semibold text-sm">{user?.email}</Text>
        </View>

        <View className="flex-row items-center justify-between border-b border-slate-200 pb-3 pt-1">
          <View className="flex-row items-center">
            <Shield color="#64748b" size={20} className="mr-3" />
            <Text className="text-slate-600 font-medium text-sm">Role</Text>
          </View>
          <Text className="font-bold text-sm uppercase" style={{ color: '#65a30d' }}>{user?.role || 'Applicant'}</Text>
        </View>
      </Card>

      {/* Settings Options */}
      <Card className="mb-6 space-y-4 p-5">
        <Text className="text-slate-900 font-bold text-lg mb-2">Settings & Preferences</Text>

        <View className="flex-row items-center justify-between border-b border-slate-200 pb-3">
          <View className="flex-row items-center">
            <Bell color="#64748b" size={20} className="mr-3" />
            <Text className="text-slate-600 font-medium text-sm">Push Notifications</Text>
          </View>
          <Switch
            value={preferences?.push_alerts_enabled ?? false}
            onValueChange={handlePushToggle}
            trackColor={{ false: '#e2e8f0', true: '#bef264' }}
            thumbColor={preferences?.push_alerts_enabled ? '#65a30d' : '#94a3b8'}
          />
        </View>

        <View className="flex-row items-center justify-between pt-1">
          <View className="flex-row items-center">
            <Fingerprint color="#64748b" size={20} className="mr-3" />
            <Text className="text-slate-600 font-medium text-sm">Biometric Unlock</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleBiometricsToggle}
            trackColor={{ false: '#e2e8f0', true: '#bef264' }}
            thumbColor={biometricsEnabled ? '#65a30d' : '#94a3b8'}
          />
        </View>
      </Card>

      {/* Saved Jobs Bookmarks */}
      <Card className="mb-6 p-5">
        <Text className="text-slate-900 font-bold text-lg mb-3">Saved Jobs ({savedJobs.length})</Text>
        {savedJobs.length > 0 ? (
          <View className="space-y-3">
            {savedJobs.map((job) => (
              <View 
                key={job.id} 
                className="bg-white border border-slate-200 rounded-xl p-3 flex-row justify-between items-center"
              >
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
                  className="flex-1 mr-3"
                >
                  <Text className="text-slate-900 font-bold text-sm truncate" numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text className="text-slate-500 text-xs mt-0.5 truncate" numberOfLines={1}>
                    {job.company}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => toggleSaveJob(job.id)}
                  className="p-2 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <Trash2 color="#ef4444" size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-slate-400 text-sm italic">You haven't saved any jobs yet.</Text>
        )}
      </Card>

      {/* Actions */}
      <Button
        label="Sign Out"
        variant="danger"
        size="lg"
        onPress={handleLogout}
        className="mt-2"
      />
    </ScrollView>
  );
}
