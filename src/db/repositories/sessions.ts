import { eq, desc, and, gte, lt, isNotNull, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { workoutSessions, exerciseLogs, workoutSetLogs } from '../drizzle-schema';
import type { WorkoutSessionStatus } from '../../data/program';
import { isoToLocalDateKey } from '../../lib/dates';

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

export interface CreateSessionWithLogsInput {
  session: CreateSessionInput;
  exercises: {
    id: string;
    exerciseName: string;
    prescribedExerciseName: string;
    substitutionNote?: string | null;
    sortOrder: number;
    sets: { id: string; setIndex: number; weight: number; reps: number }[];
  }[];
}

export interface SessionActivity {
  loggedSets: number;
  lastLoggedAt: string | null;
}

/** A working set counts only once the user actually logged it. */
const loggedWorkingSet = and(isNotNull(workoutSetLogs.loggedAt), eq(workoutSetLogs.isWarmup, 0));

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

/**
 * Creates a session with its exercise logs and (suggested, not yet logged)
 * working sets in a single transaction, so a crash or failed insert never
 * leaves a half-built session behind.
 */
export async function createSessionWithLogs(input: CreateSessionWithLogsInput) {
  const db = await getDb();
  db.transaction((tx) => {
    tx.insert(workoutSessions)
      .values({
        id: input.session.id,
        weekNumber: input.session.weekNumber,
        dayType: input.session.dayType,
        startedAt: input.session.startedAt,
        status: 'in_progress',
      })
      .run();
    for (const exercise of input.exercises) {
      tx.insert(exerciseLogs)
        .values({
          id: exercise.id,
          workoutSessionId: input.session.id,
          exerciseName: exercise.exerciseName,
          prescribedExerciseName: exercise.prescribedExerciseName,
          substitutionNote: exercise.substitutionNote ?? null,
          sortOrder: exercise.sortOrder,
        })
        .run();
      for (const set of exercise.sets) {
        tx.insert(workoutSetLogs)
          .values({
            id: set.id,
            exerciseLogId: exercise.id,
            setIndex: set.setIndex,
            weight: set.weight,
            reps: set.reps,
            loggedRpe: null,
            loggedAt: null,
          })
          .run();
      }
    }
  });

  return getSessionById(input.session.id);
}

export async function getSessionById(id: string) {
  const db = await getDb();
  const rows = db.select().from(workoutSessions).where(eq(workoutSessions.id, id)).all();

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

export async function getActiveSessions() {
  const db = await getDb();
  return db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.status, 'in_progress'))
    .orderBy(desc(workoutSessions.startedAt))
    .all();
}

export async function getSessionActivity(sessionId: string): Promise<SessionActivity> {
  const db = await getDb();
  const rows = db
    .select({
      loggedSets: sql`COUNT(${workoutSetLogs.id})`.mapWith(Number),
      lastLoggedAt: sql<string | null>`MAX(${workoutSetLogs.loggedAt})`,
    })
    .from(workoutSetLogs)
    .innerJoin(exerciseLogs, eq(workoutSetLogs.exerciseLogId, exerciseLogs.id))
    .where(and(eq(exerciseLogs.workoutSessionId, sessionId), loggedWorkingSet))
    .all();

  return {
    loggedSets: rows[0]?.loggedSets ?? 0,
    lastLoggedAt: rows[0]?.lastLoggedAt ?? null,
  };
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
    completedAt: new Date().toISOString(),
  });
}

/** Removes a session with its exercise logs and sets (the foreign keys cascade). */
export async function deleteSession(id: string) {
  const db = await getDb();
  db.delete(workoutSessions).where(eq(workoutSessions.id, id)).run();
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
      totalVolume: sql`COALESCE(SUM(${workoutSetLogs.weight} * ${workoutSetLogs.reps}), 0)`.mapWith(
        Number,
      ),
      totalSets: sql`COUNT(${workoutSetLogs.id})`.mapWith(Number),
    })
    .from(workoutSessions)
    .leftJoin(exerciseLogs, eq(workoutSessions.id, exerciseLogs.workoutSessionId))
    .leftJoin(
      workoutSetLogs,
      and(eq(exerciseLogs.id, workoutSetLogs.exerciseLogId), loggedWorkingSet),
    )
    .groupBy(workoutSessions.id)
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit)
    .all();
}

/**
 * Completed training days per program week. Counts distinct day types so a
 * repeated or made-up session never pushes a week past its 5 training days.
 */
export async function getSessionCountByWeek(
  sinceIso?: string,
): Promise<{ weekNumber: number; count: number }[]> {
  const db = await getDb();
  return db
    .select({
      weekNumber: workoutSessions.weekNumber,
      count: sql`COUNT(DISTINCT ${workoutSessions.dayType})`.mapWith(Number),
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.status, 'completed'),
        sinceIso ? gte(workoutSessions.startedAt, sinceIso) : undefined,
      ),
    )
    .groupBy(workoutSessions.weekNumber)
    .orderBy(workoutSessions.weekNumber)
    .all();
}

export async function getSessionsStartedBetween(
  startIso: string,
  endIso: string,
): Promise<(typeof workoutSessions.$inferSelect)[]> {
  const db = await getDb();
  return db
    .select()
    .from(workoutSessions)
    .where(and(gte(workoutSessions.startedAt, startIso), lt(workoutSessions.startedAt, endIso)))
    .orderBy(desc(workoutSessions.startedAt))
    .all();
}

export async function getCompletedSessionsSince(
  sinceIso: string,
): Promise<{ weekNumber: number; dayType: string; startedAt: string }[]> {
  const db = await getDb();
  return db
    .select({
      weekNumber: workoutSessions.weekNumber,
      dayType: workoutSessions.dayType,
      startedAt: workoutSessions.startedAt,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.status, 'completed'), gte(workoutSessions.startedAt, sinceIso)))
    .orderBy(desc(workoutSessions.startedAt))
    .all();
}

/**
 * Local calendar days with a workout: completed sessions, plus abandoned
 * sessions in which at least one working set was logged.
 */
export async function getAllWorkoutDates(): Promise<string[]> {
  const db = await getDb();
  const rows = db
    .select({ startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .where(
      sql`${workoutSessions.status} = 'completed' OR (${workoutSessions.status} = 'abandoned' AND EXISTS (
        SELECT 1 FROM ${workoutSetLogs}
        INNER JOIN ${exerciseLogs} ON ${exerciseLogs.id} = ${workoutSetLogs.exerciseLogId}
        WHERE ${exerciseLogs.workoutSessionId} = ${workoutSessions.id}
          AND ${workoutSetLogs.loggedAt} IS NOT NULL
          AND ${workoutSetLogs.isWarmup} = 0
      ))`,
    )
    .orderBy(workoutSessions.startedAt)
    .all();

  return Array.from(new Set(rows.map((r) => isoToLocalDateKey(r.startedAt))));
}

export async function getAdherenceRate(weekNumber: number): Promise<number> {
  const db = await getDb();
  const row = db
    .select({
      count: sql`COUNT(*)`.mapWith(Number),
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.weekNumber, weekNumber), eq(workoutSessions.status, 'completed')))
    .all();

  return row[0]?.count ?? 0;
}
