import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useRouter, useLocalSearchParams, useFocusEffect, Stack, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import { QuickLogOverlay } from '@/components/workout/QuickLogOverlay';
import { ExercisePickerSheet } from '@/components/workout/ExercisePickerSheet';
import { GhostButton } from '@/components/ui/GhostButton';
import { ElapsedTimer, ElapsedText } from '@/components/workout/ElapsedTimer';
import { SessionStatsBar } from '@/components/workout/SessionStatsBar';
import { LastTimeSheet } from '@/components/workout/LastTimeSheet';
import { GeneralWarmupCard } from '@/components/workout/GeneralWarmupCard';
import { summarizeLastTime } from '@/src/features/workout-session/last-time';
import type {
  ActiveSession,
  ActiveSet,
  SessionProgress,
  ProgressionSuggestion,
} from '@/src/features/workout-session/types';
import {
  hydrateActiveSession,
  completeSession,
  abandonSession,
  updateSet,
  getSessionProgress,
  getProgressionSuggestions,
  getProgramDayNumber,
  sessionEndAt,
  addExerciseToSession,
  deleteExerciseFromSession,
  deleteWorkoutSession,
} from '@/src/features/workout-session';
import { getActiveSession } from '@/src/db/repositories/sessions';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DevClearDbButton } from '@/components/ui/DevClearDbButton';
import { useDialog } from '@/components/ui/ConfirmDialog';

const DAY_CODES: Record<string, string> = {
  Upper: 'UP',
  Lower: 'LO',
  Pull: 'PL',
  Push: 'PS',
  Legs: 'LG',
};

function getExerciseStatus(exercise: {
  status: string;
  sets: ActiveSet[];
}): 'done' | 'active' | 'pending' {
  if (exercise.status === 'completed') return 'done';
  if (exercise.sets.length > 0 && exercise.sets.every((s) => s.isComplete)) return 'done';
  if (exercise.status === 'active' || exercise.sets.some((s) => s.isComplete)) return 'active';
  return 'pending';
}

interface ActiveState {
  phase: 'active';
  session: ActiveSession;
  progress: SessionProgress;
}

type ScreenState = { phase: 'loading' } | ActiveState | { phase: 'error'; message: string };

