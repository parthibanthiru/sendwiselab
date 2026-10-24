import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button, ChoiceField, ErrorText, InfoText, Input } from '@/components/ui';
import { makeStyles, radius, spacing, ThemePreference, useTheme } from '@/components/theme';
import { useI18n, type LangPreference } from '@/lib/i18n';
import { formatDate } from '@/lib/format';

export default function ProfileScreen() {
  const styles = useStyles();
  const { colors, preference, setPreference } = useTheme();
  const { t, preference: langPreference, setPreference: setLangPreference } = useI18n();
  const L = t.profile;
  const { user, signOut, deleteAccount } = useAuth();
  const [name, setName] = useState<string>((user?.user_metadata?.full_name as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function saveName() {
    setError(null);
    setInfo(null);
    setSaving(true);
    const { error: e1 } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    // Keep the profiles table in sync (see supabase/schema.sql).
    const { error: e2 } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user!.id);
    setSaving(false);
    if (e1 || e2) setError((e1 ?? e2)!.message);
    else setInfo(L.saved);
  }

  function confirmDelete() {
    Alert.alert(L.deleteTitle, L.deleteText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: L.deleteConfirm,
        style: 'destructive',
        onPress: async () => {
          const err = await deleteAccount();
          if (err) setError(err);
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.card}>
        <Text style={styles.label}>{L.signedInAs}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.meta}>{L.memberSince(user?.created_at ? formatDate(user.created_at) : '–')}</Text>
      </View>

      <ErrorText message={error} />
      <InfoText message={info} />

      <Input label={L.name} value={name} onChangeText={setName} />
      <Button title={L.save} onPress={saveName} loading={saving} />

      <View style={{ height: spacing.lg }} />
      <ChoiceField<ThemePreference>
        label={L.appearance}
        value={preference}
        onChange={setPreference}
        options={[
          { value: 'system', label: L.themeSystem },
          { value: 'light', label: L.themeLight },
          { value: 'dark', label: L.themeDark },
        ]}
      />
      {/* Language names stay in their own language, so they can always be found */}
      <ChoiceField<LangPreference>
        label={L.language}
        value={langPreference}
        onChange={setLangPreference}
        options={[
          { value: 'system', label: L.langSystem },
          { value: 'de', label: 'Deutsch' },
          { value: 'en', label: 'English' },
        ]}
      />

      <View style={{ height: spacing.md }} />
      <Button title={L.signOut} variant="secondary" onPress={signOut} />
      <Button title={L.deleteAccount} variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.muted, fontSize: 13 },
  email: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 2 },
  meta: { color: colors.muted, fontSize: 13, marginTop: spacing.sm },
}));
