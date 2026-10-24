import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { AuthScreen } from '@/components/AuthScreen';
import { Button, ErrorText, InfoText, Input } from '@/components/ui';
import { useT } from '@/lib/i18n';

export default function ForgotPasswordScreen() {
  const t = useT();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email) return setError(t.auth.forgot.missing);
    setError(null);
    setLoading(true);
    const err = await resetPassword(email);
    setLoading(false);
    if (err) return setError(err);
    // Same message whether or not the address exists – avoids leaking who has an account.
    setInfo(t.auth.forgot.done);
  }

  return (
    <AuthScreen title={t.auth.forgot.title} subtitle={t.auth.forgot.subtitle}>
      <ErrorText message={error} />
      <InfoText message={info} />
      <Input
        label={t.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Button title={t.auth.forgot.submit} onPress={onSubmit} loading={loading} disabled={!!info} />
    </AuthScreen>
  );
}
