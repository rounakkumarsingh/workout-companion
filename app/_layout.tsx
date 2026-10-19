import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
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
import { configureRestNotifications } from '@/src/features/workout-session/rest-notifications';

SplashScreen.preventAutoHideAsync();
configureRestNotifications();

export const unstable_settings = {
  anchor: '(tabs)',
};

type DbStatus = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const colorScheme = useColorScheme();
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

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        await runMigrations();
        if (!cancelled) setDbStatus('ready');
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unknown database error';
          console.error('[db] Migration failed:', err);
          setDbError(message);
          setDbStatus('error');
        }
      }
    }

    boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const ready = dbStatus === 'ready' && (fontsLoaded || fontsError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Initialising…</Text>
      </View>
    );
  }

  if (dbStatus === ('error' as DbStatus)) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorDetail}>{dbError}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeManager>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="workout" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="completed" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
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
});
