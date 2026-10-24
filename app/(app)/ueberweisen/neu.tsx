// New transfer in three steps: recipient → amount → review (with the payee check), then done.
// Route param `recipient` (a saved recipient's id) skips straight to the amount.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ErrorText, Input } from '@/components/ui';
import { Avatar, Notice, Row, SectionTitle, useTransferStyles } from '@/components/TransferUI';
import { spacing, useColors } from '@/components/theme';
import { useT } from '@/lib/i18n';
import { formatEUR, formatEURCents } from '@/lib/format';
import { SEPA_IBAN_LENGTHS, checkIban, formatIban, maskIban, normalizeIban } from '@/lib/iban';
import {
  LIMITS, checkAmount, getRecipients, getTransferProvider, isKnownPayee, saveRecipient, sentTodayCents,
  type PayeeCheck, type Recipient, type SourceAccount, type Speed, type Transfer,
} from '@/lib/transfers';

type Step = 1 | 2 | 3 | 4;

export default function NeueUeberweisungScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useColors();
  const ts = useTransferStyles();
  const provider = getTransferProvider();
  const params = useLocalSearchParams<{ recipient?: string }>();

  const [step, setStep] = useState<Step>(1);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [account, setAccount] = useState<SourceAccount | null>(null);
  const [sentToday, setSentToday] = useState(0);

  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  const [save, setSave] = useState(true);
  const [amountText, setAmountText] = useState('');
  const [reference, setReference] = useState('');
  const [speed, setSpeed] = useState<Speed>('instant');

  const [payee, setPayee] = useState<PayeeCheck | null>(null);
  const [knownPayee, setKnownPayee] = useState(true);
  const [riskAccepted, setRiskAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Transfer | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getRecipients(), provider.sourceAccount(), sentTodayCents()]).then(([r, a, s]) => {
      if (!alive) return;
      setRecipients(r);
      setAccount(a);
      setSentToday(s);
      const preset = params.recipient ? r.find((x) => x.id === params.recipient) : undefined;
      if (preset) {
        setName(preset.name);
        setIban(formatIban(preset.iban));
        setStep(2);
      }
    });
    return () => {
      alive = false;
    };
  }, [params.recipient, provider]);

  // ── step 1: recipient
  const ibanCheck = checkIban(iban);
  const ibanNorm = normalizeIban(iban);
  const expectedLen = SEPA_IBAN_LENGTHS[ibanNorm.slice(0, 2)];
  const ibanError = (() => {
    if (ibanCheck.ok || !ibanNorm) return null;
    const r = ibanCheck.reason;
    if (r === 'format' && ibanNorm.length >= 4) return t.transfer.ibanErrors.format;
    if (r === 'country' && ibanNorm.length >= 2 && /^[A-Z]{2}$/.test(ibanNorm.slice(0, 2))) return t.transfer.ibanErrors.country;
    if (r === 'length' && expectedLen && ibanNorm.length > expectedLen) return t.transfer.ibanErrors.length(expectedLen);
    if (r === 'length' && expectedLen && ibanNorm.length === expectedLen) return null;
    if (r === 'checksum') return t.transfer.ibanErrors.checksum;
    return null;
  })();
  const recipientReady = ibanCheck.ok && name.trim().length > 0;

  const pickRecipient = (r: Recipient) => {
    setName(r.name);
    setIban(formatIban(r.iban));
    setSave(false);
    setStep(2);
  };

  const confirmRecipient = async () => {
    if (!recipientReady) return;
    if (save) setRecipients([await saveRecipient(name, ibanNorm), ...recipients.filter((r) => r.iban !== ibanNorm)]);
    setStep(2);
  };

  // ── step 2: amount
  const amount = useMemo(() => checkAmount(amountText, sentToday), [amountText, sentToday]);
  const amountError = (() => {
    if (amount.ok || amount.reason === 'empty') return null;
    switch (amount.reason) {
      case 'perTransfer':
        return t.transfer.amountErrors.perTransfer(formatEUR(LIMITS.perTransferCents / 100));
      case 'perDay':
        return t.transfer.amountErrors.perDay(formatEURCents(Math.max(0, LIMITS.perDayCents - sentToday) / 100));
      default:
        return t.transfer.amountErrors[amount.reason];
    }
  })();

  const goReview = async () => {
    if (!amount.ok) return;
    setPayee(null);
    setRiskAccepted(false);
    setError(null);
    setStep(3);
    const [check, known] = await Promise.all([provider.verifyPayee(name, ibanNorm), isKnownPayee(ibanNorm)]);
    setPayee(check);
    setKnownPayee(known);
  };

  // ── step 3: review & send
  const risky = payee?.result === 'no_match' || payee?.result === 'unavailable';
  const canSend = !!payee && amount.ok && (!risky || riskAccepted) && !sending;

  const send = async () => {
    if (!canSend || !amount.ok || !payee) return;
    setSending(true);
    setError(null);
    try {
      const { transfer } = await provider.initiate(
        { name: name.trim(), iban: ibanNorm, amountCents: amount.cents, reference: reference.trim(), speed },
        payee.result
      );
      setResult(transfer);
      setStep(4);
    } catch {
      setError(t.transfer.failed);
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setName('');
    setIban('');
    setSave(true);
    setAmountText('');
    setReference('');
    setSpeed('instant');
    setResult(null);
    sentTodayCents().then(setSentToday);
    setStep(1);
  };

  const amountLabel = amount.ok ? formatEURCents(amount.cents / 100) : '';

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      {step === 1 && (
        <>
          <Text style={ts.stepLabel}>{t.transfer.step(1)}</Text>
          <Text style={ts.heading}>{t.transfer.recipientTitle}</Text>
          {recipients.length > 0 && (
            <View style={ts.card}>
              {recipients.map((r, i) => (
                <Pressable
                  key={r.id}
                  accessibilityRole="button"
                  style={({ pressed }) => [ts.listRow, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.85 }]}
                  onPress={() => pickRecipient(r)}
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
          )}
          <SectionTitle>{t.transfer.newRecipient}</SectionTitle>
          <Input
            label={t.transfer.name}
            placeholder={t.transfer.namePlaceholder}
            value={name}
            onChangeText={setName}
            maxLength={LIMITS.nameMaxLength}
            autoComplete="off"
            testID="transfer-name"
          />
          <Input
            label={t.transfer.iban}
            placeholder="DE00 0000 0000 0000 0000 00"
            value={iban}
            onChangeText={(v) => setIban(formatIban(v))}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            testID="transfer-iban"
          />
          {ibanError ? (
            <ErrorText message={ibanError} />
          ) : (
            <Text style={[ts.muted, { marginTop: -spacing.sm, marginBottom: spacing.md }, ibanCheck.ok && { color: colors.success }]}>
              {ibanCheck.ok ? t.transfer.ibanValid : t.transfer.ibanHint}
            </Text>
          )}
          <View style={ts.switchRow}>
            <Text style={ts.switchLabel}>{t.transfer.saveRecipient}</Text>
            <Switch value={save} onValueChange={setSave} accessibilityLabel={t.transfer.saveRecipient} />
          </View>
          <Button title={t.transfer.continue} onPress={confirmRecipient} disabled={!recipientReady} />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={ts.stepLabel}>{t.transfer.step(2)}</Text>
          <Text style={ts.heading}>{t.transfer.amountTitle}</Text>
          <View style={[ts.card, ts.listRow, { borderTopWidth: 1 }]}>
            <Avatar name={name} />
            <View style={{ flex: 1 }}>
              <Text style={ts.listTitle} numberOfLines={1}>{name}</Text>
              <Text style={ts.listSub}>{formatIban(ibanNorm)}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setStep(1)}>
              <Text style={ts.link}>{t.transfer.edit}</Text>
            </Pressable>
          </View>
          <Input
            label={t.transfer.amount}
            placeholder={t.transfer.amountPlaceholder}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            testID="transfer-amount"
          />
          {amountError ? (
            <ErrorText message={amountError} />
          ) : (
            <Text style={[ts.muted, { marginTop: -spacing.sm, marginBottom: spacing.md }]}>
              {t.transfer.limitsNote(formatEUR(LIMITS.perTransferCents / 100), formatEUR(LIMITS.perDayCents / 100))}
            </Text>
          )}
          <Input
            label={t.transfer.reference}
            placeholder={t.transfer.referencePlaceholder}
            value={reference}
            onChangeText={setReference}
            maxLength={LIMITS.referenceMaxLength}
            testID="transfer-reference"
          />
          <SectionTitle>{t.transfer.speed}</SectionTitle>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            {(['instant', 'standard'] as const).map((s) => (
              <Pressable
                key={s}
                accessibilityRole="radio"
                accessibilityState={{ selected: speed === s }}
                style={[ts.choice, speed === s && ts.choiceActive]}
                onPress={() => setSpeed(s)}
              >
                <Text style={ts.choiceTitle}>{t.transfer[s]}</Text>
                <Text style={ts.muted}>{s === 'instant' ? t.transfer.instantSub : t.transfer.standardSub}</Text>
              </Pressable>
            ))}
          </View>
          <Button title={t.transfer.review} onPress={goReview} disabled={!amount.ok} />
        </>
      )}

      {step === 3 && (
        <>
          <Text style={ts.stepLabel}>{t.transfer.step(3)}</Text>
          <Text style={ts.heading}>{t.transfer.reviewTitle}</Text>
          <Text style={[ts.big, { marginBottom: spacing.md }]}>{amountLabel}</Text>
          <View style={ts.card}>
            <View style={[ts.listRow, { borderTopWidth: 0 }]}>
              <Avatar name={name} />
              <View style={{ flex: 1 }}>
                <Text style={ts.listTitle}>{name}</Text>
                <Text style={ts.listSub}>{formatIban(ibanNorm)}</Text>
              </View>
            </View>
            <Row label={t.transfer.reference} value={reference.trim() || t.transfer.noReference} />
            <Row label={t.transfer.speed} value={speed === 'instant' ? t.transfer.instant : t.transfer.standard} />
            {account && <Row label={t.transfer.from} value={`${account.label} · ${maskIban(account.iban)}`} />}
          </View>

          {!payee ? (
            <Notice tone="info">{t.transfer.payee.checking}</Notice>
          ) : payee.result === 'match' ? (
            <Notice tone="ok">{t.transfer.payee.match}</Notice>
          ) : payee.result === 'close_match' ? (
            <Notice tone="warn">
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
                {t.transfer.payee.close_match(payee.suggestedName ?? '')}
              </Text>
              {payee.suggestedName && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setName(payee.suggestedName!);
                    setPayee({ result: 'match' });
                  }}
                >
                  <Text style={ts.link}>{t.transfer.useSuggested}</Text>
                </Pressable>
              )}
            </Notice>
          ) : (
            <Notice tone="danger">{t.transfer.payee[payee.result]}</Notice>
          )}
          {payee && !knownPayee && payee.result !== 'no_match' && <Notice tone="warn">{t.transfer.firstTransfer}</Notice>}
          {speed === 'instant' && <Text style={[ts.muted, { marginBottom: spacing.md }]}>{t.transfer.instantFinal}</Text>}
          {risky && (
            <View style={ts.switchRow}>
              <Text style={ts.switchLabel}>{t.transfer.confirmRisk}</Text>
              <Switch value={riskAccepted} onValueChange={setRiskAccepted} accessibilityLabel={t.transfer.confirmRisk} />
            </View>
          )}
          <ErrorText message={error} />
          <Button title={t.transfer.send(amountLabel)} onPress={send} disabled={!canSend} loading={sending} />
          <Button title={t.transfer.edit} variant="secondary" onPress={() => setStep(2)} disabled={sending} />
        </>
      )}

      {step === 4 && result && (
        <>
          <View style={{ alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm }}>
            <View
              style={{
                width: 72, height: 72, borderRadius: 20, backgroundColor: colors.success,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 34, color: colors.onPrimary, fontWeight: '700' }}>✓</Text>
            </View>
            <Text style={ts.heading}>{result.status === 'executed' ? t.transfer.doneInstant : t.transfer.doneStandard}</Text>
            <Text style={ts.big}>{formatEURCents(result.amountCents / 100)}</Text>
            <Text style={[ts.muted, { textAlign: 'center', fontSize: 15 }]}>
              {result.status === 'executed' ? t.transfer.doneInstantText(result.name) : t.transfer.doneStandardText(result.name)}
            </Text>
          </View>
          <Button title={t.transfer.done} onPress={() => router.back()} />
          <Button title={t.transfer.another} variant="secondary" onPress={restart} />
        </>
      )}
    </ScrollView>
  );
}
