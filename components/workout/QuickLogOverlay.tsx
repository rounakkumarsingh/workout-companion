import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet, hitSlopFor } from '@/src/theme';
import { RpeSelector } from '@/components/workout/RpeSelector';
import { CtaButton } from '@/components/ui/CtaButton';

interface QuickLogOverlayProps {
  exerciseName: string;
  /** e.g. "Set 2 of 3" */
  setLabel?: string;
  /** e.g. "Prescribed 3×10-12" */
  detail?: string;
  initialWeight?: number;
  initialReps?: number;
  initialRpe?: number | null;
  /** Heading and button text; the defaults are for quick-logging a pending set. */
  title?: string;
  ctaLabel?: string;
  /** Warm-up sets have no RPE. */
  showRpe?: boolean;
  visible: boolean;
  onClose: () => void;
  onLog: (weight: number, reps: number, rpe: number | null) => void;
}

export function QuickLogOverlay({
  exerciseName,
  setLabel,
  detail,
  initialWeight = 0,
  initialReps = 0,
  initialRpe = null,
  title = 'Quick Log',
  ctaLabel = 'Log set → Rest',
  showRpe = true,
  visible,
  onClose,
  onLog,
}: QuickLogOverlayProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [weight, setWeight] = useState(initialWeight);
  const [reps, setReps] = useState(initialReps);
  const [rpe, setRpe] = useState<number | null>(initialRpe);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [editingReps, setEditingReps] = useState<string | null>(null);

  const handleLog = () => {
    if (weight <= 0 || reps <= 0) return;
    onLog(weight, reps, rpe);
    setWeight(0);
    setReps(0);
    setRpe(null);
    setEditingWeight(null);
    setEditingReps(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLabel={title}
        >
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <View style={styles.headText}>
              <Text style={styles.title}>
                {title}
                {setLabel ? ` · ${setLabel.toUpperCase()}` : ''}
              </Text>
              <Text style={styles.exerciseName}>{exerciseName}</Text>
              {detail ? <Text style={styles.detail}>{detail}</Text> : null}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel={`Close ${title.toLowerCase()}`}
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Weight</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepBtn}
                hitSlop={hitSlopFor(36)}
                onPress={() => {
                  setEditingWeight(null);
                  setWeight(Math.max(0, weight - 2.5));
                }}
                accessibilityLabel="Decrease weight by 2.5kg"
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepValWrap}>
                <TextInput
                  style={[styles.stepVal, styles.stepValInput]}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Weight in kilograms"
                  value={editingWeight ?? String(weight)}
                  onChangeText={(text) => {
                    setEditingWeight(text);
                    const num = parseFloat(text.replace(',', '.'));
                    setWeight(!isNaN(num) && num >= 0 ? num : 0);
                  }}
                  onFocus={() => setEditingWeight(String(weight))}
                  onBlur={() => setEditingWeight(null)}
                  selectTextOnFocus
                />
                <Text style={styles.stepUnit}> kg</Text>
              </View>
              <TouchableOpacity
                style={styles.stepBtn}
                hitSlop={hitSlopFor(36)}
                onPress={() => {
                  setEditingWeight(null);
                  setWeight(weight + 2.5);
                }}
                accessibilityLabel="Increase weight by 2.5kg"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Reps</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity
                style={styles.stepBtn}
                hitSlop={hitSlopFor(36)}
                onPress={() => {
                  setEditingReps(null);
                  setReps(Math.max(0, reps - 1));
                }}
                accessibilityLabel="Decrease reps by 1"
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepValWrap}>
                <TextInput
                  style={[styles.stepVal, styles.stepValInput]}
                  keyboardType="number-pad"
                  accessibilityLabel="Reps"
                  value={editingReps ?? String(reps)}
                  onChangeText={(text) => {
                    setEditingReps(text);
                    const num = parseInt(text, 10);
                    setReps(!isNaN(num) && num >= 0 ? num : 0);
                  }}
                  onFocus={() => setEditingReps(String(reps))}
                  onBlur={() => setEditingReps(null)}
                  selectTextOnFocus
                />
                <Text style={styles.stepUnit}> reps</Text>
              </View>
              <TouchableOpacity
                style={styles.stepBtn}
                hitSlop={hitSlopFor(36)}
                onPress={() => {
                  setEditingReps(null);
                  setReps(reps + 1);
                }}
                accessibilityLabel="Increase reps by 1"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showRpe ? <RpeSelector selected={rpe} onSelect={setRpe} /> : null}

          <CtaButton label={ctaLabel} onPress={handleLog} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.scrim,
      justifyContent: 'flex-end',
    },
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
    headText: {
      flex: 1,
      minWidth: 0,
    },
    detail: {
      ...typography.monoLabel,
      color: c.textSecondary,
      marginTop: 2,
    },
    closeBtn: {
      width: 44,
      height: 44,
      marginTop: -spacing.md,
      marginRight: -spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontSize: 18,
      color: c.textSecondary,
    },
    title: {
      ...typography.monoLabel,
      color: c.goldText,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    exerciseName: {
      ...typography.subheading,
      color: c.textPrimary,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    stepperLabel: {
      ...typography.monoSmall,
      color: c.textSecondary,
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
    stepValWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 60,
    },
    stepValInput: {
      borderBottomWidth: 1,
      borderBottomColor: c.gold,
      paddingVertical: 0,
      paddingHorizontal: 4,
    },
    stepUnit: {
      ...typography.monoSmall,
      color: c.textTertiary,
    },
  });
