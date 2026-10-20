import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { hydrateActiveSession } from '@/src/features/workout-session';
import {
  detectPersonalRecords,
  computeAllStatistics,
} from '@/src/features/workout-session/statistics';
import type { ActiveSession, SessionStatistics } from '@/src/features/workout-session/types';

export default function PrCelebrationScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [prs, setPrs] = useState<
    {
      exerciseName: string;
      set: { setIndex: number; weight: number; reps: number };
      previousBestWeight: number | null;
    }[]
  >([]);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);

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
      const detectedPrs = await detectPersonalRecords(hydrated);
      const stats = computeAllStatistics(hydrated);
      setPrs(detectedPrs);
      setStatistics(stats);
      setLoading(false);
    })();
  }, [sessionId]);

  const handleContinue = useCallback(() => {
    router.dismissAll();
  }, [router]);

  const handleShare = useCallback(() => {
    // Share PR - future scope
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'PR', headerShown: false }} />
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const firstPr = prs.length > 0 ? prs[0] : null;

  const newWeight = firstPr ? firstPr.set.weight : 0;
  const improvement =
    firstPr && firstPr.previousBestWeight !== null ? newWeight - firstPr.previousBestWeight : 0;
  const improvementPct =
    firstPr && firstPr.previousBestWeight !== null && firstPr.previousBestWeight > 0
      ? (improvement / firstPr.previousBestWeight) * 100
      : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'PR', headerShown: false }} />

      <View style={styles.gradientBar} />

      <View style={styles.hero}>
        <Text style={styles.trophy}>🏆</Text>
        {prs.length > 0 && (
          <View style={styles.prBadge}>
            <Text style={styles.prBadgeText}>New Personal Record</Text>
          </View>
        )}
        <Text style={styles.heroTitle}>
          {prs.length > 0 ? 'You just lifted\nmore than ever.' : 'Great session!'}
        </Text>
        {firstPr && (
          <Text style={styles.heroSub}>
            {firstPr.exerciseName} · Week {session?.weekNumber ?? ''}
          </Text>
        )}
      </View>

      {prs.length > 0 && firstPr && (
        <View style={styles.compareCard}>
          <Text style={styles.compareLabel}>{firstPr.exerciseName} — Weight PR</Text>
          <View style={styles.compareRow}>
            <View style={styles.prevBox}>
              <Text style={styles.prevVal}>
                {firstPr.previousBestWeight ?? '—'}
                {firstPr.previousBestWeight !== null && <Text style={styles.prevUnit}>kg</Text>}
              </Text>
              <Text style={styles.prevLbl}>Previous Best</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
            <View style={styles.newBox}>
              <Text style={styles.newVal}>
                {newWeight}
                <Text style={styles.newUnit}>kg</Text>
              </Text>
              <Text style={styles.newLbl}>New PR</Text>
            </View>
          </View>
          {firstPr.previousBestWeight !== null && (
            <Text style={styles.improvement}>
              +{improvement} kg · +{improvementPct.toFixed(1)}% improvement
            </Text>
          )}
        </View>
      )}

      {prs.length === 0 && (
        <View style={styles.greatSessionCard}>
          <Text style={styles.greatSessionIcon}>💪</Text>
          <Text style={styles.greatSessionTitle}>Great session!</Text>
          <Text style={styles.greatSessionSub}>Keep showing up and the PRs will come.</Text>
        </View>
      )}

      {statistics && (
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryVal}>
              {statistics.elapsedMinutes}
              <Text style={styles.summaryUnit}>m</Text>
            </Text>
            <Text style={styles.summaryLbl}>Duration</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryVal}>
              {statistics.totalVolume >= 1000
                ? `${(statistics.totalVolume / 1000).toFixed(1)}k`
                : statistics.totalVolume}
              <Text style={styles.summaryUnit}>kg</Text>
            </Text>
            <Text style={styles.summaryLbl}>Volume</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryVal}>
              {session?.exercises.reduce(
                (sum, ex) => sum + ex.sets.filter((s) => s.isComplete).length,
                0,
              ) ?? 0}
            </Text>
            <Text style={styles.summaryLbl}>Sets</Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryVal}>{session?.exercises.length ?? 0}</Text>
            <Text style={styles.summaryLbl}>Exercises</Text>
          </View>
        </View>
      )}

      <View style={{ height: spacing.md }} />

      <CtaButton label="Back to Home" onPress={handleContinue} />
      {prs.length > 0 && <GhostButton label="Share PR" onPress={handleShare} />}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingBottom: 40,
    },
    gradientBar: {
      height: 7,
      backgroundColor: c.gold,
    },
    hero: {
      paddingVertical: 28,
      paddingHorizontal: spacing.xxl,
      alignItems: 'center',
    },
    trophy: {
      fontSize: 56,
      marginBottom: 10,
    },
    prBadge: {
      backgroundColor: c.gold,
      paddingVertical: 4,
      paddingHorizontal: 14,
      borderRadius: 20,
      marginBottom: 10,
    },
    prBadgeText: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 10,
      letterSpacing: 0.15,
      textTransform: 'uppercase',
      color: c.blackText,
    },
    heroTitle: {
      ...typography.heading,
      color: c.textPrimary,
      textAlign: 'center',
      lineHeight: 36,
    },
    heroSub: {
      ...typography.body,
      color: c.textTertiary,
      marginTop: spacing.sm,
    },
    compareCard: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
    },
    compareLabel: {
      ...typography.monoTiny,
      color: c.textTertiary,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
      marginBottom: 11,
    },
    compareRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    prevBox: {
      flex: 1,
      backgroundColor: c.background,
      borderWidth: 0.5,
      borderColor: c.textDim,
      borderRadius: radii.icon,
      padding: 11,
      alignItems: 'center',
    },
    prevVal: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 26,
      color: c.textMuted,
    },
    prevUnit: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 13,
      color: c.textMuted,
    },
    prevLbl: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 9,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.08,
      marginTop: 3,
    },
    arrow: {
      fontSize: 20,
      color: c.gold,
    },
    newBox: {
      flex: 1,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.gold,
      borderRadius: radii.icon,
      padding: 11,
      alignItems: 'center',
    },
    newVal: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 30,
      color: c.gold,
    },
    newUnit: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 15,
      color: c.goldDim,
    },
    newLbl: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 9,
      color: c.goldDim,
      textTransform: 'uppercase',
      letterSpacing: 0.08,
      marginTop: 3,
    },
    improvement: {
      textAlign: 'center',
      marginTop: 8,
      ...typography.monoSmall,
      color: c.successText,
    },
    greatSessionCard: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.gold,
      borderRadius: radii.card,
      padding: spacing.xxl,
      alignItems: 'center',
    },
    greatSessionIcon: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    greatSessionTitle: {
      ...typography.heading,
      color: c.gold,
      textAlign: 'center',
    },
    greatSessionSub: {
      ...typography.body,
      color: c.goldDim,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    summaryStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      paddingHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
    },
    summaryStat: {
      width: '48%',
      flex: 1,
      minWidth: '45%',
      backgroundColor: c.surfaceInteractive,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: 10,
      padding: 11,
      alignItems: 'center',
    },
    summaryVal: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 20,
      lineHeight: 20,
      color: c.textPrimary,
    },
    summaryUnit: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 11,
      color: c.textTertiary,
    },
    summaryLbl: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 9,
      color: c.textTertiary,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
      marginTop: 3,
    },
  });
