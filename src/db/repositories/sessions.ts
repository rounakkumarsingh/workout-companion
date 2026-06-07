import { eq, desc, and, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { workoutSessions, exerciseLogs, workoutSetLogs } from '../drizzle-schema';
import type { WorkoutSessionStatus } from '../../data/program';

export interface CreateSessionInput {
  id: string;
  weekNumber: number;
  dayType: 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs';
  startedAt: string;
}

export interface UpdateSessionStatusInput {
  id: string;
  status: WorkoutSessionStatus;
  completedAt: string | null;
}

export interface SessionWithVolume {
  id: string;
  weekNumber: number;
  dayType: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  createdAt: string;
  totalVolume: number;
  totalSets: number;
}

export async function createSession(input: CreateSessionInput) {
  const db = await getDb();
  db.insert(workoutSessions)
    .values({
      id: input.id,
      weekNumber: input.weekNumber,
      dayType: input.dayType,
      startedAt: input.startedAt,
      status: 'in_progress',
    })
    .run();

  return getSessionById(input.id);
}

export async function getSessionById(id: string) {
  const db = await getDb();
  const rows = db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, id))
    .all();

  return rows[0] ?? null;
}

export async function getActiveSession() {
  const db = await getDb();
  const rows = db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.status, 'in_progress'))
    .orderBy(desc(workoutSessions.startedAt))
    .all();

  if (rows.length > 1) {
    console.warn(`[sessions] Found ${rows.length} active sessions. Returning most recent.`);
  }

  return rows[0] ?? null;
}

export async function updateSessionStatus(input: UpdateSessionStatusInput) {
  const db = await getDb();
  db.update(workoutSessions)
    .set({
      status: input.status,
      completedAt: input.completedAt,
    })
    .where(eq(workoutSessions.id, input.id))
    .run();

  return getSessionById(input.id);
}

export async function completeSession(id: string) {
  return updateSessionStatus({
    id,
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
}

export async function abandonSession(id: string) {
  return updateSessionStatus({
    id,
    status: 'abandoned',
    completedAt: null,
  });
}

export async function getSessionsByWeek(weekNumber: number) {
  const db = await getDb();
  return db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.weekNumber, weekNumber))
    .orderBy(desc(workoutSessions.startedAt))
    .all();
}

export async function getRecentSessions(limit = 20) {
  const db = await getDb();
  return db
    .select()
    .from(workoutSessions)
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit)
    .all();
}

export async function getSessionsWithVolume(limit = 20): Promise<SessionWithVolume[]> {
  const db = await getDb();
  return db
    .select({
      id: workoutSessions.id,
      weekNumber: workoutSessions.weekNumber,
      dayType: workoutSessions.dayType,
      startedAt: workoutSessions.startedAt,
      completedAt: workoutSessions.completedAt,
      status: workoutSessions.status,
      createdAt: workoutSessions.createdAt,
      totalVolume:
        sql`COALESCE(SUM(${workoutSetLogs.weight} * ${workoutSetLogs.reps}), 0)`.mapWith(
          Number,
        ),
      totalSets: sql`COUNT(${workoutSetLogs.id})`.mapWith(Number),
    })
    .from(workoutSessions)
    .leftJoin(
      exerciseLogs,
      eq(workoutSessions.id, exerciseLogs.workoutSessionId),
    )
    .leftJoin(
      workoutSetLogs,
      eq(exerciseLogs.id, workoutSetLogs.exerciseLogId),
    )
    .groupBy(workoutSessions.id)
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit)
    .all();
}

export async function getSessionCountByWeek(): Promise<{ weekNumber: number; count: number }[]> {
  const db = await getDb();
  return db
    .select({
      weekNumber: workoutSessions.weekNumber,
      count: sql`COUNT(*)`.mapWith(Number),
    })
    .from(workoutSessions)
    .where(eq(workoutSessions.status, 'completed'))
    .groupBy(workoutSessions.weekNumber)
    .orderBy(workoutSessions.weekNumber)
    .all();
}

export async function getSessionsForToday(): Promise<(typeof workoutSessions.$inferSelect)[]> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(workoutSessions)
    .where(sql`strftime('%Y-%m-%d', ${workoutSessions.startedAt}) = ${today}`)
    .orderBy(desc(workoutSessions.startedAt))
    .all();
}

export async function getSessionsForDate(dateStr: string): Promise<(typeof workoutSessions.$inferSelect)[]> {
  const db = await getDb();
  return db
    .select()
    .from(workoutSessions)
    .where(sql`strftime('%Y-%m-%d', ${workoutSessions.startedAt}) = ${dateStr}`)
    .orderBy(desc(workoutSessions.startedAt))
    .all();
}

export async function getAllWorkoutDates(): Promise<string[]> {
  const db = await getDb();
  const rows = db
    .select({
      date: sql`strftime('%Y-%m-%d', ${workoutSessions.startedAt})`.mapWith(String),
    })
    .from(workoutSessions)
    .where(
      sql`${workoutSessions.status} IN ('completed', 'abandoned')`,
    )
    .groupBy(sql`strftime('%Y-%m-%d', ${workoutSessions.startedAt})`)
    .orderBy(sql`strftime('%Y-%m-%d', ${workoutSessions.startedAt})`)
    .all();

  return rows.map((r: { date: string }) => r.date);
}

export async function getAdherenceRate(
  weekNumber: number,
): Promise<number> {
  const db = await getDb();
  const row = db
    .select({
      count: sql`COUNT(*)`.mapWith(Number),
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.weekNumber, weekNumber),
        eq(workoutSessions.status, 'completed'),
      ),
    )
    .all();

  return row[0]?.count ?? 0;
}
