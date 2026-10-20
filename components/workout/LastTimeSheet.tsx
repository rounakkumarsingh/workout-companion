import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import type { LastTimeSummary } from '@/src/features/workout-session/last-time';
import { WEIGHT_INCREMENT_KG } from '@/src/features/workout-session/progression';

interface LastTimeSheetProps {
  visible: boolean;
  exerciseName: string;
  summary: LastTimeSummary | null;
  /** Every working set last time hit the top of the rep range. */
  readyForWeightIncrease?: boolean;
  onClose: () => void;
}

/** Small sheet listing each set done last time on this exercise. */
export function LastTimeSheet({
  visible,
  exerciseName,
  summary,
  readyForWeightIncrease,
  onClose,
}: LastTimeSheetProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!summary) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel="Last time"
        >
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <View style={styles.headText}>
              <Text style={styles.title}>LAST TIME · WEEK {summary.weekNumber}</Text>
              <Text style={styles.exerciseName}>{exerciseName}</Text>
              <Text style={styles.date}>{summary.dateLabel}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Close last time"
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {summary.sets.map((set) => (
            <View key={set.setIndex} style={styles.setRow}>
              <Text style={styles.setLabel}>Set {set.setIndex}</Text>
              <Text style={styles.setValue}>{set.text}</Text>
              <Text style={styles.setRpe}>{set.rpe !== null ? `RPE ${set.rpe}` : ''}</Text>
            </View>
          ))}

          {readyForWeightIncrease ? (
            <View style={styles.hint}>
              <Text style={styles.hintTitle}>↑ Ready for more weight</Text>
              <Text style={styles.hintSub}>
                Every set hit the top of the range. Try {WEIGHT_INCREMENT_KG} kg heavier today.
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' },
    card: {
      backgroundColor: c.surfaceElevated,
      borderTopWidth: 0.5,
      borderColor: c.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: 34,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderControl,
      marginBottom: spacing.lg,
    },
    headRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    headText: { flex: 1, minWidth: 0 },
    title: {
      ...typography.monoLabel,
      color: c.goldText,
      letterSpacing: 0.1,
      marginBottom: spacing.xs,
    },
    exerciseName: { ...typography.subheading, color: c.textPrimary },
    date: { ...typography.monoLabel, color: c.textSecondary, marginTop: 2 },
    closeBtn: {
      width: 44,
      height: 44,
      marginTop: -spacing.md,
      marginRight: -spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: { fontSize: 18, color: c.textSecondary },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderTopWidth: 0.5,
      borderColor: c.border,
      gap: spacing.md,
    },
    setLabel: { ...typography.monoLabel, color: c.textSecondary, width: 52 },
    setValue: { ...typography.bodyLarge, color: c.textPrimary, flex: 1 },
    setRpe: { ...typography.monoLabel, color: c.textSecondary },
    hint: {
      marginTop: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.row,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
    },
    hintTitle: { ...typography.body, color: c.goldText },
    hintSub: { ...typography.monoLabel, color: c.textSecondary, marginTop: 2 },
  });
