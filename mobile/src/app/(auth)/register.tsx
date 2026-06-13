import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Role } from '../../constants';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.APPLICANT);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(password)) newErrors.password = 'Password must contain an uppercase letter';
    else if (!/[0-9]/.test(password)) newErrors.password = 'Password must contain a number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({ name, email, password, role });
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} className="bg-slate-900 px-6 py-12">
      <View className="mb-8">
        <Text className="text-white text-4xl font-extrabold tracking-tight mb-2">Create Account</Text>
        <Text className="text-slate-400 text-lg">Join Jobyt and boost your career search</Text>
      </View>

      <View className="space-y-4">
        <Input
          label="Full Name"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

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

        <View className="mb-6">
          <Text className="text-slate-300 text-sm font-semibold mb-3">Join as a:</Text>
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={() => setRole(Role.APPLICANT)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                role === Role.APPLICANT
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <Text className={`font-semibold ${role === Role.APPLICANT ? 'text-indigo-300' : 'text-slate-400'}`}>
                Applicant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole(Role.RECRUITER)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                role === Role.RECRUITER
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <Text className={`font-semibold ${role === Role.RECRUITER ? 'text-indigo-300' : 'text-slate-400'}`}>
                Recruiter
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Button
          label="Register"
          variant="primary"
          size="lg"
          loading={loading}
          onPress={handleRegister}
          className="mt-4"
        />
      </View>

      <View className="flex-row justify-center mt-8">
        <Text className="text-slate-400 text-sm">Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text className="text-indigo-400 text-sm font-bold">Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
