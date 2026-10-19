import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import React, { useMemo } from 'react';
import Animated from 'react-native-reanimated';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { radii, typography } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface GhostButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function GhostButton({ label, onPress, style }: GhostButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress(0.985);
  const reducedMotion = useReducedMotion();

  return (
    <AnimatedTouchable
      style={[styles.button, !reducedMotion && animatedStyle, style]}
      onPress={onPress}
      onPressIn={!reducedMotion ? onPressIn : undefined}
      onPressOut={!reducedMotion ? onPressOut : undefined}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{label}</Text>
    </AnimatedTouchable>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    button: {
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: radii.row,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 0.5,
      borderColor: c.borderActive,
    },
    label: {
      ...typography.body,
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.05,
    },
  });
