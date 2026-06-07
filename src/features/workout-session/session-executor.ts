import type { DayType, ExercisePrescription } from '../../data/program';
import { PROGRAM } from '../../data/program';
import type { ActiveSession, ActiveExercise, ActiveSet, ExerciseStatus, ExerciseHistoryComparison, SessionProgress } from './types';
import {
  getSessionById,
  updateSessionStatus,
} from '../../db/repositories/sessions';
import {
  getExerciseLogsWithSetsBySession,
  updateSetLog,
  updateExerciseLog,
} from '../../db/repositories/exercises';
import { getSubstitutionTarget } from './substitution';
import { getCachedSession, setCachedSession, invalidateCachedSession } from './session-cache';

function getPrescription(
  weekNumber: number,
  dayType: DayType,
  prescribedExerciseName: string,
): ExercisePrescription | undefined {
  const week = PROGRAM.weeks[weekNumber - 1];
  const day = week.days.find((d) => d.dayType === dayType);
  return day?.exercises.find((e) => e.exerciseName === prescribedExerciseName);
}

export async function hydrateActiveSession(sessionId: string): Promise<ActiveSession | null> {
  const cached = getCachedSession(sessionId);
  if (cached) return cached;

  const session = await getSessionById(sessionId);
  if (!session) return null;

  const logsWithSets = await getExerciseLogsWithSetsBySession(sessionId);

  const result: ActiveSession = {
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
        const set: ActiveSet = {
          setLogId: s.id,
          setIndex: s.setIndex,
          weight: s.weight,
          reps: s.reps,
          loggedRpe: s.loggedRpe,
          loggedAt: s.loggedAt,
          isWarmup: s.isWarmup === 1,
          isComplete: s.weight > 0 || s.reps > 0,
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

  setCachedSession(result);
  return result;
}

export async function updateSet(
  session: ActiveSession,
  setLogId: string,
  updates: { weight?: number; reps?: number; loggedRpe?: number | null },
): Promise<{ session: ActiveSession; success: boolean; reason?: string }> {
  const weight = updates.weight ?? 0;
  const reps = updates.reps ?? 0;

  if (weight <= 0 || reps <= 0) {
    return { session, success: false, reason: 'Weight and reps must be greater than 0' };
  }

  const now = new Date().toISOString();
  const setUpdates: Record<string, unknown> = { loggedAt: now };
  if (updates.weight !== undefined) setUpdates.weight = updates.weight;
  if (updates.reps !== undefined) setUpdates.reps = updates.reps;
  if (updates.loggedRpe !== undefined) setUpdates.loggedRpe = updates.loggedRpe;
  await updateSetLog(setLogId, setUpdates as Parameters<typeof updateSetLog>[1]);
  invalidateCachedSession(session.id);
  const hydrated = (await hydrateActiveSession(session.id))!;
  return { session: hydrated, success: true };
}

export async function substituteExercise(
  session: ActiveSession,
  exerciseLogId: string,
  slot: 1 | 2,
): Promise<ActiveSession> {
  const exercise = session.exercises.find((e) => e.exerciseLogId === exerciseLogId);
  if (!exercise) return session;

  const target = getSubstitutionTarget(exercise.prescribedExerciseName, slot);
  if (!target) return session;

  await updateExerciseLog(exerciseLogId, {
    exerciseName: target,
    substitutionNote: `Substituted ${exercise.prescribedExerciseName} → ${target} (slot ${slot})`,
  });

  invalidateCachedSession(session.id);
  return (await hydrateActiveSession(session.id))!;
}

export async function completeSession(session: ActiveSession): Promise<ActiveSession> {
  await updateSessionStatus({
    id: session.id,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
  invalidateCachedSession(session.id);
  return (await hydrateActiveSession(session.id))!;
}

export async function abandonSession(session: ActiveSession): Promise<ActiveSession> {
  await updateSessionStatus({
    id: session.id,
    status: 'abandoned',
    completedAt: null,
  });
  invalidateCachedSession(session.id);
  return (await hydrateActiveSession(session.id))!;
}

export function getSessionProgress(session: ActiveSession): SessionProgress {
  let totalSets = 0;
  let completedSets = 0;
  let exercisesWithLoggedSets = 0;

  for (const exercise of session.exercises) {
    let exerciseHasLoggedSet = false;
    for (const set of exercise.sets) {
      totalSets++;
      if (set.weight > 0 || set.reps > 0) {
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

export async function setExerciseStatus(
  session: ActiveSession,
  exerciseLogId: string,
  status: ExerciseStatus,
): Promise<ActiveSession> {
  const { updateExerciseLogStatus } = await import('../../db/repositories/exercises');
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
  return sorted[currentIdx + 1];
}

export async function logWarmupSet(
  session: ActiveSession,
  exerciseLogId: string,
  data: { weight: number; reps: number },
): Promise<ActiveSession> {
  const { createWarmupSetLog } = await import('../../db/repositories/exercises');
  const exercise = session.exercises.find((e) => e.exerciseLogId === exerciseLogId);
  if (!exercise) return session;
  const nextWarmupIndex = (exercise.warmupSets?.length ?? 0) + 1;
  await createWarmupSetLog({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseLogId,
    setIndex: nextWarmupIndex,
    weight: data.weight,
    reps: data.reps,
    loggedRpe: null,
    loggedAt: null,
    isWarmup: true,
  });
  invalidateCachedSession(session.id);
  return (await hydrateActiveSession(session.id))!;
}

export async function getExerciseHistoryComparison(
  exerciseName: string,
  repRange: string,
): Promise<ExerciseHistoryComparison> {
  const { getLastCompletedSessionForExercise, checkProgression } = await import('./progression');
  const lastSession = await getLastCompletedSessionForExercise(exerciseName);
  const progressionSuggestion = await checkProgression(exerciseName, repRange, lastSession);

  const prs: { weight: number; reps: number; previousBest: number | null }[] = [];
  if (lastSession && lastSession.sets.length > 0) {
    for (const set of lastSession.sets) {
      prs.push({
        weight: set.weight,
        reps: set.reps,
        previousBest: null,
      });
    }
  }

  return {
    lastSession,
    prs,
    progressionSuggestion,
  };
}

export function getElapsedMinutes(session: ActiveSession): number {
  const start = new Date(session.startedAt).getTime();
  const end = session.completedAt
    ? new Date(session.completedAt).getTime()
    : Date.now();
  return Math.floor((end - start) / 60000);
}
