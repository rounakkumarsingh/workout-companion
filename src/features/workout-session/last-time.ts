import { isoToLocalDateKey, parseLocalDateKey } from '../../lib/dates';

export interface LastTimeSession {
  date: string;
  weekNumber: number;
  sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[];
}

export interface LastTimeSet {
  setIndex: number;
  /** e.g. "50 kg × 10" (bodyweight sets omit the weight). */
  text: string;
  rpe: number | null;
}

export interface LastTimeSummary {
  /** Compact one-liner for the chip, e.g. "3 × 10 @ 50 kg". */
  label: string;
  weekNumber: number;
  dateLabel: string;
  sets: LastTimeSet[];
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function range(values: readonly number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatNumber(min) : `${formatNumber(min)}-${formatNumber(max)}`;
}

/** What the user did last time on an exercise, or null when nothing was logged. */
export function summarizeLastTime(session: LastTimeSession | null): LastTimeSummary | null {
  if (!session || session.sets.length === 0) return null;

  const reps = session.sets.map((s) => s.reps);
  const weights = session.sets.map((s) => s.weight).filter((w) => w > 0);
  const sameReps = new Set(reps).size === 1;

  const volume = sameReps
    ? `${session.sets.length} × ${formatNumber(reps[0] ?? 0)}`
    : `${session.sets.length} sets · ${range(reps)} reps`;
  const label = weights.length > 0 ? `${volume} @ ${range(weights)} kg` : volume;

  const date = parseLocalDateKey(isoToLocalDateKey(session.date));
  return {
    label,
    weekNumber: session.weekNumber,
    dateLabel: date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }),
    sets: session.sets.map((s) => ({
      setIndex: s.setIndex,
      text: s.weight > 0 ? `${formatNumber(s.weight)} kg × ${s.reps}` : `${s.reps} reps`,
      rpe: s.loggedRpe,
    })),
  };
}
