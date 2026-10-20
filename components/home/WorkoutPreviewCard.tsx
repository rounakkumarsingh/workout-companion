import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { DayFigure, dayTypeToFigureKey } from '@/components/ui/DayFigure';
import { useColors, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

export interface PreviewExercise {
  name: string;
  rx: string;
  done?: boolean;
}

interface WorkoutPreviewCardProps {
  dayType: string;
  dayNumber: number;
  meta: string;
  exercises: PreviewExercise[];
  /** How many exercises to list before collapsing the rest into "+ n more". */
  limit?: number;
}

const ABBREV: Record<string, string> = {
  Upper: 'UP',
  Lower: 'LO',
  Pull: 'PL',
  Push: 'PS',
  Legs: 'LG',
};

export function WorkoutPreviewCard({
  dayType,
  dayNumber,
  meta,
  exercises,
  limit = 3,
}: WorkoutPreviewCardProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const shown = exercises.slice(0, limit);
  const more = exercises.length - shown.length;
  return (
    <View style={styles.card} accessibilityLabel={`Today's workout, ${dayType}`}>
      <View style={styles.figureCol}>
        <DayFigure day={dayTypeToFigureKey(dayType)} size={150} tone="lit" />
        <Text style={styles.caption}>
          {ABBREV[dayType] ?? dayType.toUpperCase()} · {dayType.toUpperCase()}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>
          Day {dayNumber} · {dayType}
        </Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.list}>
          {shown.map((e) => (
            <View key={e.name} style={styles.row}>
              <Text
                style={[styles.name, e.done && { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {e.name}
                {e.done ? ' ✓' : ''}
              </Text>
              <Text style={styles.rx}>{e.rx}</Text>
            </View>
          ))}
          {more > 0 && <Text style={styles.more}>+ {more} more</Text>}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    card: {
      padding: spacing.lg,
      borderRadius: radii.card,
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      flexDirection: 'row',
      gap: spacing.lg,
      alignItems: 'stretch',
    },
    figureCol: { width: 150, alignItems: 'center', gap: spacing.xs },
    caption: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 11,
      color: c.goldText,
    },
    info: { flex: 1, minWidth: 0, gap: spacing.sm },
    title: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 22,
      lineHeight: 24,
      color: c.textPrimary,
    },
    meta: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 11,
      color: c.textSecondary,
    },
    list: { marginTop: 2 },
    row: {
      paddingVertical: 5,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    name: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 16,
      lineHeight: 18,
      color: c.textPrimary,
    },
    rx: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 11,
      color: c.textSecondary,
    },
    more: {
      paddingTop: 4,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
      fontFamily: 'BarlowCondensed_600SemiBold',
      fontSize: 15,
      color: c.textTertiary,
    },
  });
