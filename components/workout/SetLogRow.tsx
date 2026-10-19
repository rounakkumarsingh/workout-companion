import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface SetLogRowProps {
  index: number;
  reps: string;
  weight: string;
  status: 'pending' | 'current' | 'done';
}

export function SetLogRow({ index, reps, weight, status }: SetLogRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDone = status === 'done';
  const isCurrent = status === 'current';

  return (
    <View style={[styles.row, isDone && styles.rowDone, isCurrent && styles.rowCurrent]}>
      <Text style={[styles.num, isDone && styles.numDone, isCurrent && styles.numCurrent]}>
        Set {index}
      </Text>
      <Text style={[styles.reps, isDone && styles.repsDone, isCurrent && styles.repsCurrent]}>
        {reps}
      </Text>
      <Text style={[styles.kg, isDone && styles.kgDone]}>{weight}</Text>
      {isDone && <Text style={styles.check}>✓</Text>}
      {isCurrent && <Text style={styles.arrow}>→</Text>}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    row: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.dot,
      paddingVertical: spacing.lg,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    rowDone: {
      borderColor: c.successBorder,
      backgroundColor: c.successSurface,
    },
    rowCurrent: {
      borderColor: c.gold,
      backgroundColor: c.goldSurface,
    },
    num: {
      ...typography.monoSmall,
      color: c.textTertiary,
      width: 36,
    },
    numDone: {
      color: c.successDim,
    },
    numCurrent: {
      color: c.goldDim,
    },
    reps: {
      flex: 1,
      ...typography.bodyLarge,
      color: c.textPrimary,
    },
    repsDone: {
      color: c.successText,
    },
    repsCurrent: {
      color: c.gold,
    },
    kg: {
      ...typography.monoBody,
      color: c.textTertiary,
    },
    kgDone: {
      color: c.successDim,
    },
    check: {
      fontSize: 14,
      color: c.success,
    },
    arrow: {
      fontSize: 12,
      color: c.gold,
    },
  });
