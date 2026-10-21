import { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface StreakBannerProps {
  count: number;
  nextSessionLabel?: string;
}

export function StreakBanner({ count, nextSessionLabel }: StreakBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();
  const prevCount = useRef(count);
  const animProgress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) {
      animProgress.value = 0;
      animProgress.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.quad),
      });
    }
    prevCount.current = count;
  }, [count, reducedMotion, animProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(animProgress.value, [0, 0.3, 1], [1, 1.15, 1]);
    return {
      transform: [{ scale: withSpring(scale, { damping: 12, stiffness: 150 }) }],
    };
  });

  return (
    <View style={styles.banner}>
      <Animated.Text style={[styles.number, !reducedMotion && animatedStyle]}>
        {count}
      </Animated.Text>
      <View style={styles.textWrap}>
        <Text style={styles.text}>Day Streak</Text>
        {nextSessionLabel && <Text style={styles.sub}>{nextSessionLabel}</Text>}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    banner: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.gold,
      borderRadius: radii.card,
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.xxl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xl,
    },
    number: {
      ...typography.monoLarge,
      color: c.gold,
      lineHeight: 40,
    },
    textWrap: {
      flex: 1,
    },
    text: {
      ...typography.body,
      color: c.gold,
      fontWeight: '700',
    },
    sub: {
      ...typography.monoSmall,
      color: c.goldDim,
      marginTop: 2,
    },
  });
