import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing, useColors, type ColorSet } from '@/src/theme';

/** Column widths shared with the header row in SetLogList. */
export const SET_COL = { num: 36, kg: 64, reps: 48, mark: 40 } as const;

interface SetLogRowProps {
  index: number;
  /** Reps as shown in the REPS column, "—" when unknown. */
  reps: string;
  /** Weight as shown in the KG column, "—" when unknown. */
  weight: string;
  /** What was done last time for this set, e.g. "50 kg × 10". */
  previous?: string;
  /** `target` = pending set showing the prefilled suggestion. */
  status: 'pending' | 'current' | 'done' | 'target';
}

export function SetLogRow({ index, reps, weight, previous, status }: SetLogRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDone = status === 'done';
  const isCurrent = status === 'current';
  const isTarget = status === 'target';
  const valueStyle = [
    styles.value,
    isDone && styles.valueDone,
    isCurrent && styles.valueCurrent,
    isTarget && styles.valueTarget,
  ];
  const label =
    `Set ${index}` +
    (previous ? `, previous ${previous}` : '') +
    `, ${weight} kg, ${reps} reps` +
    (isDone ? ', done' : '');

  return (
    <View
      style={[styles.row, isDone && styles.rowDone, isCurrent && styles.rowCurrent]}
      accessibilityLabel={label}
    >
      <Text style={[styles.num, isDone && styles.numDone, isCurrent && styles.numCurrent]}>
        {index}
      </Text>
      <Text style={styles.previous} numberOfLines={1}>
        {previous ?? '—'}
      </Text>
      <Text style={[valueStyle, styles.kgCol]}>{weight}</Text>
      <Text style={[valueStyle, styles.repsCol]}>{reps}</Text>
      <Text style={[styles.mark, isDone ? styles.markDone : styles.markCurrent]}>
        {isDone ? '✓' : isCurrent ? '→' : ''}
      </Text>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    row: {
      height: 48,
      paddingLeft: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    rowDone: {
      backgroundColor: c.successSurface,
      borderTopColor: c.successBorder,
    },
    rowCurrent: {
      backgroundColor: c.goldSurface,
    },
    num: {
      ...typography.monoSmall,
      fontFamily: 'SpaceMono_700Bold',
      width: SET_COL.num,
      color: c.textSecondary,
    },
    numDone: {
      color: c.successText,
    },
    numCurrent: {
      color: c.goldText,
    },
    previous: {
      flex: 1,
      ...typography.monoLabel,
      color: c.textTertiary,
    },
    value: {
      ...typography.monoBody,
      fontFamily: 'SpaceMono_700Bold',
      textAlign: 'center',
      color: c.textPrimary,
    },
    kgCol: {
      width: SET_COL.kg,
    },
    repsCol: {
      width: SET_COL.reps,
    },
    valueDone: {
      color: c.successText,
    },
    valueCurrent: {
      color: c.goldText,
    },
    valueTarget: {
      color: c.textTertiary,
    },
    mark: {
      width: SET_COL.mark,
      textAlign: 'center',
      ...typography.monoBody,
    },
    markDone: {
      color: c.success,
    },
    markCurrent: {
      color: c.gold,
    },
  });
