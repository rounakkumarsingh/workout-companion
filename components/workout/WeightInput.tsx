import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface WeightInputProps {
  value: number;
  unit?: string;
  step?: number;
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

export function WeightInput({ value, unit = 'kg', step = 2.5, onChange }: WeightInputProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const handleAdjust = (delta: number) => {
    const next = Math.max(0, Math.round((value + delta) * 10) / 10);
    onChange(next);
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(Math.round(parsed * 10) / 10);
    }
  };

  const display = editing ? draft : String(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Working Weight</Text>
      <View style={styles.control}>
        <StepperBtn label="−" onPress={() => handleAdjust(-step)} />
        {editing ? (
          <TextInput
            style={styles.input}
            value={display}
            onChangeText={setDraft}
            onBlur={handleBlur}
            keyboardType="numeric"
            selectTextOnFocus
            autoFocus
          />
        ) : (
          <TouchableOpacity style={styles.valWrap} onPress={() => setDraft(String(value))}>
            <Text style={styles.val} onPress={() => setEditing(true)}>
              {value}
              <Text style={styles.unit}> {unit}</Text>
            </Text>
          </TouchableOpacity>
        )}
        <StepperBtn label="+" onPress={() => handleAdjust(step)} />
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
    input: {
      flex: 1,
      textAlign: 'center',
      ...typography.monoHero,
      color: c.textPrimary,
      padding: 0,
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
