import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface RepsInputProps {
  value: number;
  onChange: (v: number) => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function StepperBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const colors = useColors();
  const stepStyles = useMemo(() => makeStepperStyles(colors), [colors]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (!reducedMotion) {
      scale.value = withSpring(0.93, { damping: 15, stiffness: 200 });
      setTimeout(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }, 100);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  };

  return (
    <AnimatedTouchable
      style={[stepStyles.adj, reducedMotion ? undefined : animatedStyle]}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <Text style={stepStyles.adjText}>{label}</Text>
    </AnimatedTouchable>
  );
}

const makeStepperStyles = (c: ColorSet) =>
  StyleSheet.create({
    adj: {
      width: 44,
      height: 44,
      borderRadius: radii.dot,
      backgroundColor: c.border,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    adjText: {
      ...typography.subheading,
      color: c.textSecondary,
      fontFamily: 'SpaceMono_400Regular',
    },
  });

export function RepsInput({ value, onChange }: RepsInputProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const handleAdjust = (delta: number) => {
    const next = Math.max(1, Math.min(30, value + delta));
    onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Reps</Text>
      <View style={styles.control}>
        <StepperBtn label="−" onPress={() => handleAdjust(-1)} />
        <View style={styles.valWrap}>
          <Text style={styles.val}>
            {value}
            <Text style={styles.unit}> reps</Text>
          </Text>
        </View>
        <StepperBtn label="+" onPress={() => handleAdjust(1)} />
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    wrap: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xxl,
    },
    label: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      marginBottom: spacing.lg,
    },
    control: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xl,
    },
    valWrap: {
      flex: 1,
      alignItems: 'center',
    },
    val: {
      ...typography.monoHero,
      color: c.textPrimary,
    },
    unit: {
      ...typography.monoBody,
      color: c.textTertiary,
    },
  });
