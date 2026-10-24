import { ColorValue, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useColors } from '@/components/theme';
import { useT } from '@/lib/i18n';

const icon = (glyph: string) => ({ color }: { color: ColorValue }) => <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

export default function AppLayout() {
  const colors = useColors();
  const t = useT();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="ueberweisen" options={{ title: t.tabs.transfer, headerShown: false, tabBarIcon: icon('⇄') }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profileTitle, tabBarLabel: t.tabs.profile, tabBarIcon: icon('👤') }} />
      {/* redirect only, not a tab */}
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
