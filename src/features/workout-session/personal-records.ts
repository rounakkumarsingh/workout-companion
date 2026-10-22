/**
 * Pure personal-record maths. Estimated 1RM is a derived number only: the
 * program judges progress within rep ranges, so the UI labels it "Est. 1RM".
 */

export type PrKind = 'weight' | 'e1rm' | 'setVolume';

export interface WorkingSetValues {
  weight: number;
  reps: number;
}

export interface ExerciseBests {
  heaviest: number | null;
  bestE1rm: number | null;
  bestSetVolume: number | null;
}

export interface SetPr {
  kind: PrKind;
  value: number;
  previous: number;
}

export interface RecordHistoryRow {
  sessionId: string;
  sessionDate: string;
  weight: number;
  reps: number;
}

export interface RecordEntry {
  value: number;
  date: string;
}

export interface ExerciseRecords {
  heaviest: RecordEntry | null;
  bestE1rm: RecordEntry | null;
  bestSetVolume: RecordEntry | null;
  bestSessionVolume: RecordEntry | null;
}

export interface SessionPoint {
  sessionId: string;
  date: string;
  heaviest: number;
  /** Null when no set of the session had 1-12 reps. */
  bestE1rm: number | null;
  bestSetVolume: number;
  sessionVolume: number;
}

export interface ExerciseRecordsData {
  records: ExerciseRecords;
  series: SessionPoint[];
}

const E1RM_MAX_REPS = 12;

/** Epley estimate; only trustworthy for 1-12 reps, so anything else is null. */
export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (weight <= 0 || reps < 1 || reps > E1RM_MAX_REPS) return null;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function computeBests(sets: readonly WorkingSetValues[]): ExerciseBests {
  const bests: ExerciseBests = {
    heaviest: null,
    bestE1rm: null,
    bestSetVolume: null,
  };
  for (const set of sets) {
    if (set.weight <= 0 || set.reps <= 0) continue;
    const e1rm = estimateOneRepMax(set.weight, set.reps);
    const volume = set.weight * set.reps;
    if (bests.heaviest === null || set.weight > bests.heaviest) bests.heaviest = set.weight;
    if (e1rm !== null && (bests.bestE1rm === null || e1rm > bests.bestE1rm)) bests.bestE1rm = e1rm;
    if (bests.bestSetVolume === null || volume > bests.bestSetVolume) bests.bestSetVolume = volume;
  }
  return bests;
}

function maxOrNull(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

export function mergeBests(a: ExerciseBests, b: ExerciseBests): ExerciseBests {
  return {
    heaviest: maxOrNull(a.heaviest, b.heaviest),
    bestE1rm: maxOrNull(a.bestE1rm, b.bestE1rm),
    bestSetVolume: maxOrNull(a.bestSetVolume, b.bestSetVolume),
  };
}

/**
 * Records a set beats. Strictly greater than the prior best, and none at all
 * without prior history (the first time nothing can be beaten).
 */
export function detectSetPrs(prior: ExerciseBests | null, set: WorkingSetValues): SetPr[] {
  if (!prior || set.weight <= 0 || set.reps <= 0) return [];
  const prs: SetPr[] = [];
  if (prior.heaviest !== null && set.weight > prior.heaviest) {
    prs.push({ kind: 'weight', value: set.weight, previous: prior.heaviest });
  }
  const e1rm = estimateOneRepMax(set.weight, set.reps);
  if (e1rm !== null && prior.bestE1rm !== null && e1rm > prior.bestE1rm) {
    prs.push({ kind: 'e1rm', value: e1rm, previous: prior.bestE1rm });
  }
  const volume = set.weight * set.reps;
  if (prior.bestSetVolume !== null && volume > prior.bestSetVolume) {
    prs.push({
      kind: 'setVolume',
      value: volume,
      previous: prior.bestSetVolume,
    });
  }
  return prs;
}

function better(current: RecordEntry | null, value: number, date: string): RecordEntry {
  return current === null || value > current.value ? { value, date } : current;
}

/** Records and a per-session series from chronological working-set rows. */
export function buildExerciseRecords(rows: readonly RecordHistoryRow[]): ExerciseRecordsData {
  const records: ExerciseRecords = {
    heaviest: null,
    bestE1rm: null,
    bestSetVolume: null,
    bestSessionVolume: null,
  };
  const bySession = new Map<string, { date: string; sets: WorkingSetValues[] }>();
  for (const row of rows) {
    if (row.weight <= 0 || row.reps <= 0) continue;
    const entry = bySession.get(row.sessionId);
    if (entry) entry.sets.push(row);
    else bySession.set(row.sessionId, { date: row.sessionDate, sets: [row] });
  }

  const series: SessionPoint[] = [];
  for (const [sessionId, { date, sets }] of bySession) {
    const bests = computeBests(sets);
    const sessionVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    // Every set is positive here, so heaviest and set volume are non-null.
    const point: SessionPoint = {
      sessionId,
      date,
      heaviest: bests.heaviest ?? 0,
      bestE1rm: bests.bestE1rm,
      bestSetVolume: bests.bestSetVolume ?? 0,
      sessionVolume,
    };
    series.push(point);
    records.heaviest = better(records.heaviest, point.heaviest, date);
    if (point.bestE1rm !== null) records.bestE1rm = better(records.bestE1rm, point.bestE1rm, date);
    records.bestSetVolume = better(records.bestSetVolume, point.bestSetVolume, date);
    records.bestSessionVolume = better(records.bestSessionVolume, sessionVolume, date);
  }
  series.sort((a, b) => a.date.localeCompare(b.date));
  return { records, series };
}

export const PR_KIND_LABEL: Record<PrKind, string> = {
  weight: 'Heaviest weight',
  e1rm: 'Est. 1RM',
  setVolume: 'Best set',
};

export function trimNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/** "80 kg" for weight and est. 1RM, "80 kg × 8" for a best set. */
export function formatPrValue(kind: PrKind, value: number, set: WorkingSetValues): string {
  if (kind === 'setVolume') return `${trimNumber(set.weight)} kg × ${set.reps}`;
  return `${trimNumber(value)} kg`;
}

/** Gain over the previous best, e.g. "+2.5 kg" (best sets show the volume gained). */
export function formatPrDelta(kind: PrKind, value: number, previous: number): string {
  const gain = trimNumber(value - previous);
  return kind === 'setVolume' ? `+${gain} kg vol.` : `+${gain} kg`;
}
