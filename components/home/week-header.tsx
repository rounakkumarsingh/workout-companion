import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import type { DayPrescription } from '@/src/data/program';

interface WeekHeaderProps {
  weekNumber: number;
  blockName: string;
  dayPrescription: DayPrescription;
}

function formatDayFocus(focus: string): string {
  switch (focus) {
    case 'StrengthFocus':
      return 'Strength Focus';
    case 'HypertrophyFocus':
      return 'Hypertrophy Focus';
    default:
      return focus;
  }
}

export function WeekHeader({ weekNumber, blockName, dayPrescription }: WeekHeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const dayLabel =
    dayPrescription.activityType === 'Training' && dayPrescription.dayFocus
      ? `${dayPrescription.dayType}  ·  ${formatDayFocus(dayPrescription.dayFocus)}`
      : dayPrescription.dayType;

  return (
    <View style={styles.container}>
      <Text style={styles.weekText}>
        WEEK {weekNumber} · {blockName.toUpperCase()}
      </Text>
      <Text style={styles.dayText}>{dayLabel}</Text>
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    weekText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.8,
    },
    dayText: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      marginTop: 4,
    },
  });
