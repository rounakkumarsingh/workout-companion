import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';

interface CardioLoggerProps {
  weekNumber: number;
  onLog: (data: {
    intensityType: 'low_moderate' | 'high_intensity';
    activity: string;
    durationMinutes: number;
    note: string | null;
  }) => void;
}

export function CardioLogger({ onLog }: CardioLoggerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [intensity, setIntensity] = useState<'low_moderate' | 'high_intensity'>('low_moderate');
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(20);
  const [note, setNote] = useState('');

  const handleLog = () => {
    if (!activity.trim() || duration <= 0) return;
    onLog({
      intensityType: intensity,
      activity: activity.trim(),
      durationMinutes: duration,
      note: note.trim() || null,
    });
    setActivity('');
    setDuration(20);
    setNote('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Log Cardio / Mobility</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.toggle, intensity === 'low_moderate' && styles.toggleActive]}
          onPress={() => setIntensity('low_moderate')}
        >
          <Text
            style={[styles.toggleText, intensity === 'low_moderate' && styles.toggleTextActive]}
          >
            Low/Moderate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggle, intensity === 'high_intensity' && styles.toggleActive]}
          onPress={() => setIntensity('high_intensity')}
        >
          <Text
            style={[styles.toggleText, intensity === 'high_intensity' && styles.toggleTextActive]}
          >
            HIIT
          </Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Activity (e.g. stretching, cycling)"
        placeholderTextColor={colors.textMuted}
        value={activity}
        onChangeText={setActivity}
      />

      <View style={styles.stepperRow}>
        <Text style={styles.stepperLabel}>Duration</Text>
        <View style={styles.stepperControls}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setDuration(Math.max(1, duration - 5))}
          >
            <Text style={styles.stepBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepVal}>
            {duration}
            <Text style={styles.stepUnit}> min</Text>
          </Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setDuration(duration + 5)}>
            <Text style={styles.stepBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Optional note"
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
      />

      <CtaButton label="Log Cardio" onPress={handleLog} />
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    toggle: {
      flex: 1,
      backgroundColor: c.surfaceInteractive,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      borderRadius: radii.icon,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    toggleActive: {
      backgroundColor: c.goldSurface,
      borderColor: c.gold,
    },
    toggleText: {
      ...typography.monoSmall,
      color: c.textSecondary,
    },
    toggleTextActive: {
      color: c.gold,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.icon,
      padding: spacing.md,
      ...typography.monoBody,
      color: c.textPrimary,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepperLabel: {
      ...typography.monoSmall,
      color: c.textMuted,
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.dot,
      backgroundColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: {
      ...typography.monoBody,
      color: c.textSecondary,
    },
    stepVal: {
      ...typography.monoBody,
      color: c.textPrimary,
      minWidth: 60,
      textAlign: 'center',
    },
    stepUnit: {
      ...typography.monoSmall,
      color: c.textTertiary,
    },
  });
