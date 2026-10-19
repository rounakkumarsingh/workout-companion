import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColors, typography, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  resolveCurrentSchedule,
  getProgramStart,
  getProgramWeekDays,
} from '@/src/features/workout-session';
import { PROGRAM } from '@/src/data/program';
import type { Week } from '@/src/data/program';

const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function WeekScreen() {
  const colors = useColors();
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [week, setWeek] = useState<Week | null>(null);
  // Weekday label for each program day (the program can start on any day).
  const [dayLabels, setDayLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [schedule, start] = await Promise.all([
            resolveCurrentSchedule(),
            getProgramStart(),
          ]);
          if (cancelled) return;
          const currentWeek = schedule.status === 'active' ? schedule.weekNumber : 1;
          setWeekNumber(currentWeek);
          setWeek(PROGRAM.weeks[currentWeek - 1]);
          setDayLabels(
            start
              ? getProgramWeekDays(start, currentWeek).map((d) => WEEKDAY_LABELS[d.date.getDay()])
              : [],
          );
        } catch {
          if (!cancelled) {
            setWeekNumber(1);
            setWeek(PROGRAM.weeks[0]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading || !week) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const blockName = week.blockName;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader subtitle={`This week's schedule`} title={`Week ${weekNumber}`} />
      <View style={styles.planDays}>
        {week.days.map((day, i) => {
          const isTraining = day.activityType === 'Training';
          const exCount = day.exercises.length;
          return (
            <View key={day.dayIndex} style={[styles.dayCard, !isTraining && styles.restCard]}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayLabels[i] ?? `DAY ${i + 1}`}</Text>
                <Text style={[styles.dayName, !isTraining && styles.restName]}>
                  {isTraining
                    ? `${day.dayType} Day`
                    : day.activityType === 'OptionalCardioHIIT'
                      ? 'Cardio / HIIT'
                      : 'Rest Day'}
                </Text>
                {isTraining && <Text style={styles.dayBadge}>{exCount} ex.</Text>}
              </View>
              {isTraining && (
                <View style={styles.chips}>
                  {day.exercises.map((ex) => (
                    <View key={`${ex.exerciseName}-${ex.sortOrder}`} style={styles.chip}>
                      <Text style={styles.chipText}>{ex.exerciseName}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planDays: {
      paddingHorizontal: spacing.xxl,
      gap: 7,
      paddingTop: spacing.xl,
    },
    dayCard: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: 14,
      padding: 13,
    },
    restCard: {
      backgroundColor: c.restSurface,
      borderColor: c.restBorder,
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 9,
    },
    dayLabel: {
      ...typography.monoSmall,
      color: c.textTertiary,
      width: 32,
    },
    dayName: {
      ...typography.bodyLarge,
      color: c.textPrimary,
      flex: 1,
    },
    restName: {
      color: c.textMuted,
    },
    dayBadge: {
      ...typography.monoLabel,
      color: c.textTertiary,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },
    chip: {
      backgroundColor: c.border,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      borderRadius: 6,
      paddingVertical: 3,
      paddingHorizontal: 9,
    },
    chipText: {
      ...typography.monoSmall,
      color: c.textSecondary,
    },
  });
