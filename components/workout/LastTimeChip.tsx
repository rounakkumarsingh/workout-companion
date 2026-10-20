import { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, hitSlopFor, type ColorSet } from '@/src/theme';
import type { LastTimeSummary } from '@/src/features/workout-session/last-time';

interface LastTimeChipProps {
  summary: LastTimeSummary;
  onPress: () => void;
}

/** One-line reference to what was done last time; tap to see every set. */
export function LastTimeChip({ summary, onPress }: LastTimeChipProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress}
      hitSlop={hitSlopFor(120, 24)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Last time, week ${summary.weekNumber}: ${summary.label}. Show all sets`}
    >
      <Text style={styles.text} numberOfLines={1}>
        Last: {summary.label} · Wk {summary.weekNumber} ›
      </Text>
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
      borderColor: c.goldBorder,
      backgroundColor: c.goldSurface,
    },
    text: {
      ...typography.monoLabel,
      color: c.goldText,
    },
  });
