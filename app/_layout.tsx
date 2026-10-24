import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { LanguageProvider } from '@/context/LanguageProvider';
import { useTheme } from '@/components/theme';
import { SetupNotice } from '@/components/SetupNotice';
import { isSupabaseConfigured } from '@/lib/supabase';

// Sends logged-out users to /login and logged-in users into the app.
function AuthGate() {
  const { colors, scheme } = useTheme();
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/login');
    else if (session && inAuthGroup) router.replace('/');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <>
      {/* App screens have dark headers -> light status bar; login screens follow the theme. */}
      <StatusBar style={session || scheme === 'dark' ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

// In a wide browser window the app keeps a phone-to-tablet width, centred on the page.
function WebFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }}>{children}</View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <WebFrame>
            {isSupabaseConfigured ? (
              <AuthProvider>
                <AuthGate />
              </AuthProvider>
            ) : (
              <SetupNotice />
            )}
          </WebFrame>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
