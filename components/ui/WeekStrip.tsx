import { View, Text, StyleSheet } from 'react-native';
import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { typography, radii, useColors, type ColorSet } from '@/src/theme';
import { DayFigure, dayTypeToFigureKey } from './DayFigure';
import type { FigureTone } from './DayFigure';
import type { RecentDay } from '@/src/features/workout-session';

export type WeekDayType = 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs';
export type WeekDayState = 'done' | 'today' | 'rest' | 'upcoming' | 'missed';

export interface DayStatus {
  /** Weekday initial, e.g. "M". */
  label: string;
  /** Day of the month. */
  date: number;
  /** null on rest days. */
  dayType: WeekDayType | null;
  status: WeekDayState;
  /** Overrides the code under the figure, e.g. "MOB" or "UP+". */
  code?: string;
}

interface WeekStripProps {
  days: DayStatus[];
}

const DAY_CODES: Record<WeekDayType, string> = {
  Upper: 'UP',
  Lower: 'LO',
  Pull: 'PL',
  Push: 'PS',
  Legs: 'LG',
};

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const FIGURE_TONE: Record<WeekDayState, FigureTone> = {
  done: 'lit',
  today: 'lit',
  upcoming: 'dim',
  missed: 'neutral',
  rest: 'neutral',
};

/** Strip cells for the rolling 7-day history, oldest first. */
export function recentDayStatuses(days: readonly RecentDay[]): DayStatus[] {
  const todayKey = days[days.length - 1]?.dateKey;
  return days.map((day) => {
    const dayType = day.workouts[0] ?? null;
    const extra = day.workouts.length > 1 ? '+' : '';
    return {
      label: WEEKDAY_INITIALS[day.date.getDay()] ?? '',
      date: day.date.getDate(),
      dayType,
      status: dayType ? 'done' : day.dateKey === todayKey ? 'today' : 'rest',
      code: dayType ? `${DAY_CODES[dayType]}${extra}` : day.mobility ? 'MOB' : undefined,
    };
  });
}

export function WeekStrip({ days }: WeekStripProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const dayColor = (status: WeekDayState) =>
    status === 'today' ? colors.goldText : colors.textSecondary;
  const markColor = (status: WeekDayState) =>
    status === 'done'
      ? colors.successText
      : status === 'missed'
        ? colors.dangerText
        : status === 'today'
          ? colors.goldText
          : colors.textSecondary;

  return (
    <View style={styles.strip} accessibilityLabel="Last 7 days">
      {days.map((day, i) => {
        const code = day.code ?? (day.dayType ? DAY_CODES[day.dayType] : 'REST');
        const mark = markColor(day.status);
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={`${day.dayType ?? 'Rest'}, ${day.date}, ${day.status}`}
            style={[styles.cell, styles[day.status]]}
          >
            <View style={styles.topRow}>
              <Text style={[styles.dayLabel, { color: dayColor(day.status) }]}>{day.label}</Text>
              <Text style={[styles.date, { color: dayColor(day.status) }]}>{day.date}</Text>
            </View>
            <DayFigure
              day={dayTypeToFigureKey(day.dayType ?? 'Rest')}
              size={20}
              tone={FIGURE_TONE[day.status]}
            />
            <View style={styles.bottomRow}>
              <Text style={[styles.code, { color: mark }]}>{code}</Text>
              {day.status === 'done' && (
                <Svg width={10} height={10} viewBox="0 0 24 24">
                  <Path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    fill="none"
                    stroke={mark}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              {day.status === 'missed' && (
                <Svg width={10} height={10} viewBox="0 0 24 24">
                  <Path
                    d="M7 7l10 10M17 7L7 17"
                    fill="none"
                    stroke={mark}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                </Svg>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// The strip has no horizontal padding of its own; the screen supplies the gutter.
const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    strip: {
      flexDirection: 'row',
      gap: 4,
    },
    cell: {
      flex: 1,
      minWidth: 0,
      height: 72,
      borderRadius: radii.row,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    done: {
      backgroundColor: c.successSurface,
      borderColor: c.successBorder,
    },
    today: {
      backgroundColor: c.goldSurface,
      borderColor: c.goldStroke,
      borderWidth: 1.5,
    },
    rest: {
      backgroundColor: 'transparent',
      borderStyle: 'dashed',
    },
    upcoming: {},
    missed: {
      backgroundColor: c.dangerSurface,
      borderColor: c.dangerBorder,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 3,
    },
    dayLabel: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 13,
    },
    date: {
      ...typography.monoTiny,
    },
    bottomRow: {
      height: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    code: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 10,
    },
  });
