import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import * as schema from './drizzle-schema';

let _db: ExpoSQLiteDatabase<typeof schema> | null = null;
let _rawDb: SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

async function initDb(): Promise<void> {
  if (_db) return;

  // drizzle-orm/expo-sqlite uses sync methods internally
  // (prepareSync / executeSync / getAllSync). On web these are backed by
  // SharedArrayBuffer + Atomics.wait inside the WASM worker.
  //
  // ⚠️  openDatabaseSync on web creates a Worker and then busy-loops
  // waiting for it to initialize SQLite WASM + OPFS.  If the Worker
  // hasn't loaded WASM yet, the spin-loop times out after ~10ms
  // ("Sync operation timeout").  We work around this by pre-warming
  // the Worker with an async open first — WASM is cached by the Worker
  // module, so the subsequent sync open reuses the ready engine.
  try {
    if (Platform.OS === 'web') {
      const warmup = await SQLite.openDatabaseAsync(':memory:');
      await warmup.execAsync('SELECT 1');
      await warmup.closeAsync();
    }

    const expoDb = SQLite.openDatabaseSync('workout-companion.db');
    // Web SQLite (WASM) does not support WAL journal mode — skip it.
    if (Platform.OS !== 'web') {
      expoDb.execSync('PRAGMA journal_mode = WAL');
    }
    expoDb.execSync('PRAGMA foreign_keys = ON');
    _rawDb = expoDb;
    _db = drizzle(expoDb, { schema });
  } catch (e) {
    // Reset the promise so a subsequent call can retry (e.g. after a
    // user taps "Retry" or the error screen triggers a re-mount).
    _initPromise = null;
    throw e;
  }
}

export async function getDb(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  if (!_initPromise) {
    _initPromise = initDb();
  }
  await _initPromise;
  return _db!;
}

/**
 * Returns the raw expo-sqlite `SQLiteDatabase` instance.
 * Useful for running raw DDL / migration queries that
 * the Drizzle ORM wrapper cannot express comfortably.
 */
export async function getRawDb(): Promise<SQLiteDatabase> {
  if (!_initPromise) {
    _initPromise = initDb();
  }
  await _initPromise;
  return _rawDb!;
}

const ALL_TABLES = [
  'workout_set_logs',
  'exercise_logs',
  'workout_sessions',
  'bodyweight_entries',
  'cardio_sessions',
  'progress_photos',
  'app_settings',
] as const;

export async function clearAllTables(): Promise<void> {
  const raw = await getRawDb();
  raw.execSync('PRAGMA foreign_keys = OFF');
  for (const table of ALL_TABLES) {
    raw.execSync(`DELETE FROM "${table}"`);
  }
  raw.execSync('PRAGMA foreign_keys = ON');
}
