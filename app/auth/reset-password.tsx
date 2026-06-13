import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Header } from '@/components/ui/Header';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { getSupabase } from '@/lib/supabase';
import { useLocale } from '@/hooks/useLocale';

export default function ResetPassword() {
  const router = useRouter();
  const { t, lang } = useLocale();
  const params = useLocalSearchParams<{ email?: string }>();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState(params.email ?? '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setStep(2);
    } catch (e: any) {
      Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', e?.message ?? '');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const { error } = await getSupabase().auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: 'recovery',
      });
      if (error) throw error;
      setStep(3);
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
      <Header title={lang === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password'} showBack />
      
      <View className="mt-4">
        {step === 1 && (
          <>
            <Text className="mb-4 text-slate-500 dark:text-slate-400">
              {lang === 'ar' 
                ? 'أدخل بريدك الإلكتروني وسنرسل لك رمزاً مكوناً من 6 أرقام لإعادة تعيين كلمة المرور.'
                : 'Enter your email and we will send you a 6-digit code to reset your password.'}
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
              title={lang === 'ar' ? 'إرسال الرمز' : 'Send Code'}
              loading={loading}
              onPress={handleSendOtp}
            />
          </>
        )}

        {step === 2 && (
          <>
            <Text className="mb-4 text-slate-500 dark:text-slate-400">
              {lang === 'ar' 
                ? `لقد أرسلنا رمزاً إلى ${email}. الرجاء إدخاله أدناه.`
                : `We sent a code to ${email}. Please enter it below.`}
            </Text>
            <Input
              label={lang === 'ar' ? 'رمز التحقق (OTP)' : 'Verification Code (OTP)'}
              placeholder="123456"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
            <Button
              title={lang === 'ar' ? 'تحقق' : 'Verify'}
              loading={loading}
              onPress={handleVerifyOtp}
            />
            <Button
              title={lang === 'ar' ? 'تعديل الإيميل' : 'Change Email'}
              variant="outline"
              className="mt-3"
              onPress={() => setStep(1)}
              disabled={loading}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Text className="mb-4 text-slate-500 dark:text-slate-400">
              {lang === 'ar' 
                ? 'تم التحقق بنجاح! أدخل كلمة المرور الجديدة الخاصة بك الآن.'
                : 'Verified successfully! Enter your new password now.'}
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
