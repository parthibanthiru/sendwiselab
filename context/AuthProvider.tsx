import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/i18n';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, name: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Supabase's English error messages -> friendly messages in the app's current language.
function friendlyError(message: string): string {
  const e = strings().auth.errors;
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return e.invalidLogin;
  if (m.includes('email not confirmed')) return e.emailNotConfirmed;
  if (m.includes('already registered')) return e.alreadyRegistered;
  if (m.includes('password should be at least')) return e.passwordTooShort;
  if (m.includes('rate limit')) return e.rateLimit;
  if (m.includes('network')) return e.network;
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? friendlyError(error.message) : null;
    },

    async signUp(email, password, name) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      return error ? friendlyError(error.message) : null;
    },

    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      return error ? friendlyError(error.message) : null;
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    // GDPR (Art. 17): users must be able to delete their account.
    // Calls the `delete_own_account` SQL function from supabase/schema.sql, then clears the
    // recipients and history kept on this device (lib/transfers/store.ts).
    async deleteAccount() {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) return friendlyError(error.message);
      const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('mt.transfers.'));
      if (keys.length) await AsyncStorage.multiRemove(keys);
      await supabase.auth.signOut();
      return null;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
