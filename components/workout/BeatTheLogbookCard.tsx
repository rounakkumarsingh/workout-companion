import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import type { ExerciseHistoryComparison } from '@/src/features/workout-session/types';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface BeatTheLogbookCardProps {
  comparison: ExerciseHistoryComparison | null;
  isLoading: boolean;
}

export function BeatTheLogbookCard({ comparison, isLoading }: BeatTheLogbookCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>BEAT THE LOGBOOK</Text>
      {!comparison ? (
        <Text style={styles.firstTime}>
          This is your first time on this exercise. Give it your best!
        </Text>
      ) : (
        <>
          <Text style={styles.lastTime}>
            Last time (Week {comparison.lastSession?.weekNumber ?? '—'}):
          </Text>
          {comparison.lastSession?.sets.map((set, i) => (
            <View key={i} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {set.setIndex}: </Text>
              <Text style={styles.setValue}>{set.weight}kg × {set.reps} reps</Text>
            </View>
          ))}
          {comparison.prs.length > 0 && (
            <View style={styles.prBadge}>
              <Text style={styles.prText}>
                🏆 PR: {comparison.prs[0].weight}kg × {comparison.prs[0].reps}
              </Text>
            </View>
          )}
          {comparison.progressionSuggestion.readyForWeightIncrease && (
            <View style={styles.weightBanner}>
              <Text style={styles.weightTitle}>↑ Ready for weight increase!</Text>
              <Text style={styles.weightSub}>
                Last week you hit top of range. Try 2.5kg heavier this week.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function LoadingSkeleton() {
  const opacity = useSharedValue(0.3);
  const colors = useColors();
  const skeletonStyles = useMemo(() => makeSkeletonStyles(colors), [colors]);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[skeletonStyles.skeleton, animatedStyle]} />
  );
}

const makeSkeletonStyles = (c: ColorSet) => StyleSheet.create({
  skeleton: {
    backgroundColor: c.surfaceCard,
    height: 120,
    borderRadius: radii.card,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xxl,
  },
});

const makeStyles = (c: ColorSet) => StyleSheet.create({
  card: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.card,
    padding: spacing.xxl,
    marginBottom: spacing.xl,
    marginHorizontal: spacing.xxl,
  },
  label: {
    ...typography.monoTiny,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  firstTime: {
    ...typography.monoBody,
    color: c.textMuted,
    textAlign: 'center',
  },
  lastTime: {
    ...typography.monoSmall,
    color: c.textSecondary,
    marginBottom: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  setLabel: {
    ...typography.monoSmall,
    color: c.textMuted,
  },
  setValue: {
    ...typography.monoSmall,
    color: c.textPrimary,
  },
  prBadge: {
    backgroundColor: c.goldSurface,
    borderWidth: 0.5,
    borderColor: c.goldDim,
    borderRadius: radii.dot,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  prText: {
    ...typography.monoSmall,
    color: c.gold,
  },
  weightBanner: {
    backgroundColor: c.goldSurface,
    borderWidth: 0.5,
    borderColor: c.goldDim,
    borderRadius: radii.dot,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  weightTitle: {
    ...typography.monoSmall,
    color: c.gold,
  },
  weightSub: {
    ...typography.monoTiny,
    color: c.textSecondary,
    marginTop: spacing.xs,
  },
});
