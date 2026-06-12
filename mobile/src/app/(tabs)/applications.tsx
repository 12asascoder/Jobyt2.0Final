import React from 'react';
import { View, Text } from 'react-native';

export default function ApplicationsTab() {
  return (
    <View className="flex-1 bg-slate-900 justify-center items-center p-5">
      <Text className="text-white text-2xl font-bold mb-2">My Applications</Text>
      <Text className="text-slate-400 text-center text-sm">
        Track your applied status, interviews, and progress timeline. Available in Phase 2.
      </Text>
    </View>
  );
}
