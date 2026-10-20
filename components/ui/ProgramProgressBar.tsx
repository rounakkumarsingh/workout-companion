import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { typography, spacing, useColors, type ColorSet } from '@/src/theme';

interface ProgramProgressBarProps {
  currentWeek: number;
  totalWeeks: number;
  /** When given, the bar tracks completed sessions instead of the week. */
  sessionsDone?: number;
  totalSessions?: number;
}

export function ProgramProgressBar({
  currentWeek,
  totalWeeks = 12,
  sessionsDone,
  totalSessions = 60,
}: ProgramProgressBarProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const bySessions = sessionsDone !== undefined;
  const pct = bySessions
    ? Math.round((sessionsDone / totalSessions) * 100)
    : Math.round((currentWeek / totalWeeks) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {bySessions
            ? `WEEK ${currentWeek} OF ${totalWeeks}`
            : `Week ${currentWeek} of ${totalWeeks}`}
        </Text>
        <Text style={styles.pct}>
          {bySessions ? `${sessionsDone} / ${totalSessions} sessions` : `${pct}%`}
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.min(pct, 100) }}
      >
        <View style={[styles.fill, { width: `${Math.min(pct, 100)}%` as unknown as number }]} />
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    label: {
      ...typography.monoSmall,
      color: c.textTertiary,
    },
    pct: {
      ...typography.monoSmall,
      color: c.gold,
    },
    track: {
      height: 4,
      backgroundColor: c.textDim,
      borderRadius: 2,
    },
    fill: {
      height: 4,
      backgroundColor: c.gold,
      borderRadius: 2,
    },
  });
