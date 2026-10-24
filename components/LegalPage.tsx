import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { makeStyles, radius, spacing, useColors } from './theme';
import { useT } from '@/lib/i18n';
import { OPERATOR, isOperatorComplete } from '@/lib/legal';

type Section = { title: string; body: string };

// Shared page for the Impressum and the privacy policy: reachable signed in, signed out and on
// a build without Supabase keys (see app/_layout.tsx).
export function LegalPage({
  title,
  operatorHeading,
  subtitle,
  sections,
}: {
  title: string;
  operatorHeading: string;
  subtitle?: string;
  sections: Section[];
}) {
  const styles = useStyles();
  const colors = useColors();
  const t = useT();
  const router = useRouter();

  function goBack() {
    if (router.canGoBack?.()) router.back();
    else router.replace('/');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right', 'top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.back}>
          <Text style={styles.link}>‹ {t.common.back}</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <Text style={styles.heading}>{operatorHeading}</Text>
        {isOperatorComplete ? (
          <View style={styles.block}>
            <Text style={styles.body} selectable>
              {OPERATOR.name}
              {'\n'}
              {OPERATOR.street}
              {'\n'}
              {OPERATOR.city}
            </Text>
            <Text style={[styles.body, { marginTop: spacing.sm }]} selectable>
              {t.legal.contact}: {OPERATOR.email}
            </Text>
          </View>
        ) : (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{t.legal.incomplete}</Text>
          </View>
        )}

        {sections.map((s) => (
          <View key={s.title}>
            <Text style={styles.heading}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { padding: spacing.lg, paddingBottom: spacing.xl },
  back: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.md },
  link: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontSize: 13, color: colors.muted },
  heading: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  block: { marginTop: spacing.xs },
  notice: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  noticeText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
}));

/** "Impressum · Datenschutz" links, shown under login, register, the setup notice and the profile. */
export function LegalLinks() {
  const styles = useLinkStyles();
  const t = useT();
  const router = useRouter();
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/impressum')}>
        <Text style={styles.link}>{t.legal.impressum}</Text>
      </Pressable>
      <Text style={styles.dot}>·</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/datenschutz')}>
        <Text style={styles.link}>{t.legal.privacy}</Text>
      </Pressable>
    </View>
  );
}

const useLinkStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  link: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
  dot: { color: colors.muted, fontSize: 13 },
}));
