// Send abroad in three steps: destination and amount (with the partner's quote) → recipient
// with the bank details that country needs → review (purpose, identity check, warnings), then
// a status tracker. Runs on the demo payout partner: its quote is labelled as sample values.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, ErrorText, Input } from '@/components/ui';
import { Avatar, Notice, Row, SectionTitle, useTransferStyles } from '@/components/TransferUI';
import { spacing, useColors } from '@/components/theme';
import { useT } from '@/lib/i18n';
import { formatEUR, formatEURCents, formatMoney, formatNumber } from '@/lib/format';
import {
  COUNTRIES, FIELDS, LIMITS, MAIN_COUNTRIES, checkAmount, checkField, checkRecipient, getCountry, getIdentity,
  getIntlRecipients, getPayoutProvider, isKnownIntlAccount, maskAccount, newId, normalizeField, saveIntlRecipient,
  sentTodayCents,
  type AccountType, type Identity, type IntlRecipient, type IntlTransfer, type Purpose, type Quote, type RecipientField,
} from '@/lib/transfers';

type Step = 1 | 2 | 3 | 4;
const PURPOSES: Purpose[] = ['family', 'gift', 'bills', 'savings', 'services', 'other'];

export default function AuslandScreen() {
  const t = useT();
  const L = t.intl;
  const router = useRouter();
  const colors = useColors();
  const ts = useTransferStyles();
  const provider = getPayoutProvider();

  const [step, setStep] = useState<Step>(1);
  const [country, setCountry] = useState('IN');
  const [picking, setPicking] = useState(false);
  const [search, setSearch] = useState('');
  const [amountText, setAmountText] = useState('');
  const [sentToday, setSentToday] = useState(0);
  const [quote, setQuote] = useState<Quote | null>(null);

  const [saved, setSaved] = useState<IntlRecipient[]>([]);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Partial<Record<RecipientField, string>>>({});
  const [save, setSave] = useState(true);
  const [triedNext, setTriedNext] = useState(false);
  const [recipient, setRecipient] = useState<IntlRecipient | null>(null);

  const [purpose, setPurpose] = useState<Purpose>('family');
  const [reference, setReference] = useState('');
  const [identity, setIdentity] = useState<Identity>({ status: 'none' });
  const [known, setKnown] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntlTransfer | null>(null);

  const c = getCountry(country)!;
  const countryName = (code: string) => t.countries[code] ?? code;

  useEffect(() => {
    let alive = true;
    Promise.all([getIntlRecipients(), sentTodayCents()]).then(([r, s]) => {
      if (!alive) return;
      setSaved(r);
      setSentToday(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The identity status can change on the identity screen; re-read it whenever this screen shows.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getIdentity().then((i) => alive && setIdentity(i));
      return () => {
        alive = false;
      };
    }, [])
  );

  // ── step 1: destination and amount
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
  const sendCents = amount.ok ? amount.cents : 0;

  useEffect(() => {
    let alive = true;
    setQuote(null);
    if (sendCents > 0) provider.quote(country, sendCents).then((q) => alive && setQuote(q));
    return () => {
      alive = false;
    };
  }, [country, sendCents, provider]);

  const countryMatches = (code: string) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const cc = getCountry(code);
    return countryName(code).toLowerCase().includes(q) || code.toLowerCase() === q || cc?.currency.toLowerCase() === q;
  };

  const chooseCountry = (code: string) => {
    if (code !== country) {
      setFields({});
      setRecipient(null);
    }
    setCountry(code);
    setPicking(false);
    setSearch('');
  };

  const receiveLabel = (q: Quote) => formatMoney(q.receiveMinor, q.currency, q.decimals);
  const rateLabel = (q: Quote) => L.rateValue(q.currency, formatNumber(q.rate, q.rate < 10 ? 4 : 2));

  // ── step 2: recipient
  const check = checkRecipient(country, name, fields);
  const forCountry = saved.filter((r) => r.country === country);

  const pickSaved = async (r: IntlRecipient) => {
    setRecipient(r);
    await goReview(r);
  };

  const confirmNew = async () => {
    setTriedNext(true);
    if (!check.ok) return;
    const normalized: Partial<Record<RecipientField, string>> = {};
    for (const f of FIELDS[c.method]) normalized[f] = normalizeField(f, fields[f] ?? '');
    let r: IntlRecipient = { id: newId(), name: name.trim(), country, fields: normalized, createdAt: new Date().toISOString() };
    if (save) {
      r = await saveIntlRecipient(r);
      setSaved([r, ...saved.filter((x) => x.id !== r.id)]);
    }
    setRecipient(r);
    await goReview(r);
  };

  // ── step 3: review
  const goReview = async (r: IntlRecipient) => {
    setError(null);
    setStep(3);
    const [q, k] = await Promise.all([provider.quote(country, sendCents), isKnownIntlAccount(country, maskAccount(country, r.fields))]);
    setQuote(q);
    setKnown(k);
  };

  const verified = identity.status === 'verified';
  const canSend = !!quote && !!recipient && amount.ok && verified && !sending;

  const send = async () => {
    if (!canSend || !quote || !recipient) return;
    setSending(true);
    setError(null);
    try {
      setResult(await provider.create(quote, { recipient, purpose, reference: reference.trim() }));
      setStep(4);
    } catch {
      setError(L.failed);
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setAmountText('');
    setName('');
    setFields({});
    setRecipient(null);
    setReference('');
    setPurpose('family');
    setTriedNext(false);
    setResult(null);
    sentTodayCents().then(setSentToday);
    setStep(1);
  };

  const fieldError = (f: RecipientField) => {
    const value = fields[f] ?? '';
    const e = checkField(country, f, value);
    if (!e || (!triedNext && (!value || e === 'required'))) return null;
    return L.fieldErrors[e];
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      {step < 4 && <Notice tone="info">{L.demoBanner}</Notice>}

      {step === 1 && (
        <>
          <Text style={ts.stepLabel}>{L.step(1)}</Text>
          <Text style={ts.heading}>{L.whereTitle}</Text>

          <SectionTitle>{L.country}</SectionTitle>
          {!picking ? (
            <View style={[ts.card, ts.listRow, { borderTopWidth: 1 }]}>
              <CountryBadge code={country} />
              <View style={{ flex: 1 }}>
                <Text style={ts.listTitle}>{countryName(country)}</Text>
                <Text style={ts.listSub}>{c.currency}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setPicking(true)} testID="intl-change-country">
                <Text style={ts.link}>{L.change}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Input
                label={L.searchCountry}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                autoFocus
                testID="intl-country-search"
              />
              {([
                [L.popular, MAIN_COUNTRIES],
                [L.allCountries, COUNTRIES.map((x) => x.code).filter((x) => !MAIN_COUNTRIES.includes(x))],
              ] as const).map(([title, codes]) => {
                const list = codes.filter(countryMatches);
                if (list.length === 0) return null;
                return (
                  <View key={title}>
                    <Text style={[ts.muted, { marginBottom: spacing.xs }]}>{title}</Text>
                    <View style={ts.card}>
                      {list.map((code, i) => (
                        <Pressable
                          key={code}
                          accessibilityRole="button"
                          style={({ pressed }) => [ts.listRow, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.85 }]}
                          onPress={() => chooseCountry(code)}
                        >
                          <CountryBadge code={code} />
                          <Text style={[ts.listTitle, { flex: 1 }]}>{countryName(code)}</Text>
                          <Text style={ts.listSub}>{getCountry(code)?.currency}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          <Input
            label={L.youSend}
            placeholder={t.transfer.amountPlaceholder}
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            testID="intl-amount"
          />
          {amountError ? (
            <ErrorText message={amountError} />
          ) : (
            <Text style={[ts.muted, { marginTop: -spacing.sm, marginBottom: spacing.md }]}>
              {t.transfer.limitsNote(formatEUR(LIMITS.perTransferCents / 100), formatEUR(LIMITS.perDayCents / 100))}
            </Text>
          )}

          {amount.ok && (
            <View style={ts.card}>
              {!quote ? (
                <Row label={L.rate} value={L.quoteLoading} />
              ) : (
                <>
                  <Row label={L.fee} value={`− ${formatEURCents(quote.feeCents / 100)}`} />
                  <Row label={L.converted} value={formatEURCents((quote.sendCents - quote.feeCents) / 100)} />
                  <Row label={L.rate} value={rateLabel(quote)} />
                  <Row label={L.recipientGets} value={receiveLabel(quote)} strong />
                  <Row label={L.arrives} value={L.delivery[quote.delivery]} />
                </>
              )}
            </View>
          )}
          {quote?.demo && <Text style={[ts.muted, { marginBottom: spacing.md }]}>{L.sampleNote}</Text>}
          <Button title={t.transfer.continue} onPress={() => setStep(2)} disabled={!amount.ok || !quote} />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={ts.stepLabel}>{L.step(2)}</Text>
          <Text style={ts.heading}>{L.recipientTitle}</Text>

          {forCountry.length > 0 && (
            <>
              <SectionTitle>{L.savedFor(countryName(country))}</SectionTitle>
              <View style={ts.card}>
                {forCountry.map((r, i) => (
                  <Pressable
                    key={r.id}
                    accessibilityRole="button"
                    style={({ pressed }) => [ts.listRow, i === 0 && { borderTopWidth: 0 }, pressed && { opacity: 0.85 }]}
                    onPress={() => pickSaved(r)}
                  >
                    <Avatar name={r.name} />
                    <View style={{ flex: 1 }}>
                      <Text style={ts.listTitle} numberOfLines={1}>{r.name}</Text>
                      <Text style={ts.listSub} numberOfLines={1}>{maskAccount(r.country, r.fields)}</Text>
                    </View>
                    <Text style={ts.chevron}>›</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <SectionTitle>{L.newRecipient}</SectionTitle>
          <Input
            label={L.fullName}
            placeholder={L.fullNamePlaceholder}
            value={name}
            onChangeText={setName}
            maxLength={LIMITS.nameMaxLength}
            autoComplete="off"
            testID="intl-name"
          />
          {triedNext && !check.nameOk && <ErrorText message={L.nameError} />}

          {FIELDS[c.method].map((f) =>
            f === 'accountType' ? (
              <View key={f} style={{ marginBottom: spacing.md }}>
                <Text style={[ts.listTitle, { marginBottom: spacing.xs }]}>{L.fields.accountType}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(['checking', 'savings'] as AccountType[]).map((type) => (
                    <Pressable
                      key={type}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: fields.accountType === type }}
                      style={[ts.choice, fields.accountType === type && ts.choiceActive]}
                      onPress={() => setFields({ ...fields, accountType: type })}
                    >
                      <Text style={ts.choiceTitle}>{L.accountTypes[type]}</Text>
                    </Pressable>
                  ))}
                </View>
                {fieldError(f) && <ErrorText message={fieldError(f)} />}
              </View>
            ) : (
              <View key={f}>
                <Input
                  label={L.fields[f]}
                  value={fields[f] ?? ''}
                  onChangeText={(v) => setFields({ ...fields, [f]: v })}
                  autoCapitalize={f === 'address' ? 'words' : 'characters'}
                  autoCorrect={false}
                  autoComplete="off"
                  keyboardType={f === 'sortCode' || f === 'routingNumber' ? 'number-pad' : 'default'}
                  testID={`intl-${f}`}
                />
                {fieldError(f) ? (
                  <ErrorText message={fieldError(f)} />
                ) : L.hints[f] ? (
                  <Text style={[ts.muted, { marginTop: -spacing.sm, marginBottom: spacing.md }]}>{L.hints[f]}</Text>
                ) : null}
              </View>
            )
          )}

          <View style={ts.switchRow}>
            <Text style={ts.switchLabel}>{t.transfer.saveRecipient}</Text>
            <Switch value={save} onValueChange={setSave} accessibilityLabel={t.transfer.saveRecipient} />
          </View>
          <Button title={t.transfer.continue} onPress={confirmNew} />
          <Button title={t.common.back} variant="secondary" onPress={() => setStep(1)} />
        </>
      )}

      {step === 3 && recipient && (
        <>
          <Text style={ts.stepLabel}>{L.step(3)}</Text>
          <Text style={ts.heading}>{L.reviewTitle}</Text>
          <Text style={[ts.big, { marginBottom: spacing.xs }]}>{quote ? receiveLabel(quote) : ' '}</Text>
          <Text style={[ts.muted, { textAlign: 'center', marginBottom: spacing.md }]}>{L.recipientGets}</Text>

          <View style={ts.card}>
            <View style={[ts.listRow, { borderTopWidth: 0 }]}>
              <Avatar name={recipient.name} />
              <View style={{ flex: 1 }}>
                <Text style={ts.listTitle}>{recipient.name}</Text>
                <Text style={ts.listSub}>{countryName(country)} · {maskAccount(country, recipient.fields)}</Text>
              </View>
              <Pressable accessibilityRole="button" onPress={() => setStep(2)}>
                <Text style={ts.link}>{t.transfer.edit}</Text>
              </Pressable>
            </View>
            {quote && (
              <>
                <Row label={L.youPay} value={formatEURCents(quote.sendCents / 100)} strong />
                <Row label={L.fee} value={formatEURCents(quote.feeCents / 100)} />
                <Row label={L.rate} value={rateLabel(quote)} />
                <Row label={L.arrives} value={L.delivery[quote.delivery]} />
              </>
            )}
          </View>
          {quote?.demo && <Text style={[ts.muted, { marginBottom: spacing.md }]}>{L.sampleNote}</Text>}

          <SectionTitle>{L.purpose}</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs }}>
            {PURPOSES.map((p) => (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected: purpose === p }}
                style={[ts.choice, { flexGrow: 0, flexBasis: 'auto', paddingVertical: spacing.sm }, purpose === p && ts.choiceActive]}
                onPress={() => setPurpose(p)}
              >
                <Text style={ts.choiceTitle}>{L.purposes[p]}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[ts.muted, { marginBottom: spacing.md }]}>{L.purposeHint}</Text>
          <Input
            label={L.reference}
            value={reference}
            onChangeText={setReference}
            maxLength={LIMITS.referenceMaxLength}
            testID="intl-reference"
          />

          {verified ? (
            <Notice tone="ok">{L.identityDone}</Notice>
          ) : (
            <Notice tone="warn">
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{L.identityNeeded}</Text>
              <Pressable accessibilityRole="button" onPress={() => router.push('/ueberweisen/identitaet')}>
                <Text style={ts.link}>{L.identityButton}</Text>
              </Pressable>
            </Notice>
          )}
          {!known && <Notice tone="warn">{L.firstTransfer}</Notice>}
          <Text style={[ts.muted, { marginBottom: spacing.md }]}>{L.scamWarning}</Text>

          <ErrorText message={error} />
          <Button
            title={L.send(formatEURCents(sendCents / 100))}
            onPress={send}
            disabled={!canSend}
            loading={sending}
          />
          <Button title={t.transfer.edit} variant="secondary" onPress={() => setStep(1)} disabled={sending} />
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
            <Text style={ts.heading}>{L.doneTitle}</Text>
            <Text style={ts.big}>{formatMoney(result.receiveMinor, result.currency, result.decimals)}</Text>
            <Text style={[ts.muted, { textAlign: 'center', fontSize: 15 }]}>
              {L.doneText(result.name, formatMoney(result.receiveMinor, result.currency, result.decimals))}
            </Text>
          </View>
          <View style={[ts.card, { padding: spacing.md, gap: spacing.md }]}>
            {(
              [
                [L.track.created, 'done'],
                [L.track.paid, 'done'],
                [L.track.converting, 'now'],
                [`${L.track.delivered} · ${L.delivery[result.delivery]}`, 'next'],
              ] as const
            ).map(([label, state]) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
                    borderColor: state === 'next' ? colors.border : colors.success,
                    backgroundColor: state === 'done' ? colors.success : colors.card,
                  }}
                />
                <Text style={[ts.listTitle, state === 'next' && { color: colors.muted, fontWeight: '400' }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Button title={L.done} onPress={() => router.back()} />
          <Button title={L.another} variant="secondary" onPress={restart} />
        </>
      )}
    </ScrollView>
  );
}

/** Two-letter country code in a round badge (no flag emoji: they don't render on every device). */
function CountryBadge({ code }: { code: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: colors.ink,
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{code}</Text>
    </View>
  );
}
