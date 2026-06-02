import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, BackHandler, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, radii, spacing } from '@/src/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SetLogList } from '@/components/workout/SetLogList';
import { RpeSelector } from '@/components/workout/RpeSelector';
import { WarmupSection } from '@/components/workout/WarmupSection';
import { SubstitutionCard } from '@/components/workout/SubstitutionCard';
import { BeatTheLogbookCard } from '@/components/workout/BeatTheLogbookCard';
import { DemoVideoLink } from '@/components/workout/DemoVideoLink';
import { TechniqueNotes } from '@/components/workout/TechniqueNotes';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { useRestTimer } from '@/hooks/useRestTimer';
import { PROGRAM } from '@/src/data/program';
import type { ActiveSession, ActiveExercise, ExerciseHistoryComparison, LoggingPhase } from '@/src/features/workout-session/types';
import {
  hydrateActiveSession,
  updateSet,
  completeSession,
  getExerciseHistoryComparison,
  substituteExercise,
  logWarmupSet,
  getNextExercise,
  setExerciseStatus,
} from '@/src/features/workout-session';
import { getSubstitutionOptions } from '@/src/features/workout-session/substitution';
import { getActiveSession } from '@/src/db/repositories/sessions';

function parseRestSeconds(rest: string): number {
  const match = rest.match(/(\d+)/);
  return match ? parseInt(match[1], 10) * 60 : 90;
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
    };

