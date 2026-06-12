import React from 'react';
import { View, Text, ViewProps } from 'react-native';

interface BadgeProps extends ViewProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  className = '',
  ...props
}) => {
  let badgeStyle = 'px-2.5 py-1 rounded-full self-start ';
  let textStyle = 'text-xs font-semibold ';

  if (variant === 'primary') {
    badgeStyle += 'bg-indigo-900/40 border border-indigo-700/50 ';
    textStyle += 'text-indigo-300 ';
  } else if (variant === 'secondary') {
    badgeStyle += 'bg-slate-700/40 border border-slate-600/50 ';
    textStyle += 'text-slate-300 ';
  } else if (variant === 'success') {
    badgeStyle += 'bg-emerald-900/40 border border-emerald-700/50 ';
    textStyle += 'text-emerald-300 ';
  } else if (variant === 'warning') {
    badgeStyle += 'bg-amber-900/40 border border-amber-700/50 ';
    textStyle += 'text-amber-300 ';
  } else if (variant === 'danger') {
    badgeStyle += 'bg-red-900/40 border border-red-700/50 ';
    textStyle += 'text-red-300 ';
  } else if (variant === 'info') {
    badgeStyle += 'bg-teal-900/40 border border-teal-700/50 ';
    textStyle += 'text-teal-300 ';
  }

  return (
    <View className={`${badgeStyle} ${className}`} {...props}>
      <Text className={textStyle}>{label}</Text>
    </View>
  );
};

export default Badge;
