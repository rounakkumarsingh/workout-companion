import type { DayType, ExercisePrescription } from '../../data/program';
import { PROGRAM } from '../../data/program';
import type {
  ActiveSession,
  ActiveExercise,
  ActiveSet,
  ExerciseStatus,
  ExerciseHistoryComparison,
  SessionProgress,
} from './types';
import {
  getSessionById,
  updateSessionStatus,
  getActiveSessions,
  getSessionActivity,
} from '../../db/repositories/sessions';
import {
  getExerciseLogsWithSetsBySession,
  updateSetLog,
  updateExerciseLog,
  updateExerciseLogStatus,
  createWarmupSetLog,
} from '../../db/repositories/exercises';
import { getSubstitutionOptions } from './substitution';
import {
  getLastCompletedSessionForExercise,
  getSuggestedSetValues,
  checkProgression,
} from './progression';
import { clearActiveRestForSession } from './rest-state';
import { generateId } from '../../lib/ids';
import { startOfLocalDay } from '../../lib/dates';

/** An open session from an earlier day is closed after this much inactivity. */
const STALE_SESSION_INACTIVITY_MS = 2 * 60 * 60 * 1000;

function getPrescription(
  weekNumber: number,
  dayType: DayType,
  prescribedExerciseName: string,
): ExercisePrescription | undefined {
  const week = PROGRAM.weeks[weekNumber - 1];
  const day = week?.days.find((d) => d.dayType === dayType);
  return day?.exercises.find((e) => e.exerciseName === prescribedExerciseName);
}

/** Always reads from SQLite so screens never show stale data. */
export async function hydrateActiveSession(sessionId: string): Promise<ActiveSession | null> {
  const session = await getSessionById(sessionId);
  if (!session) return null;

  const logsWithSets = await getExerciseLogsWithSetsBySession(sessionId);

  return {
    id: session.id,
    weekNumber: session.weekNumber,
    dayType: session.dayType as DayType,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    status: session.status as ActiveSession['status'],
    exercises: logsWithSets.map(({ exerciseLog, sets }) => {
      const prescription = getPrescription(
        session.weekNumber,
        session.dayType as DayType,
        exerciseLog.prescribedExerciseName,
      );
      const warmupSets: ActiveSet[] = [];
      const workingSets: ActiveSet[] = [];
      for (const s of sets) {
        const isWarmup = s.isWarmup === 1;
        const set: ActiveSet = {
          setLogId: s.id,
          setIndex: s.setIndex,
          weight: s.weight,
          reps: s.reps,
          loggedRpe: s.loggedRpe,
          loggedAt: s.loggedAt,
          isWarmup,
          // Working sets are pre-filled with suggested values; a set is only
          // complete once the user logs it (which stamps loggedAt).
          isComplete: isWarmup || s.loggedAt !== null,
        };
        if (set.isWarmup) {
          warmupSets.push(set);
        } else {
          workingSets.push(set);
        }
      }
      return {
        exerciseLogId: exerciseLog.id,
        prescribedExerciseName: exerciseLog.prescribedExerciseName,
        exerciseName: exerciseLog.exerciseName,
        sortOrder: exerciseLog.sortOrder,
        substitutionNote: exerciseLog.substitutionNote,
        prescription: prescription ?? undefined,
        status: (exerciseLog.status as ExerciseStatus) ?? 'pending',
        warmupSets,
        sets: workingSets,
      };
    }),
  };
}

/**
 * Corrects an already logged set, in any session status. Unlike `updateSet`
 * this keeps the original `loggedAt`, so history order and timing stay put.
 */
export async function editLoggedSet(
  sessionId: string,
  setLogId: string,
  updates: { weight?: number; reps?: number; loggedRpe?: number | null },
): Promise<{ session: ActiveSession; success: boolean; reason?: string }> {
  if (updates.weight !== undefined && !(updates.weight > 0 && Number.isFinite(updates.weight))) {
    return {
      session: (await hydrateActiveSession(sessionId))!,
      success: false,
      reason: 'Weight must be greater than 0',
    };
  }
  if (updates.reps !== undefined && !(updates.reps > 0 && Number.isFinite(updates.reps))) {
    return {
      session: (await hydrateActiveSession(sessionId))!,
      success: false,
      reason: 'Reps must be greater than 0',
    };
  }
  await updateSetLog(setLogId, updates);
  return { session: (await hydrateActiveSession(sessionId))!, success: true };
}

