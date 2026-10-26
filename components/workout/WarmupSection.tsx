import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, type HostInstance } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  typography,
  radii,
  spacing,
  useColors,
  type ColorSet,
  hitSlopFor,
  MIN_TAP_SIZE,
} from '@/src/theme';
import { WEIGHT_INCREMENT_KG } from '@/src/features/workout-session/progression';
import { buildWarmupLadder, clampWarmupCount } from '@/src/features/workout-session/warmup-ladder';

interface WarmupSectionProps {
  prescribedMin: number;
  prescribedMax: number;
  /** The planned working weight (kg) the warm-up percentages apply to; 0 when not known yet. */
  workingWeight: number;
  warmupSets: { setLogId: string; setIndex: number; weight: number; reps: number }[];
  onLogWarmupSet: (weight: number, reps: number) => Promise<void>;
  /** Tapping a logged warm-up row opens it for editing. */
  onEditWarmupSet?: (setLogId: string) => void;
}

export function WarmupSection({
  prescribedMin,
  prescribedMax,
  workingWeight,
  warmupSets,
  onLogWarmupSet,
  onEditWarmupSet,
}: WarmupSectionProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [showEditor, setShowEditor] = useState(warmupSets.length === 0);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(10);
  const editorRef = useRef<HostInstance>(null);
  const loggingLadderRef = useRef(false);
  // The PDF's pyramid for the top of the listed range, steppable down to the minimum.
  const [ladderCount, setLadderCount] = useState(prescribedMax);
  const count = clampWarmupCount(ladderCount, prescribedMin, prescribedMax);
  const ladder = buildWarmupLadder(count, workingWeight, WEIGHT_INCREMENT_KG);
  const remaining = ladder.slice(warmupSets.length);
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
    animHeight.value = withTiming(expanded ? 760 : 0, { duration: 300 });
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

  const handleLogSuggestion = async (weight: number, reps: number) => {
    if (loggingLadderRef.current) return;
    loggingLadderRef.current = true;
    try {
      await onLogWarmupSet(weight, reps);
    } finally {
      loggingLadderRef.current = false;
    }
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
      {prescribedMax > 0 && (
        <Text style={styles.prescribed}>
          Prescribed: {prescribedMin}-{prescribedMax} warmup sets
        </Text>
      )}
      <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
        <Text style={hasLogged ? styles.toggleDone : styles.toggleActive}>
          {hasLogged
            ? `✓ ${warmupSets.length} warmup sets logged`
            : `Log warmup sets ${expanded ? '▾' : '▸'}`}
        </Text>
      </TouchableOpacity>
      <Animated.View style={animatedStyle}>
        {warmupSets.map((ws) => (
          <TouchableOpacity
            key={ws.setIndex}
            style={styles.loggedRow}
            disabled={!onEditWarmupSet}
            onPress={() => onEditWarmupSet?.(ws.setLogId)}
            accessibilityRole="button"
            accessibilityLabel={`Edit warmup ${ws.setIndex}, ${ws.weight} kg, ${ws.reps} reps`}
          >
            <Text style={styles.loggedLabel}>Warmup {ws.setIndex} ✓</Text>
            <Text style={styles.loggedDetail}>
              {ws.weight}kg × {ws.reps} reps{onEditWarmupSet ? '  ✎' : ''}
            </Text>
          </TouchableOpacity>
        ))}
        {ladder.length > 0 && (
          <View style={styles.ladder}>
            <View style={styles.ladderHead}>
              <Text style={styles.ladderTitle}>SUGGESTED LADDER</Text>
              {prescribedMax > prescribedMin ? (
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    hitSlop={hitSlopFor(36)}
                    onPress={() => setLadderCount(count - 1)}
                    disabled={count <= prescribedMin}
                    accessibilityLabel="Fewer warmup sets"
                    activeOpacity={0.6}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepVal}>{count} sets</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    hitSlop={hitSlopFor(36)}
                    onPress={() => setLadderCount(count + 1)}
                    disabled={count >= prescribedMax}
                    accessibilityLabel="More warmup sets"
                    activeOpacity={0.6}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {workingWeight <= 0 ? (
              <Text style={styles.ladderHint}>
                No working weight yet: percentages are of the weight you plan to use.
              </Text>
            ) : null}
            {remaining.length === 0 ? (
              <Text style={styles.ladderHint}>Ladder complete.</Text>
            ) : (
              remaining.map((step, i) => (
                <View key={step.setIndex} style={styles.ladderRow}>
                  <Text style={styles.ladderText}>
                    Warmup {step.setIndex} · ~{step.percent}%
                    {step.weight !== null ? ` · ${step.weight} kg × ${step.reps}` : ''}
                    {` (${step.repsLabel} reps)`}
                  </Text>
                  {i === 0 && step.weight !== null ? (
                    <TouchableOpacity
                      style={styles.ladderLog}
                      onPress={() => handleLogSuggestion(step.weight as number, step.reps)}
                      accessibilityRole="button"
                      accessibilityLabel={`Log warmup ${step.setIndex}: ${step.weight} kilograms for ${step.reps} reps`}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.logBtnText}>Log</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
        {showEditor && warmupSets.length < prescribedMax && (
          <Animated.View ref={editorRef} style={[styles.logRow, highlightStyle]}>
            <Text style={styles.logRowLabel}>Warmup {warmupSets.length + 1}</Text>
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Weight</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  hitSlop={hitSlopFor(36)}
                  onPress={() => adjustWeight(-2.5)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{weight} kg</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  hitSlop={hitSlopFor(36)}
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
                  hitSlop={hitSlopFor(36)}
                  onPress={() => adjustReps(-1)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepVal}>{reps}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  hitSlop={hitSlopFor(36)}
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
    ladder: {
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      borderRadius: radii.row,
      padding: spacing.lg,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    ladderHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    ladderTitle: {
      ...typography.monoLabel,
      color: c.goldText,
      letterSpacing: 0.1,
    },
    ladderHint: {
      ...typography.monoLabel,
      color: c.textSecondary,
      marginBottom: spacing.sm,
    },
    ladderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    ladderText: {
      ...typography.monoSmall,
      color: c.textPrimary,
      flex: 1,
    },
    ladderLog: {
      minHeight: MIN_TAP_SIZE,
      minWidth: 64,
      borderRadius: radii.button,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
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
      minHeight: MIN_TAP_SIZE,
      justifyContent: 'center',
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
      minHeight: MIN_TAP_SIZE,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    addBtnText: {
      ...typography.cta,
      color: c.gold,
    },
  });
