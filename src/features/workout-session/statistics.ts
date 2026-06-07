import type { ActiveSession, PerExerciseVolume, SessionStatistics } from './types';
import { getElapsedMinutes } from './session-executor';
import { getExerciseHistory } from '../../db/repositories/exercises';

function computeSetVolume(weight: number, reps: number): number {
  return weight * reps;
}

export function computeTotalVolume(session: ActiveSession): number {
  let total = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      total += computeSetVolume(set.weight, set.reps);
    }
  }
  return total;
}

export function computePerExerciseVolume(session: ActiveSession): PerExerciseVolume[] {
  return session.exercises.map((exercise) => {
    const totalVolume = exercise.sets.reduce(
      (sum, set) => sum + computeSetVolume(set.weight, set.reps),
      0,
    );
    return {
      exerciseName: exercise.exerciseName,
      totalVolume,
    };
  });
}

export function computeSessionDuration(session: ActiveSession): number {
  return getElapsedMinutes(session);
}

export async function detectPersonalRecords(
  session: ActiveSession,
): Promise<{ exerciseName: string; set: { setIndex: number; weight: number; reps: number }; previousBestWeight: number | null }[]> {
  const prs: {
    exerciseName: string;
    set: { setIndex: number; weight: number; reps: number };
    previousBestWeight: number | null;
  }[] = [];

  for (const exercise of session.exercises) {
    const history = await getExerciseHistory(exercise.prescribedExerciseName, 100);
    if (history.length === 0) continue;

    const previousBestWeight = Math.max(...history.map((h) => h.weight));

    for (const set of exercise.sets) {
      if (set.weight > 0 && set.weight > previousBestWeight) {
        prs.push({
          exerciseName: exercise.exerciseName,
          set: { setIndex: set.setIndex, weight: set.weight, reps: set.reps },
          previousBestWeight: previousBestWeight > 0 ? previousBestWeight : null,
        });
      }
    }
  }

  return prs;
}

export function computeAllStatistics(session: ActiveSession): SessionStatistics {
  return {
    totalVolume: computeTotalVolume(session),
    perExerciseVolume: computePerExerciseVolume(session),
    elapsedMinutes: computeSessionDuration(session),
  };
}
