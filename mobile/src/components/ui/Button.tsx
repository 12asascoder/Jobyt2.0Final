import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { COLORS } from '../../constants';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  let btnStyle = 'rounded-xl flex-row justify-center items-center ';
  let textStyle = 'font-semibold text-center ';

  if (variant === 'primary') {
    btnStyle += 'bg-indigo-600 ';
    textStyle += 'text-white ';
  } else if (variant === 'secondary') {
    btnStyle += 'bg-teal-600 ';
    textStyle += 'text-white ';
  } else if (variant === 'outline') {
    btnStyle += 'border border-slate-700 bg-transparent ';
    textStyle += 'text-slate-200 ';
  } else if (variant === 'ghost') {
    btnStyle += 'bg-transparent ';
    textStyle += 'text-slate-400 ';
  } else if (variant === 'danger') {
    btnStyle += 'bg-red-600 ';
    textStyle += 'text-white ';
  }

  if (size === 'sm') {
    btnStyle += 'px-3 py-2 ';
    textStyle += 'text-xs ';
  } else if (size === 'md') {
    btnStyle += 'px-5 py-3 ';
    textStyle += 'text-sm ';
  } else if (size === 'lg') {
    btnStyle += 'px-6 py-4 ';
    textStyle += 'text-base ';
  }

  if (disabled || loading) {
    btnStyle += 'opacity-50 ';
  }

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`${btnStyle} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : '#ffffff'}
          className="mr-2"
        />
      ) : null}
      <Text className={textStyle}>{label}</Text>
    </TouchableOpacity>
  );
};
export default Button;
