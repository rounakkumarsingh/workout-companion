import { eq, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { cardioSessions } from '../drizzle-schema';

export interface CreateCardioSessionInput {
  id: string;
  weekNumber: number;
  intensityType: 'low_moderate' | 'high_intensity';
  activity: string;
  durationMinutes: number;
  note: string | null;
  loggedAt: string;
}

export async function createCardioSession(input: CreateCardioSessionInput) {
  const db = await getDb();
  db.insert(cardioSessions)
    .values({
      id: input.id,
      weekNumber: input.weekNumber,
      intensityType: input.intensityType,
      activity: input.activity,
      durationMinutes: input.durationMinutes,
      note: input.note,
      loggedAt: input.loggedAt,
    })
    .run();

  return getCardioSessionById(input.id);
}

export async function getCardioSessionById(id: string) {
  const db = await getDb();
  const rows = db.select().from(cardioSessions).where(eq(cardioSessions.id, id)).all();

  return rows[0] ?? null;
}

export async function getCardioSessionsByWeek(weekNumber: number) {
  const db = await getDb();
  return db
    .select()
    .from(cardioSessions)
    .where(eq(cardioSessions.weekNumber, weekNumber))
    .orderBy(desc(cardioSessions.loggedAt))
    .all();
}

export async function getCardioSessions(limit = 50) {
  const db = await getDb();
  return db.select().from(cardioSessions).orderBy(desc(cardioSessions.loggedAt)).limit(limit).all();
}

export async function getCardioMinutesByWeek(weekNumber: number): Promise<number> {
  const db = await getDb();
  const rows = db
    .select({
      totalMinutes: cardioSessions.durationMinutes,
    })
    .from(cardioSessions)
    .where(eq(cardioSessions.weekNumber, weekNumber))
    .all();

  return rows.reduce((sum, r) => sum + r.totalMinutes, 0);
}

export async function deleteCardioSession(id: string) {
  const db = await getDb();
  db.delete(cardioSessions).where(eq(cardioSessions.id, id)).run();
}
