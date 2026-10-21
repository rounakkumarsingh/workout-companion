/**
 * Exercise-specific warm-up pyramids from docs/program.pdf ("Warm Up Protocol"):
 * loads are a percentage of the planned working weight, chosen by the number of
 * warm-up sets listed for the exercise.
 */
export interface WarmupStep {
  percent: number;
  repsMin: number;
  repsMax: number;
}

/** The PDF defines pyramids for 1 to 4 warm-up sets; no exercise lists more. */
export const MAX_WARMUP_SETS = 4;

export const WARMUP_PYRAMIDS: Readonly<Record<1 | 2 | 3 | 4, readonly WarmupStep[]>> = {
  1: [{ percent: 60, repsMin: 6, repsMax: 10 }],
  2: [
    { percent: 50, repsMin: 6, repsMax: 10 },
    { percent: 70, repsMin: 4, repsMax: 6 },
  ],
  3: [
    { percent: 45, repsMin: 6, repsMax: 10 },
    { percent: 65, repsMin: 4, repsMax: 6 },
    { percent: 85, repsMin: 3, repsMax: 4 },
  ],
  4: [
    { percent: 45, repsMin: 6, repsMax: 10 },
    { percent: 60, repsMin: 4, repsMax: 6 },
    { percent: 75, repsMin: 3, repsMax: 5 },
    { percent: 85, repsMin: 2, repsMax: 4 },
  ],
};

export interface WarmupLadderStep {
  /** 1-based position in the warm-up. */
  setIndex: number;
  percent: number;
  /** e.g. "6-10". */
  repsLabel: string;
  /** Suggested reps to prefill: the top of the range. */
  reps: number;
  /** Suggested load in kg, or null when the working weight is not known yet. */
  weight: number | null;
}

/** Clamp a requested count to the listed range and to the pyramids the PDF defines. */
export function clampWarmupCount(count: number, min: number, max: number): number {
  const upper = Math.min(Math.max(max, 0), MAX_WARMUP_SETS);
  const lower = Math.min(Math.max(min, 0), upper);
  return Math.min(Math.max(Math.round(count), lower), upper);
}

function roundToIncrement(value: number, increment: number): number {
  return Math.max(increment, Math.round(value / increment) * increment);
}

/** The suggested warm-up sets for `count` sets ahead of a working weight of `workingWeight` kg. */
export function buildWarmupLadder(
  count: number,
  workingWeight: number,
  increment = 2.5,
): WarmupLadderStep[] {
  const n = Math.min(Math.max(Math.round(count), 0), MAX_WARMUP_SETS);
  if (n === 0) return [];
  const steps = WARMUP_PYRAMIDS[n as 1 | 2 | 3 | 4];
  return steps.map((step, i) => ({
    setIndex: i + 1,
    percent: step.percent,
    repsLabel: `${step.repsMin}-${step.repsMax}`,
    reps: step.repsMax,
    weight:
      workingWeight > 0 ? roundToIncrement((workingWeight * step.percent) / 100, increment) : null,
  }));
}
