# Data Model — Workout Companion

Canonical domain model for the BTS Beginner Program app. Defines entities, responsibilities, relationships, and the boundary between static program data and user-generated tracking data.

---

## 1. Conceptual Layers

The data model is separated into three layers:

| Layer | Category | Persistence | Source |
|-------|----------|-------------|--------|
| **Canonical / Static** | Program definition | Bundled with app (never modified at runtime) | Extracted from PDFs |
| **Prescription / Scheduled** | What the user *should* do each week-day | Derived from static data at runtime | Computed from static + week number |
| **Execution / Tracking** | What the user *actually* did | SQLite (user-generated) | Logged during workouts |

### Layer Purpose

- **Canonical** — Exercises, substitution options, video URLs, technique metadata, rest periods, warm-up ranges. Immutable program knowledge.
- **Prescription** — For any given week, the exact working sets, rep ranges, and RPE targets per exercise per day. Derived from canonical data + week number.
- **Execution** — Weight and reps the user logged for each set, bodyweight entries, progress photos, cardio sessions. Grows over time.

---

## 2. Entity Catalog

### 2.1 Exercise

**Layer**: Canonical / Static

**Responsibility**: Represents a distinct exercise in the program. Holds all immutable metadata about the movement itself — technique defaults, substitution options, demo video, and execution notes.

**Key attributes**:
- name (string, unique identifier, e.g. "45° Incline Barbell Press")
- demo_video_url (YouTube URL)
- notes (execution cues from the program)

**Relationships**:
- Has 0–2 substitution options (other Exercise entities)
- Appears in 1+ DayPrescriptions (via ExercisePrescription)
- Appears in 0+ ExerciseLogs (via user logging)

**Identity**: Canonical name matches `docs/domain/exercise-metadata.md`. Never changes.

---

### 2.2 Substitution

**Layer**: Canonical / Static

**Responsibility**: Links an exercise to its alternative options. Both Option 1 and Option 2 are equally valid (no priority ordering).

**Key attributes**:
- slot (1 or 2)

**Relationships**:
- Belongs to exactly 1 Exercise (the primary exercise)
- References exactly 1 Exercise (the substitute)

**Cardinality**: 0–2 per Exercise.

---

### 2.3 Block

**Layer**: Canonical / Static

**Responsibility**: Groups weeks into training phases. Defines the overarching training context.

**Key attributes**:
- name ("Foundation" or "Ramping")
- week_start (1)
- week_end (5 or 12)
- description

**Relationships**:
- Contains 1+ Weeks

**Cardinality**: Exactly 2 in this program (Foundation W1–5, Ramping W6–12).

---

### 2.4 Week

**Layer**: Canonical / Static (structure) + Prescription (parameter values)

**Responsibility**: A numbered week (1–12) within the program. Holds the week's position within its block and provides the context for looking up per-week prescription values.

**Key attributes**:
- week_number (1–12)
- label ("Foundation Block Week 1", etc.)

**Relationships**:
- Belongs to exactly 1 Block
- Contains exactly 7 Days

**Cardinality**: Exactly 12.

---

### 2.5 DayType

**Layer**: Canonical / Static

**Responsibility**: Enumeration of the 7 day types in the weekly rotation.

**Values**:
- `Upper`
- `Lower`
- `OptionalCardioHIIT`
- `Pull`
- `Push`
- `Legs`
- `FullRest`

**Relationships**:
- Each Day has exactly 1 DayType
- Training day types (Upper, Lower, Pull, Push, Legs) have a DayFocus
- OptionalCardioHIIT and FullRest have no exercises

---

### 2.6 DayFocus

**Layer**: Canonical / Static

**Responsibility**: Distinguishes whether a training day emphasizes strength or hypertrophy.

**Values**:
- `StrengthFocus` (applies to Upper, Lower)
- `HypertrophyFocus` (applies to Pull, Push, Legs)

**Relationships**:
- Each training Day has exactly 1 DayFocus

---

### 2.7 Day

**Layer**: Prescription / Scheduled

**Responsibility**: A specific occurrence of a DayType within a specific Week. Represents a single day in the 7-day rotation for a given week. For training days, holds the ordered list of exercise prescriptions.

**Key attributes**:
- day_index (1–7, position in the weekly rotation)
- day_type
- day_focus (null for non-training days)
- activity_type ("Training", "OptionalCardioHIIT", "FullRest")

