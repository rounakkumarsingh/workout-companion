import { useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, MIN_TAP_SIZE, type ColorSet } from '@/src/theme';

interface WeighInCardProps {
  onPress: () => void;
}

/** Nudge shown on Home until today's weight is logged. */
export function WeighInCard({ onPress }: WeighInCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Log today's weight"
    >
      <View style={styles.text}>
        <Text style={styles.title}>Log today&apos;s weight</Text>
        <Text style={styles.sub}>Takes a few seconds. The 7-day average is what you track.</Text>
      </View>
      <Text style={styles.action}>Log →</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      minHeight: MIN_TAP_SIZE,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.lg,
      borderRadius: radii.card,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      backgroundColor: c.goldSurface,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyLarge,
      color: c.textPrimary,
    },
    sub: {
      ...typography.body,
      color: c.textSecondary,
    },
    action: {
      ...typography.monoSmall,
      color: c.goldText,
    },
  });
