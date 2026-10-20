import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColors, typography, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  getSessionsWithVolume,
  getSessionCountByWeek,
  getAllWorkoutDates,
} from '@/src/db/repositories/sessions';
import { getExerciseHistory, getVolumeByExercise } from '@/src/db/repositories/exercises';
import { getProgramStart } from '@/src/features/workout-session';
import { WorkoutCalendar } from '@/features/progress/WorkoutCalendar';
import { AdherenceGrid } from '@/features/progress/AdherenceGrid';
import { VolumeTrendChart } from '@/features/progress/VolumeTrendChart';
import { ExerciseProgressionCard } from '@/features/progress/ExerciseProgressionCard';
import { BodyweightSection } from '@/features/bodyweight/BodyweightSection';
import { PhotoSummaryCard } from '@/features/progress-photos/PhotoSummaryCard';

interface VolumeBar {
  weekNumber: number;
  volume: number;
  isFuture: boolean;
}

interface AdherenceWeek {
  weekNumber: number;
  sessionsCompleted: number;
}

export default function HistoryScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [volumeBars, setVolumeBars] = useState<VolumeBar[]>([]);
  const [adherenceWeeks, setAdherenceWeeks] = useState<AdherenceWeek[]>([]);
  const [topExercises, setTopExercises] = useState<string[]>([]);
  const [exerciseHistoryMap, setExerciseHistoryMap] = useState<
    Record<string, { date: string; weekNumber: number; sets: { weight: number; reps: number }[] }[]>
  >({});

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const programStart = await getProgramStart();
          const [dates, sessions, weeklyCounts, exerciseVolumes] = await Promise.all([
            getAllWorkoutDates(),
            getSessionsWithVolume(200),
            // Adherence covers the current program cycle only.
            getSessionCountByWeek(programStart?.toISOString()),
            getVolumeByExercise(),
          ]);

          if (cancelled) return;

          setWorkoutDates(dates);

          const weeks: AdherenceWeek[] = [];
          for (let w = 1; w <= 12; w++) {
            const found = weeklyCounts.find((c) => c.weekNumber === w);
            weeks.push({ weekNumber: w, sessionsCompleted: found?.count ?? 0 });
          }
          setAdherenceWeeks(weeks);

          const bars: VolumeBar[] = [];
          for (let w = 1; w <= 12; w++) {
            const weekSessions = sessions.filter(
              (s) =>
                s.weekNumber === w &&
                (s.status === 'completed' || s.status === 'abandoned') &&
                (!programStart || s.startedAt >= programStart.toISOString()),
            );
            const volume = weekSessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0);
            bars.push({ weekNumber: w, volume, isFuture: weekSessions.length === 0 });
          }
          setVolumeBars(bars);

          const sorted = exerciseVolumes.slice(0, 5).map((e) => e.exerciseName);
          setTopExercises(sorted);

          const historyMap: Record<
            string,
            { date: string; weekNumber: number; sets: { weight: number; reps: number }[] }[]
          > = {};
          for (const exName of sorted.slice(0, 3)) {
            const rows = await getExerciseHistory(exName, 30);
            const bySession = new Map<
              string,
              { date: string; weekNumber: number; sets: { weight: number; reps: number }[] }
            >();
            for (const r of rows) {
              const key = r.sessionId;
              if (!bySession.has(key)) {
                bySession.set(key, { date: r.sessionDate, weekNumber: r.weekNumber, sets: [] });
              }
              bySession.get(key)!.sets.push({ weight: r.weight, reps: r.reps });
            }
            historyMap[exName] = Array.from(bySession.values());
          }
          setExerciseHistoryMap(historyMap);
        } catch (e) {
          console.error('[history] Failed to load:', e);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ScreenHeader subtitle="Your workout history" title="History" />

      {/* Calendar View */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calendar</Text>
        <WorkoutCalendar workoutDates={workoutDates} />
      </View>

      {/* Weekly Adherence */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Adherence</Text>
        <AdherenceGrid weeks={adherenceWeeks} />
      </View>

      {/* Volume Trend */}
      <View style={styles.section}>
        <VolumeTrendChart bars={volumeBars} />
      </View>

      {/* Top Exercises */}
      {topExercises.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Progression</Text>
          {topExercises.slice(0, 3).map((exName) => {
            const history = exerciseHistoryMap[exName] ?? [];
            return <ExerciseProgressionCard key={exName} exerciseName={exName} history={history} />;
          })}
        </View>
      )}

      {/* Bodyweight */}
      <View style={styles.section}>
        <BodyweightSection />
      </View>

      {/* Progress photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress photos</Text>
        <PhotoSummaryCard />
      </View>

      <View style={{ height: 80 }} />
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
    section: {
      paddingHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      marginBottom: spacing.md,
    },
  });
