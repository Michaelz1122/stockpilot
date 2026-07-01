import { View, type ViewProps } from 'react-native';
import { cn } from '@/lib/cn';

export function Card({ className, children, ...rest }: ViewProps) {
  return (
    <View
      className={cn(
        'rounded-2xl bg-card p-4 shadow-sm',
        'border border-border',
        className,
      )}
      {...rest}
    >
      {children}
    </View>
  );
}
