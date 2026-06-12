import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <View className="mb-4 w-full">
      {label ? (
        <Text className="text-slate-300 text-sm font-semibold mb-2">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#64748b"
        className={`bg-slate-900 border ${
          error ? 'border-red-500' : 'border-slate-700'
        } rounded-xl px-4 py-3 text-slate-100 text-sm focus:border-indigo-500 ${className}`}
        {...props}
      />
      {error ? (
        <Text className="text-red-500 text-xs mt-1 font-medium">{error}</Text>
      ) : null}
    </View>
  );
};

export default Input;
