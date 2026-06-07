import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View, Text, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useColors, typography, radii, spacing } from '@/src/theme';
import type { ColorSet } from '@/src/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CtaButton } from '@/components/ui/CtaButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { ProgramProgressBar } from '@/components/ui/ProgramProgressBar';
import { resolveCurrentSchedule, wasTrainingDayMissed, hydrateActiveSession, abandonSession, getSessionProgress, getElapsedMinutes } from '@/src/features/workout-session';
import { getActiveSession, getSessionsForToday, getSessionsWithVolume } from '@/src/db/repositories/sessions';
import { initializeSession } from '@/src/features/workout-session/session-initializer';
import { createCardioSession } from '@/src/db/repositories/cardio';
import { PROGRAM, TOTAL_WEEKS } from '@/src/data/program';
import type { HomeScreenState } from '@/components/home/types';
import type { ActiveSession } from '@/src/features/workout-session';
import { CardioLogger } from '@/components/cardio/CardioLogger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DevClearDbButton } from '@/components/ui/DevClearDbButton';

type WorkoutDayType = 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs';

const TRAINING_DAY_TYPES: WorkoutDayType[] = ['Upper', 'Lower', 'Pull', 'Push', 'Legs'];

function getBlockName(weekNumber: number): string {
  const block = PROGRAM.blocks.find(
    (b: { weekStart: number; weekEnd: number }) =>
      weekNumber >= b.weekStart && weekNumber <= b.weekEnd,
  );
  return block?.name ?? '';
}

function isTrainingDayType(dayType: string): dayType is WorkoutDayType {
  return (TRAINING_DAY_TYPES as readonly string[]).includes(dayType);
}

