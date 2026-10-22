import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radii, spacing, useColors, type ColorSet } from '@/src/theme';

interface PreviousHintProps {
  /** Last session's result for this set, e.g. "50 kg × 10". */
  previous: string;
  /** Suggested weight jump, shown when every set hit the top of the range. */
  increaseKg?: number;
}

/** "Previous: 50 kg × 10" line for the log card, with an optional "+2.5 kg" marker. */
export function PreviousHint({ previous, increaseKg }: PreviousHintProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <Text style={styles.text}>Previous: {previous}</Text>
      {increaseKg ? (
        <View style={styles.badge} accessibilityLabel={`Ready to add ${increaseKg} kilograms`}>
          <Text style={styles.badgeText}>+{increaseKg} kg</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
    text: {
      ...typography.monoSmall,
      color: c.textSecondary,
    },
    badge: {
      paddingVertical: 1,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.pill,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      backgroundColor: c.goldSurface,
    },
    badgeText: {
      ...typography.monoLabel,
      fontFamily: 'SpaceMono_700Bold',
      color: c.goldText,
    },
  });
