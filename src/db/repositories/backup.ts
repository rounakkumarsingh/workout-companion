import { getDb } from '../client';
import {
  appSettings,
  bodyweightEntries,
  cardioSessions,
  exerciseLogs,
  exerciseNotes,
  progressPhotos,
  workoutSessions,
  workoutSetLogs,
} from '../drizzle-schema';
import type { BackupTables } from '../../features/backup/build-export';

/** Reads every user-data table for a backup. schema_version is not user data. */
export async function readAllTablesForBackup(): Promise<BackupTables> {
  const db = await getDb();
  return {
    workoutSessions: db.select().from(workoutSessions).all(),
    exerciseLogs: db.select().from(exerciseLogs).all(),
    workoutSetLogs: db.select().from(workoutSetLogs).all(),
    bodyweightEntries: db.select().from(bodyweightEntries).all(),
    cardioSessions: db.select().from(cardioSessions).all(),
    progressPhotos: db.select().from(progressPhotos).all(),
    appSettings: db.select().from(appSettings).all(),
    exerciseNotes: db.select().from(exerciseNotes).all(),
  };
}
