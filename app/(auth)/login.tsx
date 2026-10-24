import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthProvider';
import { AuthScreen } from '@/components/AuthScreen';
import { Button, ErrorText, Input } from '@/components/ui';
import { makeStyles, spacing, useColors } from '@/components/theme';
import { useT } from '@/lib/i18n';

export default function LoginScreen() {
  const t = useT();
  const styles = useStyles();
  const colors = useColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email || !password) return setError(t.auth.login.missing);
    setError(null);
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) setError(err);
    // On success the AuthGate redirects automatically.
  }

  return (
    <AuthScreen showBrand title={t.auth.login.title} subtitle={t.auth.login.subtitle}>
      <ErrorText message={error} />
      <Input
        label={t.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        placeholder={t.auth.emailPlaceholder}
      />
      <Input
        label={t.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        placeholder="••••••••"
        onSubmitEditing={onSubmit}
      />
      <Link href="/forgot-password" asChild>
        <Pressable style={{ alignSelf: 'flex-end', marginBottom: spacing.md }}>
          <Text style={styles.link}>{t.auth.login.forgot}</Text>
        </Pressable>
      </Link>
      <Button title={t.auth.login.submit} onPress={onSubmit} loading={loading} />
      <View style={styles.footer}>
        <Text style={{ color: colors.muted }}>{t.auth.login.noAccount}</Text>
        <Link href="/register" asChild>
          <Pressable>
            <Text style={styles.link}>{t.auth.login.register}</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  link: { color: colors.primary, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
}));
