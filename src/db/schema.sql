-- ============================================================
-- Workout Companion — SQLite Schema
-- 
-- This schema stores ONLY the Execution / Tracking layer.
-- All canonical program data (exercises, prescriptions, blocks,
-- weeks, substitutions) lives in src/data/program.ts and is
-- never persisted to SQLite.
--
-- Naming conventions:
--   - snake_case for all columns and tables
--   - TEXT PRIMARY KEY for UUIDs
--   - Explicit foreign keys with ON DELETE CASCADE
--   - Append-only design — rows are inserted, never updated
--     (except workout_session.status transitions)
-- ============================================================

-- ============================================================
-- Workout Sessions
-- ============================================================
-- One row per gym session. Corresponds to one training day
-- (Upper, Lower, Pull, Push, or Legs) in one program week.
-- Status transitions: in_progress -> completed | abandoned.
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_sessions (
    id              TEXT PRIMARY KEY,
    week_number     INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 12),
    day_type        TEXT NOT NULL CHECK (day_type IN ('Upper', 'Lower', 'Pull', 'Push', 'Legs')),
    started_at      TEXT NOT NULL,
    completed_at    TEXT,
    status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_week
    ON workout_sessions(week_number);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_status
    ON workout_sessions(status);

-- ============================================================
-- Exercise Logs
-- ============================================================
-- Groups all logged sets for a single exercise within a session.
-- exercise_name and prescribed_exercise_name are canonical
-- identifiers matching program.ts (not duplicated metadata).
-- When the user substitutes, exercise_name differs from
-- prescribed_exercise_name and substitution_note is populated.
-- ============================================================
CREATE TABLE IF NOT EXISTS exercise_logs (
    id                        TEXT PRIMARY KEY,
    workout_session_id        TEXT NOT NULL,
    exercise_name             TEXT NOT NULL,
    prescribed_exercise_name  TEXT NOT NULL,
    substitution_note         TEXT,
    sort_order                INTEGER NOT NULL,
    created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (workout_session_id)
        REFERENCES workout_sessions(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_session
    ON exercise_logs(workout_session_id);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise
    ON exercise_logs(exercise_name);

-- ============================================================
-- Workout Set Logs
-- ============================================================
-- One row per working set performed. set_index (1–3) maps to
-- SET 1/SET 2/SET 3 in the program.  The number of rows should
-- match the week's prescribed working_sets, but the schema does
-- not enforce this — it records what the user actually did.
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_set_logs (
    id              TEXT PRIMARY KEY,
    exercise_log_id TEXT NOT NULL,
    set_index       INTEGER NOT NULL CHECK (set_index BETWEEN 1 AND 3),
    weight          REAL NOT NULL,
    reps            INTEGER NOT NULL,
    logged_rpe      REAL CHECK (logged_rpe IS NULL OR (logged_rpe >= 1 AND logged_rpe <= 10)),
    logged_at       TEXT,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (exercise_log_id)
        REFERENCES exercise_logs(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_set_logs_exercise
    ON workout_set_logs(exercise_log_id);

-- ============================================================
-- Bodyweight Entries
-- ============================================================
-- Append-only bodyweight measurements. Multiple entries per week
-- are expected — weekly averages are computed in queries.
-- ============================================================
CREATE TABLE IF NOT EXISTS bodyweight_entries (
    id          TEXT PRIMARY KEY,
    weight      REAL NOT NULL,
    unit        TEXT NOT NULL CHECK (unit IN ('lbs', 'kg')),
    measured_at TEXT NOT NULL,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_bodyweight_entries_date
    ON bodyweight_entries(measured_at);

-- ============================================================
-- Cardio Sessions
-- ============================================================
-- Optional cardio/HIIT sessions, typically logged on Day 3.
-- Contextually associated with a week via week_number.
-- ============================================================
CREATE TABLE IF NOT EXISTS cardio_sessions (
    id              TEXT PRIMARY KEY,
    week_number     INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 12),
    intensity_type  TEXT NOT NULL CHECK (intensity_type IN ('low_moderate', 'high_intensity')),
    activity        TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    note            TEXT,
    logged_at       TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_week
    ON cardio_sessions(week_number);

-- ============================================================
-- Progress Photos
-- ============================================================
-- Stores local file URIs (not binary data). Standalone entity
-- associated contextually by timestamp.
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_photos (
    id          TEXT PRIMARY KEY,
    file_uri    TEXT NOT NULL,
    angle       TEXT NOT NULL CHECK (angle IN ('front', 'side', 'rear')),
    taken_at    TEXT NOT NULL,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_progress_photos_date
    ON progress_photos(taken_at);

-- ============================================================
-- Schema Version (meta)
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    description TEXT
);

INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial schema: workout_sessions, exercise_logs, workout_set_logs, bodyweight_entries, cardio_sessions, progress_photos');
