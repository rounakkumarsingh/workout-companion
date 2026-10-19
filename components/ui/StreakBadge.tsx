import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface StreakBadgeProps {
  count: number;
}

export function StreakBadge({ count }: StreakBadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.badge}>
      <Text style={styles.num}>{count}</Text>
      <Text style={styles.label}>Streak</Text>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    badge: {
      backgroundColor: c.surfaceInteractive,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      borderRadius: radii.dot,
      paddingVertical: 7,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    num: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 26,
      lineHeight: 26,
      color: c.gold,
    },
    label: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 9,
      lineHeight: 10,
      color: c.textTertiary,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
      marginTop: 1,
    },
  });
