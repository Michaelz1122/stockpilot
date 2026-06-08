import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/state/auth';
import { useLocale } from '@/hooks/useLocale';

export default function SignIn() {
  const router = useRouter();
  const { t } = useLocale();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (isSignUp) await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
      router.replace('/');
    } catch (e: any) {
      Alert.alert(t('auth.failed'), e?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View className="mt-8 items-center">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-600">
          <Ionicons name="cube" size={36} color="#fff" />
        </View>
        <Text className="mt-4 text-3xl font-bold text-slate-900 dark:text-slate-50">
          {t('app.name')}
        </Text>
        <Text className="mt-2 text-center text-slate-500">{t('app.tagline')}</Text>
      </View>

      <View className="mt-8">
        <Input
          label={t('auth.email')}
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Input
          label={t('auth.password')}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Button
          title={isSignUp ? t('auth.signUp') : t('auth.signIn')}
          loading={loading}
          onPress={submit}
        />
        <Pressable onPress={() => setIsSignUp((v) => !v)} className="mt-4">
          <Text className="text-center text-brand-700 dark:text-brand-300">
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
