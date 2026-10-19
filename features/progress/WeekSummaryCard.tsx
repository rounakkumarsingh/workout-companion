import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/src/theme';

interface WeekSummaryCardProps {
  weekNumber: number;
  sessionsCompleted: number;
  totalSessions: number;
  totalVolume: number;
  topExercises: string[];
}

export function WeekSummaryCard({
  weekNumber,
  sessionsCompleted,
  totalSessions,
  totalVolume,
  topExercises,
}: WeekSummaryCardProps) {
  const pct = totalSessions > 0 ? (sessionsCompleted / totalSessions) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.weekLabel}>Week {weekNumber}</Text>
        <Text style={styles.pct}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>
            {sessionsCompleted}/{totalSessions}
          </Text>
          <Text style={styles.statLbl}>Sessions</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{totalVolume.toLocaleString()}</Text>
          <Text style={styles.statLbl}>Volume</Text>
        </View>
      </View>
      {topExercises.length > 0 && (
        <View style={styles.exSection}>
          <Text style={styles.exLbl}>Top exercises</Text>
          {topExercises.slice(0, 3).map((ex, i) => (
            <Text key={i} style={styles.exName}>
              {ex}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weekLabel: {
    ...typography.subheading,
    color: colors.textPrimary,
  },
  pct: {
    ...typography.monoBody,
    color: colors.gold,
  },
  barTrack: {
    height: 3,
    backgroundColor: colors.textDim,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  barFill: {
    height: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    ...typography.monoMedium,
    color: colors.textPrimary,
  },
  statLbl: {
    ...typography.monoTiny,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginTop: 2,
  },
  exSection: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  exLbl: {
    ...typography.monoTiny,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginBottom: spacing.xs,
  },
  exName: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
});