async function computeScreenState(): Promise<HomeScreenState> {
  const schedule = await resolveCurrentSchedule();

  if (schedule.status === 'onboarding') {
    return { status: 'onboarding' };
  }

  if (schedule.status === 'programCompleted') {
    return { status: 'programCompleted' };
  }

  const { weekNumber, dayPrescription } = schedule;
  const blockName = getBlockName(weekNumber);

  if (
    dayPrescription.activityType === 'OptionalCardioHIIT' ||
    dayPrescription.activityType === 'FullRest'
  ) {
    return {
      status: 'restDay',
      weekNumber,
      dayType: dayPrescription.dayType,
      activityType: dayPrescription.activityType,
      blockName,
    };
  }

  const activeSession = await getActiveSession();
  if (activeSession) {
    return {
      status: 'inProgress',
      weekNumber,
      dayPrescription,
      sessionId: activeSession.id,
      blockName,
    };
  }

  const todaySessions = await getSessionsForToday();
  const matchingSession = todaySessions.find(
    (s: { weekNumber: number; dayType: string }) =>
      s.weekNumber === weekNumber && s.dayType === dayPrescription.dayType,
  );

  if (matchingSession) {
    if (matchingSession.status === 'in_progress') {
      return {
        status: 'inProgress',
        weekNumber,
        dayPrescription,
        sessionId: matchingSession.id,
        blockName,
      };
    }
    if (matchingSession.status === 'completed') {
      return {
        status: 'completed',
        weekNumber,
        dayPrescription,
        blockName,
      };
    }
  }

  // Check if a training day was recently missed
  const missed = await wasTrainingDayMissed();
  if (missed) {
    return {
      status: 'missed',
      weekNumber,
      dayPrescription,
      blockName,
      missedDate: missed.missedDate,
      missedDayType: missed.missedDayType,
      daysAgo: missed.daysAgo,
    };
  }

  return {
    status: 'ready',
    weekNumber,
    dayPrescription,
    blockName,
  };
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TodayScheduleScreen() {
  const router = useRouter();
  const [screenState, setScreenState] = useState<HomeScreenState>({ status: 'loading' });
  const [didAutoRedirect, setDidAutoRedirect] = useState(false);
  const reducedMotion = useReducedMotion();
  const [hydratedSession, setHydratedSession] = useState<ActiveSession | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [missedStreakWas, setMissedStreakWas] = useState(0);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const resumePulse = useSharedValue(1);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (screenState.status === 'inProgress' && !reducedMotion) {
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
  }, [screenState.status === 'inProgress' ? true : false]);

  const resumePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resumePulse.value }],
  }));

  // Hydrate active session when entering inProgress state
  useEffect(() => {
    if (screenState.status === 'inProgress') {
      setHydrating(true);
      (async () => {
        try {
          const session = await hydrateActiveSession(screenState.sessionId);
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
  }, [screenState.status === 'inProgress' ? screenState.sessionId : null]);

  // Compute streak when entering missed state
  useEffect(() => {
    if (screenState.status === 'missed') {
      (async () => {
        try {
          const sessions = await getSessionsWithVolume(200);
          const missedDateEnd = screenState.missedDate + 'T23:59:59.999Z';
          const completedBeforeMissed = sessions.filter(
            (s) => s.status === 'completed' && s.startedAt < missedDateEnd,
          );
          setMissedStreakWas(completedBeforeMissed.length);
        } catch {
          setMissedStreakWas(0);
        }
      })();
    }
  }, [screenState.status === 'missed' ? screenState.missedDate : null]);

  useEffect(() => {
    if (screenState.status === 'programCompleted' && !didAutoRedirect) {
      setDidAutoRedirect(true);
      router.replace('/completed');
    }
  }, [screenState.status, didAutoRedirect]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const state = await computeScreenState();
          if (!cancelled) setScreenState(state);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          if (!cancelled) setScreenState({ status: 'error', message });
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const handleCardioLog = useCallback(async (data: {
    intensityType: 'low_moderate' | 'high_intensity';
    activity: string;
    durationMinutes: number;
    note: string | null;
  }) => {
    if (screenState.status !== 'restDay') return;
    try {
      await createCardioSession({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        weekNumber: screenState.weekNumber,
        intensityType: data.intensityType,
        activity: data.activity,
        durationMinutes: data.durationMinutes,
        note: data.note,
        loggedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[home] Failed to log cardio:', e);
    }
  }, [screenState]);

  const handleStartOrResume = useCallback(async () => {
    if (screenState.status === 'ready') {
      const dayType = screenState.dayPrescription.dayType;
      if (!isTrainingDayType(dayType)) return;
      const { session } = await initializeSession(
        screenState.weekNumber,
        dayType,
        screenState.dayPrescription,
      );
      router.push(`/workout?sessionId=${session.id}` as Href);
    } else if (screenState.status === 'inProgress') {
      const activeSesh = hydratedSession ?? await hydrateActiveSession(screenState.sessionId);
      if (activeSesh) {
        const activeEx = activeSesh.exercises.find((e) => e.status === 'active');
        if (activeEx) {
          router.push(`/workout/${activeEx.exerciseLogId}` as Href);
          return;
        }
      }
      router.push(`/workout?sessionId=${screenState.sessionId}` as Href);
    }
  }, [screenState, router, hydratedSession]);

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
        <Text style={styles.messageSub}>
          Set up your program start date to begin.
        </Text>
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
        <Text style={styles.messageSub}>
          You have finished all 12 weeks.
        </Text>
        <TouchableOpacity
          style={styles.goldBtn}
          onPress={() => router.replace('/completed')}
        >
          <Text style={styles.goldBtnText}>View Summary →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- MISSED SESSION (mockup s-missed) ---
  if (screenState.status === 'missed') {
    const { dayPrescription, weekNumber, blockName, missedDate, missedDayType, daysAgo } = screenState;
    const missedDay = new Date(missedDate + 'T00:00:00');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const displayDayName = dayNames[missedDay.getDay()];
    const displayDate = missedDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const todayDayName = dayNames[new Date().getDay()];
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{todayDayName} · Week {weekNumber}</Text>
              <Text style={styles.headerTitle}>Welcome back.</Text>
            </View>
          </View>

          <View style={styles.missedWarning}>
            <Text style={styles.missedIcon}>⚠️</Text>
            <View>
              <Text style={styles.missedTitle}>You missed {missedDayType} Day</Text>
              <Text style={styles.missedSub}>{displayDayName} {displayDate} was skipped. Your streak has reset.</Text>
            </View>
          </View>

          <View style={styles.streakResetRow}>
            <View style={styles.streakWas}>
              <Text style={styles.streakWasNum}>{missedStreakWas}</Text>
              <Text style={styles.streakWasLbl}>Was</Text>
            </View>
            <View style={styles.streakNow}>
              <Text style={styles.streakNowNum}>0</Text>
              <Text style={styles.streakNowLbl}>Now</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>What would you like to do?</Text>

          <TouchableOpacity style={styles.optionBest} onPress={handleStartOrResume}>
            <Text style={styles.optionIcon}>▶️</Text>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Do today&apos;s workout — {dayPrescription.dayType} Day</Text>
              <Text style={styles.optionSub}>Stay on schedule, skip the missed session</Text>
            </View>
            <View style={styles.bestBadge}>
              <Text style={styles.bestBadgeText}>Best</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionRegular}>
            <Text style={styles.optionIcon}>🔁</Text>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Make up {missedDayType} Day now</Text>
              <Text style={styles.optionSub}>Do {daysAgo === 1 ? 'yesterday\'s' : `${daysAgo} days ago`} session today instead</Text>
            </View>
          </TouchableOpacity>

          <CtaButton label={`Start ${dayPrescription.dayType} Day →`} onPress={handleStartOrResume} />
        </ScrollView>
        <DevClearDbButton onCleared={() => setScreenState({ status: 'onboarding' })} />
      </View>
    );
  }

  // --- REST DAY (mockup s-restday) ---
  if (screenState.status === 'restDay') {
    const { activityType, weekNumber } = screenState;
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Rest Day · Week {weekNumber}</Text>
              <Text style={styles.headerTitle}>Recovery Day</Text>
            </View>
          </View>

          <View style={styles.restCenter}>
            <Text style={styles.restEmoji}>😴</Text>
            <Text style={styles.restDesc}>
              No training today. Your muscles grow while you rest.
            </Text>
          </View>

          {activityType === 'OptionalCardioHIIT' && (
            <CardioLogger weekNumber={weekNumber} onLog={handleCardioLog} />
          )}

          <GhostButton label="View Full Plan" onPress={() => router.push('/(tabs)/week' as Href)} />
        </ScrollView>
        <DevClearDbButton onCleared={() => setScreenState({ status: 'onboarding' })} />
      </View>
    );
  }

  // --- READY / DAY 1 ZERO STATE (mockup s-zero + s-ready) ---
  if (screenState.status === 'ready') {
    const { dayPrescription, weekNumber, blockName } = screenState;
    const dayName = dayPrescription.dayType;

    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Monday · Week {weekNumber}</Text>
              <Text style={styles.headerTitle}>{dayName} Day A</Text>
            </View>
          </View>

          <View style={styles.zeroRing}>
            <View style={styles.zeroRingSvg}>
              <Text style={styles.zeroPct}>0%</Text>
              <Text style={styles.zeroLbl}>READY</Text>
            </View>
            <Text style={styles.zeroTitle}>Ready when you are</Text>
            <Text style={styles.zeroSub}>Your first session is loaded. Start your first set to begin the clock.</Text>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>First time? Start lighter than you think. Increase weight next session.</Text>
          </View>

          <ProgramProgressBar currentWeek={weekNumber} totalWeeks={TOTAL_WEEKS} />

          <CtaButton label="Begin Session →" onPress={handleStartOrResume} />
        </ScrollView>
        <DevClearDbButton onCleared={() => setScreenState({ status: 'onboarding' })} />
      </View>
    );
  }

  // --- IN PROGRESS / RESUME ---
  if (screenState.status === 'inProgress') {
    const { dayPrescription, weekNumber, blockName, sessionId } = screenState;
    const session = hydratedSession;

    // While hydrating, show a loading state
    if (hydrating || !session) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      );
    }

    // Compute all real values from the hydrated session
    const progress = getSessionProgress(session);
    const elapsedMin = getElapsedMinutes(session);
    const pct = progress.totalSets > 0 ? progress.completedSets / progress.totalSets : 0;
    const pctDisplay = `${Math.round(pct * 100)}%` as const;
    const setsDisplay = `${progress.completedSets} of ${progress.totalSets} sets`;
    const exercisesLeft = progress.totalExercises - progress.exercisesWithLoggedSets;

    // Format startedAt time (e.g., "10:24 AM")
    const startTime = new Date(session.startedAt);
    const formattedStartTime = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Find the active exercise and next set for the CTA label
    const activeExercise = session.exercises.find((e) => e.status === 'active');
    const nextExercise = session.exercises.find((e) => e.status === 'pending');
    const ctaExercise = activeExercise ?? nextExercise;
    const ctaSetIndex = ctaExercise
      ? ctaExercise.sets.filter((s) => s.isComplete).length + 1
      : null;
    const ctaExerciseName = ctaExercise?.exerciseName ?? dayPrescription.dayType;
    const ctaLabel = ctaSetIndex != null
      ? `Resume → Set ${ctaSetIndex} of ${ctaExerciseName}`
      : 'Resume Session →';

    // Estimate remaining time: ~2 min per remaining set
    const remainingSets = progress.totalSets - progress.completedSets;
    const estimatedLeftMin = Math.max(1, Math.round(remainingSets * 2));

    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Friday · Week {weekNumber}</Text>
              <Text style={styles.headerTitle}>Welcome back.</Text>
            </View>
          </View>

          <View style={styles.resumeIndicator}>
            <View style={styles.resumeDot} />
            <View>
              <Text style={styles.resumeLabel}>Session in progress</Text>
              <Text style={styles.resumeSub}>
                Left {elapsedMin} min ago · {dayPrescription.dayType} Day
              </Text>
            </View>
          </View>

          <View style={styles.resumeCard}>
            <Text style={styles.resumeCardTitle}>{dayPrescription.dayType} Day</Text>
            <Text style={styles.resumeCardMeta}>
              Started {formattedStartTime} · {elapsedMin} min elapsed
            </Text>

            <View style={styles.resumeExList}>
              {session.exercises
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((ex, i) => {
                  const completedSets = ex.sets.filter((s) => s.isComplete).length;
                  const totalExSets = ex.prescription?.workingSets ?? ex.sets.length;
                  const isCompleted = ex.status === 'completed';
                  const isActive = ex.status === 'active';
                  return (
                    <View key={ex.exerciseLogId} style={styles.resumeExRow}>
                      <View
                        style={[
                          styles.resumeDot,
                          isCompleted && styles.resumeDotDone,
                          isActive && styles.resumeDotActive,
                        ]}
                      />
                      <Text
                        style={[
                          styles.resumeExName,
                          isCompleted && styles.resumeExDone,
                          isActive && styles.resumeExActive,
                        ]}
                        numberOfLines={1}
                      >
                        {ex.exerciseName}
                      </Text>
                      <Text style={styles.resumeExSets}>
                        {completedSets}/{totalExSets}
                      </Text>
                    </View>
                  );
                })}
            </View>

            <View style={styles.progressBar}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: pctDisplay }]} />
              </View>
              <Text style={styles.progressLabel}>
                {setsDisplay} · {pctDisplay}
              </Text>
            </View>
          </View>

          <View style={styles.resumeStats}>
            <View style={styles.resumeStat}>
              <Text style={styles.resumeStatVal}>
                {elapsedMin}<Text style={styles.resumeStatUnit}>m</Text>
              </Text>
              <Text style={styles.resumeStatLbl}>Elapsed</Text>
            </View>
            <View style={styles.resumeStat}>
              <Text style={styles.resumeStatVal}>
                ~{estimatedLeftMin}<Text style={styles.resumeStatUnit}>m</Text>
              </Text>
              <Text style={styles.resumeStatLbl}>Left</Text>
            </View>
            <View style={styles.resumeStat}>
              <Text style={[styles.resumeStatVal, { color: colors.gold }]}>
                {exercisesLeft}
              </Text>
              <Text style={styles.resumeStatLbl}>Ex. left</Text>
            </View>
          </View>

          <ProgramProgressBar currentWeek={weekNumber} totalWeeks={TOTAL_WEEKS} />

          <Animated.View style={!reducedMotion ? resumePulseStyle : undefined}>
            <CtaButton label={ctaLabel} onPress={handleStartOrResume} />
          </Animated.View>

          <TouchableOpacity style={styles.dangerBtn} onPress={handleAbandon} activeOpacity={0.7} accessibilityLabel="Abandon current session">
            <Text style={styles.dangerBtnText}>Abandon Session</Text>
          </TouchableOpacity>
        </ScrollView>
        <DevClearDbButton onCleared={() => setScreenState({ status: 'onboarding' })} />
      </View>
    );
  }

  // --- COMPLETED ---
  const { dayPrescription, weekNumber, blockName } = screenState;
  const totalExercises = dayPrescription.exercises.length;
  const totalSets = dayPrescription.exercises.reduce((sum, ex) => sum + ex.workingSets, 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dayHeader}>
          <Text style={styles.daySub}>
            WEEK {weekNumber} · {blockName.toUpperCase()}
          </Text>
          <Text style={styles.dayTitle}>
            {dayPrescription.dayType} Day
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>{totalSets}</Text>
            <Text style={styles.statLabel}>Working Sets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statVal}>
              {dayPrescription.exercises[0]?.repRange ?? '—'}
            </Text>
            <Text style={styles.statLabel}>Rep Range</Text>
          </View>
        </View>

        <View style={styles.exPreview}>
          <Text style={styles.sectionLabel}>TODAY&apos;S EXERCISES</Text>
          {dayPrescription.exercises.map((ex) => (
            <View key={`${ex.exerciseName}-${ex.sortOrder}`} style={styles.exRow}>
              <Text style={styles.exName} numberOfLines={1}>
                {ex.exerciseName}
              </Text>
              <Text style={styles.exSpec}>
                {ex.workingSets}×{ex.repRange}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.completedBanner}>
          <Text style={styles.completedBannerIcon}>✓</Text>
          <Text style={styles.completedBannerTitle}>Today&apos;s Session Complete</Text>
          <Text style={styles.completedBannerSub}>Great work. See you next time.</Text>
        </View>
      </ScrollView>
      <DevClearDbButton onCleared={() => setScreenState({ status: 'onboarding' })} />
    </View>
  );
}

