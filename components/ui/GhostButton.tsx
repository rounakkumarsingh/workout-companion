import { TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import React, { useMemo } from 'react';
import Animated from 'react-native-reanimated';
import { useAnimatedPress } from '@/hooks/useAnimatedPress';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { radii, typography, useColors, type ColorSet } from '@/src/theme';

interface GhostButtonProps {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
  /** `danger` for destructive actions such as deleting. */
  tone?: 'default' | 'danger';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function GhostButton({ label, onPress, style, tone = 'default' }: GhostButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress(0.985);
  const reducedMotion = useReducedMotion();

  return (
    <AnimatedTouchable
      style={[
        styles.button,
        tone === 'danger' && styles.buttonDanger,
        !reducedMotion && animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={!reducedMotion ? onPressIn : undefined}
      onPressOut={!reducedMotion ? onPressOut : undefined}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.label, tone === 'danger' && styles.labelDanger]}>{label}</Text>
    </AnimatedTouchable>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    button: {
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: radii.button,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderControl,
    },
    buttonDanger: {
      borderColor: c.dangerBorder,
    },
    labelDanger: {
      color: c.dangerText,
    },
    label: {
      ...typography.cta,
      fontSize: 16,
      color: c.textPrimary,
      textTransform: 'uppercase',
    },
  });
