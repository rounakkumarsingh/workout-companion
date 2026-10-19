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
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ActiveExercise } from '@/src/features/workout-session/types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ExerciseRowProps {
  exercise: ActiveExercise;
  status: 'pending' | 'active' | 'done';
  progressionStatus?: 'ready' | 'almost' | null;
  icon: string;
  spec: string;
  onPress: () => void;
  onLongPress?: () => void;
}

const CHECK_PATH = 'M6 12l4 4 8-8';
const CHECK_LENGTH = 28;
const SHIMMER_WIDTH = 4;

export function ExerciseRow({ exercise, status, progressionStatus, icon, spec, onPress, onLongPress }: ExerciseRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const prevStatus = useRef(status);
  const checkProgress = useSharedValue(0);
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
  }, [status]);

  // Shimmer on active
  useEffect(() => {
    if (status === 'active' && !reducedMotion) {
      shimmerOffset.value = withSequence(
        withTiming(300, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        withTiming(-SHIMMER_WIDTH, { duration: 0 }),
      );
    }
  }, [status]);

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
  }, [status]);

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

  return (
    <TouchableOpacity
      style={[styles.row, isDone && styles.rowDone, isActive && styles.rowActive]}
      onPress={() => {
        console.log('[ExerciseRow] onPress fired for:', exercise.exerciseName);
        onPress?.();
      }}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityLabel={`${exercise.exerciseName}, ${spec}, ${status}`}
      accessibilityRole="button"
    >
      {/* Shimmer overlay for active */}
      {isActive && !reducedMotion && (
        <Animated.View style={[styles.shimmer, animatedShimmerStyle]} pointerEvents="none" />
      )}

      {/* Completion flash overlay — only during the brief flash when exercise completes */}
      {isDone && !reducedMotion && (
        <Animated.View style={[styles.flashOverlay, animatedFlashStyle]} />
      )}

      <View
        style={[styles.iconWrap, isDone && styles.iconDone, isActive && styles.iconActive]}
        accessibilityLabel={`Exercise: ${exercise.exerciseName}`}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.name, isDone && styles.nameDone, isActive && styles.nameActive]}
          numberOfLines={1}
        >
          {exercise.exerciseName}
        </Text>
        <View style={styles.specRow}>
          <Text style={[styles.spec, isDone && styles.specDone, isActive && styles.specActive]}>
            {spec}
          </Text>
          {/* Progression indicator */}
          {progressionStatus === 'ready' && (
            <View style={styles.progressionBadge}>
              <Text style={styles.progressionIcon}>↑</Text>
            </View>
          )}
          {progressionStatus === 'almost' && (
            <View style={[styles.progressionBadge, styles.progressionAlmost]}>
              <Text style={[styles.progressionIcon, styles.progressionAlmostIcon]}>~</Text>
            </View>
          )}
        </View>
      </View>
      <View style={[styles.check, isDone && styles.checkDone, isActive && styles.checkActive]}>
        {isDone ? (
          <Svg width={22} height={22} viewBox="0 0 22 22">
            <AnimatedPath
              d={CHECK_PATH}
              stroke="#fff"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={animatedCheckProps}
            />
          </Svg>
        ) : (
          <Text style={[styles.chevron, isActive && styles.chevronActive]}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  row: {
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.row,
    paddingVertical: spacing.lg,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  rowDone: {
    borderColor: c.successBorder,
    backgroundColor: c.successSurface,
  },
  rowActive: {
    borderColor: c.gold,
    backgroundColor: c.goldSurface,
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.success,
    borderRadius: radii.row,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.icon,
    backgroundColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  iconDone: {
    backgroundColor: c.successDim,
  },
  iconActive: {
    backgroundColor: c.goldDim,
  },
  icon: {
    fontSize: 13,
    position: 'relative',
  },
  info: {
    flex: 1,
    position: 'relative',
  },
  name: {
    ...typography.exerciseName,
    color: c.textPrimary,
  },
  nameDone: {
    color: c.successText,
  },
  nameActive: {
    color: c.gold,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  spec: {
    ...typography.monoBody,
    color: c.textTertiary,
  },
  specDone: {
    color: c.successDim,
  },
  specActive: {
    color: c.goldDim,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  checkDone: {
    backgroundColor: c.success,
    borderColor: c.success,
  },
  checkActive: {
    borderColor: c.gold,
  },
  chevron: {
    fontSize: 16,
    color: c.textMuted,
    fontWeight: '700',
    lineHeight: 18,
  },
  chevronActive: {
    color: c.gold,
  },
  progressionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.successDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  progressionAlmost: {
    backgroundColor: c.goldDim,
  },
  progressionIcon: {
    fontSize: 12,
    color: c.successText,
    fontWeight: '700',
  },
  progressionAlmostIcon: {
    color: c.gold,
  },
});
