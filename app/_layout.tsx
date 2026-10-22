import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { runMigrations } from '../src/db/migrations';
import { ThemeManager, colors } from '@/src/theme';
import { DialogProvider } from '@/components/ui/ConfirmDialog';
import { configureRestNotifications } from '@/src/features/workout-session/rest-notifications';

SplashScreen.preventAutoHideAsync();

configureRestNotifications();

export const unstable_settings = {
  anchor: '(tabs)',
};

type DbStatus = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const [dbStatus, setDbStatus] = useState<DbStatus>('loading');
  const [dbError, setDbError] = useState<string | null>(null);

  const [fontsLoaded, fontsError] = useFonts({
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    BarlowCondensed_400Regular,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
  });

  const boot = useCallback(async () => {
    setDbStatus('loading');
    setDbError(null);
    try {
      await runMigrations();
      setDbStatus('ready');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown database error';
      console.error('[db] Migration failed:', err);
      setDbError(message);
      setDbStatus('error');
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  const ready = dbStatus === 'ready' && (fontsLoaded || fontsError);

  // `dbStatus === 'error'` is a terminal state, not a "still loading" one, so
  // the splash must come down for it too — otherwise a migration failure left
  // the app stuck behind a splash screen with no way to report the error.
  const settled = ready || dbStatus === 'error';

  useEffect(() => {
    if (settled) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [settled]);

  // Checked before the `!ready` guard: when dbStatus is 'error', `ready` is
  // always false, so testing it first made this branch unreachable.
  if (dbStatus === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorDetail}>{dbError}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => void boot()}
          accessibilityRole="button"
          accessibilityLabel="Retry database initialisation"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Initialising…</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeManager>
        <DialogProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="workout" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen
              name="completed"
              options={{ presentation: 'modal', headerShown: false }}
            />
          </Stack>
        </DialogProvider>
      </ThemeManager>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textTertiary,
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 24,
    minHeight: 44,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: colors.goldBorder,
  },
  retryText: {
    color: colors.gold,
    fontSize: 16,
  },
});
