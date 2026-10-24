import { Redirect } from 'expo-router';

// After login the app opens on the transfer overview.
export default function Home() {
  return <Redirect href="/ueberweisen" />;
}