**Relationships**:
- Belongs to exactly 1 Week
- Contains 0+ ExercisePrescriptions (ordered; non-empty only for training day types)

**Cardinality**: Exactly 7 per Week (84 total over 12 weeks).

---

### 2.8 ExercisePrescription

**Layer**: Prescription / Scheduled

**Responsibility**: The weekly prescription for performing a specific exercise on a specific day. This is the core entity that binds "what exercise" to "how to do it this week."

**Key attributes**:
- technique ("N/A" or "Failure")
- warmup_sets_range (min–max, e.g. "2–3")
- working_sets (1, 2, or 3)
- rep_range (e.g. "6–8", "8–10", "10–12", "12–15", "15–20", "10–20")
- early_set_rpe (string or null; null when working_sets = 1)
- last_set_rpe (string)
- rest (e.g. "3–5 min", "2–3 min", "1–2 min")
- sort_order (integer, position within the day)

**Relationships**:
- Belongs to exactly 1 Day
- References exactly 1 Exercise
- May be overridden by exactly 1 Substitution (user choice)
- Has 1+ SetLog entries when the user completes the workout

**Derivation**: The prescription for a given week-day-exercise is computed from the canonical exercise metadata + the specific week number. The canonical metadata defines ranges (e.g. "W1–2: 1 set, W3–5: 2 sets") and the week number selects the correct value.

**Cardinality**: Varies by day — 4–7 per training day, 0 for rest/cardio days.

---

### 2.9 WorkoutSession

**Layer**: Execution / Tracking

**Responsibility**: Represents a single gym session where the user performed one training day. Tracks timing metadata and completion status.

**Key attributes**:
- id (UUID)
- week_number
- day_type
- started_at (timestamp)
- completed_at (timestamp, null if in progress)
- status ("in_progress", "completed", "abandoned")

**Relationships**:
- For the Day prescribed by week_number + day_type
- Contains 1+ ExerciseLog entries
- May have 0+ RPE assessments recorded during the session

**Cardinality**: 0–60 per user (one per training day completed, up to 5 per week × 12 weeks).

---

### 2.10 WorkoutSetLog

**Layer**: Execution / Tracking

**Responsibility**: A single working set performed by the user. Records the actual weight, actual reps completed, and optionally the user's perceived RPE for that set.

