import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { typography, radii, spacing } from '@/src/theme';
import { useColors } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import type { RecentDay, TrainingDayType } from '@/src/features/workout-session';

export interface DayStatus {
  label: string;
  status: 'done' | 'today' | 'rest';
  /** Short text shown in place of the pip, e.g. what was trained. */
  detail?: string;
}

interface WeekStripProps {
  days: DayStatus[];
}

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const DAY_TYPE_ABBR: Record<TrainingDayType, string> = {
  Upper: 'UPR',
  Lower: 'LWR',
  Pull: 'PULL',
  Push: 'PUSH',
  Legs: 'LEGS',
};

/** Strip cells for the rolling 7-day history, oldest first. */
export function recentDayStatuses(days: readonly RecentDay[]): DayStatus[] {
  const todayKey = days[days.length - 1]?.dateKey;
  return days.map((day) => {
    const done = [...day.workouts.map((t) => DAY_TYPE_ABBR[t]), ...(day.mobility ? ['MOB'] : [])];
    return {
      label: WEEKDAY_INITIALS[day.date.getDay()],
      status: day.workouts.length > 0 ? 'done' : day.dateKey === todayKey ? 'today' : 'rest',
      detail: done.length > 0 ? `${done[0]}${done.length > 1 ? '+' : ''}` : undefined,
    };
  });
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
          {day.detail ? (
            <Text
              style={[styles.detail, styles[`label_${day.status}`] as typeof styles.detail]}
              numberOfLines={1}
            >
              {day.detail}
            </Text>
          ) : (
            <View style={[styles.pip, styles[`pip_${day.status}`] as typeof styles.pip]} />
          )}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
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
    dotLabel: {
      ...typography.monoTiny,
      color: c.textMuted,
      letterSpacing: 0.06,
      textTransform: 'uppercase',
    },
    detail: {
      ...typography.monoTiny,
      fontSize: 8,
      lineHeight: 10,
      color: c.textTertiary,
    },
    label_done: {
      color: c.successDim,
    },
    label_today: {
      color: c.goldDim,
    },
    label_rest: {},
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
  });
