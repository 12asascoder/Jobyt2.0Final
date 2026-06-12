import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function IndexPage() {
  return (
    <View className="flex-1 bg-slate-900 justify-center items-center">
      <Text className="text-white text-3xl font-bold mb-4 tracking-wider">Jobyt</Text>
      <ActivityIndicator size="small" color="#6366f1" />
    </View>
  );
}
