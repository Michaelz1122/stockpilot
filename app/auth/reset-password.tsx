import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getSupabase } from '@/lib/supabase';
import { useLocale } from '@/hooks/useLocale';

export default function ResetPassword() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const params = useLocalSearchParams<{ email?: string; access_token?: string; refresh_token?: string; recovery?: string }>();

  const [step, setStep] = useState<1 | 2>((params.access_token || params.recovery) ? 2 : 1);
  const [email, setEmail] = useState(params.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the app was opened via the email link, we extract the tokens and set the session
    if (params.access_token && params.refresh_token) {
      setStep(2);
      getSupabase().auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
    }
  }, [params.access_token, params.refresh_token]);

  const handleSendLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      // Use expo-linking to construct the correct deep link URL for this screen
      const resetUrl = Linking.createURL('/auth/reset-password');
      
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: resetUrl,
      });
      if (error) throw error;
      
      Alert.alert(
        lang === 'ar' ? 'تم الإرسال' : 'Sent',
        lang === 'ar' 
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. الرجاء التحقق من صندوق الوارد واضغط على الرابط.' 
          : 'A password reset link has been sent to your email. Please check your inbox and click the link.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', e?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) return;
    if (newPassword.length < 6) {
      Alert.alert(lang === 'ar' ? 'كلمة المرور ضعيفة' : 'Weak Password', lang === 'ar' ? 'يجب أن لا تقل كلمة المرور عن 6 أحرف' : 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      
      Alert.alert(
        lang === 'ar' ? 'تم بنجاح' : 'Success',
        lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password updated successfully!',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (e: any) {
      Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', e?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title={lang === 'ar' ? 'استعادة كلمة المرور' : 'Reset Password'} showBack />
      
      <View className="mt-4">
        {step === 1 && (
          <>
            <Text className="mb-4 text-slate-500 dark:text-slate-400">
              {lang === 'ar' 
                ? 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور الخاصة بك.'
                : 'Enter your email and we will send you a link to reset your password.'}
            </Text>
            <Input
              label={t('auth.email')}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button
              title={lang === 'ar' ? 'إرسال الرابط' : 'Send Link'}
              loading={loading}
              onPress={handleSendLink}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text className="mb-4 text-slate-500 dark:text-slate-400">
              {lang === 'ar' 
                ? 'الرجاء إدخال كلمة المرور الجديدة.'
                : 'Please enter your new password.'}
            </Text>
            <Input
              label={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              placeholder="••••••••"
              isPassword
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Button
              title={lang === 'ar' ? 'حفظ كلمة المرور' : 'Save Password'}
              loading={loading}
              onPress={handleUpdatePassword}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
