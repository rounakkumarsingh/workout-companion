import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColors, typography, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { resolveCurrentSchedule, getTodayPlan } from '@/src/features/workout-session';
import type { TodayPlan } from '@/src/features/workout-session';

export default function WeekScreen() {
  const colors = useColors();
  const [plan, setPlan] = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const schedule = await resolveCurrentSchedule();
          const currentWeek = schedule.status === 'active' ? schedule.weekNumber : 1;
          const weekPlan = await getTodayPlan(currentWeek);
          if (!cancelled) setPlan(weekPlan);
        } catch (e) {
          console.warn('[week] Failed to load the week:', e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading || !plan) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const doneCount = plan.choices.filter((c) => c.status === 'doneThisWeek').length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader
        subtitle={`Any order · ${doneCount} of ${plan.choices.length} done`}
        title={`Week ${plan.weekNumber}`}
      />
      <View style={styles.planDays}>
        {plan.choices.map((choice) => {
          const done = choice.status === 'doneThisWeek';
          const { exercises } = choice.dayPrescription;
          return (
            <View key={choice.dayType} style={[styles.dayCard, done && styles.doneCard]}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, done && styles.doneLabel]}>
                  {done ? 'DONE' : 'TO DO'}
                </Text>
                <Text style={styles.dayName}>{choice.dayType} Day</Text>
                <Text style={styles.dayBadge}>{exercises.length} ex.</Text>
              </View>
              <View style={styles.chips}>
                {exercises.map((ex) => (
                  <View key={`${ex.exerciseName}-${ex.sortOrder}`} style={styles.chip}>
                    <Text style={styles.chipText}>{ex.exerciseName}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
        <View style={[styles.dayCard, styles.restCard]}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayLabel}>OPT.</Text>
            <Text style={[styles.dayName, styles.restName]}>Cardio / Mobility</Text>
          </View>
          <Text style={styles.restNote}>Optional · at most once every 7 days</Text>
        </View>
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
    doneCard: {
      backgroundColor: c.successSurface,
      borderColor: c.successBorder,
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
      width: 44,
    },
    doneLabel: {
      color: c.successText,
    },
    dayName: {
      ...typography.bodyLarge,
      color: c.textPrimary,
      flex: 1,
    },
    restName: {
      color: c.textMuted,
    },
    restNote: {
      ...typography.monoSmall,
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
