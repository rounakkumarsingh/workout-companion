// Local-calendar date helpers.
//
// Timestamps are stored as ISO-8601 UTC strings (Date#toISOString), but
// "today", "yesterday" and calendar days must follow the user's local
// timezone. A date key is a local calendar day formatted as YYYY-MM-DD.

export const DAY_MS = 24 * 60 * 60 * 1000;

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses a YYYY-MM-DD key (extra characters ignored) as local midnight. */
export function parseLocalDateKey(key: string): Date {
  const [y = NaN, m = NaN, d = NaN] = key
    .slice(0, 10)
    .split('-')
    .map((part) => parseInt(part, 10));
  return new Date(y, m - 1, d);
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Whole calendar days from a to b (DST-safe). */
export function localDaysBetween(a: Date, b: Date): number {
  return Math.round((startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime()) / DAY_MS);
}

/** UTC ISO bounds [startIso, endIso) covering one local calendar day. */
export function localDayBoundsIso(date: Date): { startIso: string; endIso: string } {
  const start = startOfLocalDay(date);
  return {
    startIso: start.toISOString(),
    endIso: addLocalDays(start, 1).toISOString(),
  };
}

/** Local date key of a stored ISO timestamp. */
export function isoToLocalDateKey(iso: string): string {
  return toLocalDateKey(new Date(iso));
}
