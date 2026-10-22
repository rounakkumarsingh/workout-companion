import type { ActiveSession, PerExerciseVolume, SessionStatistics } from './types';
import { getElapsedMinutes } from './session-executor';
import { getExerciseBests } from '../../db/repositories/exercises';
import { detectSetPrs, type PrKind } from './personal-records';

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

export interface SessionPr {
  exerciseName: string;
  kind: PrKind;
  value: number;
  previous: number;
  set: { setIndex: number; weight: number; reps: number };
}

/** Records this session set against every earlier session; none on a first time. */
export async function detectPersonalRecords(session: ActiveSession): Promise<SessionPr[]> {
  const prs: SessionPr[] = [];

  for (const exercise of session.exercises) {
    // Compare against every earlier session, never this one.
    const prior = await getExerciseBests(exercise.exerciseName, session.id);
    if (prior === null) continue; // first time: nothing to beat

    // The set that beat each prior best by the most, one entry per kind.
    const bestByKind = new Map<PrKind, SessionPr>();
    for (const set of exercise.sets) {
      if (!set.isComplete) continue;
      for (const pr of detectSetPrs(prior, set)) {
        const current = bestByKind.get(pr.kind);
        if (!current || pr.value > current.value) {
          bestByKind.set(pr.kind, {
            exerciseName: exercise.exerciseName,
            kind: pr.kind,
            value: pr.value,
            previous: pr.previous,
            set: { setIndex: set.setIndex, weight: set.weight, reps: set.reps },
          });
        }
      }
    }
    prs.push(...bestByKind.values());
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
