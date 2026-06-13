import { forwardRef, useState } from 'react';
import { Text, TextInput, View, Pressable, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '@/lib/cn';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, containerClassName, className, isPassword, ...rest },
  ref,
) {
  const [isSecure, setIsSecure] = useState(isPassword ?? false);
  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </Text>
      )}
      <View className="relative justify-center">
        <TextInput
          ref={ref}
          placeholderTextColor="#94a3b8"
          secureTextEntry={isSecure}
          className={cn(
            'rounded-xl border bg-white px-4 py-3 text-base text-slate-900',
            'dark:bg-slate-800 dark:text-slate-100',
            error
              ? 'border-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:border-brand-500',
            isPassword ? 'pr-12' : '',
            className,
          )}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setIsSecure(!isSecure)}
            className="absolute right-3 h-full justify-center px-2"
          >
            <Ionicons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#94a3b8"
            />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      )}
      {!error && !!hint && (
        <Text className="mt-1 text-xs text-slate-500">{hint}</Text>
      )}
    </View>
  );
});
