import { sql } from 'drizzle-orm';
import { TOTAL_WEEKS } from '../data/program';
import { sqliteTable, text, integer, real, index, check } from 'drizzle-orm/sqlite-core';

// ============================================================
// Workout Sessions
// ============================================================

export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    id: text('id').primaryKey(),
    weekNumber: integer('week_number').notNull(),
    dayType: text('day_type').notNull(),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    status: text('status').notNull().default('in_progress'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index('idx_workout_sessions_week').on(table.weekNumber),
    index('idx_workout_sessions_status').on(table.status),
    check('chk_sessions_week', sql`${table.weekNumber} BETWEEN 1 AND ${TOTAL_WEEKS}`),
    check(
      'chk_sessions_day_type',
      sql`${table.dayType} IN ('Upper', 'Lower', 'Pull', 'Push', 'Legs')`,
    ),
    check('chk_sessions_status', sql`${table.status} IN ('in_progress', 'completed', 'abandoned')`),
  ],
);

// ============================================================
// Exercise Logs
// ============================================================

export const exerciseLogs = sqliteTable(
  'exercise_logs',
  {
    id: text('id').primaryKey(),
    workoutSessionId: text('workout_session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseName: text('exercise_name').notNull(),
    prescribedExerciseName: text('prescribed_exercise_name').notNull(),
    substitutionNote: text('substitution_note'),
    status: text('status').notNull().default('pending'),
    sortOrder: integer('sort_order').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index('idx_exercise_logs_session').on(table.workoutSessionId),
    index('idx_exercise_logs_exercise').on(table.exerciseName),
    check('chk_exercise_status', sql`${table.status} IN ('pending', 'active', 'completed')`),
  ],
);

// ============================================================
// Workout Set Logs
// ============================================================

export const workoutSetLogs = sqliteTable(
  'workout_set_logs',
  {
    id: text('id').primaryKey(),
    exerciseLogId: text('exercise_log_id')
      .notNull()
      .references(() => exerciseLogs.id, { onDelete: 'cascade' }),
    setIndex: integer('set_index').notNull(),
    weight: real('weight').notNull(),
    reps: integer('reps').notNull(),
    loggedRpe: real('logged_rpe'),
    isWarmup: integer('is_warmup').notNull().default(0),
    loggedAt: text('logged_at'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index('idx_workout_set_logs_exercise').on(table.exerciseLogId),
    check(
      'chk_set_logs_set_index',
      sql`${table.setIndex} >= 1 AND (${table.isWarmup} = 1 OR ${table.setIndex} <= 3)`,
    ),
    check(
      'chk_set_logs_rpe',
      sql`${table.loggedRpe} IS NULL OR (${table.loggedRpe} >= 1 AND ${table.loggedRpe} <= 10)`,
    ),
  ],
);

// ============================================================
// Bodyweight Entries
// ============================================================

export const bodyweightEntries = sqliteTable(
  'bodyweight_entries',
  {
    id: text('id').primaryKey(),
    weight: real('weight').notNull(),
    unit: text('unit').notNull(),
    measuredAt: text('measured_at').notNull(),
    note: text('note'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index('idx_bodyweight_entries_date').on(table.measuredAt),
    check('chk_bodyweight_unit', sql`${table.unit} IN ('lbs', 'kg')`),
  ],
);

// ============================================================
// Cardio Sessions
// ============================================================

export const cardioSessions = sqliteTable(
  'cardio_sessions',
  {
    id: text('id').primaryKey(),
    weekNumber: integer('week_number').notNull(),
    intensityType: text('intensity_type').notNull(),
    activity: text('activity').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    note: text('note'),
    loggedAt: text('logged_at').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index('idx_cardio_sessions_week').on(table.weekNumber),
    check('chk_cardio_week', sql`${table.weekNumber} BETWEEN 1 AND ${TOTAL_WEEKS}`),
    check(
      'chk_cardio_intensity',
      sql`${table.intensityType} IN ('low_moderate', 'high_intensity')`,
    ),
    check('chk_cardio_duration', sql`${table.durationMinutes} > 0`),
  ],
);

// ============================================================
// Progress Photos
// ============================================================

export const progressPhotos = sqliteTable(
  'progress_photos',
  {
    id: text('id').primaryKey(),
    fileUri: text('file_uri').notNull(),
    angle: text('angle').notNull(),
    takenAt: text('taken_at').notNull(),
    note: text('note'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (table) => [
    index('idx_progress_photos_date').on(table.takenAt),
    check('chk_photos_angle', sql`${table.angle} IN ('front', 'side', 'rear')`),
  ],
);

// ============================================================
// Schema Version (meta)
// ============================================================

export const schemaVersion = sqliteTable('schema_version', {
  version: integer('version').primaryKey(),
  appliedAt: text('applied_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  description: text('description'),
});

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const exerciseNotes = sqliteTable('exercise_notes', {
  exerciseName: text('exercise_name').primaryKey(),
  note: text('note').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
