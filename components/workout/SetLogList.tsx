import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { SetLogRow, SET_COL } from './SetLogRow';
import type { ActiveSet } from '@/src/features/workout-session/types';

interface SetLogListProps {
  sets: ActiveSet[];
  allSetsLogged: boolean;
  currentSetIndex: number;
  /** Last session's result per set index, e.g. "50 kg × 10". */
  previousBySetIndex?: Map<number, string>;
  /** When given, logged rows are tappable to edit that set. */
  onEditSet?: (setLogId: string) => void;
  /** Past workouts: unlogged sets are tappable too, to log them. */
  editPending?: boolean;
}

export function SetLogList({
  sets,
  allSetsLogged,
  currentSetIndex,
  previousBySetIndex,
  onEditSet,
  editPending = false,
}: SetLogListProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.list}>
      <View style={styles.head}>
        <Text style={[styles.headText, styles.headNum]}>SET</Text>
        <Text style={[styles.headText, styles.headPrev]}>PREVIOUS</Text>
        <Text style={[styles.headText, styles.headKg]}>KG</Text>
        <Text style={[styles.headText, styles.headReps]}>REPS</Text>
        <Text style={[styles.headText, styles.headMark]}>✓</Text>
      </View>
      {sets.map((set) => {
        const isLogged = set.isComplete;
        const status: 'done' | 'current' | 'pending' | 'target' = isLogged
          ? 'done'
          : set.setIndex === currentSetIndex || (allSetsLogged && set.setIndex === sets.length)
            ? 'current'
            : set.weight > 0 || set.reps > 0
              ? 'target'
              : 'pending';
        return (
          <SetLogRow
            key={set.setIndex}
            index={set.setIndex}
            reps={set.reps > 0 ? String(set.reps) : '—'}
            weight={set.weight > 0 ? String(set.weight) : '—'}
            previous={previousBySetIndex?.get(set.setIndex)}
            status={status}
            onPress={
              onEditSet && (isLogged || editPending) ? () => onEditSet(set.setLogId) : undefined
            }
          />
        );
      })}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    list: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.lg,
      borderRadius: radii.card,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    head: {
      height: 32,
      paddingLeft: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headText: {
      ...typography.monoTiny,
      letterSpacing: 0.6,
      color: c.textTertiary,
    },
    headNum: { width: SET_COL.num },
    headPrev: { flex: 1 },
    headKg: { width: SET_COL.kg, textAlign: 'center' },
    headReps: { width: SET_COL.reps, textAlign: 'center' },
    headMark: { width: SET_COL.mark, textAlign: 'center' },
  });