export async function updateSet(
  session: ActiveSession,
  setLogId: string,
  updates: { weight?: number; reps?: number; loggedRpe?: number | null },
): Promise<{ session: ActiveSession; success: boolean; reason?: string }> {
  // Validate only the fields that were supplied: `?? 0` made an omitted field
  // indistinguishable from an explicit 0 and rejected every partial update.
  if (updates.weight !== undefined && updates.weight <= 0) {
    return { session, success: false, reason: 'Weight must be greater than 0' };
  }
  if (updates.reps !== undefined && updates.reps <= 0) {
    return { session, success: false, reason: 'Reps must be greater than 0' };
  }
  if (updates.weight === undefined && updates.reps === undefined) {
    return { session, success: false, reason: 'No set data provided' };
  }

  const now = new Date().toISOString();
  const setUpdates: Record<string, unknown> = { loggedAt: now };
  if (updates.weight !== undefined) setUpdates.weight = updates.weight;
  if (updates.reps !== undefined) setUpdates.reps = updates.reps;
  if (updates.loggedRpe !== undefined) setUpdates.loggedRpe = updates.loggedRpe;
  await updateSetLog(setLogId, setUpdates as Parameters<typeof updateSetLog>[1]);
  const hydrated = (await hydrateActiveSession(session.id))!;
  return { session: hydrated, success: true };
}

/**
 * Swaps an exercise to one of its listed substitutes, or back to the
 * prescribed exercise. Unlogged sets get fresh suggested values from the
 * new exercise's own history.
 */
export async function swapExercise(
  session: ActiveSession,
  exerciseLogId: string,
  targetName: string,
): Promise<ActiveSession> {
  const exercise = session.exercises.find((e) => e.exerciseLogId === exerciseLogId);
  if (!exercise || exercise.exerciseName === targetName) return session;

  const isRevert = targetName === exercise.prescribedExerciseName;
  const isListedSubstitute = getSubstitutionOptions(
    exercise.prescribedExerciseName,
    session.weekNumber,
  ).some((o) => o.substituteName === targetName);
  if (!isRevert && !isListedSubstitute) return session;

  await updateExerciseLog(exerciseLogId, {
    exerciseName: targetName,
    substitutionNote: isRevert
      ? null
      : `Substituted ${exercise.prescribedExerciseName} → ${targetName}`,
  });

  const suggestions = await getSuggestedSetValues(targetName, exercise.sets.length, {
    excludeSessionId: session.id,
    dayType: session.dayType,
    repRange: exercise.prescription?.repRange,
  });
  for (const [i, set] of exercise.sets.entries()) {
    if (set.isComplete) continue;
    const suggestion = suggestions[i];
    if (!suggestion) continue;
    await updateSetLog(set.setLogId, suggestion);
  }

  return (await hydrateActiveSession(session.id))!;
}

export async function completeSession(session: ActiveSession): Promise<ActiveSession> {
  await updateSessionStatus({
    id: session.id,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
  await clearActiveRestForSession(session.id);
  return (await hydrateActiveSession(session.id))!;
}

export async function abandonSession(session: ActiveSession): Promise<ActiveSession> {
  await updateSessionStatus({
    id: session.id,
    status: 'abandoned',
    completedAt: new Date().toISOString(),
  });
  await clearActiveRestForSession(session.id);
  return (await hydrateActiveSession(session.id))!;
}

/** Puts an ended session back in progress (logged sets are kept). */
export async function reopenSession(sessionId: string): Promise<void> {
  await updateSessionStatus({
    id: sessionId,
    status: 'in_progress',
    completedAt: null,
  });
}

/**
 * Closes sessions left open from an earlier day: completed when at least
 * one working set was logged, otherwise abandoned. Sessions with recent
 * activity (e.g. a workout running past midnight) are left alone.
 */
export async function finalizeStaleSessions(now: Date = new Date()): Promise<void> {
  const todayStart = startOfLocalDay(now).getTime();
  for (const session of await getActiveSessions()) {
    if (new Date(session.startedAt).getTime() >= todayStart) continue;

    const activity = await getSessionActivity(session.id);
    const lastActiveAt = activity.lastLoggedAt ?? session.startedAt;
    if (now.getTime() - new Date(lastActiveAt).getTime() < STALE_SESSION_INACTIVITY_MS) continue;

    const hasLoggedSets = activity.loggedSets > 0;
    await updateSessionStatus({
      id: session.id,
      status: hasLoggedSets ? 'completed' : 'abandoned',
      completedAt: lastActiveAt,
    });
    await clearActiveRestForSession(session.id);
  }
}

export function getSessionProgress(session: ActiveSession): SessionProgress {
  let totalSets = 0;
  let completedSets = 0;
  let exercisesWithLoggedSets = 0;

  for (const exercise of session.exercises) {
    let exerciseHasLoggedSet = false;
    for (const set of exercise.sets) {
      totalSets++;
      if (set.isComplete) {
        completedSets++;
        exerciseHasLoggedSet = true;
      }
    }
    if (exerciseHasLoggedSet) exercisesWithLoggedSets++;
  }

  return {
    totalSets,
    completedSets,
    exercisesWithLoggedSets,
    totalExercises: session.exercises.length,
  };
}

/** Timestamp of the most recently logged working set, if any. */
export function getLastActivityAt(session: ActiveSession): string | null {
  let latest: string | null = null;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (set.loggedAt && (!latest || set.loggedAt > latest)) latest = set.loggedAt;
    }
  }
  return latest;
}

