import { eq, asc, and, or, desc, inArray, sql } from 'drizzle-orm';
import { getDb } from '../client';
import {
  exerciseLogs,
  workoutSetLogs,
  workoutSessions,
} from '../drizzle-schema';

export interface CreateExerciseLogInput {
  id: string;
  workoutSessionId: string;
  exerciseName: string;
  prescribedExerciseName: string;
  substitutionNote: string | null;
  sortOrder: number;
}

export interface CreateSetLogInput {
  id: string;
  exerciseLogId: string;
  setIndex: number;
  weight: number;
  reps: number;
  loggedRpe: number | null;
  loggedAt: string | null;
}

export interface ExerciseLogWithSets {
  exerciseLog: typeof exerciseLogs.$inferSelect;
  sets: (typeof workoutSetLogs.$inferSelect)[];
}

export interface ExerciseHistoryRow {
  sessionDate: string;
  weekNumber: number;
  setIndex: number;
  weight: number;
  reps: number;
  loggedRpe: number | null;
}

export async function createExerciseLog(input: CreateExerciseLogInput) {
  const db = await getDb();
  db.insert(exerciseLogs)
    .values({
      id: input.id,
      workoutSessionId: input.workoutSessionId,
      exerciseName: input.exerciseName,
      prescribedExerciseName: input.prescribedExerciseName,
      substitutionNote: input.substitutionNote,
      sortOrder: input.sortOrder,
    })
    .run();

  return getExerciseLogById(input.id);
}

export async function getExerciseLogById(id: string) {
  const db = await getDb();
  const rows = db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.id, id))
    .all();

  return rows[0] ?? null;
}

export async function getExerciseLogsBySession(sessionId: string) {
  const db = await getDb();
  return db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.workoutSessionId, sessionId))
    .orderBy(asc(exerciseLogs.sortOrder))
    .all();
}

export async function getExerciseLogsWithSetsBySession(
  sessionId: string,
): Promise<ExerciseLogWithSets[]> {
  const db = await getDb();
  const logs = db
    .select()
    .from(exerciseLogs)
    .where(eq(exerciseLogs.workoutSessionId, sessionId))
    .orderBy(asc(exerciseLogs.sortOrder))
    .all();

  if (logs.length === 0) return [];

  const logIds = logs.map((l) => l.id);
  const allSets = db
    .select()
    .from(workoutSetLogs)
    .where(inArray(workoutSetLogs.exerciseLogId, logIds))
    .orderBy(asc(workoutSetLogs.setIndex))
    .all();

  const setsByLogId = new Map<string, typeof workoutSetLogs.$inferSelect[]>();
  for (const set of allSets) {
    const existing = setsByLogId.get(set.exerciseLogId);
    if (existing) {
      existing.push(set);
    } else {
      setsByLogId.set(set.exerciseLogId, [set]);
    }
  }

  return logs.map((log) => ({
    exerciseLog: log,
    sets: setsByLogId.get(log.id) ?? [],
  }));
}

export async function createSetLog(input: CreateSetLogInput) {
  const db = await getDb();
  db.insert(workoutSetLogs)
    .values({
      id: input.id,
      exerciseLogId: input.exerciseLogId,
      setIndex: input.setIndex,
      weight: input.weight,
      reps: input.reps,
      loggedRpe: input.loggedRpe,
      loggedAt: input.loggedAt,
    })
    .run();

  return getSetLogById(input.id);
}

export async function getSetLogById(id: string) {
  const db = await getDb();
  const rows = db
    .select()
    .from(workoutSetLogs)
    .where(eq(workoutSetLogs.id, id))
    .all();

  return rows[0] ?? null;
}

export async function getSetLogsByExerciseLog(exerciseLogId: string) {
  const db = await getDb();
  return db
    .select()
    .from(workoutSetLogs)
    .where(eq(workoutSetLogs.exerciseLogId, exerciseLogId))
    .orderBy(asc(workoutSetLogs.setIndex))
    .all();
}

