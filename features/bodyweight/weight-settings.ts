import { getSetting, setSetting } from '@/src/db/repositories/settings';
import { createBodyweightEntry, getLatestBodyweightEntry } from '@/src/db/repositories/bodyweight';
import type { WeightUnit } from '@/src/features/progress-tracking/weight';
import { isoToLocalDateKey } from '@/src/lib/dates';

const WEIGHT_UNIT_KEY = 'weight_unit';
const WEIGH_IN_SKIPPED_KEY = 'weigh_in_skipped_on';

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === 'kg' || value === 'lbs';
}

/** The remembered unit; otherwise the unit of the latest entry; otherwise kg. */
export async function getWeightUnit(): Promise<WeightUnit> {
  const stored = await getSetting(WEIGHT_UNIT_KEY);
  if (isWeightUnit(stored)) return stored;
  const latest = await getLatestBodyweightEntry();
  return latest && isWeightUnit(latest.unit) ? latest.unit : 'kg';
}

export async function setWeightUnit(unit: WeightUnit): Promise<void> {
  await setSetting(WEIGHT_UNIT_KEY, unit);
}

/** Saves one weigh-in taken now and remembers its unit. */
export async function logWeightEntry(weight: number, unit: WeightUnit): Promise<void> {
  await createBodyweightEntry({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    weight,
    unit,
    measuredAt: new Date().toISOString(),
    note: null,
  });
  await setWeightUnit(unit);
}

/** "Skip for now" holds for the rest of the local day, so Resume stops asking. */
export async function skipWeighInToday(now: Date = new Date()): Promise<void> {
  await setSetting(WEIGH_IN_SKIPPED_KEY, isoToLocalDateKey(now.toISOString()));
}

export async function wasWeighInSkippedToday(now: Date = new Date()): Promise<boolean> {
  return (await getSetting(WEIGH_IN_SKIPPED_KEY)) === isoToLocalDateKey(now.toISOString());
}
