import { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, hitSlopFor, type ColorSet } from '@/src/theme';

interface RecordsChipProps {
  onPress: () => void;
}

/** Entry to an exercise's records and trend; shown once it has history. */
export function RecordsChip({ onPress }: RecordsChipProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      hitSlop={hitSlopFor(80, 24)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Records and trend for this exercise"
    >
      <Text style={styles.text}>Records ›</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
      paddingVertical: 2,
      paddingHorizontal: spacing.md,
      borderRadius: radii.pill,
      borderWidth: 0.5,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    text: {
      ...typography.monoLabel,
      color: c.textSecondary,
    },
  });
