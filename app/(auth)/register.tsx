import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthProvider';
import { AuthScreen } from '@/components/AuthScreen';
import { Button, ErrorText, InfoText, Input } from '@/components/ui';
import { makeStyles, spacing, useColors } from '@/components/theme';
import { useT } from '@/lib/i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const t = useT();
  const colors = useColors();
  const styles = useStyles();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!name.trim()) return setError(t.auth.register.errName);
    if (!EMAIL_RE.test(email.trim())) return setError(t.auth.register.errEmail);
    if (password.length < 8) return setError(t.auth.register.errPassword);
    if (password !== password2) return setError(t.auth.register.errMismatch);
    if (!accepted) return setError(t.auth.register.errConsent);

    setLoading(true);
    const err = await signUp(email, password, name);
    setLoading(false);
    if (err) return setError(err);
    setInfo(t.auth.register.done);
  }

  return (
    <AuthScreen title={t.auth.register.title} subtitle={t.auth.register.subtitle}>
      <ErrorText message={error} />
      <InfoText message={info} />
      <Input label={t.auth.register.name} value={name} onChangeText={setName} autoComplete="name" placeholder={t.auth.register.namePlaceholder} />
      <Input
        label={t.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={t.auth.emailPlaceholder}
      />
      <Input
        label={t.auth.register.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Input
        label={t.auth.register.password2}
        value={password2}
        onChangeText={setPassword2}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <Pressable style={styles.checkRow} onPress={() => setAccepted(!accepted)} accessibilityRole="checkbox">
        <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
          {accepted && <Text style={{ color: colors.onPrimary, fontWeight: '800' }}>✓</Text>}
        </View>
        <Text style={styles.checkText}>{t.auth.register.consent}</Text>
      </Pressable>
      <Button title={t.auth.register.submit} onPress={onSubmit} loading={loading} disabled={!!info} />
    </AuthScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkText: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 20 },
}));
