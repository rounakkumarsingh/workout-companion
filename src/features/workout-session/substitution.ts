import { PROGRAM } from '../../data/program';

export interface SubstitutionOption {
  slot: 1 | 2;
  substituteName: string;
}

export function getSubstitutionOptions(exerciseName: string): SubstitutionOption[] {
  return PROGRAM.substitutions
    .filter((s) => s.exerciseName === exerciseName)
    .map((s) => ({
      slot: s.slot,
      substituteName: s.substituteName,
    }));
}

export function getSubstitutionTarget(
  exerciseName: string,
  slot: 1 | 2,
): string | null {
  const sub = PROGRAM.substitutions.find(
    (s) => s.exerciseName === exerciseName && s.slot === slot,
  );
  return sub?.substituteName ?? null;
}
