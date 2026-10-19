import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { StreakBanner } from '@/components/ui/StreakBanner';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hydrateActiveSession, getCurrentStreak } from '@/src/features/workout-session';
import { computeAllStatistics } from '@/src/features/workout-session/statistics';
import type { ActiveSession, SessionStatistics } from '@/src/features/workout-session/types';

const dayNames: Record<string, string> = {
  Upper: 'Upper',
  Lower: 'Lower',
  Push: 'Push',
  Pull: 'Pull',
  Legs: 'Legs',
  OptionalCardioHIIT: 'Cardio',
  FullRest: 'Rest',
};

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) {
    return `${(vol / 1_000_000).toFixed(1)}m`;
  }
  if (vol >= 1_000) {
    return `${(vol / 1_000).toFixed(1)}k`;
  }
  return String(vol);
}

function FadeInView({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const delay = index * 50;
    opacity.value = withDelay(delay, withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) }));
  }, [index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const reducedMotion = useReducedMotion();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);
  const [streakCount, setStreakCount] = useState(0);

  const heroScale = useSharedValue(reducedMotion ? 1 : 0.8);

  useEffect(() => {
    if (!reducedMotion) {
      heroScale.value = withSpring(1, { damping: 10, stiffness: 150 });
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    (async () => {
      const hydrated = await hydrateActiveSession(sessionId);
      if (!hydrated) {
        setLoading(false);
        return;
      }
      setSession(hydrated);
      setStatistics(computeAllStatistics(hydrated));
      setLoading(false);

      setStreakCount(await getCurrentStreak());
    })();
  }, [sessionId]);

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));

  const handleDismiss = () => {
    router.dismissAll();
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'Summary', headerShown: false }} />
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const totalSets = session
    ? session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
    : 0;
  const completedSets = session
    ? session.exercises.reduce(
        (sum, ex) => sum + ex.sets.filter((s) => s.isComplete).length,
        0,
      )
    : 0;

  const sessionDate = session ? new Date(session.startedAt) : new Date();
  const dateStr = sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const heroSub = session
    ? `${dayNames[session.dayType] || session.dayType} Day · ${dateStr}`
    : '';

  const statCards = [
    {
      value: String(statistics?.elapsedMinutes ?? 0),
      unit: 'm',
      label: 'Duration',
      accent: false,
    },
    {
      value: formatVolume(statistics?.totalVolume ?? 0),
      unit: 'kg',
      label: 'Volume',
      accent: false,
    },
    {
      value: String(completedSets),
      unit: '',
      label: 'Sets Logged',
      accent: false,
    },
    {
      value: String(session?.exercises.length ?? 0),
      unit: '',
      label: 'Exercises',
      accent: false,
    },
  ];

  const exercises = session?.exercises ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Summary', headerShown: false }} />

      <View style={styles.hero}>
        <Animated.View style={heroStyle}>
          <Text style={styles.heroIcon}>🎯</Text>
        </Animated.View>
        <Text style={styles.heroTitle}>Session Done</Text>
        <Text style={styles.heroSub}>{heroSub}</Text>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((stat, i) => (
          <FadeInView key={stat.label} index={i}>
            <View style={styles.statCard}>
              <Text style={[styles.statVal, stat.accent && styles.statAccent]}>
                {stat.value}
                {stat.unit ? <Text style={styles.statUnit}> {stat.unit}</Text> : null}
              </Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          </FadeInView>
        ))}
      </View>

      {streakCount > 0 && (
        <StreakBanner
          count={streakCount}
          nextSessionLabel="Keep the streak going!"
        />
      )}

      <FadeInView index={4}>
        <SectionLabel label="Exercises completed" />
      </FadeInView>

      <View style={styles.exList}>
        {exercises.map((ex, i) => (
          <FadeInView key={ex.exerciseLogId} index={5 + i}>
            <View style={styles.exRow}>
              <Text style={styles.exIcon}>✓</Text>
              <Text style={styles.exName}>{ex.exerciseName}</Text>
              <Text style={styles.exDetail}>
                {ex.sets.filter((s) => s.isComplete).length}/{ex.sets.length} sets
              </Text>
            </View>
          </FadeInView>
        ))}
      </View>

      <View style={{ height: spacing.lg }} />
      <CtaButton label="Back to Home" onPress={handleDismiss} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    paddingVertical: 36,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 54,
    marginBottom: 10,
  },
  heroTitle: {
    ...typography.display,
    color: c.gold,
    letterSpacing: -0.02,
  },
  heroSub: {
    ...typography.body,
    color: c.textTertiary,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    paddingHorizontal: spacing.xxl,
    paddingBottom: 14,
  },
  statCard: {
    width: '48%',
    flex: 1,
    minWidth: '45%',
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.dot,
    padding: 11,
    alignItems: 'center',
  },
  statVal: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 20,
    lineHeight: 20,
    color: c.textPrimary,
  },
  statAccent: {
    color: c.gold,
  },
  statUnit: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: c.textTertiary,
  },
  statLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: c.textTertiary,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  exList: {
    paddingHorizontal: spacing.xxl,
    gap: 6,
    marginBottom: spacing.lg,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: c.successSurface,
    borderWidth: 0.5,
    borderColor: c.successBorder,
    borderRadius: radii.dot,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  exIcon: {
    fontSize: 18,
    color: c.successText,
  },
  exName: {
    flex: 1,
    ...typography.body,
    color: c.successText,
    fontWeight: '600',
  },
  exDetail: {
    ...typography.monoSmall,
    color: c.successDim,
  },
});
