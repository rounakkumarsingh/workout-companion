import type { ActiveSession, PerExerciseVolume, SessionStatistics } from './types';
import { getElapsedMinutes } from './session-executor';
import { getBestWorkingWeight } from '../../db/repositories/exercises';

function computeSetVolume(weight: number, reps: number): number {
  return weight * reps;
}

export function computeTotalVolume(session: ActiveSession): number {
  let total = 0;
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      if (set.isComplete) total += computeSetVolume(set.weight, set.reps);
    }
  }
  return total;
}

export function computePerExerciseVolume(session: ActiveSession): PerExerciseVolume[] {
  return session.exercises.map((exercise) => {
    const totalVolume = exercise.sets.reduce(
      (sum, set) => sum + (set.isComplete ? computeSetVolume(set.weight, set.reps) : 0),
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
    // Compare against every earlier session — never this one.
    const previousBestWeight = await getBestWorkingWeight(exercise.exerciseName, session.id);
    if (previousBestWeight === null) continue; // first time: nothing to beat

    const best = exercise.sets
      .filter((set) => set.isComplete && set.weight > previousBestWeight)
      .sort((a, b) => b.weight - a.weight)[0];
    if (best) {
      prs.push({
        exerciseName: exercise.exerciseName,
        set: { setIndex: best.setIndex, weight: best.weight, reps: best.reps },
        previousBestWeight,
      });
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
