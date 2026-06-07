import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';

export interface DayStatus {
  label: string;
  status: 'done' | 'today' | 'rest' | 'upcoming' | 'missed';
}

interface WeekStripProps {
  days: DayStatus[];
}

export function WeekStrip({ days }: WeekStripProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.strip}>
      {days.map((day, i) => (
        <View key={i} style={[styles.dot, styles[day.status]]}>
          <Text style={[styles.dotLabel, styles[`label_${day.status}`] as typeof styles.dotLabel]}>
            {day.label}
          </Text>
          <View style={[styles.pip, styles[`pip_${day.status}`] as typeof styles.pip]} />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  dot: {
    flex: 1,
    height: 44,
    borderRadius: radii.dot,
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  done: {
    backgroundColor: c.successSurface,
    borderColor: c.successBorder,
  },
  today: {
    backgroundColor: c.goldSurface,
    borderColor: c.gold,
  },
  rest: {
    backgroundColor: c.restSurface,
  },
  upcoming: {
    backgroundColor: c.surfaceInteractive,
  },
  missed: {
    backgroundColor: c.surfaceInteractive,
    opacity: 0.5,
  },
  dotLabel: {
    ...typography.monoTiny,
    color: c.textMuted,
    letterSpacing: 0.06,
    textTransform: 'uppercase',
  },
  label_done: {
    color: c.successDim,
  },
  label_today: {
    color: c.goldDim,
  },
  label_rest: {},
  label_upcoming: {},
  label_missed: {},
  pip: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.textDim,
  },
  pip_done: {
    backgroundColor: c.success,
  },
  pip_today: {
    backgroundColor: c.gold,
  },
  pip_rest: {},
  pip_upcoming: {},
  pip_missed: {},
});
