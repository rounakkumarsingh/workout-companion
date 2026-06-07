import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/src/theme';

interface WeekCell {
  weekNumber: number;
  sessionsCompleted: number;
}

interface AdherenceGridProps {
  weeks: WeekCell[];
  onWeekTap?: (weekNumber: number) => void;
}

function cellColor(count: number): string {
  if (count >= 5) return '#3a7a3a';
  if (count >= 3) return '#5a7a3a';
  if (count >= 1) return '#7a7a2a';
  return '#1a1a1a';
}

function cellLabel(count: number): string {
  return `${count}/5`;
}

export function AdherenceGrid({ weeks, onWeekTap }: AdherenceGridProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Weekly Adherence</Text>
      <View style={styles.grid}>
        {weeks.map((w) => (
          <TouchableOpacity
            key={w.weekNumber}
            style={[styles.cell, { backgroundColor: cellColor(w.sessionsCompleted) }]}
            onPress={() => onWeekTap?.(w.weekNumber)}
            activeOpacity={0.7}
          >
            <Text style={styles.cellWeek}>W{w.weekNumber}</Text>
            <Text style={styles.cellCount}>{cellLabel(w.sessionsCompleted)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.monoLabel,
    color: colors.textTertiary,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    width: '14%',
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 38,
    minHeight: 38,
  },
  cellWeek: {
    ...typography.monoTiny,
    color: colors.textTertiary,
  },
  cellCount: {
    ...typography.monoTiny,
    color: colors.textSecondary,
    fontSize: 8,
  },
});
