import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, ScrollView, View, type ViewProps } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { cn } from '@/lib/cn';

interface Props extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
}

const TAB_BAR_HEIGHT = 60;

export function Screen({
  scroll = false,
  padded = true,
  className,
  children,
  ...rest
}: Props) {
  const Container: any = scroll ? ScrollView : View;
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['top']}>
      <StatusBar style="auto" />
      <Container
        className={cn('flex-1', padded && 'px-4 pt-2', className)}
        contentContainerStyle={
          scroll ? { paddingBottom: TAB_BAR_HEIGHT + 32, flexGrow: 1 } : undefined
        }
        keyboardShouldPersistTaps={scroll ? 'handled' : undefined}
        {...rest}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

/** Provides bottom inset (tab bar + safe area) for FlatList lists inside tabs. */
export function useTabContentBottomInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + insets.bottom + 16;
}

/** Spacer to push the last list item above the tab bar */
export function ListBottomSpacer() {
  const inset = useTabContentBottomInset();
  return <View style={{ height: inset }} />;
}