export async function setExerciseStatus(
  session: ActiveSession,
  exerciseLogId: string,
  status: ExerciseStatus,
): Promise<ActiveSession> {
  await updateExerciseLogStatus(exerciseLogId, status);
  return (await hydrateActiveSession(session.id))!;
}

export function getNextExercise(
  session: ActiveSession,
  currentExerciseLogId: string,
): ActiveExercise | null {
  const sorted = [...session.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIdx = sorted.findIndex((e) => e.exerciseLogId === currentExerciseLogId);
  if (currentIdx === -1 || currentIdx >= sorted.length - 1) return null;
  return sorted[currentIdx + 1] ?? null;
}

/**
 * The next exercise (in program order, wrapping around) that is not yet
 * completed, or null when every other exercise is done.
 */
export function getNextIncompleteExercise(
  session: ActiveSession,
  currentExerciseLogId: string,
): ActiveExercise | null {
  const sorted = [...session.exercises].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIdx = sorted.findIndex((e) => e.exerciseLogId === currentExerciseLogId);
  for (let step = 1; step < sorted.length; step++) {
    const candidate = sorted[(currentIdx + step + sorted.length) % sorted.length];
    if (
      candidate &&
      candidate.exerciseLogId !== currentExerciseLogId &&
      candidate.status !== 'completed'
    ) {
      return candidate;
    }
  }
  return null;
}

export async function logWarmupSet(
  session: ActiveSession,
  exerciseLogId: string,
  data: { weight: number; reps: number },
): Promise<ActiveSession> {
  const exercise = session.exercises.find((e) => e.exerciseLogId === exerciseLogId);
  if (!exercise) return session;
  const nextWarmupIndex = (exercise.warmupSets?.length ?? 0) + 1;
  await createWarmupSetLog({
    id: generateId(),
    exerciseLogId,
    setIndex: nextWarmupIndex,
    weight: data.weight,
    reps: data.reps,
    loggedRpe: null,
    loggedAt: null,
    isWarmup: true,
  });
  return (await hydrateActiveSession(session.id))!;
}

export async function getExerciseHistoryComparison(
  exerciseName: string,
  repRange: string,
  excludeSessionId?: string,
  dayType?: string,
): Promise<ExerciseHistoryComparison> {
  const lastSession = await getLastCompletedSessionForExercise(exerciseName, {
    excludeSessionId,
    dayType,
  });
  const progressionSuggestion = await checkProgression(exerciseName, repRange, lastSession);

  return {
    lastSession,
    progressionSuggestion,
  };
}

/**
 * When a session stopped: null while in progress. Older ended sessions have no
 * `completedAt`, so fall back to the last logged set, then to the start.
 */
export function sessionEndAt(session: ActiveSession): string | null {
  if (session.status === 'in_progress') return null;
  if (session.completedAt) return session.completedAt;
  let latest: string | null = null;
  for (const exercise of session.exercises) {
    for (const set of [...exercise.warmupSets, ...exercise.sets]) {
      if (set.loggedAt && (latest === null || set.loggedAt > latest)) latest = set.loggedAt;
    }
  }
  return latest ?? session.startedAt;
}

export function getElapsedMinutes(session: ActiveSession): number {
  const start = new Date(session.startedAt).getTime();
  const endAt = sessionEndAt(session);
  const end = endAt ? new Date(endAt).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / 60000));
}