export default function ActiveWorkoutScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; review?: string }>();
  const insets = useSafeAreaInsets();
  // `review=1` reopens a finished workout so its sets can be corrected.
  const isReview = params.review === '1';
  const [state, setState] = useState<ScreenState>({ phase: 'loading' });
  const activeRef = useRef<ActiveState | null>(null);
  const quickLogBusyRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const reducedMotion = useReducedMotion();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [progressionSuggestions, setProgressionSuggestions] = useState<
    Map<string, ProgressionSuggestion>
  >(new Map());
  const [quickLogExercise, setQuickLogExercise] = useState<string | null>(null);
  const [lastTimeFor, setLastTimeFor] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const shakeOffset = useSharedValue(0);

  // Stable selectors for useEffect dependencies
  const phase = state.phase;
  const exerciseNamesKey =
    state.phase === 'active' ? state.session.exercises.map((e) => e.exerciseName).join('|') : '';
  const sessionId = state.phase === 'active' ? state.session.id : null;
  const exerciseStatusKey =
    state.phase === 'active' ? state.session.exercises.map((e) => e.status).join(',') : null;

  const hydrate = useCallback(
    async (sessionId: string) => {
      try {
        const session = await hydrateActiveSession(sessionId);
        if (!session) {
          setState({ phase: 'error', message: 'Session not found.' });
          return;
        }
        // getSessionById does not filter on status: a session finished while this
        // list sat in the stack (e.g. back out of the celebration screen) would
        // otherwise re-render as an active workout.
        if (session.status !== 'in_progress' && !isReview) {
          router.dismissAll();
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
    },
    [router, isReview],
  );

  // Reload on every focus so sets logged on the exercise screen show up
  // when returning to this list.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const sessionId =
            activeRef.current?.session.id ?? params.sessionId ?? (await getActiveSession())?.id;
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
      return () => {
        cancelled = true;
      };
    }, [params.sessionId, hydrate]),
  );

  useEffect(() => {
    if (state.phase === 'active') {
      getProgressionSuggestions(state.session).then((suggestions) => {
        const map = new Map<string, ProgressionSuggestion>();
        for (const s of suggestions) {
          map.set(s.exerciseName, s);
        }
        setProgressionSuggestions(map);
      });
    }
  }, [sessionId, exerciseNamesKey]);

  useEffect(() => {
    if (state.phase === 'active' && !isReview) {
      const activeIndex = state.session.exercises.findIndex(
        (e) => e.status === 'active' || e.status === 'pending',
      );
      if (activeIndex >= 0 && flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({
            index: activeIndex,
            animated: !reducedMotion,
          });
        } catch {
          /* ignore if index out of bounds */
        }
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

  const handleViewDetail = useCallback(
    (exerciseLogId: string) => {
      router.push(`/workout/${exerciseLogId}` as Href);
    },
    [router],
  );

  const handleQuickLog = useCallback(
    async (weight: number, reps: number, rpe: number | null) => {
      // A ref, not state: two taps in one frame both read the same pending set
      // and would write it twice.
      if (quickLogBusyRef.current) return;
      const current = activeRef.current;
      if (!current || !quickLogExercise) return;
      const exercise = current.session.exercises.find((e) => e.exerciseLogId === quickLogExercise);
      if (!exercise) return;
      const pendingSet = exercise.sets.find((s) => !s.isComplete);
      if (!pendingSet) {
        dialog.show(
          'All sets logged',
          `Every working set of ${exercise.exerciseName} is already logged.`,
        );
        return;
      }
      quickLogBusyRef.current = true;
      try {
        const result = await updateSet(current.session, pendingSet.setLogId, {
          weight,
          reps,
          loggedRpe: rpe,
        });
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
        dialog.show('Error', 'Failed to log set. Please try again.');
      } finally {
        quickLogBusyRef.current = false;
      }
    },
    [quickLogExercise, dialog],
  );

  const handleComplete = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    const { session } = current;
    const allComplete =
      session.exercises.length > 0 &&
      session.exercises.every((e) => getExerciseStatus(e) === 'done');
    if (!allComplete) {
      const unfinishedCount = session.exercises.filter(
        (e) => getExerciseStatus(e) !== 'done',
      ).length;
      dialog.show(
        `${unfinishedCount} ${unfinishedCount === 1 ? 'exercise' : 'exercises'} not finished`,
        "Complete anyway? Sets you haven't logged will be skipped.",
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
                dialog.show('Error', 'Failed to complete workout. Please try again.');
              }
            },
          },
        ],
      );
    } else {
      dialog.show('Complete Workout', 'Are you sure you want to finish this session?', [
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
              dialog.show('Error', 'Failed to complete workout. Please try again.');
            }
          },
        },
      ]);
    }
  }, [router, dialog]);

  const handleAbandon = useCallback(() => {
    dialog.show(
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
              dialog.show('Error', 'Failed to end session. Please try again.');
            }
          },
        },
      ],
    );
  }, [router, dialog]);

  // Past workouts only: add, delete exercises, or delete the whole workout.
  const handleAddExercise = useCallback(
    async (exerciseName: string) => {
      const current = activeRef.current;
      if (!current) return;
      try {
        const result = await addExerciseToSession(current.session.id, exerciseName);
        const added = result.session.exercises.reduce((a, b) =>
          b.sortOrder > a.sortOrder ? b : a,
        );
        await hydrate(current.session.id);
        router.push(`/workout/${added.exerciseLogId}` as Href);
      } catch (e) {
        console.error('[workout] Failed to add exercise:', e);
        dialog.show('Error', 'Failed to add the exercise. Please try again.');
      }
    },
    [hydrate, router, dialog],
  );

  const handleDeleteExercise = useCallback(
    (exerciseLogId: string, exerciseName: string) => {
      dialog.show(
        'Delete exercise?',
        `${exerciseName} and all its sets will be removed from this workout.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const current = activeRef.current;
              if (!current) return;
              try {
                await deleteExerciseFromSession(current.session.id, exerciseLogId);
                await hydrate(current.session.id);
              } catch (e) {
                console.error('[workout] Failed to delete exercise:', e);
                dialog.show('Error', 'Failed to delete the exercise. Please try again.');
              }
            },
          },
        ],
      );
    },
    [hydrate, dialog],
  );

  const handleDeleteWorkout = useCallback(() => {
    dialog.show(
      'Delete workout?',
      'The whole workout and every set in it will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const current = activeRef.current;
            if (!current) return;
            try {
              await deleteWorkoutSession(current.session.id);
              router.dismissAll();
            } catch (e) {
              console.error('[workout] Failed to delete workout:', e);
              dialog.show('Error', 'Failed to delete the workout. Please try again.');
            }
          },
        },
      ],
    );
  }, [router, dialog]);

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
  const exercisesDone = session.exercises.filter((e) => getExerciseStatus(e) === 'done').length;
  const allComplete =
    session.exercises.length > 0 && session.exercises.every((e) => getExerciseStatus(e) === 'done');
  const dayCode = DAY_CODES[session.dayType] ?? session.dayType;
  const dayNumber = getProgramDayNumber(session.weekNumber, session.dayType);
  const quickEx = quickLogExercise
    ? session.exercises.find((e) => e.exerciseLogId === quickLogExercise)
    : undefined;
  const quickSet = quickEx?.sets.find((s) => !s.isComplete);
  const quickSetNo = quickEx ? quickEx.sets.filter((s) => s.isComplete).length + 1 : 0;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Workout', headerShown: false }} />

      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back to Today"
          accessibilityRole="button"
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M15 5l-7 7 7 7"
              stroke={colors.textPrimary}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          {isReview ? 'Edit workout' : `${dayCode} · Day ${dayNumber}`}
        </Text>
        {isReview ? (
          <View style={styles.topSpacer} />
        ) : (
          <ElapsedTimer startedAt={session.startedAt} />
        )}
      </View>

      <SessionStatsBar session={session} />

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
            : prog?.topOfRange
              ? 'almost'
              : null;
          return (
            <ExerciseRow
              exercise={item}
              status={status}
              progressionStatus={progressionStatus}
              index={index}
              spec={spec}
              lastTime={summarizeLastTime(prog?.lastSession ?? null)}
              onLastTimePress={() => setLastTimeFor(item.exerciseName)}
              onPress={() => handleViewDetail(item.exerciseLogId)}
              onLongPress={
                isReview
                  ? () => handleDeleteExercise(item.exerciseLogId, item.exerciseName)
                  : () => setQuickLogExercise(item.exerciseLogId)
              }
            />
          );
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.progressWrap}>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>
                  {exercisesDone} OF {session.exercises.length} EXERCISES
                </Text>
              </View>
              <View
                style={styles.track}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: progress.totalSets,
                  now: progress.completedSets,
                }}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.round(pct * 100)}%` as unknown as number,
                      backgroundColor: allComplete ? colors.success : colors.gold,
                    },
                  ]}
                />
              </View>
            </View>

            {isReview ? (
              <GhostButton
                label="+ Add exercise"
                onPress={() => setPickerOpen(true)}
                style={{ marginHorizontal: 0 }}
              />
            ) : (
              <GeneralWarmupCard />
            )}

            {allComplete && (
              <View style={styles.completeCard}>
                <Svg width={26} height={26} viewBox="0 0 24 24">
                  <Path
                    d="M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0 -17 0zM8 12.25l2.75 2.75L16 9.75"
                    stroke={colors.successText}
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
                <View>
                  <Text style={styles.completeLabel}>SESSION COMPLETE</Text>
                  <Text style={styles.completeMeta}>
                    {session.exercises.length} of {session.exercises.length} ·{' '}
                    {progress.completedSets} sets ·{' '}
                    <ElapsedText startedAt={session.startedAt} endAt={sessionEndAt(session)} />
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {!isReview && (
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <TouchableOpacity
            style={allComplete ? styles.finishPrimary : styles.finishSecondary}
            onPress={handleComplete}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={allComplete ? styles.finishPrimaryText : styles.finishSecondaryText}>
              Finish workout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={handleAbandon}
            activeOpacity={0.7}
            accessibilityLabel="End current session"
            accessibilityRole="button"
          >
            <Text style={styles.endBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {isReview && (
        <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <GhostButton
            label="Delete workout"
            tone="danger"
            onPress={handleDeleteWorkout}
            style={{ marginHorizontal: 0, marginBottom: 0 }}
          />
        </View>
      )}

      {isReview && (
        <ExercisePickerSheet
          visible={pickerOpen}
          weekNumber={session.weekNumber}
          dayType={session.dayType}
          presentNames={session.exercises.flatMap((e) => [
            e.exerciseName,
            e.prescribedExerciseName,
          ])}
          onClose={() => setPickerOpen(false)}
          onPick={handleAddExercise}
        />
      )}

      <DevClearDbButton onCleared={() => router.dismissAll()} />

      {lastTimeFor && (
        <LastTimeSheet
          visible
          exerciseName={lastTimeFor}
          summary={summarizeLastTime(progressionSuggestions.get(lastTimeFor)?.lastSession ?? null)}
          readyForWeightIncrease={progressionSuggestions.get(lastTimeFor)?.readyForWeightIncrease}
          onClose={() => setLastTimeFor(null)}
        />
      )}

      {quickEx && (
        <QuickLogOverlay
          exerciseName={quickEx.exerciseName}
          setLabel={quickSet ? `Set ${quickSetNo} of ${quickEx.sets.length}` : undefined}
          detail={
            quickEx.prescription
              ? `Prescribed ${quickEx.prescription.workingSets}×${quickEx.prescription.repRange}`
              : undefined
          }
          initialWeight={quickSet?.weight}
          initialReps={quickSet?.reps}
          visible
          onClose={() => setQuickLogExercise(null)}
          onLog={handleQuickLog}
        />
      )}
    </View>
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
    },
    errorText: {
      ...typography.body,
      color: c.danger,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    errorSub: {
      ...typography.monoSmall,
      color: c.textTertiary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    dismissBtn: {
      backgroundColor: c.surfaceElevated,
      borderRadius: radii.row,
      paddingHorizontal: spacing.xxxl,
      paddingVertical: 14,
    },
    dismissBtnText: {
      ...typography.body,
      color: c.gold,
    },
    topBar: {
      height: 44,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: {
      ...typography.monoLabel,
      fontFamily: 'SpaceMono_700Bold',
      letterSpacing: 0.08,
      color: c.goldText,
      textTransform: 'uppercase',
    },
    topSpacer: {
      width: 24,
    },
    listHeader: {
      gap: spacing.lg,
      paddingBottom: spacing.lg,
    },
    progressWrap: {
      gap: spacing.sm,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressLabel: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 13,
      letterSpacing: 1.5,
      color: c.textSecondary,
    },
    track: {
      height: 4,
      borderRadius: 2,
      backgroundColor: c.surfaceCard,
      overflow: 'hidden',
    },
    fill: {
      height: 4,
      borderRadius: 2,
    },
    completeCard: {
      paddingVertical: spacing.lg,
      paddingHorizontal: 14,
      borderRadius: radii.card,
      backgroundColor: c.successSurface,
      borderWidth: 0.5,
      borderColor: c.successBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    completeLabel: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 13,
      letterSpacing: 1.5,
      color: c.successText,
    },
    completeMeta: {
      ...typography.monoBody,
      color: c.textPrimary,
    },
    listContent: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
    },
    dock: {
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      backgroundColor: c.background,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
      gap: spacing.xs,
    },
    finishPrimary: {
      height: 56,
      borderRadius: radii.button,
      backgroundColor: c.gold,
      alignItems: 'center',
      justifyContent: 'center',
    },
    finishPrimaryText: {
      ...typography.cta,
      color: c.blackText,
      textTransform: 'uppercase',
    },
    finishSecondary: {
      height: 48,
      borderRadius: radii.button,
      borderWidth: 1,
      borderColor: c.borderControl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    finishSecondaryText: {
      ...typography.cta,
      fontSize: 16,
      color: c.textPrimary,
      textTransform: 'uppercase',
    },
    endBtn: {
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    endBtnText: {
      ...typography.body,
      color: c.dangerText,
      textTransform: 'uppercase',
      letterSpacing: 0.05,
    },
  });
