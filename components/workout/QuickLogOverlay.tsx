import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { RpeSelector } from '@/components/workout/RpeSelector';
import { CtaButton } from '@/components/ui/CtaButton';

interface QuickLogOverlayProps {
  exerciseName: string;
  visible: boolean;
  onClose: () => void;
  onLog: (weight: number, reps: number, rpe: number | null) => void;
}

export function QuickLogOverlay({ exerciseName, visible, onClose, onLog }: QuickLogOverlayProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>Quick Log</Text>
          <Text style={styles.exerciseName}>{exerciseName}</Text>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Weight</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => { setEditingWeight(null); setWeight(Math.max(0, weight - 2.5)); }} accessibilityLabel="Decrease weight by 2.5kg">
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepValWrap}>
                <TextInput
                  style={[styles.stepVal, styles.stepValInput]}
                  keyboardType="decimal-pad"
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
              <TouchableOpacity style={styles.stepBtn} onPress={() => { setEditingWeight(null); setWeight(weight + 2.5); }} accessibilityLabel="Increase weight by 2.5kg">
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Reps</Text>
            <View style={styles.stepperControls}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => { setEditingReps(null); setReps(Math.max(0, reps - 1)); }} accessibilityLabel="Decrease reps by 1">
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.stepValWrap}>
                <TextInput
                  style={[styles.stepVal, styles.stepValInput]}
                  keyboardType="number-pad"
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
              <TouchableOpacity style={styles.stepBtn} onPress={() => { setEditingReps(null); setReps(reps + 1); }} accessibilityLabel="Increase reps by 1">
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <RpeSelector selected={rpe} onSelect={setRpe} />

          <CtaButton label="Log Set" onPress={handleLog} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  card: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.card,
    padding: spacing.xl,
  },
  title: {
    ...typography.monoLabel,
    color: c.textTertiary,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  exerciseName: {
    ...typography.subheading,
    color: c.textPrimary,
    marginBottom: spacing.lg,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
