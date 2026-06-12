import React, { useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useJobs } from '../../hooks/useJobs';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { User, Mail, Shield, Bookmark, Trash2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { savedJobs, fetchSavedJobs, toggleSaveJob } = useJobs();

  useEffect(() => {
    fetchSavedJobs();
  }, []);

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
      </Card>

      {/* Saved Jobs Bookmarks */}
      <Card className="mb-6 p-5">
        <Text className="text-white font-bold text-lg mb-3">Saved Jobs ({savedJobs.length})</Text>
        {savedJobs.length > 0 ? (
          <View className="space-y-3">
            {savedJobs.map((job) => (
              <View 
                key={job.id} 
                className="bg-slate-900 border border-slate-700/50 rounded-xl p-3 flex-row justify-between items-center"
              >
                <TouchableOpacity 
                  onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
                  className="flex-1 mr-3"
                >
                  <Text className="text-white font-bold text-sm truncate" numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5 truncate" numberOfLines={1}>
                    {job.company}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => toggleSaveJob(job.id)}
                  className="p-2 bg-slate-800 rounded-lg border border-slate-700/50"
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

