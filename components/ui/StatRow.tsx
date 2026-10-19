import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

interface StatItem {
  value: string;
  label: string;
  accent?: boolean;
}

interface StatRowProps {
  stats: StatItem[];
}

export function StatRow({ stats }: StatRowProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <View key={i} style={styles.stat}>
          <Text style={[styles.val, stat.accent && styles.accent]}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 7,
      paddingHorizontal: spacing.xxl,
      paddingBottom: 14,
    },
    stat: {
      flex: 1,
      backgroundColor: c.surfaceInteractive,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.dot,
      padding: 11,
      alignItems: 'center',
    },
    val: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 20,
      lineHeight: 20,
      color: c.textPrimary,
    },
    accent: {
      color: c.gold,
    },
    label: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 9,
      lineHeight: 10,
      color: c.textTertiary,
      letterSpacing: 0.08,
      textTransform: 'uppercase',
      marginTop: 3,
    },
  });
