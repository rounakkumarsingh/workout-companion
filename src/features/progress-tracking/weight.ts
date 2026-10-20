import {
  isoToLocalDateKey,
  localDaysBetween,
  parseLocalDateKey,
  toLocalDateKey,
} from '../../lib/dates';

export type WeightUnit = 'kg' | 'lbs';

export interface WeightEntry {
  weight: number;
  unit: WeightUnit;
  measuredAt: string;
}

export interface DailyWeight {
  dateKey: string;
  weight: number;
}

/** Days in the rolling average; the guidebook judges progress by weekly averages. */
export const AVERAGE_WINDOW_DAYS = 7;

const LBS_PER_KG = 2.20462;

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  return from === 'kg' ? weight * LBS_PER_KG : weight / LBS_PER_KG;
}

export function hasEntryToday(
  entries: readonly Pick<WeightEntry, 'measuredAt'>[],
  now: Date,
): boolean {
  const today = toLocalDateKey(now);
  return entries.some((e) => isoToLocalDateKey(e.measuredAt) === today);
}

/** One point per local day (the mean of that day's entries), oldest first, in `unit`. */
export function dailySeries(entries: readonly WeightEntry[], unit: WeightUnit): DailyWeight[] {
  const byDay = new Map<string, number[]>();
  for (const e of entries) {
    const key = isoToLocalDateKey(e.measuredAt);
    const list = byDay.get(key) ?? [];
    list.push(convertWeight(e.weight, e.unit, unit));
    byDay.set(key, list);
  }
  return [...byDay.entries()]
    .map(([dateKey, list]) => ({ dateKey, weight: mean(list) }))
    .sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Mean of the days that fall in the `days` calendar days ending `asOf` (inclusive). */
function windowAverage(
  series: readonly DailyWeight[],
  asOf: Date,
  days: number,
  offsetDays = 0,
): number | null {
  const inWindow = series.filter((p) => {
    const ago = localDaysBetween(parseLocalDateKey(p.dateKey), asOf) - offsetDays;
    return ago >= 0 && ago < days;
  });
  return inWindow.length > 0 ? mean(inWindow.map((p) => p.weight)) : null;
}

/** Average of the last 7 days, or null when there is no entry in that window. */
export function currentAverage(series: readonly DailyWeight[], now: Date): number | null {
  return windowAverage(series, now, AVERAGE_WINDOW_DAYS);
}

/** Rolling 7-day average at each logged day, for the chart line. */
export function rollingAverage(series: readonly DailyWeight[]): DailyWeight[] {
  return series.map((p) => {
    const avg =
      windowAverage(series, parseLocalDateKey(p.dateKey), AVERAGE_WINDOW_DAYS) ?? p.weight;
    return { dateKey: p.dateKey, weight: avg };
  });
}

/** This 7-day average minus the previous 7-day average; null if either window is empty. */
export function weeklyChange(series: readonly DailyWeight[], now: Date): number | null {
  const current = windowAverage(series, now, AVERAGE_WINDOW_DAYS);
  const previous = windowAverage(series, now, AVERAGE_WINDOW_DAYS, AVERAGE_WINDOW_DAYS);
  return current === null || previous === null ? null : current - previous;
}

/**
 * Current 7-day average minus the average of the first 7 days of logging on or
 * after `programStart`. Null if there is nothing to compare.
 */
export function changeSinceStart(
  series: readonly DailyWeight[],
  programStart: Date | null,
  now: Date,
): number | null {
  const startKey = programStart ? toLocalDateKey(programStart) : null;
  const eligible = startKey ? series.filter((p) => p.dateKey >= startKey) : series;
  const first = eligible[0];
  if (!first) return null;
  const baseline = windowAverage(
    eligible,
    addDays(parseLocalDateKey(first.dateKey), AVERAGE_WINDOW_DAYS - 1),
    AVERAGE_WINDOW_DAYS,
  );
  const current = currentAverage(eligible, now);
  return baseline === null || current === null ? null : current - baseline;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
