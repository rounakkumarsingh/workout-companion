import type { ActiveSet } from '@/src/features/workout-session/types';

export interface SetInputValues {
  weight: string;
  reps: string;
  rpe: string;
}

export type SetInputsMap = Record<string, SetInputValues>;

export function setToInputValues(set: ActiveSet): SetInputValues {
  return {
    weight: set.weight > 0 ? String(set.weight) : '',
    reps: set.reps > 0 ? String(set.reps) : '',
    rpe: set.loggedRpe != null ? String(set.loggedRpe) : '',
  };
}

export function hasSetBeenLogged(set: ActiveSet): boolean {
  return set.isComplete;
}
