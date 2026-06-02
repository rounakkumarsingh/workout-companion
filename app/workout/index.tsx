import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams, Stack, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, radii, spacing } from '@/src/theme';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { StatRow } from '@/components/ui/StatRow';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { Divider } from '@/components/ui/Divider';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import { QuickLogOverlay } from '@/components/workout/QuickLogOverlay';
import type { ActiveSession, ActiveSet, SessionProgress, ProgressionSuggestion } from '@/src/features/workout-session/types';
import type { DayStatus } from '@/components/ui/WeekStrip';
import {
  hydrateActiveSession,
  completeSession,
  abandonSession,
  updateSet,
  getSessionProgress,
  getElapsedMinutes,
  computeTotalVolume,
  getProgressionSuggestions,
} from '@/src/features/workout-session';
import { getActiveSession, getSessionsByWeek } from '@/src/db/repositories/sessions';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DevClearDbButton } from '@/components/ui/DevClearDbButton';

const EXERCISE_ICONS: Record<string, string> = {
  'Bench Press': '🏋️',
  'Overhead Press': '💪',
  'Incline Dumbbell Press': '🔁',
  'Tricep Pushdown': '📐',
  'Barbell Bench Press': '🏋️',
  'Machine Chest Press': '🏋️',
  'Machine Shoulder Press': '💪',
  'Seated DB Shoulder Press': '💪',
  'Bottom-Half DB Flye': '📐',
  'Bottom-Half Seated Cable Flye': '📐',
  'Cable Triceps Kickback': '📐',
  'EZ-Bar Skull Crusher': '📐',
  'Triceps Pressdown (Bar)': '📐',
  'Lying Leg Raise': '📐',
  'Ab Wheel Rollout': '📐',
  'High-Cable Lateral Raise': '💪',
  'Lat Pulldown': '🔁',
  'Barbell Row': '🔁',
  'Deadlift': '🔁',
  'Bicep Curl': '💪',
  'Incline Press': '🏋️',
  'DB Shoulder': '💪',
  'Lateral Raise': '💪',
  'Skull Crusher': '📐',
  'Squat': '🦵',
  'Leg Press': '🦵',
  'RDL': '🦵',
  'Leg Curl': '🦵',
  'Calf Raise': '🦵',
};

const EXERCISE_EMOJIS = ['🏋️', '💪', '🔁', '📐', '🦵', '🔥'];

