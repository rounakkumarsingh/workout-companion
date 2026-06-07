import { TOTAL_WEEKS } from '../data/program';
import { getRawDb } from './client';

const MIGRATIONS: { version: number; description: string; statements: string[] }[] = [
  {
    version: 1,
    description:
      'Initial schema: workout_sessions, exercise_logs, workout_set_logs, bodyweight_entries, cardio_sessions, progress_photos',
    statements: [
      `CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        week_number INTEGER NOT NULL,
        day_type TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (week_number BETWEEN 1 AND ${TOTAL_WEEKS}),
        CHECK (day_type IN ('Upper', 'Lower', 'Pull', 'Push', 'Legs')),
        CHECK (status IN ('in_progress', 'completed', 'abandoned'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_week ON workout_sessions(week_number)`,
      `CREATE INDEX IF NOT EXISTS idx_workout_sessions_status ON workout_sessions(status)`,

      `CREATE TABLE IF NOT EXISTS exercise_logs (
        id TEXT PRIMARY KEY,
        workout_session_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        prescribed_exercise_name TEXT NOT NULL,
        substitution_note TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(workout_session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(exercise_name)`,

      `CREATE TABLE IF NOT EXISTS workout_set_logs (
        id TEXT PRIMARY KEY,
        exercise_log_id TEXT NOT NULL,
        set_index INTEGER NOT NULL,
        weight REAL NOT NULL,
        reps INTEGER NOT NULL,
        logged_rpe REAL,
        logged_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        FOREIGN KEY (exercise_log_id) REFERENCES exercise_logs(id) ON DELETE CASCADE,
        CHECK (set_index BETWEEN 1 AND 3),
        CHECK (logged_rpe IS NULL OR (logged_rpe >= 1 AND logged_rpe <= 10))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_workout_set_logs_exercise ON workout_set_logs(exercise_log_id)`,

      `CREATE TABLE IF NOT EXISTS bodyweight_entries (
        id TEXT PRIMARY KEY,
        weight REAL NOT NULL,
        unit TEXT NOT NULL,
        measured_at TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (unit IN ('lbs', 'kg'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bodyweight_entries_date ON bodyweight_entries(measured_at)`,

      `CREATE TABLE IF NOT EXISTS cardio_sessions (
        id TEXT PRIMARY KEY,
        week_number INTEGER NOT NULL,
        intensity_type TEXT NOT NULL,
        activity TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        note TEXT,
        logged_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (week_number BETWEEN 1 AND ${TOTAL_WEEKS}),
        CHECK (intensity_type IN ('low_moderate', 'high_intensity')),
        CHECK (duration_minutes > 0)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_cardio_sessions_week ON cardio_sessions(week_number)`,

      `CREATE TABLE IF NOT EXISTS progress_photos (
        id TEXT PRIMARY KEY,
        file_uri TEXT NOT NULL,
        angle TEXT NOT NULL,
        taken_at TEXT NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (angle IN ('front', 'side', 'rear'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos(taken_at)`,

      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        description TEXT
      )`,
    ],
  },
  {
    version: 2,
    description: 'Add app_settings table for program-level configuration storage',
    statements: [
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`,
    ],
  },
  {
    version: 3,
    description: 'Add status to exercise_logs, isWarmup to workout_set_logs',
    statements: [
      `ALTER TABLE exercise_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`,
      `ALTER TABLE workout_set_logs ADD COLUMN is_warmup INTEGER NOT NULL DEFAULT 0`,
    ],
  },
];

/**
 * Run all pending database migrations.
 *
 * Uses raw expo-sqlite queries (not the Drizzle ORM) because:
 * 1. The `schema_version` table may not exist yet on first run
 * 2. DDL operations (CREATE TABLE, etc.) are simpler as raw SQL
 * 3. Avoids any ORM/type issues during the startup path
 */
export async function runMigrations(): Promise<void> {
  const rawDb = await getRawDb();

  // Check if the schema_version table exists (first-run safety).
  // Using sqlite_master avoids querying a table that may not exist.
  const tables = rawDb.getAllSync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`,
  );

  let currentVersion = 0;
  if (tables.length > 0) {
    const row = rawDb.getFirstSync<{ max_version: number }>(
      `SELECT COALESCE(MAX(version), 0) AS max_version FROM schema_version`,
    );
    currentVersion = row?.max_version ?? 0;
  }

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  if (pending.length === 0) return;

  const columnExists = (table: string, column: string): boolean => {
    const rows = rawDb.getAllSync<{ name: string }>(
      `PRAGMA table_info(${table})`,
    );
    return rows.some((r) => r.name === column);
  };

  const ALTER_ADD_COLUMN_RE =
    /ALTER\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\S+)\s+ADD\s+(?:COLUMN\s+)?(\S+)/i;

  for (const migration of pending) {
    // --- Step 1: Record the version atomically before any DDL ---
    // SQLite DDL (CREATE TABLE, ALTER TABLE) auto-commits — it cannot
    // be rolled back. If we wrapped everything in one transaction and
    // a later statement failed, the DDL would persist but the version
    // would not be recorded. On next boot the migration would be
    // retried and fail because the table/column already exists.
    //
    // By recording schema_version FIRST in its own transaction, we
    // ensure the migration is never retried — even if subsequent DDL
    // auto-commits and a later statement fails. Idempotency guards
    // (CREATE TABLE IF NOT EXISTS, ALTER column-exists check) prevent
    // errors on any hypothetical re-run.
    rawDb.execSync('BEGIN IMMEDIATE');
    try {
      rawDb.runSync(
        `INSERT OR REPLACE INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)`,
        migration.version,
        migration.description,
        new Date().toISOString(),
      );
      rawDb.execSync('COMMIT');
    } catch (e) {
      rawDb.execSync('ROLLBACK');
      throw e;
    }

    // --- Step 2: Execute each DDL statement with idempotency guards ---
    // DDL auto-commits so each statement is individually persistent.
    // That's safe now because the version is already recorded — the
    // migration won't be retried. Guards handle re-runs if a prior
    // partial-apply already exists.
    for (const stmt of migration.statements) {
      // Idempotency guard for ALTER TABLE ADD COLUMN — skip if the
      // column already exists (handles partial-apply from a prior
      // failed run where DDL auto-committed before schema_version
      // was recorded).
      const alterMatch = stmt.match(ALTER_ADD_COLUMN_RE);
      if (alterMatch) {
        const tableName = alterMatch[1].replace(/[`"[\]]/g, '');
        const columnName = alterMatch[2].replace(/[`"[\]]/g, '');
        if (columnExists(tableName, columnName)) continue;
      }

      // Use execSync for DDL — it does not go through the
      // prepare/execute/finalize cycle (fewer native round-trips
      // and avoids any edge-case issues with runSync + DDL).
      try {
        rawDb.execSync(stmt);
      } catch (stmtErr) {
        // The migration version is already recorded, so this migration
        // won't be retried. Log a warning so the developer can
        // investigate, but don't crash the app — idempotency guards
        // ensure safe re-runs if a prior partial-apply exists.
        console.warn(
          `[migrations] Statement skipped (may already be applied): ${stmt}`,
          stmtErr,
        );
      }
    }
  }
}
