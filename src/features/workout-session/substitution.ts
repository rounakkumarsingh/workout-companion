import { PROGRAM } from '../../data/program';
import type { BlockName } from '../../data/program';

export interface SubstitutionOption {
  slot: 1 | 2;
  substituteName: string;
}

function blockNameForWeek(weekNumber: number): BlockName | null {
  const block = PROGRAM.blocks.find((b) => weekNumber >= b.weekStart && weekNumber <= b.weekEnd);
  return block?.name ?? null;
}

/**
 * The substitutes the program lists for `exerciseName` in `weekNumber`. Some
 * exercises (e.g. Walking Lunge) list different substitutes in the Foundation
 * and Ramping blocks, so the week decides which apply; entries without a block
 * apply in every week.
 */
export function getSubstitutionOptions(
  exerciseName: string,
  weekNumber: number,
): SubstitutionOption[] {
  const block = blockNameForWeek(weekNumber);
  return PROGRAM.substitutions
    .filter(
      (s) => s.exerciseName === exerciseName && (s.blockName === null || s.blockName === block),
    )
    .sort((a, b) => a.slot - b.slot)
    .map((s) => ({
      slot: s.slot,
      substituteName: s.substituteName,
    }));
}

export function getSubstitutionTarget(
  exerciseName: string,
  slot: 1 | 2,
  weekNumber: number,
): string | null {
  const option = getSubstitutionOptions(exerciseName, weekNumber).find((o) => o.slot === slot);
  return option?.substituteName ?? null;
}
