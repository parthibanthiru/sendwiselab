// Small building blocks shared by the transfer screens (app/(app)/ueberweisen).
import React from 'react';
import { Text, View } from 'react-native';
import { fonts, makeStyles, radius, spacing, useColors } from './theme';

const AVATAR_COLORS = ['#17855A', '#2E5F9E', '#7A4E9A', '#8A3B33', '#B8901F', '#1C6E65'];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const initials = name.trim().split(/\s+/).map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: AVATAR_COLORS[sum % AVATAR_COLORS.length],
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: size * 0.36 }}>{initials || '?'}</Text>
    </View>
  );
}

/** A status / warning box. tone: ok (green), warn (gold), danger (red), info (teal). */
export function Notice({ tone, children }: { tone: 'ok' | 'warn' | 'danger' | 'info'; children: React.ReactNode }) {
  const styles = useStyles();
  const colors = useColors();
  const bar = { ok: colors.success, warn: colors.warning, danger: colors.danger, info: colors.info }[tone];
  return (
    <View style={[styles.notice, { borderLeftColor: bar }]}>
      {typeof children === 'string' ? <Text style={styles.noticeText}>{children}</Text> : children}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const styles = useStyles();
  return <Text style={styles.section}>{children}</Text>;
}

/** Label/value line in a summary card. */
export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && { fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

export const useTransferStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden', marginBottom: spacing.md,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  listTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  listSub: { fontSize: 13, color: colors.muted, marginTop: 2, fontVariant: ['tabular-nums'] },
  amount: { fontSize: 15, fontWeight: '600', color: colors.text, fontVariant: ['tabular-nums'] },
  big: { fontFamily: fonts.display, fontSize: 40, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], textAlign: 'center' },
  muted: { fontSize: 13, color: colors.muted },
  chevron: { fontSize: 22, color: colors.muted },
  stepLabel: { fontSize: 12, color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing.xs },
  heading: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  choice: {
    flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md,
  },
  choiceActive: { borderColor: colors.primary, borderWidth: 2, padding: spacing.md - 1 },
  choiceTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.md },
  switchLabel: { flex: 1, fontSize: 14, color: colors.text },
  link: { color: colors.primary, fontWeight: '600', fontSize: 14 },
}));

const useStyles = makeStyles((colors) => ({
  notice: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4,
    borderRadius: radius.sm, padding: spacing.sm + 4, marginBottom: spacing.md, gap: spacing.sm,
  },
  noticeText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  section: {
    fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase',
    marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md,
    paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.border,
  },
  rowLabel: { fontSize: 14, color: colors.muted },
  rowValue: { fontSize: 14, color: colors.text, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
}));
