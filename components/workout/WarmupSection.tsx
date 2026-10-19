import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface WarmupSectionProps {
  prescribedMin: number;
  prescribedMax: number;
  warmupSets: { setIndex: number; weight: number; reps: number }[];
  onLogWarmupSet: (weight: number, reps: number) => Promise<void>;
}

export function WarmupSection({
  prescribedMin,
  prescribedMax,
  warmupSets,
  onLogWarmupSet,
}: WarmupSectionProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(warmupSets.length === 0);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(10);
  const editorRef = useRef<View>(null);
  const highlight = useSharedValue(0);

  const animHeight = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    maxHeight: animHeight.value,
    overflow: 'hidden',
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    borderColor: highlight.value > 0.5 ? colors.goldDim : colors.borderActive,
    borderWidth: highlight.value > 0.5 ? 1 : 0.5,
  }));

  useEffect(() => {
    animHeight.value = withTiming(expanded ? 500 : 0, { duration: 300 });
  }, [expanded, animHeight]);

  useEffect(() => {
    setShowEditor(warmupSets.length === 0);
  }, [warmupSets.length]);

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpanded((p) => !p);
  };

  const handleLog = async () => {
    if (weight <= 0 || reps <= 0) return;
    await onLogWarmupSet(weight, reps);
    setWeight(0);
    setReps(10);
    setShowEditor(false);
  };

  const handleAdd = () => {
    setShowEditor(true);
    highlight.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 600 }),
    );
  };

  const adjustWeight = (delta: number) => {
    setWeight((p) => Math.max(0, Math.round((p + delta) * 10) / 10));
  };

  const adjustReps = (delta: number) => {
    setReps((p) => Math.max(1, p + delta));
  };

  const hasLogged = warmupSets.length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>WARMUP</Text>
      <Text style={styles.prescribed}>
        Prescribed: {prescribedMin}-{prescribedMax} warmup sets
      </Text>
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
        <Text style={hasLogged ? styles.toggleDone : styles.toggleActive}>
          {hasLogged
            ? `✓ ${warmupSets.length} warmup sets logged`
            : `Log warmup sets ${expanded ? '▾' : '▸'}`}
        </Text>
      </TouchableOpacity>
      <Animated.View style={animatedStyle}>
        {warmupSets.map((ws) => (
          <View key={ws.setIndex} style={styles.loggedRow}>
            <Text style={styles.loggedLabel}>Warmup {ws.setIndex} ✓</Text>
            <Text style={styles.loggedDetail}>
              {ws.weight}kg × {ws.reps} reps
            </Text>
          </View>
        ))}
        {showEditor && warmupSets.length < prescribedMax && (
          <Animated.View ref={editorRef} style={[styles.logRow, highlightStyle]}>
            <Text style={styles.logRowLabel}>Warmup {warmupSets.length + 1}</Text>
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Weight</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustWeight(-2.5)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{weight} kg</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustWeight(2.5)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Reps</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustReps(-1)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{reps}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustReps(1)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.logBtn} onPress={handleLog} activeOpacity={0.7}>
              <Text style={styles.logBtnText}>Log</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
        {!showEditor && warmupSets.length > 0 && warmupSets.length < prescribedMax && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ Add warmup set</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xxl,
      marginBottom: spacing.xl,
      marginHorizontal: spacing.xxl,
    },
    label: {
      ...typography.monoTiny,
      color: c.textTertiary,
      letterSpacing: 0.12,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    prescribed: {
      ...typography.monoSmall,
      color: c.textSecondary,
      marginBottom: spacing.sm,
    },
    toggleActive: {
      ...typography.monoLabel,
      color: c.gold,
    },
    toggleDone: {
      ...typography.monoSmall,
      color: c.successText,
    },
    loggedRow: {
      backgroundColor: c.successSurface,
      borderWidth: 0.5,
      borderColor: c.successBorder,
      borderRadius: radii.row,
      padding: spacing.xl,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    loggedLabel: {
      ...typography.monoSmall,
      color: c.successText,
    },
    loggedDetail: {
      ...typography.monoBody,
      color: c.successText,
      marginTop: spacing.xs,
    },
    logRow: {
      backgroundColor: c.surfaceCard,
      borderRadius: radii.row,
      padding: spacing.xl,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    logRowLabel: {
      ...typography.monoSmall,
      color: c.textSecondary,
      marginBottom: spacing.sm,
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
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.dot,
      backgroundColor: c.border,
      borderWidth: 0.5,
      borderColor: c.borderActive,
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
    logBtn: {
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldDim,
      borderRadius: radii.dot,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    logBtnText: {
      ...typography.monoSmall,
      color: c.gold,
    },
    addBtn: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    addBtnText: {
      ...typography.cta,
      color: c.gold,
    },
  });
