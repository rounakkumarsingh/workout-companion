import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { typography, radii, spacing, useColors, type ColorSet, MIN_TAP_SIZE } from '@/src/theme';

interface TechniqueNotesProps {
  notes: string | null | undefined;
}

export function TechniqueNotes({ notes }: TechniqueNotesProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  const animHeight = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    maxHeight: animHeight.value,
    overflow: 'hidden',
  }));

  const handleToggle = () => {
    const next = !expanded;
    animHeight.value = withTiming(next ? 500 : 0, { duration: 300 });
    setExpanded(next);
  };

  if (!notes) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggle} onPress={handleToggle} activeOpacity={0.7}>
        <Text style={styles.icon}>{expanded ? '▼' : '▶'}</Text>
        <Text style={styles.label}>Technique notes & form cues</Text>
      </TouchableOpacity>
      <Animated.View style={animatedStyle}>
        <View style={styles.content}>
          <Text style={styles.text}>{notes}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
    },
    toggle: {
      minHeight: MIN_TAP_SIZE,
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    icon: {
      fontSize: 10,
      color: c.gold,
    },
    label: {
      ...typography.monoLabel,
      color: c.gold,
      letterSpacing: 0.08,
    },
    content: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xxl,
      marginTop: spacing.sm,
    },
    text: {
      ...typography.monoBody,
      color: c.textSecondary,
      lineHeight: 22,
    },
  });
