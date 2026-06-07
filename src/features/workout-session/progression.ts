import type { ActiveSession, ProgressionSuggestion } from './types';
import { getExerciseHistory } from '../../db/repositories/exercises';

function parseRepRangeTop(range: string): number {
  const match = range.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function getLastCompletedSessionForExercise(
  exerciseName: string,
): Promise<{ date: string; weekNumber: number; sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[] } | null> {
  const history = await getExerciseHistory(exerciseName, 50);
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const sessionKey = `${last.sessionDate}-${last.weekNumber}`;
  const sessionSets = history.filter(
    (h) => `${h.sessionDate}-${h.weekNumber}` === sessionKey,
  );

  return {
    date: sessionSets[0].sessionDate,
    weekNumber: sessionSets[0].weekNumber,
    sets: sessionSets.map((s) => ({
      setIndex: s.setIndex,
      weight: s.weight,
      reps: s.reps,
      loggedRpe: s.loggedRpe,
    })),
  };
}

export async function prefillFromHistory(exerciseName: string): Promise<{
  weights: number[];
  reps: number[];
} | null> {
  const last = await getLastCompletedSessionForExercise(exerciseName);
  if (!last) return null;

  return {
    weights: last.sets.map((s) => s.weight),
    reps: last.sets.map((s) => s.reps),
  };
}

function extractRepsAndWeights(
  data: Awaited<ReturnType<typeof getLastCompletedSessionForExercise>> | { reps: number[] } | null,
): { reps: number[]; weights: number[] } {
  if (!data) return { reps: [], weights: [] };
  if ('sets' in data) {
    return {
      reps: data.sets.map((s) => s.reps),
      weights: data.sets.map((s) => s.weight),
    };
  }
  return { reps: data.reps ?? [], weights: [] };
}

export async function checkProgression(
  exerciseName: string,
  repRange: string,
  history?: Awaited<ReturnType<typeof getLastCompletedSessionForExercise>> | { reps: number[] } | null,
): Promise<ProgressionSuggestion> {
  const topOfRange = parseRepRangeTop(repRange);
  const sessionData = history ?? await getLastCompletedSessionForExercise(exerciseName);
  const { reps: lastReps, weights: lastWeights } = extractRepsAndWeights(sessionData);

  const allAtTop = lastReps.length > 0 && lastReps.every((r) => r >= topOfRange);

  return {
    exerciseName,
    repRange,
    lastSessionReps: lastReps,
    lastSessionWeights: lastWeights,
    topOfRange: allAtTop,
    readyForWeightIncrease: allAtTop,
  };
}

export async function getProgressionSuggestions(
  session: ActiveSession,
): Promise<ProgressionSuggestion[]> {
  const results: ProgressionSuggestion[] = [];
  for (const exercise of session.exercises) {
    if (!exercise.prescription) continue;
    results.push(
      await checkProgression(
        exercise.prescribedExerciseName,
        exercise.prescription.repRange,
      ),
    );
  }
  return results;
}