const makeStyles = (c: ColorSet) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
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
  },
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
  goldBtnText: {
    ...typography.cta,
    color: c.blackText,
    textTransform: 'uppercase',
  },
  // ---------------------------------
  // Header
  // ---------------------------------
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  eyebrow: {
    ...typography.monoLabel,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  headerTitle: {
    ...typography.heading,
    color: c.textPrimary,
    letterSpacing: -0.02,
  },
  // ---------------------------------
  // Zero State (Day 1)
  // ---------------------------------
  zeroRing: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  zeroRingSvg: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 7,
    borderColor: c.textDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  zeroPct: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 20,
    color: c.textMuted,
  },
  zeroLbl: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 11,
    color: c.textMuted,
    letterSpacing: 2,
  },
  zeroTitle: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 26,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  zeroSub: {
    fontSize: 13,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 240,
  },
  tipBox: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    backgroundColor: c.goldSurface,
    borderWidth: 0.5,
    borderColor: c.goldBorder,
    borderRadius: radii.row,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  tipIcon: {
    fontSize: 16,
  },
  tipText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 12,
    color: c.goldDim,
    lineHeight: 17,
    flex: 1,
  },
  // ---------------------------------
  // Missed Session
  // ---------------------------------
  missedWarning: {
    marginHorizontal: spacing.xxl,
    marginTop: 14,
    backgroundColor: c.dangerSurface,
    borderWidth: 0.5,
    borderColor: c.dangerBorder,
    borderRadius: radii.card,
    padding: 15,
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  missedIcon: {
    fontSize: 20,
  },
  missedTitle: {
    ...typography.body,
    fontWeight: '700',
    color: c.dangerText,
  },
  missedSub: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: c.dangerTextDim,
    lineHeight: 15,
    marginTop: 3,
  },
  streakResetRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginHorizontal: spacing.xxl,
    marginTop: 10,
  },
  streakWas: {
    flex: 1,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: 11,
    padding: 11,
    alignItems: 'center',
  },
  streakWasNum: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 26,
    color: c.textMuted,
    textDecorationLine: 'line-through',
    lineHeight: 26,
  },
  streakWasLbl: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginTop: 3,
  },
  streakNow: {
    flex: 1,
    backgroundColor: c.dangerSurface,
    borderWidth: 0.5,
    borderColor: c.dangerBorder,
    borderRadius: 11,
    padding: 11,
    alignItems: 'center',
  },
  streakNowNum: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 26,
    color: c.dangerText,
    lineHeight: 26,
  },
  streakNowLbl: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: c.dangerTextDim,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginTop: 3,
  },
  sectionTitle: {
    ...typography.monoLabel,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xxl,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  optionBest: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.sm,
    backgroundColor: c.goldSurface,
    borderWidth: 0.5,
    borderColor: c.gold,
    borderRadius: radii.row,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  optionRegular: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.sm,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.row,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  optionSub: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: c.textTertiary,
    marginTop: 2,
  },
  bestBadge: {
    backgroundColor: c.gold,
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  bestBadgeText: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 9,
    color: c.blackText,
  },
  // ---------------------------------
  // Rest Day
  // ---------------------------------
  restContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
  },
  restCenter: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  restEmoji: {
    fontSize: 60,
    marginBottom: spacing.xl,
    opacity: 0.4,
  },
  restTitle: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 28,
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  restDesc: {
    fontSize: 14,
    color: c.textTertiary,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 240,
    marginBottom: spacing.xxxl,
  },
  // ---------------------------------
  // Resume (inProgress)
  // ---------------------------------
  resumeIndicator: {
    marginHorizontal: spacing.xxl,
    marginTop: 14,
    backgroundColor: c.successSurface,
    borderWidth: 0.5,
    borderColor: c.successBorder,
    borderRadius: radii.card,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  resumeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.successText,
    flexShrink: 0,
  },
  resumeDotDone: {
    backgroundColor: c.success,
  },
  resumeDotActive: {
    backgroundColor: c.gold,
  },
  resumeLabel: {
    ...typography.body,
    fontWeight: '700',
    color: c.successText,
  },
  resumeSub: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: c.successDim,
    marginTop: 2,
  },
  resumeCard: {
    marginHorizontal: spacing.xxl,
    marginTop: 10,
    backgroundColor: c.surfaceElevated,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.card,
    padding: 15,
  },
  resumeCardTitle: {
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 20,
    color: c.textPrimary,
  },
  resumeCardMeta: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: c.textTertiary,
    marginTop: 3,
  },
  resumeExList: {
    marginTop: spacing.lg,
    gap: 7,
  },
  resumeExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resumeExName: {
    flex: 1,
    ...typography.body,
    color: c.textPrimary,
    fontSize: 14,
  },
  resumeExDone: {
    color: c.successText,
  },
  resumeExActive: {
    color: c.gold,
  },
  resumeExSets: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 11,
    color: c.textTertiary,
  },
  progressBar: {
    marginTop: 10,
  },
  progressTrack: {
    height: 4,
    backgroundColor: c.textDim,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    backgroundColor: c.gold,
    borderRadius: 2,
  },
  progressLabel: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: c.textTertiary,
    marginTop: spacing.xs,
  },
  resumeStats: {
    flexDirection: 'row',
    gap: 7,
    marginHorizontal: spacing.xxl,
    marginTop: 10,
  },
  resumeStat: {
    flex: 1,
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.border,
    borderRadius: radii.dot,
    padding: 11,
    alignItems: 'center',
  },
  resumeStatVal: {
    fontFamily: 'SpaceMono_700Bold',
    fontSize: 20,
    color: c.textPrimary,
    lineHeight: 20,
  },
  resumeStatUnit: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    color: c.textTertiary,
  },
  resumeStatLbl: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 9,
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginTop: 3,
  },
  dangerBtn: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    backgroundColor: c.dangerSurface,
    borderWidth: 0.5,
    borderColor: c.dangerBorder,
    borderRadius: radii.row,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerBtnText: {
    ...typography.body,
    color: c.dangerText,
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    fontSize: 14,
    fontWeight: '600',
  },
  // ---------------------------------
  // Completed / Default
  // ---------------------------------
  dayHeader: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  daySub: {
    ...typography.monoLabel,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  dayTitle: {
    ...typography.heading,
    color: c.textPrimary,
    letterSpacing: -0.02,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: c.surfaceInteractive,
    borderWidth: 0.5,
    borderColor: c.borderActive,
    borderRadius: radii.dot,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statVal: {
    ...typography.monoMedium,
    color: c.gold,
  },
  statLabel: {
    ...typography.monoTiny,
    color: c.textTertiary,
    letterSpacing: 0.08,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  exPreview: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    ...typography.monoLabel,
    color: c.textTertiary,
    letterSpacing: 0.12,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: c.border,
  },
  exName: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
    marginRight: spacing.lg,
  },
  exSpec: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
    flexShrink: 0,
  },
  primaryBtn: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xxxl,
    backgroundColor: c.gold,
    borderRadius: radii.row,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.cta,
    color: c.blackText,
    textTransform: 'uppercase',
  },
  completedBanner: {
    marginHorizontal: spacing.xxl,
    marginTop: spacing.xxxl,
    backgroundColor: c.successSurface,
    borderWidth: 0.5,
    borderColor: c.successBorder,
    borderRadius: radii.card,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  completedBannerIcon: {
    fontSize: 36,
    color: c.success,
    marginBottom: spacing.md,
  },
  completedBannerTitle: {
    ...typography.subheading,
    color: c.successText,
    textAlign: 'center',
  },
  completedBannerSub: {
    ...typography.monoSmall,
    color: c.successDim,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
