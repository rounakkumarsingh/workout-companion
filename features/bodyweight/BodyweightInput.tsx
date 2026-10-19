import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';

interface BodyweightInputProps {
  lastValue: { weight: number; unit: string; date: string } | null;
  onLog: (weight: number, unit: 'lbs' | 'kg') => void;
}

export function BodyweightInput({ lastValue, onLog }: BodyweightInputProps) {
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'lbs' | 'kg'>('kg');

  const handleLog = () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) return;
    onLog(w, unit);
    setWeight('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Log Bodyweight</Text>

      {lastValue && (
        <Text style={styles.lastValue}>
          Last: {lastValue.weight} {lastValue.unit} ·{' '}
          {new Date(lastValue.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      )}

      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="0.0"
          placeholderTextColor={colors.textMuted}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
        />
        <View style={styles.unitRow}>
          <TouchableOpacity
            style={[styles.unitBtn, unit === 'kg' && styles.unitActive]}
            onPress={() => setUnit('kg')}
          >
            <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitBtn, unit === 'lbs' && styles.unitActive]}
            onPress={() => setUnit('lbs')}
          >
            <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextActive]}>lbs</Text>
          </TouchableOpacity>
        </View>
      </View>

      <CtaButton label="Log Weight" onPress={handleLog} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.monoLabel,
    color: colors.textTertiary,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  lastValue: {
    ...typography.monoSmall,
    color: colors.textTertiary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.icon,
    padding: spacing.md,
    ...typography.monoBody,
    color: colors.textPrimary,
  },
  unitRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitBtn: {
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: colors.borderActive,
    borderRadius: radii.icon,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  unitActive: {
    backgroundColor: colors.goldSurface,
    borderColor: colors.gold,
  },
  unitText: {
    ...typography.monoSmall,
    color: colors.textSecondary,
  },
  unitTextActive: {
    color: colors.gold,
  },
});
