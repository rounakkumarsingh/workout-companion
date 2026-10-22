import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import React, { useMemo } from 'react';
import Animated from 'react-native-reanimated';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { typography, radii, useColors, type ColorSet } from '@/src/theme';

interface CtaButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

const CTA_HEIGHT = 56;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function CtaButton({ label, onPress, disabled, style }: CtaButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress(0.97);
  const reducedMotion = useReducedMotion();

  return (
    <AnimatedTouchable
      style={[styles.button, disabled && styles.disabled, !reducedMotion && animatedStyle, style]}
      onPress={onPress}
      onPressIn={!disabled && !reducedMotion ? onPressIn : undefined}
      onPressOut={!disabled && !reducedMotion ? onPressOut : undefined}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </AnimatedTouchable>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    button: {
      marginHorizontal: 20,
      marginBottom: 8,
      backgroundColor: c.gold,
      borderRadius: radii.button,
      minHeight: CTA_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabled: {
      backgroundColor: c.textDim,
    },
    label: {
      ...typography.cta,
      color: c.blackText,
      textTransform: 'uppercase',
    },
    labelDisabled: {
      color: c.textMuted,
    },
  });
