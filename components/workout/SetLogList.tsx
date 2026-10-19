import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { SetLogRow } from './SetLogRow';
import type { ActiveSet } from '@/src/features/workout-session/types';

interface SetLogListProps {
  sets: ActiveSet[];
  allSetsLogged: boolean;
  currentSetIndex: number;
}

export function SetLogList({ sets, allSetsLogged, currentSetIndex }: SetLogListProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.list}>
      {sets.map((set) => {
        const isLogged = set.isComplete;
        const status = isLogged
          ? 'done'
          : set.setIndex === currentSetIndex || (allSetsLogged && set.setIndex === sets.length)
          ? 'current'
          : 'pending';
        return (
          <SetLogRow
            key={set.setIndex}
            index={set.setIndex}
            reps={`${set.reps || 0} reps`}
            weight={`${set.weight || 0}kg`}
            status={status as 'done' | 'current' | 'pending'}
          />
        );
      })}
    </View>
  );
}

const makeStyles = (_c: ColorSet) => StyleSheet.create({
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: 7,
  },
});
