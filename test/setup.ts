// Runs before every test file (package.json → jest.setupFiles).
// Replaces the pieces that need a real phone, network or navigation container with simple
// stand-ins, so every screen can be rendered in Node on GitHub's runners.
import { jest } from '@jest/globals';

// Phone storage → in-memory mock shipped by the library itself
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Safe-area insets → zero insets
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: ({ children, ...p }: any) => React.createElement(View, p, children),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext: React.createContext(insets),
    initialWindowMetrics: { insets, frame },
  };
});

// Navigation → plain functions; screens only use these hooks/components.
// Tests set route params with require('expo-router').__setParams({...}).
jest.mock('expo-router', () => {
  const React = require('react');
  let params: Record<string, string> = {};
  const router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  const passThrough = ({ children }: any) => children ?? null;
  return {
    __setParams: (p: Record<string, string>) => {
      params = p;
    },
    __router: router,
    useRouter: () => router,
    useLocalSearchParams: () => params,
    useSegments: () => ['(app)'],
    useNavigation: () => ({ setOptions: jest.fn() }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    Link: passThrough,
    Redirect: () => null,
    Slot: () => null,
    Stack: Object.assign(passThrough, { Screen: () => null }),
    Tabs: Object.assign(passThrough, { Screen: () => null }),
  };
});

jest.mock('expo-linking', () => ({
  createURL: () => 'moneytransfer://',
  parse: () => ({ queryParams: {} }),
  openURL: jest.fn(),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));

// Supabase → a signed-in test user; every table query returns an empty list.
jest.mock('@/lib/supabase', () => {
  const session = {
    access_token: 'test-token',
    user: {
      id: 'test-user',
      email: 'test@example.com',
      created_at: '2026-10-01T09:00:00Z',
      user_metadata: { full_name: 'Test Nutzer' },
    },
  };
  const query = (): any => {
    const q: any = {};
    for (const m of ['select', 'order', 'limit', 'eq', 'delete', 'update']) q[m] = () => q;
    q.insert = async () => ({ error: null });
    q.upsert = async () => ({ error: null });
    q.then = (resolve: any, reject: any) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
    return q;
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithPassword: async () => ({ error: null }),
        signUp: async () => ({ error: null }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
        updateUser: async () => ({ error: null }),
        startAutoRefresh() {},
        stopAutoRefresh() {},
      },
      from: query,
      rpc: jest.fn(async () => ({ error: null })),
    },
  };
});
