import { useEffect, useRef, useMemo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { typography, radii } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SetPillProps {
  label: string;
  status: 'pending' | 'current' | 'done';
  onPress?: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SetPill({ label, status, onPress }: SetPillProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scale = useSharedValue(1);
  const bgFlash = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const prevStatus = useRef(status);

  useEffect(() => {
    if (status === 'done' && prevStatus.current !== 'done') {
      if (!reducedMotion) {
        scale.value = withSequence(
          withSpring(1.05, { damping: 12, stiffness: 200 }),
          withSpring(1, { damping: 18, stiffness: 250 }),
        );
        bgFlash.value = withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 200 }),
        );
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    prevStatus.current = status;
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: bgFlash.value * 0.3,
  }));

  return (
    <AnimatedTouchable
      style={[styles.pill, styles[status], animatedStyle]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[styles.flashOverlay, flashStyle]}
        pointerEvents="none"
      />
      <Text style={[styles.label, styles[`label_${status}`] as typeof styles.label]}>
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  pill: {
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.borderActive,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  pending: {},
  current: {
    backgroundColor: c.goldSurface,
    borderColor: c.gold,
  },
  done: {
    backgroundColor: c.successSurface,
    borderColor: c.successBorder,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.success,
    borderRadius: radii.pill,
  },
  label: {
    ...typography.monoSmall,
    color: c.textSecondary,
    position: 'relative',
  },
  label_pending: {},
  label_current: {
    color: c.gold,
  },
  label_done: {
    color: c.successText,
  },
});
