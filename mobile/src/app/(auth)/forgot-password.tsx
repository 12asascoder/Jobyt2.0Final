import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/auth.service';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      Alert.alert('Success', 'Password reset instructions have been sent to your email.');
      router.push('/(auth)/login');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Password reset request failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="bg-slate-900 px-6 py-12 justify-center">
      <View className="mb-8">
        <Text className="text-white text-4xl font-extrabold tracking-tight mb-2">Reset Password</Text>
        <Text className="text-slate-400 text-lg">Enter your email and we'll send reset instructions</Text>
      </View>

      <View className="space-y-4">
        <Input
          label="Email Address"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          error={error}
        />

        <Button
          label="Send Reset Link"
          variant="primary"
          size="lg"
          loading={loading}
          onPress={handleReset}
          className="mt-4"
        />
      </View>

      <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="mt-8">
        <Text className="text-indigo-400 text-sm font-semibold text-center">Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
