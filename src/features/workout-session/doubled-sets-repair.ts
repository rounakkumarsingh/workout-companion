import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/src/db/client';
import { exerciseLogs, workoutSetLogs } from '@/src/db/drizzle-schema';
import { getSetting, setSetting } from '@/src/db/repositories/settings';
import { generateId } from '@/src/lib/ids';

const REPAIR_KEY = 'week3_double_sets_repair_v1';

/**
 * The Week 3 Lower, Upper and Push sessions were logged against the Week 2
 * prescription, so each exercise got one working set instead of two. Add a
 * second working set identical to the first. Sessions that are not on this
 * device are skipped, and the repair runs only once.
 *
 * One-off: delete this file and its call in schedule.ts once it has run.
 */
const SESSION_IDS = ['mw926ogi-w7zs0t-d', 'mwaj7m3j-ipwx3i-f', 'mweul3k1-vlh9ql-f'];

export async function repairDoubledSetsOnce(): Promise<void> {
  if ((await getSetting(REPAIR_KEY)) !== null) return;
  const db = await getDb();
  db.transaction((tx) => {
    const logs = tx
      .select({ id: exerciseLogs.id })
      .from(exerciseLogs)
      .where(inArray(exerciseLogs.workoutSessionId, SESSION_IDS))
      .all();
    for (const log of logs) {
      const working = tx
        .select()
        .from(workoutSetLogs)
        .where(and(eq(workoutSetLogs.exerciseLogId, log.id), eq(workoutSetLogs.isWarmup, 0)))
        .all();
      const first = working[0];
      if (working.length !== 1 || !first || first.setIndex !== 1) continue;
      tx.insert(workoutSetLogs)
        .values({
          id: generateId(),
          exerciseLogId: log.id,
          setIndex: 2,
          weight: first.weight,
          reps: first.reps,
          loggedRpe: first.loggedRpe,
          loggedAt: first.loggedAt,
        })
        .run();
    }
  });
  await setSetting(REPAIR_KEY, new Date().toISOString());
}