const DAY_NAMES: Record<string, string> = {
  Upper: 'Upper Body',
  Lower: 'Lower Body',
  Pull: 'Pull',
  Push: 'Push A',
  Legs: 'Legs',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getExerciseIcon(name: string, index: number): string {
  return EXERCISE_ICONS[name] || EXERCISE_EMOJIS[index % EXERCISE_EMOJIS.length];
}

function getExerciseStatus(
  exercise: { sets: ActiveSet[] },
): 'done' | 'active' | 'pending' {
  const allDone = exercise.sets.every((s) => s.weight > 0 || s.reps > 0);
  if (allDone) return 'done';
  const anyLogged = exercise.sets.some((s) => s.weight > 0 || s.reps > 0);
  if (anyLogged) return 'active';
  return 'pending';
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function getDayName(dayType: string): string {
  return DAY_NAMES[dayType] || dayType;
}

/** Convert JS getDay() (0=Sun..6=Sat) → DAY_LABELS index (0=Mon..6=Sun). */
function getDayIndex(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getDayOfWeek(): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
}

function getWeekdayLabel(dayType: string, weekNumber: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  return `${today} · Week ${weekNumber}`;
}

interface ActiveState {
  phase: 'active';
  session: ActiveSession;
  progress: SessionProgress;
}

type ScreenState =
  | { phase: 'loading' }
  | ActiveState
  | { phase: 'error'; message: string };

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>({ phase: 'loading' });
  const activeRef = useRef<ActiveState | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const reducedMotion = useReducedMotion();
  const [elapsed, setElapsed] = useState('0m');
  const [progressionSuggestions, setProgressionSuggestions] = useState<Map<string, ProgressionSuggestion>>(new Map());
  const [weekDays, setWeekDays] = useState<DayStatus[]>([]);
  const [quickLogExercise, setQuickLogExercise] = useState<string | null>(null);

  const shakeOffset = useSharedValue(0);

  // Stable selectors for useEffect dependencies
  const phase = state.phase;
  const sessionId = state.phase === 'active' ? state.session.id : null;
  const exerciseStatusKey = state.phase === 'active'
    ? state.session.exercises.map((e) => e.status).join(',')
    : null;

  const hydrate = useCallback(async (sessionId: string) => {
    try {
      const session = await hydrateActiveSession(sessionId);
      if (!session) {
        setState({ phase: 'error', message: 'Session not found.' });
        return;
      }
      const s: ActiveState = {
        phase: 'active',
        session,
        progress: getSessionProgress(session),
      };
      activeRef.current = s;
      setState(s);
    } catch (e) {
      console.error('[workout] Failed to hydrate session:', e);
      setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const activeSession = await getActiveSession();
        const sessionId = params.sessionId ?? activeSession?.id;
        if (!sessionId) {
          if (!cancelled) setState({ phase: 'error', message: 'No active session.' });
          return;
        }
        if (!cancelled) await hydrate(sessionId);
      } catch (e) {
        console.error('[workout] Failed to load active session:', e);
        if (!cancelled) {
          setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [params.sessionId, hydrate]);

  useEffect(() => {
    if (state.phase !== 'active') return;
    setElapsed(formatElapsed(getElapsedMinutes(state.session)));
    const interval = setInterval(() => {
      if (activeRef.current) {
        setElapsed(formatElapsed(getElapsedMinutes(activeRef.current.session)));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [phase, sessionId]);

  useEffect(() => {
    if (state.phase === 'active') {
      getProgressionSuggestions(state.session).then((suggestions) => {
        const map = new Map<string, ProgressionSuggestion>();
        for (const s of suggestions) {
          map.set(s.exerciseName, s);
        }
        setProgressionSuggestions(map);
      });

      getSessionsByWeek(state.session.weekNumber).then((weekSessions) => {
        const todayIdx = getDayIndex(new Date());
        const days: DayStatus[] = DAY_LABELS.map((label, i) => {
          if (i === todayIdx) return { label, status: 'today' as const };
          const daySession = weekSessions.find((s) => {
            const mappedDay = getDayIndex(new Date(s.startedAt));
            return mappedDay === i;
          });
          if (daySession && (daySession.status === 'completed' || daySession.status === 'abandoned')) {
            return { label, status: 'done' as const };
          }
          if (i < todayIdx && !daySession) {
            const d = new Date();
            d.setDate(d.getDate() - (todayIdx - i));
            const dateStr = d.toISOString().slice(0, 10);
            const pastSession = weekSessions.find((s) => s.startedAt.slice(0, 10) === dateStr);
            if (!pastSession || pastSession.status !== 'in_progress') {
              return { label, status: 'missed' as const };
            }
          }
          return { label, status: 'upcoming' as const };
        });
        setWeekDays(days);
      });
    }
  }, [sessionId]);

  useEffect(() => {
    if (state.phase === 'active') {
      const activeIndex = state.session.exercises.findIndex((e) => e.status === 'active' || e.status === 'pending');
      if (activeIndex >= 0 && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: activeIndex,
            animated: !reducedMotion,
          });
        } catch { /* ignore if index out of bounds */ }
      }
    }
  }, [exerciseStatusKey]);

  useEffect(() => {
    if (state.phase === 'error' && !reducedMotion) {
      shakeOffset.value = withSequence(
        withTiming(-5, { duration: 50, easing: Easing.inOut(Easing.quad) }),
        withTiming(5, { duration: 50 }),
        withTiming(-5, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [phase]);

  useEffect(() => {
    if (state.phase !== 'loading') return;
    const timeout = setTimeout(() => {
      setState({ phase: 'error', message: 'Loading timed out. Please try again.' });
    }, 5000);
    return () => clearTimeout(timeout);
  }, [phase]);

  const errorShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const handleViewDetail = useCallback((exerciseLogId: string) => {
    console.log('[navigate] handleViewDetail called with exerciseLogId:', exerciseLogId);
    const url = `/workout/${exerciseLogId}` as Href;
    console.log('[navigate] pushing to:', url);
    router.push(url);
  }, [router]);

  const handleQuickLog = useCallback(async (weight: number, reps: number, rpe: number | null) => {
    const current = activeRef.current;
    if (!current || !quickLogExercise) return;
    const exercise = current.session.exercises.find((e) => e.exerciseLogId === quickLogExercise);
    if (!exercise) return;
    const pendingSet = exercise.sets.find((s) => s.weight <= 0 && s.reps <= 0);
    if (!pendingSet) return;
    try {
      const result = await updateSet(current.session, pendingSet.setLogId, { weight, reps, loggedRpe: rpe });
      if (result.success) {
        const updated: ActiveState = {
          phase: 'active',
          session: result.session,
          progress: getSessionProgress(result.session),
        };
        activeRef.current = updated;
        setState(updated);
      }
    } catch (e) {
      console.error('[workout] Failed to quick log set:', e);
      Alert.alert('Error', 'Failed to log set. Please try again.');
    }
  }, [quickLogExercise]);

  const handleComplete = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    const { session } = current;
    const allComplete = session.exercises.every((e) => e.status === 'completed');
    if (!allComplete) {
      const pendingCount = session.exercises.filter((e) => e.status === 'pending').length;
      Alert.alert(
        `${pendingCount} exercises not started`,
        'Complete anyway? Unstarted exercises will be skipped.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            style: 'default',
            onPress: async () => {
              try {
                const completed = await completeSession(session);
                router.replace(`/workout/pr-celebration?sessionId=${completed.id}`);
              } catch (e) {
                console.error('[workout] Failed to complete session:', e);
                Alert.alert('Error', 'Failed to complete workout. Please try again.');
              }
            },
          },
        ],
      );
    } else {
      Alert.alert(
        'Complete Workout',
        'Are you sure you want to finish this session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            style: 'default',
            onPress: async () => {
              try {
                const completed = await completeSession(session);
                router.replace(`/workout/pr-celebration?sessionId=${completed.id}`);
              } catch (e) {
                console.error('[workout] Failed to complete session:', e);
                Alert.alert('Error', 'Failed to complete workout. Please try again.');
              }
            },
          },
        ],
      );
    }
  }, [router]);

  const handleAbandon = useCallback(() => {
    Alert.alert(
      'End Session',
      'This will mark the session as incomplete. All logged sets will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            const current = activeRef.current;
            if (!current) return;
            try {
              await abandonSession(current.session);
              router.dismissAll();
            } catch (e) {
              console.error('[workout] Failed to abandon session:', e);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            }
          },
        },
      ],
    );
  }, [router]);

  if (state.phase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (state.phase === 'error') {
    return (
      <Animated.View style={[styles.centered, errorShakeStyle]}>
        <Text style={styles.errorText}>{state.message}</Text>
        <Text style={styles.errorSub}>Failed to load workout session</Text>
        <TouchableOpacity style={styles.dismissBtn} onPress={() => router.dismissAll()}>
          <Text style={styles.dismissBtnText}>Go Back</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const { session, progress } = state;
  const pct = progress.totalSets > 0 ? progress.completedSets / progress.totalSets : 0;
  const setsDisplay = `${progress.completedSets}/${progress.totalSets}`;
  const volume = computeTotalVolume(session);
  const formattedVolume = volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : `${volume}`;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Workout', headerShown: false }} />

      <TouchableOpacity
        style={{ backgroundColor: 'red', padding: 20, margin: 10 }}
        onPress={() => console.log('[test-btn] TEST BUTTON PRESSED')}
      >
        <Text style={{ color: 'white' }}>TEST BUTTON</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={session.exercises}
        keyExtractor={(item) => item.exerciseLogId}
        renderItem={({ item, index }) => {
          const status = getExerciseStatus(item);
          const spec = item.prescription
            ? `${item.prescription.workingSets}×${item.prescription.repRange}`
            : `${item.sets.length} sets`;
          const prog = progressionSuggestions.get(item.exerciseName);
          const progressionStatus = prog?.readyForWeightIncrease
            ? 'ready'
            : (prog?.topOfRange ? 'almost' : null);
          return (
            <ExerciseRow
                exercise={item}
                status={status}
                progressionStatus={progressionStatus}
                icon={getExerciseIcon(item.exerciseName, index)}
                spec={spec}
                onPress={() => handleViewDetail(item.exerciseLogId)}
                onLongPress={() => setQuickLogExercise(item.exerciseLogId)}
              />
          );
        }}
        ListHeaderComponent={
          <View>
            <View style={[styles.header, { paddingTop: insets.top + spacing.xxl }]}>
              <View>
                <Text style={styles.eyebrow}>{getWeekdayLabel(session.dayType, session.weekNumber)}</Text>
                <Text style={styles.headerTitle}>{getDayName(session.dayType)}</Text>
              </View>
              <StreakBadge count={12} />
            </View>

            <View style={styles.ringSection}>
              <ProgressRing percent={pct} label="Complete" />
            </View>

            <StatRow
              stats={[
                { value: setsDisplay, label: 'Sets' },
                { value: elapsed, label: 'Elapsed' },
                { value: formattedVolume, label: 'Volume (kg)', accent: true },
              ]}
            />

            <Divider style={{ marginHorizontal: spacing.xxl, marginBottom: spacing.xl }} />

            <SectionLabel label="This week" />
            <WeekStrip days={weekDays} />

            <Divider style={{ marginHorizontal: spacing.xxl, marginBottom: spacing.xl }} />
            <SectionLabel label="Exercises" />
            <Text style={styles.logHint}>Tap any exercise to log weight, reps, and RPE for each set</Text>
          </View>
        }
        ListHeaderComponentStyle={styles.listHeader}
        ItemSeparatorComponent={() => <View style={{ height: 7 }} />}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
            {session.exercises.every((e) => e.status === 'completed') && (
              <>
                <Divider style={{ marginHorizontal: spacing.xxl, marginBottom: spacing.xl }} />
                <View style={styles.allDoneBanner}>
                  <Text style={styles.completeIcon}>✓</Text>
                  <Text style={styles.allDoneText}>All exercises completed</Text>
                </View>
              </>
            )}
            <View style={styles.finishRow}>
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={handleComplete}
                activeOpacity={0.85}
              >
                <Text style={styles.completeBtnText}>
                  Complete Workout
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.abandonBtn} onPress={handleAbandon} activeOpacity={0.7} accessibilityLabel="End current session">
                <Text style={styles.abandonBtnText}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <DevClearDbButton onCleared={() => router.dismissAll()} />

      {quickLogExercise && (
        <QuickLogOverlay
          exerciseName={session.exercises.find((e) => e.exerciseLogId === quickLogExercise)?.exerciseName ?? ''}
          visible={quickLogExercise !== null}
          onClose={() => setQuickLogExercise(null)}
          onLog={handleQuickLog}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  errorSub: {
    ...typography.monoSmall,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  dismissBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.row,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 14,
  },
  dismissBtnText: {
    ...typography.body,
    color: colors.gold,
  },
  listHeader: {
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  eyebrow: {
    ...typography.monoLabel,
    color: colors.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    letterSpacing: -0.02,
  },
  ringSection: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  logHint: {
    ...typography.monoSmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  listContent: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 40,
  },
  footer: {
    paddingTop: spacing.lg,
    paddingBottom: 60,
  },
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  completeIcon: {
    fontSize: 24,
    color: colors.success,
  },
  allDoneText: {
    ...typography.subheading,
    color: colors.successText,
  },
  finishRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  completeBtn: {
    flex: 1,
    backgroundColor: colors.gold,
    borderRadius: radii.row,
    paddingVertical: 15,
    alignItems: 'center',
  },
  completeBtnText: {
    ...typography.cta,
    color: '#0f0f0f',
    textTransform: 'uppercase',
    fontSize: 14,
  },
  abandonBtn: {
    flex: 1,
    borderRadius: radii.row,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.danger,
  },
  abandonBtnText: {
    ...typography.body,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    fontSize: 14,
  },
});