export async function getExerciseHistory(
  exerciseName: string,
  limit = 50,
): Promise<ExerciseHistoryRow[]> {
  const db = await getDb();
  return db
    .select({
      sessionDate: workoutSessions.startedAt,
      weekNumber: workoutSessions.weekNumber,
      setIndex: workoutSetLogs.setIndex,
      weight: workoutSetLogs.weight,
      reps: workoutSetLogs.reps,
      loggedRpe: workoutSetLogs.loggedRpe,
    })
    .from(workoutSetLogs)
    .innerJoin(
      exerciseLogs,
      eq(workoutSetLogs.exerciseLogId, exerciseLogs.id),
    )
    .innerJoin(
      workoutSessions,
      eq(exerciseLogs.workoutSessionId, workoutSessions.id),
    )
    .where(
      and(
        or(
          eq(exerciseLogs.exerciseName, exerciseName),
          eq(exerciseLogs.prescribedExerciseName, exerciseName),
        ),
        eq(workoutSessions.status, 'completed'),
      ),
    )
    .orderBy(asc(workoutSessions.startedAt), asc(workoutSetLogs.setIndex))
    .limit(limit)
    .all();
}

export async function getTotalVolume(
  sessionId: string,
): Promise<number> {
  const db = await getDb();
  const rows = db
    .select({
      total: sql`COALESCE(SUM(${workoutSetLogs.weight} * ${workoutSetLogs.reps}), 0)`.mapWith(
        Number,
      ),
    })
    .from(workoutSetLogs)
    .innerJoin(
      exerciseLogs,
      eq(workoutSetLogs.exerciseLogId, exerciseLogs.id),
    )
    .where(eq(exerciseLogs.workoutSessionId, sessionId))
    .all();

  return rows[0]?.total ?? 0;
}

export interface UpdateSetLogInput {
  weight?: number;
  reps?: number;
  loggedRpe?: number | null;
  loggedAt?: string | null;
}

export async function updateSetLog(id: string, input: UpdateSetLogInput) {
  const db = await getDb();
  const updates: Record<string, unknown> = {};
  if (input.weight !== undefined) updates.weight = input.weight;
  if (input.reps !== undefined) updates.reps = input.reps;
  if (input.loggedRpe !== undefined) updates.loggedRpe = input.loggedRpe;
  if (input.loggedAt !== undefined) updates.loggedAt = input.loggedAt;

  if (Object.keys(updates).length === 0) return getSetLogById(id);

  db.update(workoutSetLogs)
    .set(updates)
    .where(eq(workoutSetLogs.id, id))
    .run();

  return getSetLogById(id);
}

export async function updateExerciseLog(id: string, input: UpdateExerciseLogInput) {
  const db = await getDb();
  const updates: Record<string, unknown> = {};
  if (input.exerciseName !== undefined) updates.exerciseName = input.exerciseName;
  if (input.substitutionNote !== undefined) updates.substitutionNote = input.substitutionNote;

  if (Object.keys(updates).length === 0) return getExerciseLogById(id);

  db.update(exerciseLogs)
    .set(updates)
    .where(eq(exerciseLogs.id, id))
    .run();

  return getExerciseLogById(id);
}

export async function updateExerciseLogStatus(
  id: string,
  status: 'pending' | 'active' | 'completed',
) {
  const db = await getDb();
  db.update(exerciseLogs)
    .set({ status })
    .where(eq(exerciseLogs.id, id))
    .run();
  return getExerciseLogById(id);
}

export async function createWarmupSetLog(
  input: CreateSetLogInput & { isWarmup: boolean },
) {
  const db = await getDb();
  db.insert(workoutSetLogs)
    .values({
      id: input.id,
      exerciseLogId: input.exerciseLogId,
      setIndex: input.setIndex,
      weight: input.weight,
      reps: input.reps,
      loggedRpe: null,
      loggedAt: new Date().toISOString(),
      isWarmup: 1,
    })
    .run();
  return getSetLogById(input.id);
}

export async function deleteExerciseLog(id: string) {
  const db = await getDb();
  db.delete(exerciseLogs).where(eq(exerciseLogs.id, id)).run();
}

export async function deleteSetLog(id: string) {
  const db = await getDb();
  db.delete(workoutSetLogs).where(eq(workoutSetLogs.id, id)).run();
}

export interface UpdateExerciseLogInput {
  exerciseName?: string;
  substitutionNote?: string | null;
}
