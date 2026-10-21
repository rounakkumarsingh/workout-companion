import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SetLogList } from '@/components/workout/SetLogList';
import { RpeSelector } from '@/components/workout/RpeSelector';
import { WarmupSection } from '@/components/workout/WarmupSection';
import { SubstitutionCard } from '@/components/workout/SubstitutionCard';
import { LastTimeChip } from '@/components/workout/LastTimeChip';
import { LastTimeSheet } from '@/components/workout/LastTimeSheet';
import { summarizeLastTime } from '@/src/features/workout-session/last-time';
import {
  getPreferredExercise,
  setSubstitutionPreference,
} from '@/src/features/workout-session/substitution-preferences-store';
import { DemoVideoLink } from '@/components/workout/DemoVideoLink';
import { TechniqueNotes } from '@/components/workout/TechniqueNotes';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useRestTimer } from '@/hooks/useRestTimer';
import { PROGRAM } from '@/src/data/program';
import type {
  ActiveSession,
  ActiveExercise,
  ExerciseHistoryComparison,
  LoggingPhase,
} from '@/src/features/workout-session/types';
import {
  hydrateActiveSession,
  updateSet,
  completeSession,
  getExerciseHistoryComparison,
  swapExercise,
  logWarmupSet,
  getNextIncompleteExercise,
  setExerciseStatus,
  getActiveRest,
  beginRest,
  moveRestDeadline,
  clearActiveRest,
} from '@/src/features/workout-session';
import { getSubstitutionOptions } from '@/src/features/workout-session/substitution';
import { getExerciseLogById } from '@/src/db/repositories/exercises';

function parseRestSeconds(rest: string): number {
  const minutes = rest.match(/(\d+)/)?.[1];
  return minutes ? parseInt(minutes, 10) * 60 : 90;
}

/**
 * Default weight/reps for a set: its suggested (pre-filled) values, falling
 * back to the most recently logged set of this exercise.
 */
function getSetDefaults(
  exercise: ActiveExercise,
  setIndex: number,
  justLogged?: { weight: number; reps: number },
): { weight: number; reps: number } {
  const set = exercise.sets.find((s) => s.setIndex === setIndex);
  const lastLogged = justLogged ?? [...exercise.sets].reverse().find((s) => s.isComplete);
  return {
    weight: set && set.weight > 0 ? set.weight : (lastLogged?.weight ?? 0),
    reps: set && set.reps > 0 ? set.reps : (lastLogged?.reps ?? 0),
  };
}

function getRestSeconds(exercise: ActiveExercise): number {
  return exercise.prescription ? parseRestSeconds(exercise.prescription.rest) : 90;
}

function formatRestClock(seconds: number): string {
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const sec = abs % 60;
  return `${seconds < 0 ? '-' : ''}${m}:${String(sec).padStart(2, '0')}`;
}

