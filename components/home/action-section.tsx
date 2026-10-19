import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

export type ActionState = 'start' | 'resume' | 'completed';

interface ActionSectionProps {
  state: ActionState;
  onPress: (() => void) | null;
}

const LABELS: Record<ActionState, string> = {
  start: 'Start Workout',
  resume: 'Resume Workout',
  completed: 'Workout Complete',
};

export function ActionSection({ state, onPress }: ActionSectionProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (state === 'completed') {
    return (
      <View style={styles.container}>
        <View style={styles.completedBadge}>
          <Text style={styles.completedIcon}>✓</Text>
          <Text style={styles.completedText}>{LABELS.completed}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onPress ?? undefined}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>{LABELS[state]}</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 40,
    },
    primaryButton: {
      backgroundColor: c.success,
      borderRadius: 14,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      fontSize: 18,
      fontWeight: '700',
      color: c.blackText,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
      borderRadius: 14,
      height: 56,
      gap: 10,
    },
    completedIcon: {
      fontSize: 20,
      color: c.success,
      fontWeight: '800',
    },
    completedText: {
      fontSize: 18,
      fontWeight: '600',
      color: c.success,
    },
  });
