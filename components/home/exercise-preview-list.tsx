import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import type { ExercisePrescription } from '@/src/data/program';

interface ExercisePreviewListProps {
  exercises: readonly ExercisePrescription[];
  dimmed?: boolean;
}

export function ExercisePreviewList({ exercises, dimmed }: ExercisePreviewListProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (exercises.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>TODAY&apos;S EXERCISES</Text>
      {exercises.map((ex) => (
        <View key={`${ex.exerciseName}-${ex.sortOrder}`} style={styles.exerciseRow}>
          <Text style={[styles.exerciseName, dimmed && styles.dimmed]} numberOfLines={1}>
            {ex.exerciseName}
          </Text>
          <Text style={[styles.setInfo, dimmed && styles.dimmed]}>
            {ex.workingSets}×{ex.repRange}
          </Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 24,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    exerciseName: {
      fontSize: 16,
      color: c.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    setInfo: {
      fontSize: 15,
      color: c.success,
      fontWeight: '700',
      flexShrink: 0,
      fontVariant: ['tabular-nums'],
    },
    dimmed: {
      opacity: 0.4,
    },
  });
