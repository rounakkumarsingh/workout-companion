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
  if (Platform.OS === 'web') {
    const warmup = await SQLite.openDatabaseAsync(':memory:');
    await warmup.execAsync('SELECT 1');
    await warmup.closeAsync();
  }

  const expoDb = SQLite.openDatabaseSync('workout-companion.db');
  try {
    // Web SQLite (WASM) does not support WAL journal mode — skip it.
    if (Platform.OS !== 'web') {
      expoDb.execSync('PRAGMA journal_mode = WAL');
    }
    expoDb.execSync('PRAGMA foreign_keys = ON');
  } catch (e) {
    // The handle is not yet reachable via _rawDb/_db, so a retry would open a
    // second one and leak this file descriptor. Close it before rethrowing.
    try {
      expoDb.closeSync();
    } catch {
      // Nothing useful to do if closing also fails.
    }
    throw e;
  }
  _rawDb = expoDb;
  _db = drizzle(expoDb, { schema });
}

// On native there is no `await` before openDatabaseSync, so a failure inside
// initDb throws synchronously and its rejected promise is returned to the
// caller *before* `_initPromise` is assigned. Clearing the handle inside
// initDb therefore ran too early and was immediately overwritten by the
// rejected promise, leaving it cached forever. Clear it here, after the
// assignment, so a later call can actually retry.
function initOnce(): Promise<void> {
  if (!_initPromise) {
    _initPromise = initDb().catch((e) => {
      _initPromise = null;
      throw e;
    });
  }
  return _initPromise;
}

export async function getDb(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  await initOnce();
  return _db!;
}

/**
 * Returns the raw expo-sqlite `SQLiteDatabase` instance.
 * Useful for running raw DDL / migration queries that
 * the Drizzle ORM wrapper cannot express comfortably.
 */
export async function getRawDb(): Promise<SQLiteDatabase> {
  await initOnce();
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
  'exercise_notes',
] as const;

export async function clearAllTables(): Promise<void> {
  const raw = await getRawDb();
  // `PRAGMA foreign_keys` is a no-op inside a transaction, so it has to be set
  // before BEGIN and restored after COMMIT.
  //
  // Restoring in `finally` is the point: a DELETE that threw used to skip
  // `PRAGMA foreign_keys = ON` entirely, leaving the connection with FK
  // enforcement disabled for the rest of the session and silently weakening
  // every later write.
  raw.execSync('PRAGMA foreign_keys = OFF');
  try {
    raw.execSync('BEGIN IMMEDIATE');
    try {
      for (const table of ALL_TABLES) {
        raw.execSync(`DELETE FROM "${table}"`);
      }
      raw.execSync('COMMIT');
    } catch (e) {
      raw.execSync('ROLLBACK');
      throw e;
    }
  } finally {
    raw.execSync('PRAGMA foreign_keys = ON');
  }
}