export default function ExerciseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { exerciseLogId } = params as { exerciseLogId: string };
  console.log('[exercise-detail] mounted with params:', JSON.stringify(params));
  console.log('[exercise-detail] exerciseLogId:', exerciseLogId);
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScreenState>({ phase: 'loading' });
  const [comparison, setComparison] = useState<ExerciseHistoryComparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(true);
  const hasLoggedSetsRef = useRef(false);
  const prevLoggingPhaseRef = useRef<LoggingPhase | null>(null);

  const restTimer = useRestTimer(90);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const active = await getActiveSession();
        if (cancelled) return;
        if (!active) {
          setState({ phase: 'error', message: 'No active session.' });
          return;
        }
        const session = await hydrateActiveSession(active.id);
        if (cancelled) return;
        if (!session) {
          setState({ phase: 'error', message: 'Session not found.' });
          return;
        }
        const exercise = session.exercises.find((e) => e.exerciseLogId === exerciseLogId);
        if (cancelled) return;
        if (!exercise) {
          setState({ phase: 'error', message: 'Exercise not found.' });
          return;
        }

        if (exercise.prescription?.repRange) {
          const comp = await getExerciseHistoryComparison(
            exercise.prescribedExerciseName,
            exercise.prescription.repRange,
          );
          if (cancelled) return;
          setComparison(comp);
        }
        setComparisonLoading(false);

        const someLogged = exercise.sets.some((s) => s.weight > 0 || s.reps > 0);
        const allLogged = exercise.sets.every((s) => s.weight > 0 || s.reps > 0);
        hasLoggedSetsRef.current = someLogged;

        if (allLogged) {
          setState({
            phase: 'active',
            loggingPhase: 'sets_completed',
            session,
            exercise,
            currentSetIndex: exercise.sets.length,
            weight: 0,
            reps: 0,
            selectedRpe: null,
            restDuration: 90,
          });
          return;
        }

        const lastLogged = [...exercise.sets].reverse().find((s) => s.weight > 0 || s.reps > 0);
        const currentSetIndex = lastLogged
          ? Math.min(lastLogged.setIndex + 1, exercise.sets.length)
          : 1;
        const restSeconds = exercise.prescription
          ? parseRestSeconds(exercise.prescription.rest)
          : 90;

        if (cancelled) return;
        setState({
          phase: 'active',
          loggingPhase: someLogged ? 'logging' : 'intro',
          session,
          exercise,
          currentSetIndex,
          weight: lastLogged?.weight ?? exercise.sets[0]?.weight ?? 0,
          reps: lastLogged?.reps ?? 0,
          selectedRpe: null,
          restDuration: restSeconds,
        });
      } catch (e) {
        console.error('[exercise-detail] Failed to load exercise:', e);
        if (!cancelled) {
          setState({ phase: 'error', message: 'Failed to load exercise.' });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [exerciseLogId]);

  const allSetsLogged = state.phase === 'active'
    ? state.exercise.sets.every((s) => s.weight > 0 || s.reps > 0)
    : false;

  const confirmLeave = useCallback(() => {
    Alert.alert(
      'Leave exercise?',
      'You have logged sets but haven\'t finished all yet. Progress will be saved.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: () => router.back() },
      ],
    );
  }, [router]);

  const transitionFromRest = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'active') return prev;
      const { exercise, currentSetIndex } = prev;
      const allDone = exercise.sets.every((s) => s.weight > 0 || s.reps > 0);
      const nextWeight = !allDone
        ? (exercise.sets.find((s) => s.setIndex === currentSetIndex)?.weight ?? 0)
        : 0;
      return {
        ...prev,
        loggingPhase: (allDone ? 'sets_completed' : 'logging') as LoggingPhase,
        weight: nextWeight,
        selectedRpe: null,
      };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleSkipRest = useCallback(() => {
    restTimer.stop();
    transitionFromRest();
  }, [restTimer, transitionFromRest]);

  useEffect(() => {
    if (state.phase !== 'active') return;
    const prev = prevLoggingPhaseRef.current;
    prevLoggingPhaseRef.current = state.loggingPhase;

    if (state.loggingPhase === 'resting' && prev !== 'resting') {
      restTimer.reset(state.restDuration);
      restTimer.start();
    } else if (prev === 'resting' && state.loggingPhase !== 'resting') {
      restTimer.stop();
    }
  }, [state.phase === 'active' ? state.loggingPhase : null]);

  useEffect(() => {
    if (state.phase !== 'active') return;
    if (state.loggingPhase !== 'resting') return;
    if (!restTimer.isExpired) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    handleSkipRest();
  }, [restTimer.isExpired, state, handleSkipRest]);

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
    setState((prev) => {
      if (prev.phase !== 'active') return prev;
      return { ...prev, loggingPhase: 'logging' as const };
    });
  }, [state.phase]);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState<string | null>(null);
  const [editingReps, setEditingReps] = useState<string | null>(null);

  const handleLogSet = useCallback(async () => {
    if (state.phase !== 'active' || state.loggingPhase !== 'logging') return;
    const { session, exercise, currentSetIndex, weight, reps, selectedRpe } = state;
    const targetSet = exercise.sets.find((s) => s.setIndex === currentSetIndex);
    if (!targetSet) return;

    if (weight <= 0 || reps <= 0) {
      setValidationError('Enter weight and reps before logging');
      return;
    }
    setValidationError(null);

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

      const updatedExercise = updatedSession.exercises.find((e) => e.exerciseLogId === exerciseLogId)!;
      const allDone = updatedExercise.sets.every((s) => s.weight > 0 || s.reps > 0);

      if (!allDone) {
        const nextIndex = currentSetIndex + 1;
        const restSeconds = updatedExercise.prescription
          ? parseRestSeconds(updatedExercise.prescription.rest)
          : 90;
        setState({
          phase: 'active',
          loggingPhase: 'resting',
          session: updatedSession,
          exercise: updatedExercise,
          currentSetIndex: nextIndex,
          weight: updatedExercise.sets.find((s) => s.setIndex === nextIndex)?.weight ?? 0,
          reps: 0,
          selectedRpe: null,
          restDuration: restSeconds,
        });
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
          restDuration: 90,
        });
      }
    } catch (e) {
      console.error('[exercise] Failed to log set:', e);
      Alert.alert('Error', 'Failed to log set. Please try again.');
    }
  }, [state, exerciseLogId]);

  const handleCompleteExercise = useCallback(async () => {
    if (state.phase !== 'active') return;
    try {
      const updatedSession = await setExerciseStatus(state.session, exerciseLogId, 'completed');
      const next = getNextExercise(updatedSession, exerciseLogId);
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

  const handleFinishWorkout = useCallback(async () => {
    if (state.phase !== 'active') return;
    try {
      await completeSession(state.session);
      router.replace('/workout/summary');
    } catch (e) {
      console.error('[exercise] Failed to finish workout:', e);
      Alert.alert('Error', 'Failed to finish workout. Please try again.');
    }
  }, [state, router]);

  const handleSubstitution = useCallback(async (slot: 1 | 2) => {
    if (state.phase !== 'active') return;
    try {
      const updated = await substituteExercise(state.session, exerciseLogId, slot);
      const updatedExercise = updated.exercises.find((e) => e.exerciseLogId === exerciseLogId)!;
      setState((prev) => {
        if (prev.phase !== 'active') return prev;
        return { ...prev, session: updated, exercise: updatedExercise };
      });
    } catch (e) {
      console.error('[exercise] Failed to substitute exercise:', e);
    }
  }, [state, exerciseLogId]);

  const handleLogWarmup = useCallback(async (weight: number, reps: number) => {
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
    }
  }, [state, exerciseLogId]);

  const handleBack = useCallback(() => {
    if (hasLoggedSetsRef.current && !allSetsLogged) {
      confirmLeave();
    } else {
      router.back();
    }
  }, [allSetsLogged, confirmLeave, router]);

  const adjustFn = useCallback((field: 'weight' | 'reps', delta: number) => {
    if (state.phase !== 'active') return;
    if (field === 'weight') setEditingWeight(null);
    else setEditingReps(null);
    setState((prev) => {
      if (prev.phase !== 'active') return prev;
      const next = field === 'weight'
        ? Math.max(0, Math.round((prev.weight + delta) * 10) / 10)
        : Math.max(0, prev.reps + delta);
      return { ...prev, [field]: next };
    });
  }, [state.phase]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.dismissBtn} accessibilityLabel="Go back">
          <Text style={styles.dismissBtnText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { session, exercise, loggingPhase } = state;
  const pres = exercise.prescription;
  const exerciseMeta = PROGRAM.exercises[exercise.prescribedExerciseName];
  const substitutionOptions = getSubstitutionOptions(exercise.prescribedExerciseName).map((o) => ({
    slot: o.slot,
    name: o.substituteName,
  }));
  const substitutionDisabled = exercise.sets.some((s) => s.weight > 0 || s.reps > 0);
  const nextExercise = getNextExercise(session, exerciseLogId);

  // --- Phase Renders ---

  const renderIntro = () => (
    <>
      <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { paddingTop: insets.top + spacing.sm }]} accessibilityLabel="Back to workout">
        <Text style={styles.backBtnText}>← Today</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.exName}>{exercise.exerciseName}</Text>
        {pres && (
          <Text style={styles.exType}>
            {pres.technique !== 'N/A' ? `${pres.technique} · ` : ''}{pres.workingSets} WORKING SETS
          </Text>
        )}
      </View>

      <BeatTheLogbookCard comparison={comparison} isLoading={comparisonLoading} />

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
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { paddingTop: insets.top + spacing.sm }]} accessibilityLabel="Back to workout">
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
                    value={editingWeight ?? String(state.weight)}
                    onChangeText={setEditingWeight}
                    onFocus={() => setEditingWeight(String(state.weight))}
                    onBlur={() => {
                      if (editingWeight !== null) {
                        const num = parseFloat(editingWeight);
                        if (!isNaN(num) && num >= 0) {
                          setState(prev => {
                            if (prev.phase !== 'active') return prev;
                            return { ...prev, weight: num };
                          });
                        }
                        setEditingWeight(null);
                      }
                    }}
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
                    value={editingReps ?? String(state.reps)}
                    onChangeText={setEditingReps}
                    onFocus={() => setEditingReps(String(state.reps))}
                    onBlur={() => {
                      if (editingReps !== null) {
                        const num = parseInt(editingReps, 10);
                        if (!isNaN(num) && num >= 0) {
                          setState(prev => {
                            if (prev.phase !== 'active') return prev;
                            return { ...prev, reps: num };
                          });
                        }
                        setEditingReps(null);
                      }
                    }}
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
      <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { paddingTop: insets.top + spacing.sm }]} accessibilityLabel="Back to workout">
        <Text style={styles.backBtnText}>← Today</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <Text style={styles.exName}>{exercise.exerciseName}</Text>
        {pres && (
          <Text style={styles.exType}>
            {pres.workingSets} SETS COMPLETED
          </Text>
        )}
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
    const { remaining, total } = restTimer;
    const pct = total > 0 ? remaining / total : 0;
    const displayM = Math.floor(remaining / 60);
    const displayS = remaining % 60;
    const display = `${displayM}:${String(displayS).padStart(2, '0')}`;
    const circumference = 2 * Math.PI * 82;
    const strokeDashoffset = circumference * (1 - pct);
    const isExpired = restTimer.isExpired;

    const ringColor = isExpired ? colors.success : colors.gold;

    return (
      <>
        <Stack.Screen options={{ title: 'Rest', headerShown: false }} />

        <View style={styles.restWrap}>
          <Text style={styles.restLabel}>REST</Text>
          <Text style={styles.restContext}>
            Set {state.currentSetIndex - 1} · {exercise.exerciseName}
          </Text>

          <Animated.View style={[styles.restRing, !reducedMotion && pulseStyle]}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
              <Circle
                cx={100} cy={100} r={82}
                fill="none" stroke={colors.textDim} strokeWidth={8}
              />
              <Circle
                cx={100} cy={100} r={82}
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
              <Text style={[styles.restTime, isExpired && styles.restTimeExpired]}>
                {display}
              </Text>
              <Text style={styles.restTimeLabel}>
                {isExpired ? 'Ready' : 'Remaining'}
              </Text>
            </View>
          </Animated.View>

          <View style={styles.restAdjustRow}>
            <TouchableOpacity
              style={styles.restAdjBtn}
              onPress={() => restTimer.adjust(-15)}
              activeOpacity={0.7}
              accessibilityLabel="Subtract 15 seconds"
            >
              <Text style={styles.restAdjBtnText}>−15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restAdjBtn}
              onPress={() => restTimer.adjust(15)}
              activeOpacity={0.7}
              accessibilityLabel="Add 15 seconds"
            >
              <Text style={styles.restAdjBtnText}>+15s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restAdjBtn}
              onPress={() => restTimer.adjust(30)}
              activeOpacity={0.7}
              accessibilityLabel="Add 30 seconds"
            >
              <Text style={styles.restAdjBtnText}>+30s</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.restSkipBtn}
            onPress={handleSkipRest}
            activeOpacity={0.85}
            accessibilityLabel="Skip rest"
          >
            <Text style={styles.restSkipBtnText}>
              {isExpired ? 'Start Set →' : 'Skip Rest →'}
            </Text>
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
          <Text style={styles.finishedTitle}>
            {exercise.exerciseName}
          </Text>
          <Text style={styles.finishedSub}>Exercise completed</Text>
        </View>

        <View style={styles.finishedActions}>
          <CtaButton
            label="Back to Workout"
            onPress={() => router.back()}
          />

          {nextExercise && (
            <GhostButton
              label={`Next: ${nextExercise.exerciseName} →`}
              onPress={() => router.replace(`/workout/${nextExercise.exerciseLogId}`)}
            />
          )}

          <GhostButton
            label="View Summary"
            onPress={() => router.replace('/workout/summary')}
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
        <View style={styles.screen}>
          {phaseContent}
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {phaseContent}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  error: {
    ...typography.body,
    color: colors.danger,
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
    color: colors.textTertiary,
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
    color: colors.textPrimary,
  },
  exType: {
    ...typography.monoBody,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    letterSpacing: 0.06,
  },
  logCard: {
    marginHorizontal: spacing.xxl,
    marginBottom: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.xl,
  },
  setLabel: {
    ...typography.monoLabel,
    color: colors.textSecondary,
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
    color: colors.textMuted,
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
    backgroundColor: colors.border,
    borderWidth: 0.5,
    borderColor: colors.borderActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    ...typography.monoBody,
    color: colors.textSecondary,
  },
  stepVal: {
    ...typography.monoBody,
    color: colors.textPrimary,
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
    borderBottomColor: colors.gold,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  stepUnit: {
    ...typography.monoSmall,
    color: colors.textTertiary,
  },
  prevBest: {
    ...typography.monoSmall,
    color: colors.textMuted,
    paddingTop: spacing.sm,
  },
  validationError: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    backgroundColor: '#1a0808',
    borderWidth: 0.5,
    borderColor: '#5a1a1a',
    borderRadius: radii.icon,
    padding: spacing.md,
    alignItems: 'center',
  },
  validationErrorText: {
    ...typography.monoSmall,
    color: colors.danger,
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
    color: colors.success,
  },
  completeText: {
    ...typography.monoBody,
    color: colors.success,
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
    color: colors.textTertiary,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  restContext: {
    ...typography.subheading,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
  },
  restTimeExpired: {
    color: colors.success,
  },
  restTimeLabel: {
    ...typography.monoSmall,
    color: colors.textTertiary,
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
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: colors.borderActive,
    borderRadius: radii.dot,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  restAdjBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    letterSpacing: 0.04,
  },
  restSkipBtn: {
    width: '100%',
    backgroundColor: colors.gold,
    borderRadius: radii.row,
    paddingVertical: 15,
    alignItems: 'center',
  },
  restSkipBtnText: {
    ...typography.cta,
    color: '#0f0f0f',
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
    color: colors.success,
  },
  finishedTitle: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 32,
    lineHeight: 32,
    letterSpacing: -0.02,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  finishedSub: {
    ...typography.monoBody,
    color: colors.textTertiary,
  },
  finishedActions: {
    width: '100%',
    gap: spacing.sm,
  },
});
