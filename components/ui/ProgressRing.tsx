import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { typography } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  innerStrokeWidth?: number;
  outerColor?: string;
  innerColor?: string;
  label?: string;
}

export function ProgressRing({
  percent,
  size = 160,
  strokeWidth = 9,
  innerStrokeWidth = 6,
  outerColor: outerColorProp,
  innerColor: innerColorProp,
  label,
}: ProgressRingProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const reducedMotion = useReducedMotion();

  const outerColor = outerColorProp ?? colors.successBorder;
  const innerColor = innerColorProp ?? colors.gold;

  const half = size / 2;
  const outerRadius = half - strokeWidth / 2;
  const innerRadius = half - innerStrokeWidth / 2 - 15;
  const outerCirc = 2 * Math.PI * outerRadius;
  const innerCirc = 2 * Math.PI * innerRadius;

  const outerAnimatedOffset = useSharedValue(outerCirc);
  const innerAnimatedOffset = useSharedValue(innerCirc);

  const targetOuterOffset = outerCirc * (1 - Math.min(percent, 1));
  const targetInnerOffset = innerCirc * (1 - Math.min(percent, 1));

  useEffect(() => {
    if (reducedMotion) {
      outerAnimatedOffset.value = targetOuterOffset;
      innerAnimatedOffset.value = targetInnerOffset;
    } else {
      outerAnimatedOffset.value = withTiming(targetOuterOffset, {
        duration: 500,
        easing: Easing.out(Easing.quad),
      });
      innerAnimatedOffset.value = withTiming(targetInnerOffset, {
        duration: 500,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [percent, reducedMotion]);

  const outerAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: outerAnimatedOffset.value,
  }));

  const innerAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: innerAnimatedOffset.value,
  }));

  const strokeColor = percent >= 1 ? colors.success : outerColor;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={half}
          cy={half}
          r={outerRadius}
          fill="none"
          stroke={colors.textDim}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          cx={half}
          cy={half}
          r={outerRadius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={outerCirc}
          strokeLinecap="round"
          transform={`rotate(-90 ${half} ${half})`}
          animatedProps={outerAnimatedProps}
        />
        <Circle
          cx={half}
          cy={half}
          r={innerRadius}
          fill="none"
          stroke={colors.textDim}
          strokeWidth={innerStrokeWidth}
        />
        <AnimatedCircle
          cx={half}
          cy={half}
          r={innerRadius}
          fill="none"
          stroke={innerColor}
          strokeWidth={innerStrokeWidth}
          strokeDasharray={innerCirc}
          strokeLinecap="round"
          transform={`rotate(-90 ${half} ${half})`}
          animatedProps={innerAnimatedProps}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.pct}>{Math.round(percent * 100)}%</Text>
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      position: 'absolute',
      alignItems: 'center',
    },
    pct: {
      ...typography.monoLarge,
      color: c.textPrimary,
    },
    label: {
      ...typography.monoLabel,
      color: c.textSecondary,
      marginTop: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.1,
    },
  });
