// Überweisen: overview with the connected account, saved recipients and recent transfers
// (SEPA in euros and international).
// Runs on the demo provider until a provider contract is signed (see lib/transfers).
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { Avatar, Notice, SectionTitle, useTransferStyles } from '@/components/TransferUI';
import { makeStyles, radius, spacing } from '@/components/theme';
import { useT } from '@/lib/i18n';
import { formatDate, formatEURCents, formatMoney } from '@/lib/format';
import { formatIban, maskIban } from '@/lib/iban';
import {
  getIntlTransfers, getRecipients, getTransferProvider, getTransfers,
  type IntlTransfer, type Recipient, type SourceAccount, type Transfer,
} from '@/lib/transfers';

type HistoryItem = (Transfer & { kind?: undefined }) | IntlTransfer;

export default function UeberweisenScreen() {
  const t = useT();
  const router = useRouter();
  const styles = useStyles();
  const ts = useTransferStyles();
  const provider = getTransferProvider();
  const [account, setAccount] = useState<SourceAccount | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([provider.sourceAccount(), getRecipients(), getTransfers(), getIntlTransfers()]).then(([a, r, h, i]) => {
        if (!alive) return;
        setAccount(a);
        setRecipients(r);
        const merged: HistoryItem[] = [...h, ...i];
        setHistory(merged.sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
      });
      return () => {
        alive = false;
      };
    }, [provider])
  );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      {provider.isDemo && <Notice tone="info">{t.transfer.demoBanner}</Notice>}

      <View style={styles.account}>
        <Text style={styles.accountLabel}>{t.transfer.from}</Text>
        <Text style={styles.accountName}>{account?.label ?? ' '}</Text>
        <Text style={styles.accountIban}>{account ? formatIban(account.iban) : ' '}</Text>
        <Button title={t.transfer.newTransfer} onPress={() => router.push('/ueberweisen/neu')} />
        <Button title={t.intl.entry} variant="secondary" onPress={() => router.push('/ueberweisen/ausland')} />
        <Text style={styles.intlSub}>{t.intl.entrySub}</Text>
      </View>

      {recipients.length > 0 && (
        <>
          <SectionTitle>{t.transfer.savedRecipients}</SectionTitle>
          <View style={ts.card}>
            {recipients.map((r, i) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                style={({ pressed }) => [ts.listRow, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.85 }]}
                onPress={() => router.push({ pathname: '/ueberweisen/neu', params: { recipient: r.id } })}
              >
                <Avatar name={r.name} />
                <View style={{ flex: 1 }}>
                  <Text style={ts.listTitle} numberOfLines={1}>{r.name}</Text>
                  <Text style={ts.listSub}>{maskIban(r.iban)}</Text>
                </View>
                <Text style={ts.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <SectionTitle>{t.transfer.history}</SectionTitle>
      {history.length === 0 ? (
        <Text style={ts.muted}>{t.transfer.historyEmpty}</Text>
      ) : (
        <View style={ts.card}>
          {history.slice(0, 20).map((h, i) =>
            h.kind === 'international' ? (
              <View key={h.id} style={[ts.listRow, i === 0 && { borderTopWidth: 0 }]}>
                <Avatar name={h.name} />
                <View style={{ flex: 1 }}>
                  <Text style={ts.listTitle} numberOfLines={1}>{h.name}</Text>
                  <Text style={ts.listSub} numberOfLines={1}>
                    {(t.countries[h.country] ?? h.country) + ' · ' + formatDate(h.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={ts.amount}>−{formatEURCents(h.sendCents / 100)}</Text>
                  <Text style={ts.listSub}>
                    {formatMoney(h.receiveMinor, h.currency, h.decimals)} · {t.intl.status[h.status]}
                  </Text>
                </View>
              </View>
            ) : (
              <View key={h.id} style={[ts.listRow, i === 0 && { borderTopWidth: 0 }]}>
                <Avatar name={h.name} />
                <View style={{ flex: 1 }}>
                  <Text style={ts.listTitle} numberOfLines={1}>{h.name}</Text>
                  <Text style={ts.listSub} numberOfLines={1}>
                    {(h.reference || t.transfer.noReference) + ' · ' + formatDate(h.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={ts.amount}>−{formatEURCents(h.amountCents / 100)}</Text>
                  <Text style={ts.listSub}>{t.transfer.status[h.status]}</Text>
                </View>
              </View>
            )
          )}
        </View>
      )}
    </ScrollView>
  );
}

const useStyles = makeStyles((colors) => ({
  account: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.md + 4, marginBottom: spacing.md },
  accountLabel: { color: colors.inkMuted, fontSize: 13 },
  accountName: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', marginTop: 2 },
  accountIban: { color: colors.inkMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.sm, fontVariant: ['tabular-nums'] },
  intlSub: { color: colors.inkMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
}));