type ScreenState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | {
      phase: 'active';
      loggingPhase: LoggingPhase;
      session: ActiveSession;
      exercise: ActiveExercise;
      currentSetIndex: number;
      weight: number;
      reps: number;
      selectedRpe: number | null;
      restDuration: number;
      /** Deadline (epoch ms) of the running rest, while resting. */
      restEndAt: number | null;
    };

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { exerciseLogId } = params as { exerciseLogId: string };
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>({ phase: 'loading' });
  const [comparison, setComparison] = useState<ExerciseHistoryComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(true);
  const [lastTimeOpen, setLastTimeOpen] = useState(false);
  // The substitute saved as "always" for this exercise, if any.
  const [alwaysName, setAlwaysName] = useState<string | null>(null);
  const hasLoggedSetsRef = useRef(false);
  const loggingSetRef = useRef(false);

  const handleRestExpired = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);
  const restTimer = useRestTimer({ onExpire: handleRestExpired });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const log = await getExerciseLogById(exerciseLogId);
        if (cancelled) return;
        if (!log) {
          setState({ phase: 'error', message: 'Exercise not found.' });
          return;
        }
        const session = await hydrateActiveSession(log.workoutSessionId);
        if (cancelled) return;
        if (!session) {
          setState({ phase: 'error', message: 'Session not found.' });
          return;
        }
        const exercise = session.exercises.find((e) => e.exerciseLogId === exerciseLogId);
        if (!exercise) {
          setState({ phase: 'error', message: 'Exercise not found.' });
          return;
        }

        if (exercise.prescription?.repRange) {
          const comp = await getExerciseHistoryComparison(
            exercise.exerciseName,
            exercise.prescription.repRange,
            session.id,
          );
          if (cancelled) return;
          setComparison(comp);
        }
        setComparisonLoading(false);

        const someLogged = exercise.sets.some((s) => s.isComplete);
        const nextSet = exercise.sets.find((s) => !s.isComplete);
        hasLoggedSetsRef.current = someLogged;

        if (!nextSet) {
          setState({
            phase: 'active',
            loggingPhase: 'sets_completed',
            session,
            exercise,
            currentSetIndex: exercise.sets.length,
            weight: 0,
            reps: 0,
            selectedRpe: null,
            restDuration: getRestSeconds(exercise),
            restEndAt: null,
          });
          return;
        }

        // A rest started for this exercise is still running (or in
        // overtime) — resume it instead of skipping straight to logging.
        const activeRest = await getActiveRest();
        if (cancelled) return;
        const resumeRest =
          activeRest !== null &&
          activeRest.sessionId === session.id &&
          activeRest.exerciseLogId === exerciseLogId &&
          exercise.sets.some((s) => s.setIndex === activeRest.nextSetIndex && !s.isComplete);

        const currentSetIndex = resumeRest ? activeRest.nextSetIndex : nextSet.setIndex;
        const defaults = getSetDefaults(exercise, currentSetIndex);
        setState({
          phase: 'active',
          loggingPhase: resumeRest ? 'resting' : someLogged ? 'logging' : 'intro',
          session,
          exercise,
          currentSetIndex,
          weight: defaults.weight,
          reps: defaults.reps,
          selectedRpe: null,
          restDuration: resumeRest ? activeRest.durationSec : getRestSeconds(exercise),
          restEndAt: resumeRest ? activeRest.endAt : null,
        });
      } catch (e) {
        console.error('[exercise-detail] Failed to load exercise:', e);
        if (!cancelled) {
          setState({ phase: 'error', message: 'Failed to load exercise.' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [exerciseLogId]);

  const allSetsLogged =
    state.phase === 'active' ? state.exercise.sets.every((s) => s.isComplete) : false;

  const confirmLeave = useCallback(() => {
    Alert.alert(
      'Leave exercise?',
      "You have logged sets but haven't finished all yet. Progress will be saved.",
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => router.back() },
      ],
    );
  }, [router]);

  // Drive the timer from the persisted deadline while resting. It keeps
  // running in the background and never advances on its own.
  const restingEndAt =
    state.phase === 'active' && state.loggingPhase === 'resting' ? state.restEndAt : null;
  const restingDuration = state.phase === 'active' ? state.restDuration : 0;
  useEffect(() => {
    if (restingEndAt !== null) {
      restTimer.start(restingDuration, restingEndAt);
    } else {
      restTimer.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restingEndAt]);

  const handleMoveOn = useCallback(() => {
    restTimer.stop();
    clearActiveRest().catch((e) => console.warn('[exercise] Failed to clear rest:', e));
    setState((prev) => {
      if (prev.phase !== 'active') return prev;
      const allDone = prev.exercise.sets.every((s) => s.isComplete);
      return {
        ...prev,
        loggingPhase: (allDone ? 'sets_completed' : 'logging') as LoggingPhase,
        restEndAt: null,
        selectedRpe: null,
      };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [restTimer]);

  const handleAdjustRest = useCallback(
    (deltaSec: number) => {
      if (state.phase !== 'active') return;
      const newEndAt = restTimer.adjust(deltaSec);
      if (newEndAt === null) return;
      const newTotal = Math.max(1, restTimer.total + deltaSec);
      moveRestDeadline(newEndAt, newTotal, state.exercise.exerciseName).catch((e) =>
        console.warn('[exercise] Failed to move rest deadline:', e),
      );
    },
    [state, restTimer],
  );

  useEffect(() => {
    const hasProgress = hasLoggedSetsRef.current;
    if (!hasProgress) return;

    const onBackPress = () => {
      confirmLeave();
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [hasLoggedSetsRef.current]);

  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pulseScale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const prevRestRemainingRef = useRef<number>(0);

  useEffect(() => {
    if (state.phase !== 'active' || state.loggingPhase !== 'resting' || reducedMotion) return;
    const remaining = restTimer.remaining;
    const prev = prevRestRemainingRef.current;
    prevRestRemainingRef.current = remaining;

    if (remaining <= 3 && remaining > 0 && prev > remaining) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      pulseScale.value = withSequence(
        withTiming(1.03, { duration: 100, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200 }),
      );
    } else if (remaining <= 5 && remaining > 0 && prev > remaining) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      pulseScale.value = withSequence(
        withTiming(1.02, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200 }),
      );
    } else if (remaining <= 10 && remaining > 0 && prev > remaining) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      pulseScale.value = withSequence(
        withTiming(1.01, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200 }),
      );
    }
  }, [state.phase === 'active' && state.loggingPhase === 'resting' ? restTimer.remaining : null]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handleStartLogging = useCallback(() => {
    if (state.phase !== 'active') return;
    const { session, exercise } = state;
    setState((prev) => {
      if (prev.phase !== 'active') return prev;
      return { ...prev, loggingPhase: 'logging' as const };
    });
    if (exercise.status === 'pending') {
      setExerciseStatus(session, exercise.exerciseLogId, 'active').catch((e) =>
        console.warn('[exercise] Failed to mark exercise active:', e),
      );
    }
  }, [state]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [editingReps, setEditingReps] = useState<string | null>(null);

  const handleLogSet = useCallback(async () => {
    // Ref, not state: a double tap re-enters before state has committed and
    // would write the set twice and schedule the rest twice.
    if (loggingSetRef.current) return;
    if (state.phase !== 'active' || state.loggingPhase !== 'logging') return;
    const { session, exercise, currentSetIndex, weight, reps, selectedRpe } = state;
    const targetSet = exercise.sets.find((s) => s.setIndex === currentSetIndex);
    if (!targetSet) return;

    if (weight <= 0 || reps <= 0) {
      setValidationError('Enter weight and reps before logging');
      return;
    }
    setValidationError(null);

    loggingSetRef.current = true;
    try {
      const result = await updateSet(session, targetSet.setLogId, {
        weight,
        reps,
        loggedRpe: selectedRpe,
      });
      if (!result.success) {
        setValidationError(result.reason ?? 'Invalid set data');
        return;
      }
      const updatedSession = result.session;
      hasLoggedSetsRef.current = true;
      setEditingWeight(null);
      setEditingReps(null);

      const updatedExercise = updatedSession.exercises.find(
        (e) => e.exerciseLogId === exerciseLogId,
      )!;
      const nextSet = updatedExercise.sets.find((s) => !s.isComplete);

      if (nextSet) {
        const restSeconds = getRestSeconds(updatedExercise);
        const restEndAt = Date.now() + restSeconds * 1000;
        const defaults = getSetDefaults(updatedExercise, nextSet.setIndex, { weight, reps });
        setState({
          phase: 'active',
          loggingPhase: 'resting',
          session: updatedSession,
          exercise: updatedExercise,
          currentSetIndex: nextSet.setIndex,
          weight: defaults.weight,
          reps: defaults.reps,
          selectedRpe: null,
          restDuration: restSeconds,
          restEndAt,
        });
        beginRest(
          {
            sessionId: updatedSession.id,
            exerciseLogId,
            nextSetIndex: nextSet.setIndex,
            durationSec: restSeconds,
            endAt: restEndAt,
          },
          updatedExercise.exerciseName,
        ).catch((e) => console.warn('[exercise] Failed to persist rest:', e));
      } else {
        setState({
          phase: 'active',
          loggingPhase: 'sets_completed',
          session: updatedSession,
          exercise: updatedExercise,
          currentSetIndex,
          weight,
          reps,
          selectedRpe: null,
          restDuration: getRestSeconds(updatedExercise),
          restEndAt: null,
        });
        clearActiveRest().catch((e) => console.warn('[exercise] Failed to clear rest:', e));
      }
    } catch (e) {
      console.error('[exercise] Failed to log set:', e);
      Alert.alert('Error', 'Failed to log set. Please try again.');
    } finally {
      loggingSetRef.current = false;
    }
  }, [state, exerciseLogId]);

  const handleCompleteExercise = useCallback(async () => {
    if (state.phase !== 'active') return;
    try {
      const updatedSession = await setExerciseStatus(state.session, exerciseLogId, 'completed');
      // Go to the next unfinished exercise; only end the workout once every
      // exercise is done.
      const next = getNextIncompleteExercise(updatedSession, exerciseLogId);
      if (next) {
        router.replace(`/workout/${next.exerciseLogId}`);
      } else {
        const completed = await completeSession(updatedSession);
        router.replace(`/workout/pr-celebration?sessionId=${completed.id}`);
      }
    } catch (e) {
      console.error('[exercise] Failed to complete exercise:', e);
      Alert.alert('Error', 'Failed to complete exercise. Please try again.');
    }
  }, [state, exerciseLogId, router]);

  const handleFinishWorkout = useCallback(() => {
    if (state.phase !== 'active') return;
    const { session } = state;
    Alert.alert(
      'Finish Workout',
      "End this session now? Sets you haven't logged will be skipped.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              restTimer.stop();
              const completed = await completeSession(session);
              router.replace(`/workout/pr-celebration?sessionId=${completed.id}`);
            } catch (e) {
              console.error('[exercise] Failed to finish workout:', e);
              Alert.alert('Error', 'Failed to finish workout. Please try again.');
            }
          },
        },
      ],
    );
  }, [state, router, restTimer]);

  const prescribedName = state.phase === 'active' ? state.exercise.prescribedExerciseName : null;
  const weekNumber = state.phase === 'active' ? state.session.weekNumber : null;
  useEffect(() => {
    if (!prescribedName || weekNumber === null) return;
    let cancelled = false;
    getPreferredExercise(prescribedName, weekNumber)
      .then((name) => {
        if (!cancelled) setAlwaysName(name);
      })
      .catch((e) => console.warn('[exercise] Failed to load saved substitution:', e));
    return () => {
      cancelled = true;
    };
  }, [prescribedName, weekNumber]);

  const applySubstitution = useCallback(
    async (targetName: string, permanent: boolean) => {
      if (state.phase !== 'active') return;
      try {
        const updated = await swapExercise(state.session, exerciseLogId, targetName);
        const updatedExercise = updated.exercises.find((e) => e.exerciseLogId === exerciseLogId)!;
        setState((prev) => {
          if (prev.phase !== 'active') return prev;
          return { ...prev, session: updated, exercise: updatedExercise };
        });
        if (permanent) {
          const prescribed = updatedExercise.prescribedExerciseName;
          const substitute = targetName === prescribed ? null : targetName;
          await setSubstitutionPreference(prescribed, substitute);
          setAlwaysName(substitute);
        }
        if (updatedExercise.prescription?.repRange) {
          setComparisonLoading(true);
          const comp = await getExerciseHistoryComparison(
            updatedExercise.exerciseName,
            updatedExercise.prescription.repRange,
            updated.id,
          );
          setComparison(comp);
          setComparisonLoading(false);
        }
      } catch (e) {
        console.error('[exercise] Failed to substitute exercise:', e);
        Alert.alert('Error', 'Failed to change exercise. Please try again.');
      }
    },
    [state, exerciseLogId],
  );

  // Ask whether the switch is for this workout only or for every time.
  const handleSubstitution = useCallback(
    (targetName: string) => {
      if (state.phase !== 'active') return;
      const backToPrescribed = targetName === state.exercise.prescribedExerciseName;
      Alert.alert(
        backToPrescribed ? `Go back to ${targetName}?` : `Switch to ${targetName}?`,
        backToPrescribed
          ? 'Just for this workout, or from now on?'
          : 'Just for this workout, or every time this exercise comes up?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Just this time', onPress: () => void applySubstitution(targetName, false) },
          {
            text: backToPrescribed ? 'From now on' : 'Always',
            onPress: () => void applySubstitution(targetName, true),
          },
        ],
      );
    },
    [state, applySubstitution],
  );

  const handleLogWarmup = useCallback(
    async (weight: number, reps: number) => {
      if (state.phase !== 'active') return;
      try {
        const updated = await logWarmupSet(state.session, exerciseLogId, { weight, reps });
        const updatedExercise = updated.exercises.find((e) => e.exerciseLogId === exerciseLogId)!;
        setState((prev) => {
          if (prev.phase !== 'active') return prev;
          return { ...prev, session: updated, exercise: updatedExercise };
        });
        hasLoggedSetsRef.current = true;
      } catch (e) {
        console.error('[exercise] Failed to log warmup set:', e);
        Alert.alert('Error', 'Failed to log warmup set. Please try again.');
      }
    },
    [state, exerciseLogId],
  );

  const handleBack = useCallback(() => {
    if (hasLoggedSetsRef.current && !allSetsLogged) {
      confirmLeave();
    } else {
      router.back();
    }
  }, [allSetsLogged, confirmLeave, router]);

  const adjustFn = useCallback(
    (field: 'weight' | 'reps', delta: number) => {
      if (state.phase !== 'active') return;
      if (field === 'weight') setEditingWeight(null);
      else setEditingReps(null);
      setState((prev) => {
        if (prev.phase !== 'active') return prev;
        const next =
          field === 'weight'
            ? Math.max(0, Math.round((prev.weight + delta) * 10) / 10)
            : Math.max(0, prev.reps + delta);
        return { ...prev, [field]: next };
      });
    },
    [state.phase],
  );

  // --- Loading / Error ---

  if (state.phase === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (state.phase === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{state.message}</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.dismissBtn}
          accessibilityLabel="Go back"
        >
          <Text style={styles.dismissBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { session, exercise, loggingPhase } = state;
  const pres = exercise.prescription;
  const exerciseMeta = PROGRAM.exercises[exercise.exerciseName];
  const isSubstituted = exercise.exerciseName !== exercise.prescribedExerciseName;
  const rawOptions = getSubstitutionOptions(exercise.prescribedExerciseName, session.weekNumber);
  const substitutionOptions = isSubstituted
    ? [
        { name: exercise.prescribedExerciseName },
        ...rawOptions
          .filter((o) => o.substituteName !== exercise.exerciseName)
          .map((o) => ({ name: o.substituteName })),
      ]
    : rawOptions.map((o) => ({ name: o.substituteName }));
  const substitutionDisabled = exercise.sets.some((s) => s.isComplete);
  const lastTime = summarizeLastTime(comparison?.lastSession ?? null);
  const nextExercise = getNextIncompleteExercise(session, exerciseLogId);

  // --- Phase Renders ---

  const renderIntro = () => (
    <>
      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backBtn, { paddingTop: insets.top + spacing.sm }]}
        accessibilityLabel="Back to workout"
      >
        <Text style={styles.backBtnText}>← Today</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.exName}>{exercise.exerciseName}</Text>
        {pres && (
          <Text style={styles.exType}>
            {pres.technique !== 'N/A' ? `${pres.technique} · ` : ''}
            {pres.workingSets} WORKING SETS
          </Text>
        )}
      </View>

      {!comparisonLoading && lastTime ? (
        <View style={styles.lastTimeWrap}>
          <LastTimeChip summary={lastTime} onPress={() => setLastTimeOpen(true)} />
        </View>
      ) : null}
      <LastTimeSheet
        visible={lastTimeOpen}
        exerciseName={exercise.exerciseName}
        summary={lastTime}
        readyForWeightIncrease={comparison?.progressionSuggestion.readyForWeightIncrease}
        onClose={() => setLastTimeOpen(false)}
      />

      <WarmupSection
        prescribedMin={pres?.warmupSetsMin ?? 0}
        prescribedMax={pres?.warmupSetsMax ?? 0}
        warmupSets={exercise.warmupSets}
        onLogWarmupSet={handleLogWarmup}
      />

      {substitutionOptions.length > 0 && (
        <SubstitutionCard
          currentExerciseName={exercise.exerciseName}
          options={substitutionOptions}
          onSelect={handleSubstitution}
          disabled={substitutionDisabled}
          prescription={pres}
          permanentNote={
            alwaysName && alwaysName === exercise.exerciseName
              ? `Always used instead of ${exercise.prescribedExerciseName}. Choose it below to change that.`
              : undefined
          }
        />
      )}

      <DemoVideoLink url={exerciseMeta?.demoVideoUrl} />

      <TechniqueNotes notes={exerciseMeta?.notes ?? null} />

      <View style={styles.spacerLg} />

      <CtaButton label="Start Logging" onPress={handleStartLogging} />

      <GhostButton label="Finish Workout" onPress={handleFinishWorkout} />

      <View style={styles.spacerBottom} />
    </>
  );

  const renderLogging = () => {
    const targetSet = exercise.sets.find((s) => s.setIndex === state.currentSetIndex);
    if (!targetSet) {
      return (
        <View style={styles.centered}>
          <Text style={styles.error}>No target set found.</Text>
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, { paddingTop: insets.top + spacing.sm }]}
          accessibilityLabel="Back to workout"
        >
          <Text style={styles.backBtnText}>← Today</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.exName}>{exercise.exerciseName}</Text>
        </View>

        <SectionLabel label="Set log" />
        <SetLogList
          sets={exercise.sets}
          allSetsLogged={false}
          currentSetIndex={state.currentSetIndex}
        />

        <View style={styles.logCard}>
          <Text style={styles.setLabel}>
            Set {state.currentSetIndex} of {exercise.sets.length}
          </Text>

          <View style={styles.stepperSection}>
            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Weight</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustFn('weight', -2.5)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Decrease weight by 2.5kg"
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.stepValWrap}>
                  <TextInput
                    style={[styles.stepVal, styles.stepValInput]}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Weight in kilograms"
                    value={editingWeight ?? String(state.weight)}
                    onChangeText={(text) => {
                      setEditingWeight(text);
                      const num = parseFloat(text.replace(',', '.'));
                      setState((prev) => {
                        if (prev.phase !== 'active') return prev;
                        return { ...prev, weight: !isNaN(num) && num >= 0 ? num : 0 };
                      });
                    }}
                    onFocus={() => setEditingWeight(String(state.weight))}
                    onBlur={() => setEditingWeight(null)}
                    selectTextOnFocus
                  />
                  <Text style={styles.stepUnit}> kg</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustFn('weight', 2.5)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Increase weight by 2.5kg"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.stepperRow}>
              <Text style={styles.stepperLabel}>Reps</Text>
              <View style={styles.stepperControls}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustFn('reps', -1)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Decrease reps by 1"
                >
                  <Text style={styles.stepBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.stepValWrap}>
                  <TextInput
                    style={[styles.stepVal, styles.stepValInput]}
                    keyboardType="number-pad"
                    accessibilityLabel="Reps"
                    value={editingReps ?? String(state.reps)}
                    onChangeText={(text) => {
                      setEditingReps(text);
                      const num = parseInt(text, 10);
                      setState((prev) => {
                        if (prev.phase !== 'active') return prev;
                        return { ...prev, reps: !isNaN(num) && num >= 0 ? num : 0 };
                      });
                    }}
                    onFocus={() => setEditingReps(String(state.reps))}
                    onBlur={() => setEditingReps(null)}
                    selectTextOnFocus
                  />
                  <Text style={styles.stepUnit}> reps</Text>
                </View>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustFn('reps', 1)}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Increase reps by 1"
                >
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <RpeSelector
            selected={state.selectedRpe}
            onSelect={(rpe) => {
              if (state.phase !== 'active') return;
              setState((prev) => {
                if (prev.phase !== 'active') return prev;
                return { ...prev, selectedRpe: rpe };
              });
            }}
          />

          {pres && (
            <Text style={styles.prevBest}>
              Prescribed: {pres.workingSets}×{pres.repRange} · RPE ~{pres.lastSetRpe}
            </Text>
          )}
        </View>

        {validationError && (
          <View style={styles.validationError}>
            <Text style={styles.validationErrorText}>{validationError}</Text>
          </View>
        )}

        <View style={styles.spacerLg} />

        <CtaButton label="Log Set → Rest" onPress={handleLogSet} />

        <GhostButton label="Finish Workout" onPress={handleFinishWorkout} />

        <View style={styles.spacerBottom} />
      </>
    );
  };

  const renderSetsCompleted = () => (
    <>
      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backBtn, { paddingTop: insets.top + spacing.sm }]}
        accessibilityLabel="Back to workout"
      >
        <Text style={styles.backBtnText}>← Today</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.exName}>{exercise.exerciseName}</Text>
        {pres && <Text style={styles.exType}>{pres.workingSets} SETS COMPLETED</Text>}
      </View>

      <SectionLabel label="Set log" />
      <SetLogList
        sets={exercise.sets}
        allSetsLogged={true}
        currentSetIndex={exercise.sets.length}
      />

      <View style={styles.completeBanner}>
        <Text style={styles.completeIcon}>✓</Text>
        <Text style={styles.completeText}>All sets logged for this exercise</Text>
      </View>

      <View style={styles.spacerLg} />

      <CtaButton label="Exercise Complete" onPress={handleCompleteExercise} />

      {nextExercise && (
        <GhostButton
          label={`Next: ${nextExercise.exerciseName} →`}
          onPress={() => router.replace(`/workout/${nextExercise.exerciseLogId}`)}
        />
      )}

      <GhostButton label="Finish Workout" onPress={handleFinishWorkout} />

      <View style={styles.spacerBottom} />
    </>
  );

  const renderResting = () => {
    const { remaining, total, isOvertime } = restTimer;
    const pct = isOvertime ? 1 : total > 0 ? Math.min(1, remaining / total) : 0;
    const display = formatRestClock(remaining);
    const circumference = 2 * Math.PI * 82;
    const strokeDashoffset = circumference * (1 - pct);

    const ringColor = isOvertime ? colors.success : colors.gold;
    const nextSetLabel = `Set ${state.currentSetIndex} of ${exercise.sets.length}`;

    return (
      <>
        <Stack.Screen options={{ title: 'Rest', headerShown: false }} />

        <View style={styles.restWrap}>
          <Text style={styles.restLabel}>{isOvertime ? 'REST OVER' : 'REST'}</Text>
          <Text style={styles.restContext}>
            Up next: {nextSetLabel} · {exercise.exerciseName}
          </Text>

          <Animated.View style={[styles.restRing, !reducedMotion && pulseStyle]}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
              <Circle
                cx={100}
                cy={100}
                r={82}
                fill="none"
                stroke={colors.textDim}
                strokeWidth={8}
              />
              <Circle
                cx={100}
                cy={100}
                r={82}
                fill="none"
                stroke={ringColor}
                strokeWidth={8}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </Svg>
            <View style={styles.restTimeCenter}>
              <Text style={[styles.restTime, isOvertime && styles.restTimeExpired]}>{display}</Text>
              <Text style={styles.restTimeLabel}>{isOvertime ? 'Over rest' : 'Remaining'}</Text>
            </View>
          </Animated.View>

          <View style={styles.restAdjustRow}>
            <TouchableOpacity
              style={styles.restAdjBtn}
              onPress={() => handleAdjustRest(-15)}
              activeOpacity={0.7}
              accessibilityLabel="Subtract 15 seconds"
            >
              <Text style={styles.restAdjBtnText}>−15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restAdjBtn}
              onPress={() => handleAdjustRest(15)}
              activeOpacity={0.7}
              accessibilityLabel="Add 15 seconds"
            >
              <Text style={styles.restAdjBtnText}>+15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restAdjBtn}
              onPress={() => handleAdjustRest(30)}
              activeOpacity={0.7}
              accessibilityLabel="Add 30 seconds"
            >
              <Text style={styles.restAdjBtnText}>+30s</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.restSkipBtn}
            onPress={handleMoveOn}
            activeOpacity={0.85}
            accessibilityLabel="Move on to the next set"
          >
            <Text style={styles.restSkipBtnText}>Move On →</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderFinished = () => (
    <>
      <View style={styles.centered}>
        <View style={styles.finishedBanner}>
          <Text style={styles.finishedIcon}>✓</Text>
          <Text style={styles.finishedTitle}>{exercise.exerciseName}</Text>
          <Text style={styles.finishedSub}>Exercise completed</Text>
        </View>

        <View style={styles.finishedActions}>
          <CtaButton label="Back to Workout" onPress={() => router.back()} />

          {nextExercise && (
            <GhostButton
              label={`Next: ${nextExercise.exerciseName} →`}
              onPress={() => router.replace(`/workout/${nextExercise.exerciseLogId}`)}
            />
          )}

          <GhostButton
            label="View Summary"
            onPress={() => router.replace(`/workout/summary?sessionId=${session.id}`)}
          />
        </View>
      </View>
    </>
  );

  const phaseContent = {
    intro: renderIntro,
    logging: renderLogging,
    sets_completed: renderSetsCompleted,
    resting: renderResting,
    finished: renderFinished,
  }[loggingPhase]();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: exercise.exerciseName, headerShown: false }} />
      {loggingPhase === 'resting' ? (
        <View style={styles.screen}>{phaseContent}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {phaseContent}
        </ScrollView>
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
    scroll: {
      flex: 1,
    },
    content: {
      paddingBottom: 40,
    },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxxl,
    },
    error: {
      ...typography.body,
      color: c.danger,
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
    backBtn: {
      paddingHorizontal: spacing.xxl,
      paddingTop: 14,
      paddingBottom: spacing.xs,
      alignSelf: 'flex-start',
    },
    backBtnText: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 10,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      color: c.textTertiary,
    },
    hero: {
      paddingHorizontal: spacing.xxl,
      paddingBottom: spacing.xl,
    },
    exName: {
      fontFamily: 'BarlowCondensed_800ExtraBold',
      fontSize: 36,
      lineHeight: 36,
      letterSpacing: -0.02,
      color: c.textPrimary,
    },
    exType: {
      ...typography.monoBody,
      color: c.textTertiary,
      marginTop: spacing.xs,
      letterSpacing: 0.06,
    },
    logCard: {
      marginHorizontal: spacing.xxl,
      marginBottom: 14,
      backgroundColor: c.surfaceElevated,
      borderWidth: 0.5,
      borderColor: c.border,
      borderRadius: radii.card,
      padding: spacing.xl,
    },
    setLabel: {
      ...typography.monoLabel,
      color: c.textSecondary,
      letterSpacing: 0.1,
      textTransform: 'uppercase',
      marginBottom: spacing.lg,
    },
    stepperSection: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    stepperLabel: {
      ...typography.monoSmall,
      color: c.textMuted,
    },
    stepperControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.dot,
      backgroundColor: c.border,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: {
      ...typography.monoBody,
      color: c.textSecondary,
    },
    stepVal: {
      ...typography.monoBody,
      color: c.textPrimary,
      minWidth: 70,
      textAlign: 'center',
    },
    stepValWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 70,
    },
    stepValInput: {
      borderBottomWidth: 1,
      borderBottomColor: c.gold,
      paddingVertical: 0,
      paddingHorizontal: 4,
    },
    stepUnit: {
      ...typography.monoSmall,
      color: c.textTertiary,
    },
    prevBest: {
      ...typography.monoSmall,
      color: c.textMuted,
      paddingTop: spacing.sm,
    },
    validationError: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.md,
      backgroundColor: c.dangerSurface,
      borderWidth: 0.5,
      borderColor: c.dangerBorder,
      borderRadius: radii.icon,
      padding: spacing.md,
      alignItems: 'center',
    },
    validationErrorText: {
      ...typography.monoSmall,
      color: c.danger,
    },
    lastTimeWrap: {
      marginHorizontal: spacing.xxl,
      marginBottom: spacing.xl,
      alignItems: 'flex-start',
    },
    spacerLg: {
      height: spacing.lg,
    },
    spacerBottom: {
      height: 40,
    },
    completeBanner: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      gap: spacing.sm,
    },
    completeIcon: {
      fontSize: 40,
      color: c.success,
    },
    completeText: {
      ...typography.monoBody,
      color: c.success,
      textAlign: 'center',
    },
    // Rest timer styles
    restWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xxl,
    },
    restLabel: {
      ...typography.monoLabel,
      color: c.textTertiary,
      letterSpacing: 0.15,
      textTransform: 'uppercase',
      marginBottom: spacing.sm,
    },
    restContext: {
      ...typography.subheading,
      color: c.textSecondary,
      marginBottom: spacing.xxxl,
      textAlign: 'center',
    },
    restRing: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xxxl,
      position: 'relative',
    },
    restTimeCenter: {
      position: 'absolute',
      alignItems: 'center',
    },
    restTime: {
      fontFamily: 'SpaceMono_700Bold',
      fontSize: 42,
      lineHeight: 42,
      letterSpacing: -0.04,
      color: c.textPrimary,
    },
    restTimeExpired: {
      color: c.success,
    },
    restTimeLabel: {
      ...typography.monoSmall,
      color: c.textTertiary,
      letterSpacing: 0.12,
      textTransform: 'uppercase',
      marginTop: spacing.sm,
    },
    restAdjustRow: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%',
      marginBottom: spacing.lg,
    },
    restAdjBtn: {
      flex: 1,
      backgroundColor: c.surfaceInteractive,
      borderWidth: 0.5,
      borderColor: c.borderActive,
      borderRadius: radii.dot,
      paddingVertical: spacing.lg,
      alignItems: 'center',
    },
    restAdjBtnText: {
      ...typography.body,
      color: c.textSecondary,
      letterSpacing: 0.04,
    },
    restSkipBtn: {
      width: '100%',
      backgroundColor: c.gold,
      borderRadius: radii.row,
      paddingVertical: 15,
      alignItems: 'center',
    },
    restSkipBtnText: {
      ...typography.cta,
      color: c.blackText,
      textTransform: 'uppercase',
    },
    // Finished styles
    finishedBanner: {
      alignItems: 'center',
      marginBottom: spacing.xxxl,
      gap: spacing.sm,
    },
    finishedIcon: {
      fontSize: 48,
      color: c.success,
    },
    finishedTitle: {
      fontFamily: 'BarlowCondensed_800ExtraBold',
      fontSize: 32,
      lineHeight: 32,
      letterSpacing: -0.02,
      color: c.textPrimary,
      textAlign: 'center',
    },
    finishedSub: {
      ...typography.monoBody,
      color: c.textTertiary,
    },
    finishedActions: {
      width: '100%',
      gap: spacing.sm,
    },
  });
