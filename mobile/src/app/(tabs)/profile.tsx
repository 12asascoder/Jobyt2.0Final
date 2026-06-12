import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { User, Mail, Shield, LogOut } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

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
    <ScrollView className="bg-slate-900 flex-1 px-5" contentContainerStyle={{ paddingTop: 20, paddingBottom: 40 }}>
      {/* Profile Header */}
      <View className="items-center my-6">
        <View className="bg-indigo-600/10 p-5 rounded-full mb-4 border border-indigo-500/20">
          <User color="#6366f1" size={48} />
        </View>
        <Text className="text-white text-2xl font-black">{user?.name || 'User'}</Text>
        <Text className="text-slate-400 font-medium text-sm mt-1">{user?.email}</Text>
      </View>

      {/* Profile Details */}
      <Card className="mb-6 space-y-4 p-5">
        <Text className="text-white font-bold text-lg mb-2">Account Details</Text>
        
        <View className="flex-row items-center justify-between border-b border-slate-700/50 pb-3">
          <View className="flex-row items-center">
            <Mail color="#94a3b8" size={20} className="mr-3" />
            <Text className="text-slate-300 font-medium text-sm">Email</Text>
          </View>
          <Text className="text-slate-200 font-semibold text-sm">{user?.email}</Text>
        </View>

        <View className="flex-row items-center justify-between border-b border-slate-700/50 pb-3 pt-1">
          <View className="flex-row items-center">
            <Shield color="#94a3b8" size={20} className="mr-3" />
            <Text className="text-slate-300 font-medium text-sm">Role</Text>
          </View>
          <Text className="text-indigo-400 font-bold text-sm uppercase">{user?.role || 'Applicant'}</Text>
        </View>

        {user?.phone ? (
          <View className="flex-row items-center justify-between pt-1">
            <Text className="text-slate-300 font-medium text-sm">Phone</Text>
            <Text className="text-slate-200 font-semibold text-sm">{user.phone}</Text>
          </View>
        ) : null}
      </Card>

      {/* Actions */}
      <Button
        label="Sign Out"
        variant="danger"
        size="lg"
        onPress={handleLogout}
        className="mt-4"
      />
    </ScrollView>
  );
}
