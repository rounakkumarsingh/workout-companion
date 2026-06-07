import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { typography, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface ProgramProgressBarProps {
  currentWeek: number;
  totalWeeks: number;
}

export function ProgramProgressBar({ currentWeek, totalWeeks = 12 }: ProgramProgressBarProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pct = Math.round((currentWeek / totalWeeks) * 100);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Week {currentWeek} of {totalWeeks}</Text>
        <Text style={styles.pct}>{pct}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(pct, 100)}%` as unknown as number }]} />
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
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
