import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface Props extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

const VARIANTS: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-brand-600 active:bg-brand-700', text: 'text-white' },
  secondary: {
    container: 'bg-secondary active:bg-accent',
    text: 'text-secondary-foreground',
  },
  ghost: { container: 'bg-transparent', text: 'text-brand-700 dark:text-brand-300' },
  danger: { container: 'bg-red-600 active:bg-red-700', text: 'text-white' },
  outline: {
    container:
      'bg-transparent border border-border active:bg-secondary',
    text: 'text-foreground',
  },
};

const SIZES: Record<Size, string> = {
  sm: 'py-2 px-3 rounded-lg',
  md: 'py-3 px-4 rounded-xl',
  lg: 'py-4 px-6 rounded-2xl',
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...rest
}: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center',
        v.container,
        SIZES[size],
        (disabled || loading) && 'opacity-50',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#64748b'} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {leftIcon}
          <Text className={cn('font-semibold text-base', v.text)}>{title}</Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}
