import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email, password });
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Standard mock / stub for Google Login since it requires client credentials
    setGoogleLoading(true);
    try {
      // For testing, we can exchange a dummy token or simulate a success if dev
      // In production, we'd trigger expo-auth-session to request an idToken
      Alert.alert('Google Sign In', 'OAuth session initialized...');
      // Simulated successful OAuth flow for local dev verification
      // await googleLogin('dummy-id-token');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="bg-slate-900 px-6 py-12">
      <View className="mb-8">
        <Text className="text-white text-4xl font-extrabold tracking-tight mb-2">Welcome Back</Text>
        <Text className="text-slate-400 text-lg">Sign in to search and apply for jobs with Jobyt</Text>
      </View>

      <View className="space-y-4">
        <Input
          label="Email Address"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
        />

        <Input
          label="Password"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <TouchableOpacity 
          onPress={() => router.push('/(auth)/forgot-password')}
          className="align-self-end py-1"
        >
          <Text className="text-indigo-400 text-sm font-semibold text-right">Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          label="Sign In"
          variant="primary"
          size="lg"
          loading={loading}
          onPress={handleLogin}
          className="mt-4"
        />

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-slate-800" />
          <Text className="text-slate-500 px-4 text-sm font-medium">OR</Text>
          <View className="flex-1 h-px bg-slate-800" />
        </View>

        <Button
          label="Continue with Google"
          variant="outline"
          size="lg"
          loading={googleLoading}
          onPress={handleGoogleLogin}
          className="mb-4"
        />
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-slate-400 text-sm">Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text className="text-indigo-400 text-sm font-bold">Sign Up</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
