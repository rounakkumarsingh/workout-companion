import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { radii, useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface StreakBadgeProps {
  count: number;
}

export function StreakBadge({ count }: StreakBadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const active = count > 0;
  const tint = active ? colors.goldText : colors.textSecondary;
  return (
    <View
      style={[styles.pill, !active && styles.pillIdle]}
      accessible
      accessibilityLabel={`${count} day streak`}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={1.75}>
        <Path
          d="M12 21a6 6 0 0 0 6-6c0-3.6-2.6-5.6-3.6-8.6-1 2-2.4 3.1-3.4 3.1 0-2.6-.6-4.5-2-6.5C8 6.6 6 10 6 15a6 6 0 0 0 6 6z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M12 21a2.5 2.5 0 0 1-2.5-2.5c0-1.8 1.5-2.8 2.5-4.5 1 1.7 2.5 2.7 2.5 4.5A2.5 2.5 0 0 1 12 21z"
          fill={tint}
          stroke="none"
        />
      </Svg>
      <Text style={[styles.num, { color: tint }]}>{count}</Text>
      <Text style={styles.label}>day streak</Text>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    pill: {
      height: 36,
      paddingLeft: 8,
      paddingRight: 12,
      borderRadius: radii.pill,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      backgroundColor: c.goldSurface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pillIdle: {
      borderColor: c.borderActive,
      backgroundColor: c.surface,
    },
    num: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 15,
    },
    label: {
      fontFamily: 'BarlowCondensed_600SemiBold',
      fontSize: 14,
      color: c.textSecondary,
    },
  });
