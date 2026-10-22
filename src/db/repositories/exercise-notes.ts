import { eq } from 'drizzle-orm';
import { getDb } from '../client';
import { exerciseNotes } from '../drizzle-schema';

/** The user's note for an exercise (keyed on the performed exercise name), or null. */
export async function getExerciseNote(exerciseName: string): Promise<string | null> {
  const db = await getDb();
  const rows = db
    .select({ note: exerciseNotes.note })
    .from(exerciseNotes)
    .where(eq(exerciseNotes.exerciseName, exerciseName))
    .all();
  return rows[0]?.note ?? null;
}

/** Saves a trimmed note; an empty note deletes it. Returns what is stored (null if deleted). */
export async function saveExerciseNote(exerciseName: string, note: string): Promise<string | null> {
  const db = await getDb();
  const trimmed = note.trim();
  if (trimmed === '') {
    db.delete(exerciseNotes).where(eq(exerciseNotes.exerciseName, exerciseName)).run();
    return null;
  }
  const updatedAt = new Date().toISOString();
  db.insert(exerciseNotes)
    .values({ exerciseName, note: trimmed, updatedAt })
    .onConflictDoUpdate({
      target: exerciseNotes.exerciseName,
      set: { note: trimmed, updatedAt },
    })
    .run();
  return trimmed;
}
