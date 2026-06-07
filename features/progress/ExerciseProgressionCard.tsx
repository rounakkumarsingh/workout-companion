import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/src/theme';

interface ProgressionEntry {
  date: string;
  weekNumber: number;
  sets: { weight: number; reps: number }[];
}

interface ExerciseProgressionCardProps {
  exerciseName: string;
  history: ProgressionEntry[];
}

function formatVolume(vol: number): string {
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}k`;
  return String(vol);
}

export function ExerciseProgressionCard({ exerciseName, history }: ExerciseProgressionCardProps) {
  if (history.length === 0) return null;

  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const latestVolume = latest.sets.reduce((s, set) => s + set.weight * set.reps, 0);
  const prevVolume = previous
    ? previous.sets.reduce((s, set) => s + set.weight * set.reps, 0)
    : 0;
  const change = prevVolume > 0 ? latestVolume - prevVolume : 0;
  const pctChange = prevVolume > 0 ? (change / prevVolume) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
        {previous && (
          <View style={change >= 0 ? styles.upBadge : styles.downBadge}>
            <Text style={[styles.changeText, change >= 0 ? styles.upText : styles.downText]}>
              {change >= 0 ? '↑' : '↓'} {formatVolume(Math.abs(change))} ({Math.round(pctChange)}%)
            </Text>
          </View>
        )}
      </View>

      {history.slice(-3).reverse().map((entry, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.dateLabel}>
            W{entry.weekNumber} · {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.setsLabel}>
            {entry.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  exerciseName: {
    ...typography.exerciseName,
    color: colors.textPrimary,
    flex: 1,
  },
  upBadge: {
    backgroundColor: colors.successSurface,
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  downBadge: {
    backgroundColor: '#1a0808',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  changeText: {
    ...typography.monoTiny,
    letterSpacing: 0.08,
  },
  upText: {
    color: colors.successText,
  },
  downText: {
    color: colors.danger,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  dateLabel: {
    ...typography.monoSmall,
    color: colors.textTertiary,
  },
  setsLabel: {
    ...typography.monoBody,
    color: colors.textSecondary,
  },
});
