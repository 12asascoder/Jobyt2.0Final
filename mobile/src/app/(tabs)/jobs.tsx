import React from 'react';
import { View, Text } from 'react-native';

export default function JobsTab() {
  return (
    <View className="flex-1 bg-slate-900 justify-center items-center p-5">
      <Text className="text-white text-2xl font-bold mb-2">Job Search</Text>
      <Text className="text-slate-400 text-center text-sm">
        Browse and discover high-paying jobs customized to your matching profile. Available in Phase 2.
      </Text>
    </View>
  );
}
