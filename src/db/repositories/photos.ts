import { eq, desc } from 'drizzle-orm';
import { getDb } from '../client';
import { progressPhotos } from '../drizzle-schema';

export interface CreateProgressPhotoInput {
  id: string;
  fileUri: string;
  angle: 'front' | 'side' | 'rear';
  takenAt: string;
  note: string | null;
}

export async function createProgressPhoto(input: CreateProgressPhotoInput) {
  const db = await getDb();
  db.insert(progressPhotos)
    .values({
      id: input.id,
      fileUri: input.fileUri,
      angle: input.angle,
      takenAt: input.takenAt,
      note: input.note,
    })
    .run();

  return getProgressPhotoById(input.id);
}

export async function getProgressPhotoById(id: string) {
  const db = await getDb();
  const rows = db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.id, id))
    .all();

  return rows[0] ?? null;
}

export async function getProgressPhotos(limit = 50) {
  const db = await getDb();
  return db
    .select()
    .from(progressPhotos)
    .orderBy(desc(progressPhotos.takenAt))
    .limit(limit)
    .all();
}

export async function getProgressPhotosByAngle(angle: 'front' | 'side' | 'rear') {
  const db = await getDb();
  return db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.angle, angle))
    .orderBy(desc(progressPhotos.takenAt))
    .all();
}

export async function getLatestPhotoByAngle(angle: 'front' | 'side' | 'rear') {
  const db = await getDb();
  const rows = db
    .select()
    .from(progressPhotos)
    .where(eq(progressPhotos.angle, angle))
    .orderBy(desc(progressPhotos.takenAt))
    .limit(1)
    .all();

  return rows[0] ?? null;
}

export async function deleteProgressPhoto(id: string) {
  const db = await getDb();
  db.delete(progressPhotos).where(eq(progressPhotos.id, id)).run();
}
