import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import type { ActiveExercise } from '@/src/features/workout-session/types';
import type { SetInputValues } from './types';
import { SetInputRow } from './set-input-row';

interface ExerciseCardProps {
  exercise: ActiveExercise;
  inputs: Record<string, SetInputValues>;
  onValueChange: (setLogId: string, field: keyof SetInputValues, value: string) => void;
  onCommit: (setLogId: string) => void;
  onPressDetail: (exerciseLogId: string) => void;
}

export function ExerciseCard({
  exercise,
  inputs,
  onValueChange,
  onCommit,
  onPressDetail,
}: ExerciseCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { prescription } = exercise;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPressDetail(exercise.exerciseLogId)}
    >
      <View style={styles.header}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {exercise.exerciseName}
        </Text>
        {exercise.substitutionNote && (
          <Text style={styles.substitutionNote} numberOfLines={1}>
            {exercise.substitutionNote}
          </Text>
        )}
      </View>

      {prescription && (
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              {prescription.workingSets}×{prescription.repRange}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              RPE{' '}
              {prescription.earlySetRpe
                ? `${prescription.earlySetRpe} / ${prescription.lastSetRpe}`
                : prescription.lastSetRpe}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{prescription.rest}</Text>
          </View>
        </View>
      )}

      <View style={styles.columnHeaders}>
        <Text style={[styles.columnLabel, { width: 36 }]} />
        <Text style={styles.columnLabel}>Wt</Text>
        <Text style={styles.columnLabel}>Reps</Text>
        <Text style={[styles.columnLabel, { flex: 0.8 }]}>RPE</Text>
      </View>

      {exercise.sets.map((set) => (
        <SetInputRow
          key={set.setLogId}
          set={set}
          values={inputs[set.setLogId]}
          onValueChange={onValueChange}
          onCommit={onCommit}
        />
      ))}
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 14,
      marginHorizontal: 16,
      marginVertical: 6,
      padding: 16,
    },
    header: {
      marginBottom: 8,
    },
    exerciseName: {
      fontSize: 17,
      fontWeight: '700',
      color: c.textPrimary,
    },
    substitutionNote: {
      fontSize: 12,
      color: c.textSecondary,
      fontStyle: 'italic',
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    metaChip: {
      backgroundColor: c.surfaceInteractive,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    metaChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.success,
      fontVariant: ['tabular-nums'],
    },
    columnHeaders: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      marginBottom: 4,
    },
    columnLabel: {
      flex: 1,
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      textAlign: 'center',
      letterSpacing: 0.5,
    },
  });
