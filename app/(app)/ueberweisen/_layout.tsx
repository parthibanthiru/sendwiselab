import { Stack } from 'expo-router';
import { useColors } from '@/components/theme';
import { useT } from '@/lib/i18n';

export default function UeberweisenLayout() {
  const colors = useColors();
  const t = useT();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: t.common.back,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: t.transfer.title }} />
      <Stack.Screen name="neu" options={{ title: t.transfer.newTitle }} />
    </Stack>
  );
}
