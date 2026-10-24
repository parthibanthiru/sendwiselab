import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** False when the build has no Supabase keys; the app then shows a setup notice instead of login. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '[SendWiseLab] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY missing – copy .env.example to .env'
  );
}

// createClient throws on an empty URL, so an unconfigured build gets a placeholder that is never
// called (the auth gate stops at the setup notice).
export const supabase = createClient(supabaseUrl || 'https://not-configured.invalid', supabaseAnonKey || 'missing', {
  auth: {
    // AsyncStorage keeps the user logged in between app starts.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On the web, the e-mail confirmation link returns to the site with a one-time code; pick it up
    // so the user lands signed in. Native apps don't receive links this way.
    detectSessionInUrl: Platform.OS === 'web',
    // PKCE: Google login returns a one-time code that the app exchanges for a session.
    flowType: 'pkce',
  },
});

// Only refresh tokens while the app is in the foreground (recommended by Supabase for RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
