// Identity check before the first transfer abroad (anti-money-laundering rules). The real
// payout partner verifies an ID document or the German online ID; in the demo the details
// are only checked for plausibility and stay on the device.
import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ErrorText, Input } from '@/components/ui';
import { Notice, useTransferStyles } from '@/components/TransferUI';
import { spacing } from '@/components/theme';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/context/AuthProvider';
import { getIdentity, isAdult, parseBirthDate, saveIdentity, type Identity } from '@/lib/transfers';

export default function IdentitaetScreen() {
  const t = useT();
  const L = t.identity;
  const router = useRouter();
  const ts = useTransferStyles();
  const { user } = useAuth();

  const [identity, setIdentity] = useState<Identity>({ status: 'none' });
  const [fullName, setFullName] = useState<string>((user?.user_metadata?.full_name as string) ?? '');
  const [birth, setBirth] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIdentity().then(setIdentity);
  }, []);

  // The session can arrive after the first render; prefill the name from the profile then.
  const profileName = (user?.user_metadata?.full_name as string | undefined) ?? '';
  useEffect(() => {
    if (profileName) setFullName((current) => current || profileName);
  }, [profileName]);

  const submit = async () => {
    setError(null);
    if (fullName.trim().split(/\s+/).filter(Boolean).length < 2) return setError(L.errors.name);
    const date = parseBirthDate(birth);
    if (!date || Number.isNaN(new Date(date).getTime())) return setError(L.errors.birthDate);
    if (!isAdult(date)) {
      // isAdult is also false for impossible dates such as 31.02.
      const [y, m, d] = date.split('-').map(Number);
      const real = new Date(y, m - 1, d);
      return setError(real.getDate() === d && real.getMonth() === m - 1 ? L.errors.underage : L.errors.birthDate);
    }
    if (street.trim().length < 3 || city.trim().length < 3) return setError(L.errors.address);
    const next: Identity = {
      status: 'verified',
      fullName: fullName.trim(),
      birthDate: date,
      street: street.trim(),
      city: city.trim(),
      verifiedAt: new Date().toISOString(),
      demo: true,
    };
    await saveIdentity(next);
    setIdentity(next);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
      <Text style={ts.heading}>{L.title}</Text>
      {identity.status === 'verified' ? (
        <>
          <Notice tone="ok">{L.verified}</Notice>
          <Button title={L.back} onPress={() => router.back()} />
        </>
      ) : (
        <>
          <Text style={[ts.muted, { fontSize: 15, lineHeight: 21, marginBottom: spacing.md }]}>{L.intro}</Text>
          <Notice tone="info">{L.demoNote}</Notice>
          <Input label={L.fullName} value={fullName} onChangeText={setFullName} autoComplete="name" testID="id-name" />
          <Input
            label={L.birthDate}
            placeholder={L.birthDatePlaceholder}
            value={birth}
            onChangeText={setBirth}
            keyboardType="numbers-and-punctuation"
            testID="id-birth"
          />
          <Input label={L.street} value={street} onChangeText={setStreet} autoComplete="street-address" testID="id-street" />
          <Input label={L.city} value={city} onChangeText={setCity} autoComplete="postal-address-locality" testID="id-city" />
          <ErrorText message={error} />
          <Button title={L.submit} onPress={submit} />
        </>
      )}
    </ScrollView>
  );
}
