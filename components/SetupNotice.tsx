import { Text } from 'react-native';
import { AuthScreen } from './AuthScreen';
import { makeStyles, spacing } from './theme';
import { useT } from '@/lib/i18n';

// Shown instead of login when the build has no Supabase keys (lib/supabase.ts → isSupabaseConfigured).
export function SetupNotice() {
  const styles = useStyles();
  const t = useT();
  return (
    <AuthScreen title={t.setup.title} showBrand>
      <Text style={styles.text}>{t.setup.text}</Text>
      <Text style={styles.hint}>{t.setup.hint}</Text>
    </AuthScreen>
  );
}

const useStyles = makeStyles((colors) => ({
  text: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: spacing.md },
  hint: { fontSize: 13, color: colors.muted, lineHeight: 19 },
}));
