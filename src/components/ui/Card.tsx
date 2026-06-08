import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-2xl bg-white p-4 shadow-sm',
        'dark:bg-slate-800',
        'border border-slate-200/60 dark:border-slate-700/60',
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
