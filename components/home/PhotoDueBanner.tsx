import { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { typography, radii, spacing, MIN_TAP_SIZE, useColors, type ColorSet } from '@/src/theme';

interface PhotoDueBannerProps {
  onPress: () => void;
  /** Days since the last photo set; null when no photos exist yet. */
  daysSinceLast: number | null;
}

export function PhotoDueBanner({ onPress, daysSinceLast }: PhotoDueBannerProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const text =
    daysSinceLast === null
      ? 'Take your first front, side and rear photos to track your progress.'
      : `It has been ${daysSinceLast} days since your last progress photos.`;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Monthly progress photos due. ${text}`}
    >
      <View style={styles.body}>
        <Text style={styles.title}>PROGRESS PHOTOS DUE</Text>
        <Text style={styles.text}>{text}</Text>
      </View>
      <Text style={styles.cta}>Take photos →</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    banner: {
      minHeight: MIN_TAP_SIZE,
      padding: spacing.xl,
      borderRadius: radii.card,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      gap: spacing.sm,
    },
    body: { gap: spacing.xs },
    title: { ...typography.monoLabel, color: c.goldText, letterSpacing: 0.1 },
    text: { ...typography.body, color: c.textPrimary },
    cta: { ...typography.exerciseName, color: c.goldText },
  });
