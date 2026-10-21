import { toLocalDateKey } from '../../lib/dates';

export const BACKUP_FORMAT = 'workout-companion-backup';
export const BACKUP_VERSION = 1;

/** Raw rows of every user-data table, exactly as stored. */
export interface BackupTables {
  workoutSessions: readonly object[];
  exerciseLogs: readonly object[];
  workoutSetLogs: readonly object[];
  bodyweightEntries: readonly object[];
  cardioSessions: readonly object[];
  progressPhotos: readonly object[];
  appSettings: readonly object[];
}

export interface AppDataBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  /** Photo files are not included, only their records. */
  includesPhotoFiles: false;
  counts: Record<keyof BackupTables, number>;
  tables: BackupTables;
}

export function buildBackup(tables: BackupTables, now: Date): AppDataBackup {
  const counts = Object.fromEntries(
    Object.entries(tables).map(([name, rows]) => [name, rows.length]),
  ) as Record<keyof BackupTables, number>;
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    includesPhotoFiles: false,
    counts,
    tables,
  };
}

export function backupFileName(now: Date): string {
  return `workout-companion-backup-${toLocalDateKey(now)}.json`;
}
