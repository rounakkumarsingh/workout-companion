import { useEffect, useRef, useMemo } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { WEIGHT_INCREMENT_KG } from '@/src/features/workout-session/progression';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ActiveExercise } from '@/src/features/workout-session/types';
import type { LastTimeSummary } from '@/src/features/workout-session/last-time';
import { LastTimeChip } from '@/components/workout/LastTimeChip';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ExerciseRowProps {
  exercise: ActiveExercise;
  status: 'pending' | 'active' | 'done';
  progressionStatus?: 'ready' | 'almost' | null;
  /** Zero-based position in the list; shown as the lead number. */
  index: number;
  spec: string;
  /** What was done last time; omitted on the first time. */
  lastTime?: LastTimeSummary | null;
  onLastTimePress?: () => void;
  onPress: () => void;
  onLongPress?: () => void;
}

const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
const CHECK_LENGTH = 22;
const SHIMMER_WIDTH = 4;

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function buildMeta(exercise: ActiveExercise, status: ExerciseRowProps['status'], spec: string) {
  const total = exercise.sets.length;
  const done = exercise.sets.filter((s) => s.isComplete);
  const last = done[done.length - 1];
  if (status === 'done' && last) {
    return `${done.length}/${total} · ${fmt(last.weight)} kg × ${last.reps}`;
  }
  if (status === 'active') {
    const next = exercise.sets.find((s) => !s.isComplete);
    if (next) {
      const k = done.length + 1;
      return next.weight > 0
        ? `Set ${k} of ${total} · ${fmt(next.weight)} × ${next.reps}`
        : `Set ${k} of ${total}`;
    }
  }
  return spec;
}

export function ExerciseRow({
  exercise,
  status,
  progressionStatus,
  index,
  spec,
  lastTime,
  onLastTimePress,
  onPress,
  onLongPress,
}: ExerciseRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const prevStatus = useRef(status);
  const checkProgress = useSharedValue(status === 'done' ? 1 : 0);
  const shimmerOffset = useSharedValue(-SHIMMER_WIDTH);
  const flashOpacity = useSharedValue(0);

  // Check draw-in on done
  useEffect(() => {
    if (status === 'done' && prevStatus.current !== 'done') {
      if (!reducedMotion) {
        checkProgress.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.quad),
        });
      } else {
        checkProgress.value = 1;
      }
    }
    prevStatus.current = status;
  }, [status, reducedMotion, checkProgress]);

  // Shimmer on active
  useEffect(() => {
    if (status === 'active' && !reducedMotion) {
      shimmerOffset.value = withSequence(
        withTiming(300, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-SHIMMER_WIDTH, { duration: 0 }),
      );
    }
  }, [status, reducedMotion, shimmerOffset]);

  // Completion flash when last set of exercise is done
  useEffect(() => {
    if (status === 'done' && prevStatus.current === 'active') {
      if (!reducedMotion) {
        flashOpacity.value = withSequence(
          withTiming(0.15, { duration: 100 }),
          withTiming(0, { duration: 200 }),
        );
      }
    }
  }, [status, reducedMotion, flashOpacity]);

  const animatedCheckProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - checkProgress.value),
  }));

  const animatedShimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerOffset.value }],
  }));

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const isDone = status === 'done';
  const isActive = status === 'active';
  const meta = buildMeta(exercise, status, spec);
  const ready = !isDone && progressionStatus === 'ready';

  return (
    <TouchableOpacity
      style={[styles.row, isDone && styles.rowDone, isActive && styles.rowActive]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityLabel={`${exercise.exerciseName}, ${meta}, ${status}${ready ? `, increase weight ${WEIGHT_INCREMENT_KG} kg` : ''}`}
      accessibilityRole="button"
    >
      {isActive && !reducedMotion && (
        <Animated.View style={[styles.shimmer, animatedShimmerStyle]} pointerEvents="none" />
      )}
      {isDone && !reducedMotion && (
        <Animated.View style={[styles.flashOverlay, animatedFlashStyle]} pointerEvents="none" />
      )}

      <View style={[styles.lead, isDone && styles.leadDone, isActive && styles.leadActive]}>
        {isDone ? (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <AnimatedPath
              d={CHECK_PATH}
              stroke={colors.successText}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={animatedCheckProps}
            />
          </Svg>
        ) : (
          <Text style={[styles.leadText, isActive && styles.leadTextActive]}>{index + 1}</Text>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, isDone && styles.nameDone]} numberOfLines={2}>
          {exercise.exerciseName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, isDone && styles.metaDone, isActive && styles.metaActive]}>
            {meta}
          </Text>
          {ready && (
            <View style={styles.badge}>
              <Svg width={12} height={12} viewBox="0 0 24 24">
                <Path
                  d="M12 19V5M6 11l6-6 6 6"
                  stroke={colors.goldText}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Svg>
              <Text style={styles.badgeText}>+{fmt(WEIGHT_INCREMENT_KG)} kg</Text>
            </View>
          )}
        </View>
        {lastTime && onLastTimePress && !isDone ? (
          <LastTimeChip summary={lastTime} onPress={onLastTimePress} />
        ) : null}
      </View>

      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d="M9 6l6 6-6 6"
          stroke={colors.textTertiary}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    row: {
      minHeight: 64,
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.row,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      overflow: 'hidden',
      position: 'relative',
    },
    rowDone: {
      backgroundColor: 'transparent',
    },
    rowActive: {
      borderColor: c.goldStroke,
      backgroundColor: c.surfaceElevated,
    },
    shimmer: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: SHIMMER_WIDTH,
      height: '100%',
      backgroundColor: c.gold,
      opacity: 0.12,
    },
    flashOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.success,
      borderRadius: radii.row,
    },
    lead: {
      width: 36,
      height: 36,
      borderRadius: 9,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    leadDone: {
      backgroundColor: c.successSurface,
      borderColor: c.successBorder,
    },
    leadActive: {
      backgroundColor: c.goldSurface,
      borderColor: c.goldStroke,
      borderWidth: 1,
    },
    leadText: {
      ...typography.monoBody,
      fontFamily: 'SpaceMono_700Bold',
      color: c.textSecondary,
    },
    leadTextActive: {
      color: c.goldText,
    },
    info: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    name: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 17,
      lineHeight: 19,
      color: c.textPrimary,
    },
    nameDone: {
      color: c.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    meta: {
      ...typography.monoLabel,
      color: c.textSecondary,
    },
    metaDone: {
      color: c.successText,
    },
    metaActive: {
      color: c.goldText,
    },
    badge: {
      height: 20,
      paddingLeft: 3,
      paddingRight: 6,
      borderRadius: radii.pill,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    badgeText: {
      ...typography.monoTiny,
      fontFamily: 'SpaceMono_700Bold',
      color: c.goldText,
    },
  });
