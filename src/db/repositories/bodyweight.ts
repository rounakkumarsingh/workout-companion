import { eq, desc, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { bodyweightEntries } from '../drizzle-schema';

export interface CreateBodyweightEntryInput {
  id: string;
  weight: number;
  unit: 'lbs' | 'kg';
  measuredAt: string;
  note: string | null;
}

export interface WeeklyAverage {
  year: number;
  week: number;
  avgWeight: number;
  unit: string;
  entryCount: number;
}

export async function createBodyweightEntry(input: CreateBodyweightEntryInput) {
  const db = await getDb();
  db.insert(bodyweightEntries)
    .values({
      id: input.id,
      weight: input.weight,
      unit: input.unit,
      measuredAt: input.measuredAt,
      note: input.note,
    })
    .run();

  return getBodyweightEntryById(input.id);
}

export async function getBodyweightEntryById(id: string) {
  const db = await getDb();
  const rows = db.select().from(bodyweightEntries).where(eq(bodyweightEntries.id, id)).all();

  return rows[0] ?? null;
}

export async function getBodyweightEntries(limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(bodyweightEntries)
    .orderBy(desc(bodyweightEntries.measuredAt))
    .limit(limit)
    .all();
}

export async function getBodyweightEntriesSince(since: string) {
  const db = await getDb();
  return db
    .select()
    .from(bodyweightEntries)
    .where(sql`${bodyweightEntries.measuredAt} >= ${since}`)
    .orderBy(desc(bodyweightEntries.measuredAt))
    .all();
}

export async function getLatestBodyweightEntry() {
  const db = await getDb();
  const rows = db
    .select()
    .from(bodyweightEntries)
    .orderBy(desc(bodyweightEntries.measuredAt))
    .limit(1)
    .all();

  return rows[0] ?? null;
}

export async function getBodyweightWeeklyAverages(limit = 12): Promise<WeeklyAverage[]> {
  const db = await getDb();
  return db
    .select({
      year: sql`CAST(strftime('%Y', ${bodyweightEntries.measuredAt}) AS INTEGER)`.mapWith(Number),
      week: sql`CAST(strftime('%W', ${bodyweightEntries.measuredAt}) AS INTEGER)`.mapWith(Number),
      avgWeight: sql`ROUND(AVG(${bodyweightEntries.weight}), 1)`.mapWith(Number),
      unit: bodyweightEntries.unit,
      entryCount: sql`COUNT(*)`.mapWith(Number),
    })
    .from(bodyweightEntries)
    .groupBy(
      sql`strftime('%Y', ${bodyweightEntries.measuredAt})`,
      sql`strftime('%W', ${bodyweightEntries.measuredAt})`,
      bodyweightEntries.unit,
    )
    .orderBy(
      desc(sql`strftime('%Y', ${bodyweightEntries.measuredAt})`),
      desc(sql`strftime('%W', ${bodyweightEntries.measuredAt})`),
    )
    .limit(limit)
    .all();
}

export async function deleteBodyweightEntry(id: string) {
  const db = await getDb();
  db.delete(bodyweightEntries).where(eq(bodyweightEntries.id, id)).run();
}
