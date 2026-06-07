import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useColors, typography, spacing, radii } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getSessionsWithVolume, getSessionCountByWeek, getAllWorkoutDates } from '@/src/db/repositories/sessions';
import { getExerciseHistory } from '@/src/db/repositories/exercises';
import { getLatestBodyweightEntry, createBodyweightEntry } from '@/src/db/repositories/bodyweight';
import type { SessionWithVolume } from '@/src/db/repositories/sessions';
import { WorkoutCalendar } from '@/features/progress/WorkoutCalendar';
import { AdherenceGrid } from '@/features/progress/AdherenceGrid';
import { VolumeTrendChart } from '@/features/progress/VolumeTrendChart';
import { ExerciseProgressionCard } from '@/features/progress/ExerciseProgressionCard';
import { BodyweightInput } from '@/features/bodyweight/BodyweightInput';

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
  const [exerciseHistoryMap, setExerciseHistoryMap] = useState<Record<string, { date: string; weekNumber: number; sets: { weight: number; reps: number }[] }[]>>({});
  const [latestBodyweight, setLatestBodyweight] = useState<{ weight: number; unit: string; measuredAt: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const [dates, sessions, weeklyCounts, bwLatest] = await Promise.all([
            getAllWorkoutDates(),
            getSessionsWithVolume(200),
            getSessionCountByWeek(),
            getLatestBodyweightEntry(),
          ]);

          if (cancelled) return;

          setWorkoutDates(dates);
          setLatestBodyweight(bwLatest);

          const weeks: AdherenceWeek[] = [];
          for (let w = 1; w <= 12; w++) {
            const found = weeklyCounts.find((c) => c.weekNumber === w);
            weeks.push({ weekNumber: w, sessionsCompleted: found?.count ?? 0 });
          }
          setAdherenceWeeks(weeks);

          const bars: VolumeBar[] = [];
          for (let w = 1; w <= 12; w++) {
            const weekSessions = sessions.filter((s) => s.weekNumber === w && (s.status === 'completed' || s.status === 'abandoned'));
            const volume = weekSessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0);
            bars.push({ weekNumber: w, volume, isFuture: weekSessions.length === 0 });
          }
          setVolumeBars(bars);

          const volumeByExercise: Record<string, number> = {};
          for (const s of sessions) {
            if (s.status !== 'completed' && s.status !== 'abandoned') continue;
            const { getExerciseLogsBySession } = await import('@/src/db/repositories/exercises');
            const logs = await getExerciseLogsBySession(s.id);
            for (const log of logs) {
              volumeByExercise[log.exerciseName] = (volumeByExercise[log.exerciseName] ?? 0) + (s.totalVolume ?? 0);
            }
          }
          const sorted = Object.entries(volumeByExercise)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);
          setTopExercises(sorted);

          const historyMap: Record<string, { date: string; weekNumber: number; sets: { weight: number; reps: number }[] }[]> = {};
          for (const exName of sorted.slice(0, 3)) {
            const rows = await getExerciseHistory(exName, 30);
            const bySession = new Map<string, { date: string; weekNumber: number; sets: { weight: number; reps: number }[] }>();
            for (const r of rows) {
              const key = r.sessionDate;
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
      return () => { cancelled = true; };
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
            return (
              <ExerciseProgressionCard
                key={exName}
                exerciseName={exName}
                history={history}
              />
            );
          })}
        </View>
      )}

      {/* Bodyweight */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bodyweight</Text>
        <BodyweightInput
          lastValue={latestBodyweight ? { weight: latestBodyweight.weight, unit: latestBodyweight.unit, date: latestBodyweight.measuredAt } : null}
          onLog={async (weight, unit) => {
            await createBodyweightEntry({
              id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
              weight,
              unit,
              measuredAt: new Date().toISOString(),
              note: null,
            });
            const entry = await getLatestBodyweightEntry();
            setLatestBodyweight(entry);
          }}
        />
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
