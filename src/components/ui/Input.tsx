import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, Props>(function Input(
  { label, error, hint, containerClassName, className, ...rest },
  ref,
) {
  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <Text className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor="#94a3b8"
        className={cn(
          'rounded-xl border bg-white px-4 py-3 text-base text-slate-900',
          'dark:bg-slate-800 dark:text-slate-100',
          error
            ? 'border-red-500'
            : 'border-slate-200 dark:border-slate-700 focus:border-brand-500',
          className,
        )}
        {...rest}
      />
      {!!error && (
        <Text className="mt-1 text-xs text-red-500">{error}</Text>
      )}
      {!error && !!hint && (
        <Text className="mt-1 text-xs text-slate-500">{hint}</Text>
      )}
    </View>
  );
});
