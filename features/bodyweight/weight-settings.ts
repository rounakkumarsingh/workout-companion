import { getSetting, setSetting } from '@/src/db/repositories/settings';
import { createBodyweightEntry, getLatestBodyweightEntry } from '@/src/db/repositories/bodyweight';
import type { WeightUnit } from '@/src/features/progress-tracking/weight';

const WEIGHT_UNIT_KEY = 'weight_unit';

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
