import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { ProgramProgressBar } from '@/components/ui/ProgramProgressBar';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { WeekStrip, recentDayStatuses } from '@/components/ui/WeekStrip';
import { DayFigure, dayTypeToFigureKey } from '@/components/ui/DayFigure';
import { WorkoutPreviewCard, type PreviewExercise } from '@/components/home/WorkoutPreviewCard';
import {
  resolveCurrentSchedule,
  getTodayPlan,
  getRecentDays,
  getDayPrescription,
  isTrainingDayType,
  hydrateActiveSession,
  abandonSession,
  getSessionProgress,
  getElapsedMinutes,
  finalizeStaleSessions,
  getCurrentStreak,
  getCompletedSessionCount,
  getProgramDayNumber,
  getProgramStart,
  TRAINING_DAY_TYPES,
} from '@/src/features/workout-session';
import { getActiveSession, getSessionsStartedBetween } from '@/src/db/repositories/sessions';
import {
  isoToLocalDateKey,
  localDayBoundsIso,
  localDaysBetween,
  parseLocalDateKey,
} from '@/src/lib/dates';
import { initializeSession } from '@/src/features/workout-session/session-initializer';
import { createCardioSession } from '@/src/db/repositories/cardio';
import { getBodyweightEntries } from '@/src/db/repositories/bodyweight';
import { getProgressPhotos } from '@/src/db/repositories/photos';
import { WeighInSheet } from '@/features/bodyweight/WeighInSheet';
import { logWeightEntry } from '@/features/bodyweight/weight-settings';
import { WeighInCard } from '@/components/home/WeighInCard';
import { PhotoDueBanner } from '@/components/home/PhotoDueBanner';
import { hasEntryToday, type WeightUnit } from '@/src/features/progress-tracking/weight';
import { isPhotoSetDue } from '@/src/features/progress-tracking/photos';
import { PROGRAM, TOTAL_WEEKS } from '@/src/data/program';
import type { DayPrescription } from '@/src/data/program';
import type { HomeScreenState } from '@/components/home/types';
import type {
  ActiveSession,
  RecentDay,
  TodayPlan,
  TrainingDayType,
  WorkoutChoice,
} from '@/src/features/workout-session';
import { CardioLogger } from '@/components/cardio/CardioLogger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DevClearDbButton } from '@/components/ui/DevClearDbButton';

type Selection = TrainingDayType | 'Mobility';

