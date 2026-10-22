import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';
import { hydrateActiveSession } from '@/src/features/workout-session';
import {
  detectPersonalRecords,
  computeAllStatistics,
  type SessionPr,
} from '@/src/features/workout-session/statistics';
import {
  PR_KIND_LABEL,
  formatPrDelta,
  formatPrValue,
} from '@/src/features/workout-session/personal-records';
import type { ActiveSession, SessionStatistics } from '@/src/features/workout-session/types';

export default function PrCelebrationScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();

  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [prs, setPrs] = useState<SessionPr[]>([]);
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

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ title: 'PR', headerShown: false }} />
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

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
          {prs.length > 0 ? 'You just lifted\nmore than ever.' : 'Session done.'}
        </Text>
      </View>

      {prs.length > 0 && (
        <View style={styles.prList}>
          <View style={styles.prListHeader}>
            <Text style={styles.prCount}>
              {prs.length} {prs.length === 1 ? 'PR' : 'PRS'} THIS SESSION
            </Text>
            <Text style={styles.prVs}>VS PREVIOUS BEST</Text>
          </View>
          <View style={styles.prCard}>
            {prs.map((pr, i) => (
              <View
                key={`${pr.exerciseName}-${pr.kind}`}
                style={[styles.prRow, i > 0 && styles.prRowRule]}
                accessible
                accessibilityLabel={`${pr.exerciseName}, ${PR_KIND_LABEL[pr.kind]}, ${formatPrValue(pr.kind, pr.value, pr.set)}, up ${formatPrDelta(pr.kind, pr.value, pr.previous)}`}
              >
                <View style={styles.prRowMain}>
                  <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                  <Text style={styles.prType}>{PR_KIND_LABEL[pr.kind].toUpperCase()}</Text>
                </View>
                <View style={styles.prRowValue}>
                  <Text style={styles.prValue}>{formatPrValue(pr.kind, pr.value, pr.set)}</Text>
                  <Text style={styles.prDelta}>
                    ↑ {formatPrDelta(pr.kind, pr.value, pr.previous)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
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
            <Text style={styles.summaryVal}>
              {session?.exercises.filter((ex) => ex.sets.some((s) => s.isComplete)).length ?? 0}
            </Text>
            <Text style={styles.summaryLbl}>Exercises</Text>
          </View>
        </View>
      )}

      <View style={{ height: spacing.md }} />

      <CtaButton label="Back to Home" onPress={handleContinue} />

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
    prList: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
    },
    prListHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: spacing.sm,
    },
    prCount: {
      ...typography.monoLabel,
      fontFamily: 'SpaceMono_700Bold',
      letterSpacing: 0.9,
      color: c.goldText,
    },
    prVs: {
      ...typography.monoTiny,
      color: c.textTertiary,
    },
    prCard: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      borderRadius: radii.card,
      overflow: 'hidden',
    },
    prRow: {
      minHeight: 64,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    prRowRule: {
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    prRowMain: {
      flex: 1,
      gap: 2,
    },
    prExercise: {
      ...typography.exerciseName,
      lineHeight: 18,
      color: c.textPrimary,
    },
    prType: {
      ...typography.monoTiny,
      color: c.textTertiary,
    },
    prRowValue: {
      alignItems: 'flex-end',
      gap: 2,
    },
    prValue: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 16,
      color: c.goldText,
    },
    prDelta: {
      ...typography.monoLabel,
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
