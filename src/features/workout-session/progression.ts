import type { ActiveSession, ProgressionSuggestion } from './types';
import { getExerciseHistory } from '../../db/repositories/exercises';

type LastSession = {
  date: string;
  weekNumber: number;
  sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[];
};

function parseRepRangeTop(range: string): number {
  const match = range.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Most recent ended session in which this exercise was actually performed,
 * with only the working sets the user logged.
 */
export async function getLastCompletedSessionForExercise(
  exerciseName: string,
  options: { excludeSessionId?: string } = {},
): Promise<LastSession | null> {
  const history = await getExerciseHistory(exerciseName, 50, options);
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const sessionSets = history.filter((h) => h.sessionId === last.sessionId);

  return {
    date: last.sessionDate,
    weekNumber: last.weekNumber,
    sets: sessionSets.map((s) => ({
      setIndex: s.setIndex,
      weight: s.weight,
      reps: s.reps,
      loggedRpe: s.loggedRpe,
    })),
  };
}

/**
 * Suggested weight/reps for each of `setCount` working sets, taken from the
 * matching set of the last session (or its last set when this session has
 * more sets). These are suggestions only — they are not logged.
 */
export async function getSuggestedSetValues(
  exerciseName: string,
  setCount: number,
  options: { excludeSessionId?: string } = {},
): Promise<{ weight: number; reps: number }[]> {
  const last = await getLastCompletedSessionForExercise(exerciseName, options);
  return Array.from({ length: setCount }, (_, i) => {
    if (!last || last.sets.length === 0) return { weight: 0, reps: 0 };
    const match =
      last.sets.find((s) => s.setIndex === i + 1) ?? last.sets[last.sets.length - 1];
    return { weight: match.weight, reps: match.reps };
  });
}

function extractRepsAndWeights(
  data: LastSession | { reps: number[] } | null,
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
  history?: LastSession | { reps: number[] } | null,
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
        exercise.exerciseName,
        exercise.prescription.repRange,
        await getLastCompletedSessionForExercise(exercise.exerciseName, {
          excludeSessionId: session.id,
        }),
      ),
    );
  }
  return results;
}