**Key attributes**:
- id (UUID)
- set_index (1, 2, or 3 — which working set this is)
- weight (number)
- reps (number)
- logged_rpe (number, optional — user's own RPE assessment)
- logged_at (timestamp)

**Relationships**:
- Belongs to exactly 1 ExerciseLog
- Corresponds positionally to the prescription's working set N

**Cardinality**: 1–3 per ExerciseLog (matches the exercise's working_sets for the session's week).

---

### 2.11 ExerciseLog

**Layer**: Execution / Tracking

**Responsibility**: Groups all logged working sets for one exercise within one workout session. Captures the actual exercise performed (which may differ from the prescribed exercise if substituted).

**Key attributes**:
- id (UUID)
- exercise_name (string, may differ from prescription if substituted — stores the name of the exercise actually performed)
- substitution_note (optional, records if a substitution was used and why)
- sort_order (position within the session)

**Relationships**:
- Belongs to exactly 1 WorkoutSession
- References exactly 1 Exercise (the prescribed exercise)
- References 0–1 Substitution (if the user chose to substitute)
- Contains 1–3 WorkoutSetLog entries

---

### 2.12 BodyweightEntry

**Layer**: Execution / Tracking

**Responsibility**: A single bodyweight measurement logged by the user. Supports multiple entries per week for trend analysis.

**Key attributes**:
- id (UUID)
- weight (number)
- unit ("lbs" or "kg")
- measured_at (timestamp)

**Relationships**:
- Belongs to exactly 1 user (implicit)

**Usage**: Progress is judged by the rolling 7-day average, not single weigh-ins (guidebook). Averages and "already weighed today" use the user's local calendar day, not UTC. Entries are stored as entered (kg or lbs) and converted only for display; the preferred unit is the `weight_unit` app setting. The app prompts for a weigh-in before a workout if today has none; the prompt can be skipped.

---

### 2.13 ProgressPhoto

**Layer**: Execution / Tracking

**Responsibility**: A progress photo taken by the user at a specific point in time. The app stores the photo path/URI rather than the binary data.

**Key attributes**:
- id (UUID)
- file_uri (local file path)
- angle ("front", "side", "rear")
- taken_at (timestamp)
- notes (optional)

**Relationships**:
- Standalone entity (no direct relation to a specific workout or week, though can be associated contextually by timestamp)

**Usage**: A set is the photos taken on the same local day. A new set is due 30 days after the previous one (the guidebook suggests every 2-3 months, no more than weekly). Photos are copied into the app's document directory (`progress-photos/<id>.jpg`) because picker URIs are temporary; `file_uri` points there. Deleting a photo removes both the row and the file.

**Frequency guidance**: Roughly once every 2–3 months, no more than once per week.

---

### 2.14 CardioSession

**Layer**: Execution / Tracking

**Responsibility**: An optional cardio/HIIT session logged on Day 3. Captures what the user did, for how long, and at what intensity level.

**Key attributes**:
- id (UUID)
- week_number
- type ("low_moderate" or "high_intensity" / "HIIT")
- activity (string, e.g. "treadmill", "cycling", "rowing")
- duration_minutes (number)
- note (optional)
- logged_at (timestamp)

**Relationships**:
- Associated with Week N, Day 3 contextually (not a direct foreign key — Day 3 has no prescription)

---

### 2.15 WeightProgressionRecord

**Layer**: Derived (computed from Execution data)

**Responsibility**: A computed record showing the user's weight progression for a specific exercise over time. Not stored directly — derived by querying ExerciseLog → WorkoutSetLog grouped by exercise and session date.

**Derived attributes**:
- exercise_name
- session_date
- week_number
- working_set_index (1, 2, 3)
- weight_used
- reps_completed
- estimated_1rm (computed, optional)

**Usage**: Powers exercise progression charts in the Progress screen.

---

### 2.16 WeeklySummary

**Layer**: Derived (computed from Execution data)

**Responsibility**: A computed summary of a completed week. Shows total volume, sessions completed, adherence rate, and weight changes across exercises.

**Derived attributes**:
- week_number
- sessions_completed (0–5)
- total_working_sets
- total_volume (weight × reps across all sets)
- adherence_rate (sessions_completed / 5)

---

## 3. Relationship Diagram

```
Block (static, 2)
 └── Week (static structure, 12)
      └── Day (static structure, 7 per week)
           ├── DayType (enum: 7 values)
           ├── DayFocus (Strength / Hypertrophy, null on rest days)
           ├── ExercisePrescription (0..N, ordered)
           │    ├── Exercise (1, canonical reference)
           │    ├── technique, warmup_sets, working_sets, rep_range
           │    ├── early_set_rpe, last_set_rpe, rest
           │    └── Substitution (0..2, static links to other Exercises)
           │
           └── WorkoutSession (0..1 per user, execution)
                ├── status, started_at, completed_at
                ├── ExerciseLog (1..N, ordered)
                │    ├── exercise_name (actual)
                │    ├── substitution_note
                │    └── WorkoutSetLog (1..3)
                │         ├── set_index, weight, reps, logged_rpe
                │         └── (corresponds positionally to prescription's working_set N)
                │
                └── (no cardio sets logged inside workout session)

BodyweightEntry (standalone, user tracking)
ProgressPhoto (standalone, user tracking)
CardioSession (standalone, user tracking, contextually W3 Day 3)

Derived:
 └── WeightProgressionRecord ← query(ExerciseLog → WorkoutSetLog)
 └── WeeklySummary ← query(WorkoutSession)
```

---

## 4. Attribute Specifications

### 4.1 Exercise

| Attribute | Type | Notes |
|-----------|------|-------|
| name | string | Canonical name. Matches `exercise-metadata.md`. Used as the stable identifier. |
| demo_video_url | string | YouTube URL (youtu.be shortlink). Nullable — not all exercises may have a unique demo. |
| notes | string | Execution cues from the program PDF. |

### 4.2 Substitution

| Attribute | Type | Notes |
|-----------|------|-------|
| exercise_name | string | The primary exercise this substitution belongs to. |
| slot | 1 or 2 | Which substitution option. Both are equally valid — no priority. |
| substitute_name | string | The alternative exercise name. |

### 4.3 Block

| Attribute | Type | Notes |
|-----------|------|-------|
| name | enum | "Foundation" or "Ramping" |
| week_start | integer | 1 or 6 |
| week_end | integer | 5 or 12 |
| description | string | Free-text description |

### 4.4 Week

| Attribute | Type | Notes |
|-----------|------|-------|
| week_number | integer | 1–12 |
| block_name | string | Derived from week_number |

### 4.5 Day (as scheduled)

| Attribute | Type | Notes |
|-----------|------|-------|
| week_number | integer | 1–12 |
| day_index | integer | 1–7 |
| day_type | enum | Upper, Lower, OptionalCardioHIIT, Pull, Push, Legs, FullRest |
| day_focus | enum or null | StrengthFocus, HypertrophyFocus, or null for non-training days |
| activity_type | enum | Training, OptionalCardioHIIT, FullRest |

### 4.6 ExercisePrescription

| Attribute | Type | Constraints |
|-----------|------|-------------|
| week_number | integer | 1–12 |
| day_type | enum | Upper, Lower, Pull, Push, Legs |
| exercise_name | string | Must match a canonical Exercise |
| sort_order | integer | Position within the day |
| technique | enum | "N/A" or "Failure" |
| warmup_sets_min | integer | Lower bound of warm-up set range |
| warmup_sets_max | integer | Upper bound of warm-up set range |
| working_sets | integer | 1, 2, or 3 |
| rep_range | string | e.g. "6–8", "8–10", "10–12", "12–15", "15–20", "10–20" |
| early_set_rpe | string or null | e.g. "~7", "~7-8", "~8-9". null when working_sets = 1 |
| last_set_rpe | string | e.g. "~6", "~7", "~8", "~7-8", "~8-9", "10" |
| rest | string | e.g. "3-5 min", "2-3 min", "1-2 min" |

**Derivation rule**: Values for a given week_number + day_type + exercise_name are selected by week-based ranges defined in the canonical exercise metadata. For example:
- An exercise with working_sets "1 (W1–2), 2 (W3–5)" yields working_sets=1 for week 1–2, working_sets=2 for week 3–5.
- Rep range changes across blocks are handled the same way.

### 4.7 WorkoutSession

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (UUID) | Primary key |
| week_number | integer | The week the workout belongs to |
| day_type | enum | Which training day |
| started_at | datetime | When the user started the session |
| completed_at | datetime or null | When the user finished (or null if in progress) |
| status | enum | "in_progress", "completed", "abandoned" |

### 4.8 ExerciseLog

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (UUID) | Primary key |
| workout_session_id | string (UUID) | FK to WorkoutSession |
| exercise_name | string | The exercise actually performed. May differ from prescription if substituted. |
| prescribed_exercise_name | string | What the program prescribed (for comparison/reference) |
| substitution_note | string or null | Optional reason for substitution |
| sort_order | integer | Position within the session |

### 4.9 WorkoutSetLog

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (UUID) | Primary key |
| exercise_log_id | string (UUID) | FK to ExerciseLog |
| set_index | integer | 1, 2, or 3. Corresponds to SET 1, SET 2, SET 3 columns. |
| weight | number | Weight used for this set |
| reps | number | Reps completed |
| logged_rpe | number or null | User's self-assessed RPE for this set (optional) |
| logged_at | datetime or null | When the set was logged |

### 4.10 BodyweightEntry

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (UUID) | Primary key |
| weight | number | Bodyweight measurement |
| unit | enum | "lbs" or "kg" |
| measured_at | datetime | When the measurement was taken |
| note | string or null | Optional context (e.g. "morning, fasted") |

### 4.11 ProgressPhoto

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (UUID) | Primary key |
| file_uri | string | Local file path to the photo |
| angle | enum | "front", "side", "rear" |
| taken_at | datetime | When the photo was taken |
| note | string or null | Optional |

### 4.12 CardioSession

| Attribute | Type | Notes |
|-----------|------|-------|
| id | string (UUID) | Primary key |
| week_number | integer | Which week this belongs to |
| intensity_type | enum | "low_moderate" or "high_intensity" |
| activity | string | e.g. "treadmill", "cycling", "rowing" |
| duration_minutes | integer | Duration in minutes |
| note | string or null | Optional |
| logged_at | datetime | When the session was logged |

---

## 5. Static vs. Dynamic Boundary

| Concept | Static (bundled) | Dynamic (user data) |
|---------|-----------------|---------------------|
| Exercise list | All 52 exercises | — |
| Substitution options | All 2 per exercise | — |
| Block structure | Foundation + Ramping | — |
| Week structure | Weeks 1–12 defined | — |
| Day structure | All 7 day types | — |
| ExercisePrescription | All per-week values | — |
| WorkoutSession | — | User creates one per training session |
| ExerciseLog | — | User logs each exercise performed |
| WorkoutSetLog | — | User logs weight + reps per set |
| BodyweightEntry | — | User logs bodyweight measurements |
| ProgressPhoto | — | User uploads progress photos |
| CardioSession | — | User optionally logs cardio |
| WeeklySummary | — | Computed from user data |
| WeightProgressionRecord | — | Computed from user data |

**Key principle**: The app can fully describe every workout the user *should* do for all 12 weeks using only static data. User data is additive — it records what *actually* happened, overlaid on top of the prescription.

---

## 6. Entity Lifecycle

### 6.1 Prescription Entities (Static)
```
Exercise ──► Substitution
Block ──► Week ──► Day ──► ExercisePrescription
```
These exist at app launch. Never modified.

### 6.2 Session Lifecycle
```
WorkoutSession (status: in_progress)
  ├── ExerciseLog (logged as user completes each exercise)
  │    └── WorkoutSetLog (per set, weight + reps)
  └── CardioSession (optional, logged outside workout flow)
```
The WorkoutSession transitions: `in_progress → completed` (or `abandoned`). ExerciseLog and WorkoutSetLog are created during the session.

### 6.3 Periodic Tracking Lifecycle
```
BodyweightEntry ← logged as often as the user chooses
ProgressPhoto ← logged periodically (weeks/months apart)
CardioSession ← logged optionally on Day 3
```
These are independent of workout sessions.

### 6.4 Derived Lifecycle
```
WeightProgressionRecord ← queried from WorkoutSetLog (no direct persistence)
WeeklySummary ← queried from WorkoutSession + WorkoutSetLog (no direct persistence)
```
Computed on demand for the Progress screen.

---

## 7. Key Design Decisions

1. **Exercise identified by name**. Exercise names are canonical and unique across the program. Using the string name as the identity avoids requiring a separate ID system and makes the data model self-documenting.

2. **ExercisePrescription is derived, not stored**. Rather than storing 800+ individual prescription rows (12 weeks × 5 training days × average 5.5 exercises), the system computes the prescription for a given week-day-exercise from the canonical metadata + week number. This eliminates data duplication and ensures week-to-week consistency.

3. **WorkoutSession is a single training day**. A WorkoutSession corresponds to exactly one day_type in exactly one week. It does not span multiple days. If a user splits a workout across multiple calendar days (e.g. due to time constraints), that is represented as two separate sessions.

4. **Substitution is recorded per ExerciseLog**. When a user substitutes an exercise, the ExerciseLog stores the actual exercise name performed alongside the canonical prescription exercise name. This preserves the prescription context while accurately capturing what happened.

5. **SetLog boundaries are dictated by the prescription**. The number of WorkoutSetLog entries for a given ExerciseLog should match the prescription's `working_sets` for that week. If the user wants to do extra sets, those would be additional entries beyond the prescribed count (the app may optionally support this).

6. **Bodyweight is trend-based, not point-based**. The data model supports multiple entries per week so weekly averages can be computed. This aligns with the program's guidance to watch weekly trends rather than single weigh-ins.

7. **Progress photos are standalone**. Photos are not bound to a specific workout or week. Their timestamp provides the temporal context. The front/side/rear angle enum supports the program's recommendation of taking photos from three angles.

8. **CardioSession is contextually associated with Day 3 but not structurally linked**. Day 3 (OptionalCardioHIIT) has no ExercisePrescriptions. The CardioSession entity lives independently and is associated with a week only by the week_number field.

9. **SET 4 exists in the program's column headers but is never populated**. The data model supports up to 3 working sets (set_index 1–3). SET 4 is reserved for potential future program expansion and is not represented as a column in the current data model.

---

*Conceptual source of truth for TypeScript types, SQLite schema design, and application state architecture.*

---

## Permanent substitutions (app setting)

The `app_settings` key `preferred_substitutions` holds a JSON object mapping a prescribed exercise name to the substitute the user chose to use every time (for example `{"Smith Machine Squat": "DB Bulgarian Split Squat"}`). New workouts use the substitute in place of the prescribed exercise (the exercise log keeps the prescribed name and a substitution note). A saved substitute that is not one of the exercise's listed options for the current week is ignored (some exercises, e.g. Walking Lunge, list different substitutes in the Foundation and Ramping blocks, so a Foundation choice stops applying from Week 6). A one-time substitution only changes that workout's exercise log and never writes this setting.