const TOTAL_SESSIONS = TOTAL_WEEKS * TRAINING_DAY_TYPES.length;

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** e.g. "Thu 22 Oct" */
function shortDate(date: Date): string {
  return `${(WEEKDAY_NAMES[date.getDay()] ?? '').slice(0, 3)} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** The design's single 16px side gutter, shared by every row on Home. */
const SCREEN_GUTTER = spacing.xl;

/** Week 6 prescribes 1 working set per exercise at lower RPE: the program's deload. */
const DELOAD_WEEK = 6;

function getBlockName(weekNumber: number): string {
  if (weekNumber === DELOAD_WEEK) return 'Deload week';
  const block = PROGRAM.blocks.find(
    (b: { weekStart: number; weekEnd: number }) =>
      weekNumber >= b.weekStart && weekNumber <= b.weekEnd,
  );
  return block?.name ?? '';
}

function previewOf(day: DayPrescription): PreviewExercise[] {
  return [...day.exercises]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((e) => ({ name: e.exerciseName, rx: `${e.workingSets}×${e.repRange}` }));
}

/** The suggestion: the first open training day in program order. */
function defaultSelection(plan: TodayPlan): Selection | null {
  const next = plan.choices.find((c) => c.status === 'available');
  if (next) return next.dayType;
  return plan.mobility.available ? 'Mobility' : null;
}

function isSelectable(plan: TodayPlan, selection: Selection): boolean {
  if (selection === 'Mobility') return plan.mobility.available;
  return plan.choices.some((c) => c.dayType === selection && c.status === 'available');
}

/** "today", "yesterday", or a short weekday for a recent date key. */
function formatRecentDay(dateKey: string): string {
  const daysAgo = localDaysBetween(parseLocalDateKey(dateKey), new Date());
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  return parseLocalDateKey(dateKey).toLocaleDateString('en-US', { weekday: 'short' });
}

/** "tomorrow" or a weekday for an upcoming date key. */
function formatUnlockDay(dateKey: string): string {
  if (localDaysBetween(new Date(), parseLocalDateKey(dateKey)) <= 1) return 'tomorrow';
  return parseLocalDateKey(dateKey).toLocaleDateString('en-US', { weekday: 'long' });
}

function choiceSubtitle(choice: WorkoutChoice): string {
  const exercises = `${choice.dayPrescription.exercises.length} exercises`;
  if (choice.status === 'doneThisWeek') return `${exercises} · ✓ Done this week`;
  if (choice.status === 'recent' && choice.lastDoneOn && choice.availableOn) {
    return `Done ${formatRecentDay(choice.lastDoneOn)} · unlocks ${formatUnlockDay(choice.availableOn)}`;
  }
  if (!choice.lastDoneOn) return `${exercises} · Not done yet`;
  const daysAgo = localDaysBetween(parseLocalDateKey(choice.lastDoneOn), new Date());
  return `${exercises} · Last done ${daysAgo} days ago`;
}

async function computeScreenState(): Promise<HomeScreenState> {
  // Sessions left open from an earlier day are closed before anything
  // else, so they never block today's workout. This runs before the week is
  // resolved because completing one can finish the week.
  await finalizeStaleSessions();

  const schedule = await resolveCurrentSchedule();

  if (schedule.status === 'onboarding') {
    return { status: 'onboarding' };
  }

  if (schedule.status === 'programCompleted') {
    return { status: 'programCompleted' };
  }

  // An open session always wins. Describe it with its own week/day.
  const activeSession = await getActiveSession();
  if (activeSession && isTrainingDayType(activeSession.dayType)) {
    return {
      status: 'inProgress',
      weekNumber: activeSession.weekNumber,
      dayPrescription: getDayPrescription(activeSession.weekNumber, activeSession.dayType),
      sessionId: activeSession.id,
      blockName: getBlockName(activeSession.weekNumber),
    };
  }

  const { startIso, endIso } = localDayBoundsIso(new Date());
  const completedToday = (await getSessionsStartedBetween(startIso, endIso)).find(
    (s) => s.status === 'completed',
  );
  if (completedToday && isTrainingDayType(completedToday.dayType)) {
    return {
      status: 'completed',
      weekNumber: completedToday.weekNumber,
      dayPrescription: getDayPrescription(completedToday.weekNumber, completedToday.dayType),
      blockName: getBlockName(completedToday.weekNumber),
    };
  }
  // An abandoned session for today stays selectable: Begin reopens it with
  // its logged sets.

  return {
    status: 'choose',
    blockName: getBlockName(schedule.weekNumber),
    plan: await getTodayPlan(schedule.weekNumber),
  };
}

export default function TodayScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [screenState, setScreenState] = useState<HomeScreenState>({ status: 'loading' });
  const [didAutoRedirect, setDidAutoRedirect] = useState(false);
  const reducedMotion = useReducedMotion();
  const [hydratedSession, setHydratedSession] = useState<ActiveSession | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [picked, setPicked] = useState<Selection | null>(null);
  const [streak, setStreak] = useState(0);
  const [sessionsDone, setSessionsDone] = useState(0);
  const [recentDays, setRecentDays] = useState<RecentDay[]>([]);
  // null until loaded, so the weigh-in sheet is never shown on a stale guess.
  const [weighedToday, setWeighedToday] = useState<boolean | null>(null);
  const [photoNudge, setPhotoNudge] = useState<{ due: boolean; daysSince: number | null }>({
    due: false,
    daysSince: null,
  });
  const [weighInOpen, setWeighInOpen] = useState(false);
  // The workout waiting on the weigh-in sheet, started once it is logged or skipped.
  const [pendingChoice, setPendingChoice] = useState<WorkoutChoice | null>(null);
  // Resuming the open workout is also waiting on the weigh-in sheet.
  const [resumePending, setResumePending] = useState(false);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const startingRef = useRef(false);

  const resumePulse = useSharedValue(1);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInProgress = screenState.status === 'inProgress';
  const inProgressSessionId = screenState.status === 'inProgress' ? screenState.sessionId : null;

  useEffect(() => {
    if (isInProgress && !reducedMotion) {
      resumePulse.value = withRepeat(
        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
      pulseTimeoutRef.current = setTimeout(() => {
        resumePulse.value = withTiming(1, { duration: 300 });
      }, 30000);
    }
    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    };
  }, [isInProgress, reducedMotion, resumePulse]);

  const resumePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resumePulse.value }],
  }));

  // Hydrate active session when entering inProgress state
  useEffect(() => {
    if (inProgressSessionId !== null) {
      setHydrating(true);
      (async () => {
        try {
          const session = await hydrateActiveSession(inProgressSessionId);
          setHydratedSession(session);
        } catch {
          setHydratedSession(null);
        } finally {
          setHydrating(false);
        }
      })();
    } else {
      setHydratedSession(null);
    }
  }, [inProgressSessionId]);

  useEffect(() => {
    if (screenState.status === 'programCompleted' && !didAutoRedirect) {
      setDidAutoRedirect(true);
      router.replace('/completed');
    }
  }, [screenState.status, didAutoRedirect, router]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const state = await computeScreenState();
          if (cancelled) return;
          setScreenState(state);
          // A fresh plan starts from its own suggestion.
          setPicked(null);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (!cancelled) setScreenState({ status: 'error', message });
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Streak, session count and the last-7-days strip for the shared header.
  useEffect(() => {
    if (
      screenState.status === 'loading' ||
      screenState.status === 'error' ||
      screenState.status === 'onboarding'
    ) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [streakNow, done, days, weights, latestPhotos, programStart] = await Promise.all([
          getCurrentStreak(),
          getCompletedSessionCount(),
          getRecentDays(),
          getBodyweightEntries(30),
          getProgressPhotos(1),
          getProgramStart(),
        ]);
        if (cancelled) return;
        setStreak(streakNow);
        setSessionsDone(done);
        setRecentDays(days);
        const now = new Date();
        setWeighedToday(hasEntryToday(weights, now));
        const lastTakenAt = latestPhotos[0]?.takenAt ?? null;
        setPhotoNudge({
          due: isPhotoSetDue(lastTakenAt, programStart, now),
          daysSince: lastTakenAt
            ? localDaysBetween(parseLocalDateKey(isoToLocalDateKey(lastTakenAt)), now)
            : null,
        });
      } catch (e) {
        console.warn('[home] Failed to load header data:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [screenState]);

  const handleCardioLog = useCallback(
    async (data: {
      intensityType: 'low_moderate' | 'high_intensity';
      activity: string;
      durationMinutes: number;
      note: string | null;
    }) => {
      if (screenState.status !== 'choose') return;
      try {
        await createCardioSession({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          weekNumber: screenState.plan.weekNumber,
          intensityType: data.intensityType,
          activity: data.activity,
          durationMinutes: data.durationMinutes,
          note: data.note,
          loggedAt: new Date().toISOString(),
        });
        Alert.alert('Logged', `${data.durationMinutes} min of ${data.activity} saved.`);
        // Refresh so the history and the mobility lock show the new log.
        setScreenState(await computeScreenState());
      } catch (e) {
        console.error('[home] Failed to log cardio:', e);
        Alert.alert('Error', 'Failed to log cardio. Please try again.');
      }
    },
    [screenState],
  );

  const startSession = useCallback(
    async (weekNumber: number, dayPrescription: DayPrescription) => {
      const dayType = dayPrescription.dayType;
      if (!isTrainingDayType(dayType)) return;
      // Guard against double taps creating two sessions.
      if (startingRef.current) return;
      startingRef.current = true;
      try {
        const { session } = await initializeSession(weekNumber, dayType, dayPrescription);
        router.push(`/workout?sessionId=${session.id}` as Href);
      } catch (e) {
        console.error('[home] Failed to start session:', e);
        Alert.alert('Error', 'Failed to start the workout. Please try again.');
      } finally {
        startingRef.current = false;
      }
    },
    [router],
  );

  const doResume = useCallback(async () => {
    if (screenState.status !== 'inProgress') return;
    const activeSesh = hydratedSession ?? (await hydrateActiveSession(screenState.sessionId));
    if (activeSesh) {
      const activeEx = activeSesh.exercises.find((e) => e.status === 'active');
      if (activeEx) {
        router.push(`/workout/${activeEx.exerciseLogId}` as Href);
        return;
      }
    }
    router.push(`/workout?sessionId=${screenState.sessionId}` as Href);
  }, [screenState, router, hydratedSession]);

  const handleBegin = useCallback(
    async (choice: WorkoutChoice) => {
      if (screenState.status !== 'choose' || choice.status !== 'available') return;
      // Ask for today's weight first, but never block the workout on it.
      if (weighedToday === false) {
        setPendingChoice(choice);
        setWeighInOpen(true);
        return;
      }
      await startSession(screenState.plan.weekNumber, choice.dayPrescription);
    },
    [screenState, startSession, weighedToday],
  );

  const finishWeighIn = useCallback(async () => {
    setWeighInOpen(false);
    const choice = pendingChoice;
    const resuming = resumePending;
    setPendingChoice(null);
    setResumePending(false);
    if (choice && screenState.status === 'choose') {
      await startSession(screenState.plan.weekNumber, choice.dayPrescription);
    } else if (resuming) {
      await doResume();
    }
  }, [pendingChoice, resumePending, screenState, startSession, doResume]);

  const handleResume = useCallback(async () => {
    // Ask for today's weight first, but never block the workout on it.
    if (weighedToday === false) {
      setPendingChoice(null);
      setResumePending(true);
      setWeighInOpen(true);
      return;
    }
    await doResume();
  }, [weighedToday, doResume]);

  const handleWeighInLog = useCallback(
    async (weight: number, unit: WeightUnit) => {
      try {
        await logWeightEntry(weight, unit);
      } catch (e) {
        console.error('[home] Failed to log weight:', e);
        Alert.alert('Error', 'Failed to save your weight. Please try again, or skip.');
        return;
      }
      setWeighedToday(true);
      await finishWeighIn();
    },
    [finishWeighIn],
  );

  const handleAbandon = useCallback(() => {
    if (screenState.status !== 'inProgress' || !hydratedSession) return;
    Alert.alert(
      'Abandon Session',
      'This will mark the session as incomplete. All logged sets will be kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: async () => {
            try {
              await abandonSession(hydratedSession);
              const newState = await computeScreenState();
              setScreenState(newState);
            } catch (e) {
              console.error('[home] Failed to abandon session:', e);
              Alert.alert('Error', 'Failed to abandon session. Please try again.');
            }
          },
        },
      ],
    );
  }, [screenState, hydratedSession]);

  if (screenState.status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (screenState.status === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{screenState.message}</Text>
      </View>
    );
  }

  if (screenState.status === 'onboarding') {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>No Program Started</Text>
        <Text style={styles.messageSub}>Set up your program start date to begin.</Text>
        <TouchableOpacity
          style={styles.goldBtn}
          onPress={() => router.push('/(onboarding)/set-start-date')}
        >
          <Text style={styles.goldBtnText}>Set Start Date</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screenState.status === 'programCompleted') {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Program Complete</Text>
        <Text style={styles.messageSub}>You have finished all 12 weeks.</Text>
        <TouchableOpacity style={styles.goldBtn} onPress={() => router.replace('/completed')}>
          <Text style={styles.goldBtnText}>View Summary →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const devClear = <DevClearDbButton onCleared={() => setScreenState({ status: 'onboarding' })} />;

  // Shared frame: header, progress, last-7-days strip, state block, CTA dock.
  const frame = (weekNumber: number, block: React.ReactNode, footer: React.ReactNode) => (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>TODAY</Text>
            <Text style={styles.headerTitle}>{shortDate(new Date())}</Text>
          </View>
          <StreakBadge count={streak} />
        </View>
        <ProgramProgressBar
          currentWeek={weekNumber}
          totalWeeks={TOTAL_WEEKS}
          sessionsDone={sessionsDone}
          totalSessions={TOTAL_SESSIONS}
        />
        {recentDays.length > 0 && (
          <View style={styles.stripWrap}>
            <Text style={styles.sectionLabel}>LAST 7 DAYS</Text>
            <WeekStrip days={recentDayStatuses(recentDays)} />
          </View>
        )}
        {photoNudge.due ? (
          <View style={styles.nudge}>
            <PhotoDueBanner
              daysSinceLast={photoNudge.daysSince}
              onPress={() => router.push('/(tabs)/progress/photos' as Href)}
            />
          </View>
        ) : weighedToday === false ? (
          <View style={styles.nudge}>
            <WeighInCard
              onPress={() => {
                setPendingChoice(null);
                setResumePending(false);
                setWeighInOpen(true);
              }}
            />
          </View>
        ) : null}
        <View style={styles.block}>{block}</View>
      </ScrollView>
      {footer ? <View style={styles.dock}>{footer}</View> : null}
      <WeighInSheet visible={weighInOpen} onLog={handleWeighInLog} onSkip={finishWeighIn} />
      {devClear}
    </View>
  );

  // --- CHOOSE TODAY'S WORKOUT ---
  if (screenState.status === 'choose') {
    const { plan, blockName } = screenState;
    const selection = picked && isSelectable(plan, picked) ? picked : defaultSelection(plan);
    const upNext = plan.choices.find((c) => c.status === 'available');
    const selectedChoice = plan.choices.find((c) => c.dayType === selection);
    const nextUnlock = upNext
      ? null
      : plan.choices
          .map((c) => c.availableOn)
          .filter((d): d is string => d !== null)
          .sort()[0];
    const firstWorkout =
      plan.weekNumber === 1 && plan.choices.every((c) => c.status !== 'doneThisWeek');

    const block = (
      <>
        <View style={styles.choiceList} accessibilityRole="radiogroup">
          {plan.choices.map((choice) => {
            const locked = choice.status !== 'available';
            const isSelected = choice.dayType === selection;
            return (
              <TouchableOpacity
                key={choice.dayType}
                style={[
                  styles.choiceCard,
                  isSelected && styles.choiceCardSelected,
                  locked && styles.choiceLocked,
                ]}
                onPress={() => setPicked(choice.dayType)}
                disabled={locked}
                accessibilityRole="radio"
                accessibilityLabel={`${choice.dayType} day, ${choiceSubtitle(choice)}`}
                accessibilityState={{ selected: isSelected, disabled: locked }}
              >
                <DayFigure
                  day={dayTypeToFigureKey(choice.dayType)}
                  size={40}
                  tone={locked ? 'dim' : 'lit'}
                />
                <View style={styles.choiceInfo}>
                  <Text style={styles.choiceTitle}>{choice.dayType} Day</Text>
                  <Text style={styles.choiceSub}>{choiceSubtitle(choice)}</Text>
                </View>
                {choice === upNext && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>UP NEXT</Text>
                  </View>
                )}
                {choice.status === 'doneThisWeek' && <Text style={styles.doneMark}>✓</Text>}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.choiceCard,
              selection === 'Mobility' && styles.choiceCardSelected,
              !plan.mobility.available && styles.choiceLocked,
            ]}
            onPress={() => setPicked('Mobility')}
            disabled={!plan.mobility.available}
            accessibilityRole="radio"
            accessibilityLabel="Cardio and mobility"
            accessibilityState={{
              selected: selection === 'Mobility',
              disabled: !plan.mobility.available,
            }}
          >
            <DayFigure day="rest" size={40} tone="neutral" />
            <View style={styles.choiceInfo}>
              <Text style={styles.choiceTitle}>Cardio / Mobility</Text>
              <Text style={styles.choiceSub}>
                {plan.mobility.availableOn
                  ? `Logged in the last 7 days · unlocks ${formatUnlockDay(plan.mobility.availableOn)}`
                  : 'Optional · once every 7 days'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {nextUnlock && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              All five workouts were done in the last 7 days. The next one unlocks{' '}
              {formatUnlockDay(nextUnlock)}.
            </Text>
          </View>
        )}

        {selectedChoice && (
          <WorkoutPreviewCard
            dayType={selectedChoice.dayType}
            dayNumber={getProgramDayNumber(plan.weekNumber, selectedChoice.dayType)}
            meta={`${selectedChoice.dayPrescription.exercises.length} exercises${blockName ? ` · ${blockName}` : ''}`}
            exercises={previewOf(selectedChoice.dayPrescription)}
          />
        )}

        {selection === 'Mobility' && (
          <CardioLogger weekNumber={plan.weekNumber} onLog={handleCardioLog} />
        )}

        {firstWorkout && selectedChoice && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              First time? Start lighter than you think. Increase weight next session.
            </Text>
          </View>
        )}
      </>
    );

    const footer = selectedChoice ? (
      <CtaButton
        label={`Start ${selectedChoice.dayType} workout`}
        onPress={() => handleBegin(selectedChoice)}
      />
    ) : selection === 'Mobility' ? null : (
      <CtaButton label="Nothing available today" onPress={() => {}} disabled />
    );

    return frame(plan.weekNumber, block, footer);
  }

  // --- IN PROGRESS / RESUME ---
  if (screenState.status === 'inProgress') {
    const { dayPrescription, weekNumber, blockName } = screenState;
    const session = hydratedSession;

    // While hydrating, show a loading state
    if (hydrating || !session) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      );
    }

    const progress = getSessionProgress(session);
    const elapsedMin = getElapsedMinutes(session);
    const ordered = [...session.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
    const exercises: PreviewExercise[] = ordered.map((ex) => ({
      name: ex.exerciseName,
      rx: `${ex.prescription?.workingSets ?? ex.sets.length}×${ex.prescription?.repRange ?? ''}`,
      done: ex.status === 'completed',
    }));
    // Show unfinished exercises first so the card says what is left.
    exercises.sort((a, b) => Number(!!a.done) - Number(!!b.done));
    const doneCount = ordered.filter((e) => e.status === 'completed').length;

    return frame(
      weekNumber,
      <WorkoutPreviewCard
        dayType={dayPrescription.dayType}
        dayNumber={getProgramDayNumber(weekNumber, dayPrescription.dayType)}
        meta={`${doneCount} of ${progress.totalExercises} done · ${elapsedMin} min${blockName ? ` · ${blockName}` : ''}`}
        exercises={exercises}
        limit={6}
      />,
      <>
        <Animated.View style={!reducedMotion ? resumePulseStyle : undefined}>
          <CtaButton label="Resume workout" onPress={handleResume} />
        </Animated.View>
        <TouchableOpacity
          style={styles.textBtn}
          onPress={handleAbandon}
          activeOpacity={0.7}
          accessibilityLabel="Abandon current session"
        >
          <Text style={styles.textBtnLabel}>Abandon Session</Text>
        </TouchableOpacity>
      </>,
    );
  }

  // --- COMPLETED TODAY ---
  const { dayPrescription, weekNumber, blockName } = screenState;
  return frame(
    weekNumber,
    <>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Today&apos;s session complete</Text>
        <Text style={styles.noticeText}>Great work. See you next time.</Text>
      </View>
      <WorkoutPreviewCard
        dayType={dayPrescription.dayType}
        dayNumber={getProgramDayNumber(weekNumber, dayPrescription.dayType)}
        meta={`Session complete${blockName ? ` · ${blockName}` : ''}`}
        exercises={previewOf(dayPrescription).map((e) => ({ ...e, done: true }))}
      />
    </>,
    <GhostButton label="View progress" onPress={() => router.push('/(tabs)/progress' as Href)} />,
  );
}

const makeStyles = (c: ColorSet) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { flexGrow: 1, paddingBottom: spacing.xxl },
    centered: {
      flex: 1,
      backgroundColor: c.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
    },
    errorText: { ...typography.body, color: c.danger, textAlign: 'center' },
    messageTitle: {
      ...typography.heading,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    messageSub: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    goldBtn: {
      marginTop: spacing.xxxl,
      backgroundColor: c.gold,
      borderRadius: radii.row,
      paddingVertical: 14,
      paddingHorizontal: spacing.xxxl,
    },
    goldBtnText: { ...typography.cta, color: c.blackText, textTransform: 'uppercase' },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: SCREEN_GUTTER,
      paddingBottom: spacing.xl,
    },
    headerText: { gap: 2 },
    eyebrow: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 13,
      letterSpacing: 1.5,
      color: c.textTertiary,
    },
    headerTitle: {
      fontFamily: 'BarlowCondensed_800ExtraBold',
      fontSize: 32,
      lineHeight: 32,
      color: c.textPrimary,
    },
    stripWrap: {
      paddingHorizontal: SCREEN_GUTTER,
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    sectionLabel: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 13,
      letterSpacing: 1.5,
      color: c.textSecondary,
    },
    block: { paddingHorizontal: SCREEN_GUTTER, gap: spacing.xl },
    nudge: { paddingHorizontal: SCREEN_GUTTER, marginBottom: spacing.xl },
    dock: {
      paddingHorizontal: SCREEN_GUTTER,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
      backgroundColor: c.background,
      borderTopWidth: 0.5,
      borderTopColor: c.border,
    },
    // ---------------------------------
    // Choose today's workout
    // ---------------------------------
    choiceList: { gap: spacing.md },
    choiceCard: {
      minHeight: 64,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.row,
      backgroundColor: c.surface,
      borderWidth: 0.5,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    choiceCardSelected: {
      backgroundColor: c.goldSurface,
      borderWidth: 1.5,
      borderColor: c.goldStroke,
    },
    choiceLocked: { opacity: 0.55 },
    choiceInfo: { flex: 1, minWidth: 0, gap: 2 },
    choiceTitle: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 18,
      lineHeight: 20,
      color: c.textPrimary,
    },
    choiceSub: {
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 11,
      color: c.textSecondary,
    },
    badge: {
      backgroundColor: c.gold,
      borderRadius: 5,
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    badgeText: { fontFamily: 'SpaceMono_700Bold', fontSize: 9, color: c.blackText },
    doneMark: { fontFamily: 'SpaceMono_700Bold', fontSize: 16, color: c.successText },
    notice: {
      padding: 14,
      borderRadius: radii.card,
      backgroundColor: c.goldSurface,
      borderWidth: 0.5,
      borderColor: c.goldBorder,
      gap: 2,
    },
    noticeTitle: {
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 20,
      color: c.textPrimary,
    },
    noticeText: {
      fontFamily: 'BarlowCondensed_600SemiBold',
      fontSize: 16,
      color: c.textSecondary,
    },
    textBtn: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    textBtnLabel: { ...typography.body, color: c.dangerText },
  });
