import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts, makeStyles, spacing, useColors } from './theme';
import { APP_NAME } from '@/lib/brand';
import { LegalLinks } from './LegalPage';

// Shared shell for login / register / reset screens.
export function AuthScreen({
  title,
  subtitle,
  children,
  showBrand,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showBrand?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom', 'left', 'right', 'top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {showBrand && (
            <View style={styles.brandRow} accessibilityRole="header" accessibilityLabel={APP_NAME}>
              <Image source={require('../assets/icon.png')} style={styles.logo} />
              <Text style={styles.brand}>{APP_NAME}</Text>
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {children}
          <LegalLinks />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 44, height: 44, borderRadius: 10, marginRight: 12 },
  brand: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: spacing.lg, lineHeight: 21 },
}));
