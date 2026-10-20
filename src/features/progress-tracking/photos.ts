import { isoToLocalDateKey, localDaysBetween, parseLocalDateKey } from '../../lib/dates';

export type PhotoAngle = 'front' | 'side' | 'rear';

export interface PhotoLike {
  id: string;
  angle: string;
  takenAt: string;
}

export interface PhotoSet<T extends PhotoLike> {
  dateKey: string;
  photos: T[];
}

/** A progress photo set is due this many days after the previous one. */
export const PHOTO_INTERVAL_DAYS = 30;

/**
 * Due when no photos exist yet (once the program has started), or when at least
 * PHOTO_INTERVAL_DAYS local days have passed since the latest photo.
 */
export function isPhotoSetDue(
  lastTakenAt: string | null,
  programStart: Date | null,
  now: Date,
): boolean {
  if (!programStart) return false;
  if (!lastTakenAt) return localDaysBetween(programStart, now) >= 0;
  return (
    localDaysBetween(parseLocalDateKey(isoToLocalDateKey(lastTakenAt)), now) >= PHOTO_INTERVAL_DAYS
  );
}

/** Days until the next set is due; 0 or negative when due. Null if no photo yet. */
export function daysUntilPhotoSet(lastTakenAt: string | null, now: Date): number | null {
  if (!lastTakenAt) return null;
  const since = localDaysBetween(parseLocalDateKey(isoToLocalDateKey(lastTakenAt)), now);
  return PHOTO_INTERVAL_DAYS - since;
}

/** Photos taken on the same local day form one set; newest set first. */
export function groupIntoSets<T extends PhotoLike>(photos: readonly T[]): PhotoSet<T>[] {
  const byDay = new Map<string, T[]>();
  for (const p of photos) {
    const key = isoToLocalDateKey(p.takenAt);
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  return [...byDay.entries()]
    .map(([dateKey, list]) => ({ dateKey, photos: list }))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
}

/** The most recent photo of the same angle taken on an earlier local day. */
export function previousSameAngle<T extends PhotoLike>(photos: readonly T[], photo: T): T | null {
  const day = isoToLocalDateKey(photo.takenAt);
  let best: T | null = null;
  for (const p of photos) {
    if (p.angle !== photo.angle || isoToLocalDateKey(p.takenAt) >= day) continue;
    if (!best || p.takenAt > best.takenAt) best = p;
  }
  return best;
}
