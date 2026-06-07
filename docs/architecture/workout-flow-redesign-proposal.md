# Workout Flow Redesign — Architecture Proposal

> **Author**: ArchitectUX  
> **Date**: 2026-06-02  
> **Status**: Architecture Proposal  
> **Target**: Workout modal flow overhaul (exercise logging hub, per-exercise rest timer, Beat the Logbook, warmup tracking)

---

## Table of Contents

1. [Navigation & Screen Structure](#1-navigation--screen-structure)
2. [Screen Ownership Changes](#2-screen-ownership-changes)
3. [Per-Exercise Rest Timer Design](#3-per-exercise-rest-timer-design)
4. [Set Logging Interaction Model](#4-set-logging-interaction-model)
5. [Substitution UX](#5-substitution-ux)
6. [Data Flow & State](#6-data-flow--state)
7. [Warmup Set Tracking](#7-warmup-set-tracking)
8. [Making It Real: Non-Stubbed Data](#8-making-it-real-non-stubbed-data)
9. [Implementation Plan](#9-implementation-plan)
10. [Migration Path](#10-migration-path)

---

## 1. Navigation & Screen Structure

### 1.1 Current Pain Points

| Pain Point | Root Cause |
|---|---|
| Exercise detail is a push from the list — feels like a sub-screen, not the primary logging surface | `[exerciseLogId]/index.tsx` is accessed via `router.push()` from the list footer |
| Rest timer interrupts after EVERY set | `rest.tsx` is navigated to in `handleLogSet()` after each set completion |
| Inline set input in list footer is redundant with detail screen | `workout/index.tsx` has both a list footer input panel AND a "View Detail" button |
| "Beat the Logbook" data is not visible during logging | `ProgressionSuggestion` is fetched but only shown as a badge on the exercise row |
| No warmup tracking — the prescribed range is invisible during logging | Warmup sets are in `ExercisePrescription` but never surfaced in the UI |
| Substitution UX is hidden behind a low-visibility "View Detail" button | The detail screen does have substitution logic but the UX path is unclear |

### 1.2 Proposed Route Tree

```
workout/                              ← Stack group (modal from root)
├── _layout.tsx                       ← Stack navigator (slide_from_bottom)
├── index.tsx                         ← ExerciseListScreen (table of contents, no inline logging)
├── [exerciseLogId]/
│   └── index.tsx                     ← ExerciseLogScreen (THE primary logging hub)
├── summary.tsx                       ← WorkoutSummaryScreen (unchanged anatomy)
└── pr-celebration.tsx                ← PrCelebrationScreen (unchanged anatomy)
```

**Removed screen:** `rest.tsx` — rest timer moves inline to `[exerciseLogId]/index.tsx`

### 1.3 User Flow

```
ExerciseListScreen
  │
  ├── User taps "Start Exercise" on a pending exercise
  │   ↓
  ├── ExerciseLogScreen ([exerciseLogId]/index)
  │   │
  │   ├── [Phase: ACTIVE]
  │   │   ├── Shows: demo video link, prescription, warmup range,
  │   │   │          Beat the Logbook data, set logging UI
  │   │   ├── User logs each working set (weight + reps + RPE)
  │   │   └── After each set → animation, next set auto-selected
  │   │
  │   ├── [Phase: SETS_COMPLETED → REST auto-starts]
  │   │   ├── All working sets logged → rest timer fires inline
  │   │   ├── Shows: countdown, "Next Exercise" card, +/-15s buttons
  │   │   ├── On expire → haptic + "Ready!" + option to continue
  │   │   └── "Skip" button returns to ExerciseListScreen immediately
  │   │
  │   └── [Phase: FINISHED]
  │       ├── Timer expires OR user skips
  │       └── router.back() → ExerciseListScreen
  │
  ├── All exercises completed
  │   ↓
  ├── "Complete Workout" button becomes enabled
  │   ↓
  ├── PrCelebrationScreen (if PRs detected)
  │   ↓
  └── WorkoutSummaryScreen → dismissAll()
```

### 1.4 Navigation Guarding

| Scenario | Protection |
|---|---|
| Back gesture on ExerciseLogScreen while sets are incomplete | ❌ Prevented — overwrite `headerLeft` with disabled back; alert "Abandon this exercise?" with confirm |
| Back gesture on ExerciseLogScreen during rest timer | ⚠️ Allowed — rest timer stops, return to list (sets are saved) |
| Tab bar access during workout | ✅ Modal presentation hides tab bar entirely |
| OS app background during logging | ✅ Session persists in SQLite; timer pauses via AppState listener (already implemented in `useRestTimer`) |
| Double-tap "Start Exercise" on same exercise | ❌ Prevented — exercise with status `active` or `completed` is not tappable |
| Complete workout while an exercise is partially logged | ✅ Alert: "You have incomplete sets — are you sure?" |

---

## 2. Screen Ownership Changes

### 2.1 Screen Data Map (Revised)

#### `workout/index` — ExerciseListScreen

| Category | Detail |
|---|---|
| **Role** | Exercise table of contents. Shows status of each exercise (pending/active/completed). Each row shows: exercise name, prescription summary (e.g. `2×10-12`), progression indicator, completion status. Tap row → navigate to ExerciseLogScreen. |
| **Owns** | ActiveSession state (hydrated from DB on mount). Elapsed time counter. Session progress stats. |
| **Reads** | `hydrateActiveSession(id)`, `getSessionProgress()`, `getElapsedMinutes()`, `computeTotalVolume()` |
| **Delegates** | `session-executor.completeSession()`, `session-executor.abandonSession()` |
| **Mutates** | Session status only (complete/abandon) — NOT individual sets |
| **Navigation** | Pushes `workout/[exerciseLogId]` when user taps "Start Exercise"; pushes `workout/pr-celebration` on complete |
| **Inline logging** | ❌ **Removed** — the bottom input panel with SetPill, RpeSelector, and "Log Set" button is deleted from this screen |

#### `workout/[exerciseLogId]/index` — ExerciseLogScreen (THE HUB)

| Category | Detail |
|---|---|
| **Role** | Single-exercise logging hub. The user enters exercise mode, sees all reference info, logs ALL working sets, then rests before returning to the list. This screen manages the exercise lifecycle: active → sets_completed → resting → finished. |
| **Owns** | Local state machine for exercise phase (`pending_active` → `logging` → `sets_completed` → `resting` → `finished`). Current set being edited. Rest timer state (via `useRestTimer`). Weight/reps/RPE input values. |
| **Reads** | `hydrateActiveSession()` (to get the exercise + all data). `getExerciseHistory()` / `getLastCompletedSessionForExercise()` for Beat the Logbook. `getProgressionSuggestions()` for the current exercise. Prescription from `ActiveExercise.prescription`. Demo video URL from `PROGRAM.exercises[]`. Substitution options from `getSubstitutionOptions()`. |
| **Delegates** | `session-executor.updateSet()` (per-set save). `session-executor.substituteExercise()` (if user swaps). |
| **Mutates** | Set logs (weight/reps/RPE per set). Exercise substitution (exerciseName + substitutionNote). **Exercise status** — sets `exerciseStatus` on the ActiveExercise (via a new `setExerciseStatus()` function or inline in DB). |
| **Route params** | `exerciseLogId: string` (required), `sessionId: string` (optional — can be read from DB) |
| **Back navigation** | On finish (rest completed or skipped): `router.back()`. On abandon during active logging: alert confirm → `router.back()`. |
| **New responsibilities** | Hosts inline rest timer. Hosts substitution UI. Hosts Beat the Logbook cards. Hosts warmup set toggle. |

#### `workout/summary` — WorkoutSummaryScreen

Unchanged from current architecture.

#### `workout/pr-celebration` — PrCelebrationScreen

Unchanged from current architecture.

#### `workout/rest` — Removed

The rest timer is now an **inline component** within `ExerciseLogScreen`. The `rest.tsx` file can be deleted after the inline rest timer component is built.

### 2.2 New Type Definitions

```typescript
// ============================================================
// types.ts — ADDITIONS
// ============================================================

/** Per-exercise lifecycle status within a session */
export type ExerciseStatus = 'pending' | 'active' | 'completed';

/** Per-exercise phase during logging on ExerciseLogScreen */
export type LoggingPhase =
  | 'intro'            // Exercise detail shown, no sets logged yet
  | 'logging'          // Actively logging working sets
  | 'sets_completed'   // All working sets done, rest about to auto-start
  | 'resting'          // Inter-exercise rest timer active
  | 'finished';        // Rest completed, ready to return to list

/** Extended ActiveSet with warmup flag */
export interface ActiveSet {
  setLogId: string;
  setIndex: number;
  weight: number;
  reps: number;
  loggedRpe: number | null;
  loggedAt: string | null;
  isWarmup: boolean;           // ← NEW: distinguishes warmup from working sets
  isComplete: boolean;         // ← NEW: derived flag (weight > 0 || reps > 0)
}

/** Extended ActiveExercise with lifecycle status */
export interface ActiveExercise {
  exerciseLogId: string;
  prescribedExerciseName: string;
  exerciseName: string;
  sortOrder: number;
  substitutionNote: string | null;
  prescription?: ExercisePrescription;
  sets: ActiveSet[];
  status: ExerciseStatus;      // ← NEW: 'pending' | 'active' | 'completed'
  warmupSets: ActiveSet[];     // ← NEW: logged warmup sets (optional)
}

/** Rich previous-session data for Beat the Logbook */
export interface ExerciseHistoryComparison {
  lastSession: {
    date: string;
    weekNumber: number;
    sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[];
  } | null;
  prs: {
    setIndex: number;
    weight: number;
    reps: number;
    previousBest: number | null;
  }[];
  progressionSuggestion: ProgressionSuggestion;
}
```

---

## 3. Per-Exercise Rest Timer Design

### 3.1 Design Decision: **Option A — Inline on ExerciseLogScreen**

**Chosen approach**: The rest timer lives as a **collapsible inline component** on `ExerciseLogScreen`. After the last working set is logged, the timer auto-starts inline (no navigation). The screen transitions to a rest-focused layout.

**Rationale:**
- Zero navigation latency — no screen push/pop between logging and resting
- User stays in context — they can still see the exercise name, video link, and logged sets
- The rest timer can show a "Next Exercise" preview card inline
- Removes the existing `rest.tsx` routing complexity (passing `exerciseLogId`, `sessionId`, `setIndex`, etc.)
- Eliminates the jarring screen switch that makes the current rest timer feel interruptive even before counting

### 3.2 Rest Timer Layout on ExerciseLogScreen

```
┌──────────────────────────────────────┐
│ ← Back to exercises                  │
│                                      │
│  [Exercise Name]                     │
│  3×10-12 · RESTING 2:15 ◉           │  ← timer badge in header area
│                                      │
│  ╔══════════════════════════════╗    │
│  ║        REST TIMER            ║    │
│  ║                              ║    │
│  ║       ┌────────────┐         ║    │
│  ║       │  2:15      │         ║    │
│  ║       │ remaining  │         ║    │
│  ║       └────────────┘         ║    │
│  ║    [−15s] [+15s] [+30s]     ║    │
│  ║                              ║    │
│  ║    [Skip Rest → Next Ex]     ║    │
│  ╚══════════════════════════════╝    │
│                                      │
│  ┌─── Up Next ──────────────────┐   │
│  │  💪 Incline DB Press         │   │
│  │  3×10-12 · RPE ~8, Last ~9  │   │
│  │  Last session: 30kg × 10,10 │   │
│  └──────────────────────────────┘   │
│                                      │
│  [✓] Set 1  35kg × 10  RPE 8        │
│  [✓] Set 2  35kg × 9   RPE 9        │
│  [✓] Set 3  35kg × 8   RPE 10       │
│                                      │
└──────────────────────────────────────┘
```

### 3.3 Rest Timer State Machine

```
ALL SETS LOGGED
     │
     ▼
[SetsCompleted phase]
     │
     ├── Timer auto-starts (useRestTimer with prescription.rest value)
     │
     ▼
[Resting phase]
     │
     ├── Timer counts down (inline display)
     ├── User can: skip, adjust +/-15s/30s
     │
     ├── Timer expires → haptic + "Ready!" + option to proceed
     ├── User taps "Skip" → immediate
     │
     ▼
[Finished phase]
     │
     ├── Screen auto-navigates back after 2s (or user taps)
     └── router.back() → ExerciseListScreen (next exercise highlighted)
```

### 3.4 Rest Timer Data Source

The rest period is read from the **completed exercise's prescription**, not a global/navigated param:

```typescript
// ExerciseLogScreen — rest timer initializes from prescription
const restSeconds = pres ? parseRestSeconds(pres.rest) : 90;
const timer = useRestTimer(restSeconds);
```

No route params needed for rest — the exercise owns its own rest period.

### 3.5 What Happens to `rest.tsx`?

The `rest.tsx` file is **deleted** after the inline implementation is complete. The `hooks/useRestTimer.ts` hook is **kept and reused** — it's well-designed with AppState handling and already has the API surface we need (`remaining`, `total`, `isExpired`, `start`, `stop`, `adjust`, `reset`).

---

## 4. Set Logging Interaction Model

### 4.1 Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Warmup sets: loggable? | **Yes, optional toggle** | Display prescribed range (e.g. "2-3 warmup sets"), user can optionally expand and log weight/reps. Warmup sets are saved with `isWarmup: true` and counted separately. |
| "Start Set" per set? | **No — free-form logging** | All working sets are visible as editable rows. User taps any pending set row to focus it, enters weight/reps/RPE, taps "Log Set". Next incomplete set auto-focuses. |
| Weight/reps/RPE: same screen or sub-flow? | **Same screen** | Weight stepper + reps input + RPE selector all visible without navigation. The current `ExerciseLogScreen` pattern (weight stepper card, RPE selector) is close but needs reps input. |
| Progression suggestion integration | **Inline card above set logging** | "Beat the Logbook" card shows last session's data. If at top of rep range, highlight "Ready to increase weight!". Suggestion is visible throughout logging. |
| Bulk set editing? | **Not in MVP** | Each set is logged individually to encourage deliberate tracking per the program philosophy. |
| Undo last set? | **Yes, via "Undo" button** | After logging a set, an "Undo" toast/button appears for 5s to revert the last `updateSet()` call. |

### 4.2 ExerciseLogScreen Layout (Logging Phase)

```
┌──────────────────────────────────────┐
│ ← Back to exercises                  │
│                                      │
│  [Exercise Name]                     │
│  3×10-12 · RPE ~8, Last ~9           │
│  [▶ Watch Demo]                      │
│                                      │
│  ┌── Beat the Logbook ──────────┐   │
│  │  Last time (Week 4):         │   │
│  │  Set 1: 30kg × 10            │   │
│  │  Set 2: 30kg × 9             │   │
│  │  Set 3: 30kg × 8             │   │
│  │  ─────────────────           │   │
│  │  🏆 PR: 35kg × 10 (Wk 6)    │   │
│  │  Suggestion: at rep range    │   │
│  │  top → increase weight!      │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌── Warmup ────────────────────┐   │
│  │  Prescribed: 2-3 warmup sets │   │
│  │  [Log warmup sets ▸]         │   │  ← collapsible
│  └──────────────────────────────┘   │
│                                      │
│  ┌── Working Sets ──────────────┐   │
│  │  ┌──────────────────────┐   │   │
│  │  │ SET 1 ◀ CURRENT      │   │   │  ← tappable to focus
│  │  │ 35.0 kg │ 10 reps    │   │   │
│  │  │ [−] 35.0 [+]          │   │   │
│  │  └──────────────────────┘   │   │
│  │  ┌──────────────────────┐   │   │
│  │  │ SET 2 — pending      │   │   │
│  │  └──────────────────────┘   │   │
│  │  ┌──────────────────────┐   │   │
│  │  │ SET 3 — pending      │   │   │
│  │  └──────────────────────┘   │   │
│  └──────────────────────────────┘   │
│                                      │
│  RPE: [6] [7] [8] [9●] [10]         │
│                                      │
│  [Log Set → SET 2]                   │
│                                      │
│  ┌── Substitution ──────────────┐   │
│  │  Not your exercise?          │   │
│  │  [Use Option 1: Incline DB]  │   │
│  │  [Use Option 2: Machine CP]  │   │
│  └──────────────────────────────┘   │
│                                      │
└──────────────────────────────────────┘
```

### 4.3 Set Input UX Details

**Weight input:**
- Stepper with +/-2.5kg (or +/-5lbs based on user preference)
- Direct tap to type number (opens numeric keyboard)
- Previous value from history pre-filled (0 if no history)

**Reps input:**
- Stepper with +/-1
- Direct tap to type
- Suggested value: previous set's reps (or history)
- Range validation against prescription rep range (visual indicator if outside)

**RPE selector:**
- 5-button pill (6–10) — current design is fine
- Pre-select from prescription target (e.g., `lastSetRpe` for last set)
- Highlight difference between early-set RPE and last-set RPE when logging

**Log Set button behavior:**
1. Validates weight > 0 and reps > 0
2. Calls `updateSet()` with weight, reps, loggedRpe
3. Invalidates cache
4. Re-hydrates session from DB
5. Animates set row to "completed" state
6. Focuses next incomplete set (or transitions to `sets_completed` phase)
7. Shows "Undo" toast for 5s

**On completing the last working set:**
1. Show brief celebration animation on the screen
2. After 1s delay, auto-start rest timer
3. Screen transitions to rest phase layout

---

## 5. Substitution UX

### 5.1 When Substitution UI is Visible

The substitution panel appears **at two points**:

| Point | Visibility | Behavior |
|---|---|---|
| **Before first set** (on entering ExerciseLogScreen) | **Prominent** — above or below Beat the Logbook card | Full substitution options with preview. Tapping a sub immediately switches and updates the screen. |
| **After some sets logged** | **Collapsed** — text link "Change exercise?" | Alert: "You've already logged X sets. Changing exercises will keep logged sets but future sets use the new exercise name." |

### 5.2 Substitution Card Design

```
┌── Not your exercise? ───────────┐
│                                  │
│  [A] Incline DB Press   ← Option 1 │
│      3×10-12 · RPE ~8, Last ~9   │
│                                  │
│  [B] Machine Chest Press ← Option 2 │
│      3×8-10 · RPE ~8, Last ~9    │
│                                  │
│  (Both equally valid per program)│
└──────────────────────────────────┘
```

### 5.3 Substitution Data Flow

```
User taps substitution option A
  → getSubstitutionTarget(prescribedExerciseName, 1)
  → session-executor.substituteExercise(session, exerciseLogId, 1)
    → updateExerciseLog(exerciseLogId, {
        exerciseName: target,
        substitutionNote: 'Substituted X → Y (slot 1)',
      })
    → invalidateCachedSession(session.id)
    → hydrateActiveSession(session.id)
  → Screen re-renders with new exerciseName + new prescription
  → Beat the Logbook re-fetches for the NEW exercise name
```

### 5.4 After Substitution

- `exerciseName` changes to the substituted exercise
- `prescribedExerciseName` stays the original (for program tracking)
- The prescription shown should reflect the **substituted exercise's** prescription (which is the same as the original per the program — substitutions are equivalent)
- Beat the Logbook data fetches against `exerciseName` (the actual performed exercise)
- Any previously logged sets keep their original data (weight/reps are still valid)

---

## 6. Data Flow & State

### 6.1 Per-Exercise Status Field

**New column on `exercise_logs`:**

```typescript
// drizzle-schema.ts — ADD to exerciseLogs
status: text('status', { enum: ['pending', 'active', 'completed'] })
  .notNull()
  .default('pending'),
```

**Rationale:**
- The session executor needs to know which exercise is currently active vs. completed
- The exercise list screen uses this to show correct affordances (Start Exercise vs. Done)
- App relaunch recovery: a session with `active` exercises should show "Resume" and navigate to the active exercise
- Prevents double-entry on the same exercise

### 6.2 ExerciseStatus Lifecycle

```
pending  ──(user taps "Start Exercise")──►  active
active   ──(all sets logged + rest done)──►  completed
active   ──(user abandons exercise)───────►  pending (sets preserved, status reset)
```

**Note:** The `ExerciseLogScreen`'s internal `LoggingPhase` is local state (not persisted). The persisted `status` field on `exercise_logs` only stores the coarse lifecycle. On navigation back to the list, we persist `completed` if all sets are done, or leave as `active` if the user backs out mid-exercise.

### 6.3 Session Executor — New Functions

```typescript
// session-executor.ts — ADDITIONS

/** Set the status of a single exercise within the session */
export async function setExerciseStatus(
  session: ActiveSession,
  exerciseLogId: string,
  status: ExerciseStatus,
): Promise<ActiveSession>;

/** Get the next incomplete exercise (for "Next Exercise" preview) */
export function getNextExercise(
  session: ActiveSession,
  currentExerciseLogId: string,
): ActiveExercise | null;

/** Get rich comparison data for Beat the Logbook */
export async function getExerciseHistoryComparison(
  exerciseName: string,
  repRange: string,
): Promise<ExerciseHistoryComparison>;

/** Log a warmup set */
export async function logWarmupSet(
  session: ActiveSession,
  exerciseLogId: string,
  data: { weight: number; reps: number; loggedRpe?: number | null },
): Promise<ActiveSession>;
```

### 6.4 Beat the Logbook Data Flow

```
User enters ExerciseLogScreen
  │
  ├── hydrateActiveSession() → get exercise + sets
  │
  ├── getExerciseHistoryComparison(exerciseName, repRange)
  │   ├── getExerciseHistory(exerciseName, 50) → last N session rows
  │   ├── Group by session → extract most recent session
  │   ├── Compute PRs (max volume per set across all history)
  │   ├── Compute progression suggestion (checkProgression)
  │   └── Return ExerciseHistoryComparison
  │
  └── Render Beat the Logbook card
```

### 6.5 Prefill from History — Revised

The current `prefillFromHistory()` prefills ALL sets with history data. This is correct but can be improved:

- Prefill weight from last session's corresponding set (setIndex 1 → last session's set 1)
- Prefill reps from last session (user can override)
- If last session had different number of working sets (e.g., Wk5 had 2 sets, Wk6 has 3 sets), only prefill matching indices
- Display the prefill source: "From last session (Week 5)"

### 6.6 Session Completion Flow — Revised

```
User taps "Complete Workout" on ExerciseListScreen
  │
  ├── Validate: any exercises still pending/active?
  │   ├── Yes → Alert: "X exercises not started. Complete anyway?"
  │   │         → "Complete" (abandoned those exercises)
  │   │         → "Cancel"
  │   └── No → proceed
  │
  ├── completeSession(session)
  │   ├── Update session status to 'completed'
  │   ├── Set completed_at timestamp
  │   └── Return updated session
  │
  ├── detectPersonalRecords(session)
  │   ├── Query exercise history for each exercise
  │   ├── Compare volumes → detect PRs
  │   └── Return PR list
  │
  ├── PRs detected?
  │   ├── Yes → router.push('/workout/pr-celebration')
  │   └── No  → router.push('/workout/summary')
  │
  └── Summary → router.dismissAll() → (tabs)/home
```

---

## 7. Warmup Set Tracking

### 7.1 Design Decision

**Yes, warmup sets should be optionally trackable**, but they are **not required** for session completion.

Rationale:
- The program prescribes warmup set ranges (e.g., "2–3 warmup sets") — having them visible reinforces good habits
- Some users want to log everything; optional logging respects both preferences
- Warmup sets are separate from working sets in all derived data (volume, progression, PRs)
- The program's tracking philosophy says "track everything" — warmup sets are part of the workout

### 7.2 Data Model Changes

```typescript
// SQLite schema — ADD column to workout_set_logs
isWarmup: integer('is_warmup').notNull().default(0),

// types.ts — ADD isWarmup to ActiveSet
// Already defined above in section 2.2
```

**Warmup sets are NOT counted in:**
- Session progress (completedSets / totalSets)
- Volume calculations for progression
- PR detection
- Session statistics (totalVolume)
- Double progression calculations

**Warmup sets ARE:**
- Stored in the database for the user's reference
- Displayed on the exercise detail screen (in a collapsed "Warmup" section)
- Displayed on the summary screen (optional section)
- Available for query on the progress screen (for users who want to see warmup volume trends)

### 7.3 Warmup Set UX on ExerciseLogScreen

```
┌── Warmup ───────────────────────────┐
│  Prescribed: 2-3 warmup sets        │
│                                      │
│  [Show warmup logging ▸]           │  ← tappable to expand
│                                      │
│  When expanded:                      │
│  ┌── WARMUP 1 ──────────────────┐   │
│  │  20.0 kg │ 8 reps            │   │
│  │  [−] 20.0 [+]  [−] 8 [+]   │   │
│  └──────────────────────────────┘   │
│  ┌── WARMUP 2 ──────────────────┐   │
│  │  25.0 kg │ 8 reps            │   │
│  │  [−] 25.0 [+]  [−] 8 [+]   │   │
│  └──────────────────────────────┘   │
│  [+ Add warmup set]                │
└──────────────────────────────────────┘
```

### 7.4 Warmup Set Initialization

Unlike working sets (which are pre-created during `initializeSession`), warmup sets are **created on demand** when the user opts to log them:

```typescript
export async function logWarmupSet(
  session: ActiveSession,
  exerciseLogId: string,
  data: { weight: number; reps: number; loggedRpe?: number | null },
): Promise<ActiveSession> {
  // Create a new set log entry with isWarmup = true
  // Warmup sets get their own setIndex (W1, W2, etc. or just sequential)
  // ...
}
```

This avoids creating unnecessary rows for users who skip warmup tracking.

---

## 8. Making It Real: Non-Stubbed Data

### 8.1 Audit of Stubbed vs. Real

| Feature | Current State | Real Implementation Needed |
|---|---|---|
| **Prescription engine** | `ExercisePrescription` is derived but values appear static for each exercise (same working_sets for all weeks that include the exercise) | Verify: prescription values for an exercise change week-over-week (e.g., working_sets goes 1→2→3). The `getPrescription()` lookup in session-executor uses `PROGRAM.weeks[weekNumber - 1]` which _should_ return correct per-week values. |
| **Exercise substitution** | Functional — `substituteExercise()` reads from `PROGRAM.substitutions`, writes to DB | Needs to also re-fetch prescription for the substituted exercise. Currently it only updates `exerciseName` — the prescription remains the original's because it was already hydrated. After substitution, re-hydrate with the new exercise's prescription. |
| **Double progression detection** | `checkProgression()` exists and works | Needs to integrate into the exercise detail screen as part of Beat the Logbook. Currently only shown as a badge on exercise rows. |
| **Beat the Logbook** | `getLastCompletedSessionForExercise()` exists but is not displayed during logging | New `ExerciseHistoryComparison` type + UI card needed on ExerciseLogScreen |
| **Warmup tracking** | Not implemented | New `isWarmup` column + UI + `logWarmupSet()` function |
| **Demo video URLs** | Exist in `Exercise.demoVideoUrl` in program data | Never surfaced in UI. ExerciseLogScreen needs a "▶ Watch Demo" link that opens YouTube/WebView. |
| **Exercise notes** | Exist in `Exercise.notes` | Never surfaced. Should appear in ExerciseLogScreen. |
| **Per-exercise status** | Not tracked | New `status` column on `exercise_logs` |
| **PR detection** | `detectPersonalRecords()` exists, used in `pr-celebration.tsx` | Needs to also show PRs inline during logging (Beat the Logbook card). |
| **Rest timer** | Separate screen navigated per-set | Inline on ExerciseLogScreen after all sets completed |
| **Session resume** | Reads `getActiveSession()` | After per-exercise status is added, resume should navigate directly to the `active` exercise (not the exercise list). |

### 8.2 High-Priority Changes for Production Readiness

1. **Prescription engine verification** — Add a test/assertion that `getPrescription(weekNumber, dayType, exerciseName)` returns the correct per-week values. The `PROGRAM.weeks` array has per-week exercise data, but we need to confirm each `ExercisePrescription` has week-appropriate `workingSets` and `repRange`.

2. **Substitution + prescription re-fetch** — After `substituteExercise()`, the re-hydrated session should show the **substituted exercise's prescription** (which is typically the same set/rep/RPE structure). Currently the `prescription` field on `ActiveExercise` comes from `getPrescription(prescribedExerciseName)` — this is correct because the substituted exercise has the same prescription as the original per program design. But verify this assumption.

3. **Exercise history query performance** — `getExerciseHistory()` joins across three tables. For Beat the Logbook, we need it per-exercise on entering the detail screen. The query is indexed on `exerciseName` and is synchronous (expo-sqlite). Should be fast (<5ms) for 50 rows.

4. **Route param integrity** — Current `handleLogSet` in `workout/index.tsx` reads `currentSetInfo.set` which can be null. The navigate-to-rest flow is fragile. After removing inline logging from the list, this entire code path is eliminated.

5. **Prescription type completeness** — `ExercisePrescription` has `earlySetRpe` and `lastSetRpe` but the UI currently only shows `lastSetRpe`. For Beat the Logbook and during logging, both should be visible.

### 8.3 What's Currently Stubbed vs. Real in Program Data

| Data | Real | Stubbed / Needs Work |
|---|---|---|
| Exercise list (52 exercises) | ✅ Fully populated in `PROGRAM.exercises` | — |
| Substitution options | ✅ Fully populated in `PROGRAM.substitutions` | — |
| Blocks, Weeks, Days structure | ✅ Full 12-week structure in `PROGRAM.weeks` | — |
| ExercisePrescription per week-day | ✅ Computed from program data | Verify week-over-week variation works correctly |
| Demo video URLs | ✅ Present in `Exercise.demoVideoUrl` | Not surfaced in UI |
| Exercise notes | ✅ Present in `Exercise.notes` | Not surfaced in UI |
| Per-exercise metadata (technique, warmup ranges, etc.) | ✅ Present | Warmup not surfaced |

### 8.4 Verification Checklist

Before considering the app production-ready:

- [ ] Prescription for exercise changes when week changes (e.g., Week 5 vs Week 7 for "Lat Pulldown")
- [ ] Substitution shows correct prescription for the target exercise
- [ ] Warmup sets do not affect progression calculations
- [ ] Session resume restores exercise status correctly
- [ ] "Complete Workout" block prevents incomplete exercises (with override)
- [ ] PR detection uses all historical data correctly
- [ ] Exercise history comparison shows the correct last session
- [ ] Timer correctly pauses/resumes on app background/foreground

---

## 9. Implementation Plan

### 9.1 Phase 1: ExerciseLogScreen as Logging Hub

| Step | Files Affected | Description |
|---|---|---|
| 1. Add `ExerciseHistoryComparison` type | `src/features/workout-session/types.ts` | New type for Beat the Logbook |
| 2. Add `getExerciseHistoryComparison()` | `src/features/workout-session/session-executor.ts` or new file `progression.ts` | Fetch + compute comparison data |
| 3. Rewrite `[exerciseLogId]/index.tsx` | `app/workout/[exerciseLogId]/index.tsx` | Full-screen exercise hub with phases: intro, logging, sets_completed, resting, finished |
| 4. Add Beat the Logbook card component | `components/workout/BeatTheLogbookCard.tsx` | Renders last session, PRs, progression suggestion |
| 5. Add inline rest timer component | `components/workout/InlineRestTimer.tsx` | Reuses `useRestTimer` hook, renders inline countdown + next exercise |
| 6. Add warmup set logging section | `components/workout/WarmupSection.tsx` | Collapsible warmup logging UI |
| 7. Update ExerciseListScreen to remove inline logging | `app/workout/index.tsx` | Delete bottom input panel, SetPill/RpeSelector usage; add "Start Exercise" buttons on each row |

### 9.2 Phase 2: State & Data Model

| Step | Files Affected | Description |
|---|---|---|
| 8. Add `status` column to `exercise_logs` | `src/db/migrations.ts`, `src/db/drizzle-schema.ts` | New column for per-exercise lifecycle |
| 9. Add `isWarmup` column to `workout_set_logs` | `src/db/migrations.ts`, `src/db/drizzle-schema.ts` | New column for warmup set tracking |
| 10. Add `setExerciseStatus()` | `src/features/workout-session/session-executor.ts` | Mutate exercise status in DB |
| 11. Add `logWarmupSet()` | `src/features/workout-session/session-executor.ts` | Create warmup set log |
| 12. Update `hydrateActiveSession()` | `src/features/workout-session/session-executor.ts` | Include exercise status + warmup sets in hydration |
| 13. Add migration for new columns | `src/db/migrations.ts` | Ensure existing data migrates cleanly |

### 9.3 Phase 3: Cleanup & Polish

| Step | Files Affected | Description |
|---|---|---|
| 14. Delete `rest.tsx` | `app/workout/rest.tsx` | Remove dead code after inline rest timer is live |
| 15. Update `workout/_layout.tsx` | `app/workout/_layout.tsx` | Remove `Stack.Screen name="rest"` |
| 16. Update session resume logic | `app/(tabs)/home/index.tsx` (if needed) | Resume should navigate to the active exercise if one exists |
| 17. Add "Complete Workout" validation | `app/workout/index.tsx` | Check all exercises completed before allowing finish |
| 18. Verify prescription engine | `src/data/program.ts` week-to-week variation | Spot-check weeks 1, 3, 6, 7 for changing working_sets |
| 19. Verify substitution re-fetch | `src/features/workout-session/session-executor.ts` | Ensure substituted exercise gets correct prescription in re-hydration |

### 9.4 File Structure After Changes

```
workout/
├── _layout.tsx                       ← Remove rest screen declaration
├── index.tsx                         ← Exercise list (revised, no inline logging)
├── [exerciseLogId]/
│   └── index.tsx                     ← Exercise logging hub (NEW: phases + rest inline)
├── summary.tsx                       ← Unchanged
└── pr-celebration.tsx                ← Unchanged

components/workout/
├── ExerciseRow.tsx                   ← Unchanged (but now has "Start Exercise" CTA)
├── SetLogList.tsx                    ← Revised (editable rows, not just display)
├── SetLogRow.tsx                     ← Revised (editable, weight/reps stepper)
├── RpeSelector.tsx                   ← Unchanged
├── BeatTheLogbookCard.tsx            ← NEW: last session, PRs, progression
├── InlineRestTimer.tsx               ← NEW: countdown + next exercise card
├── WarmupSection.tsx                 ← NEW: collapsible warmup logging
└── SubstitutionCard.tsx              ← NEW: exercise swap options
```

---

## 10. Migration Path

### 10.1 Breaking Changes

| Change | Impact | Migration |
|---|---|---|
| `rest.tsx` removal | Breaking for any existing deep links to `/workout/rest` | Deep links to rest are internal-only (via `router.push`), no external links. Safe to delete. |
| `exercise_logs.status` column | Existing sessions have `NULL` status | Migration sets `'active'` for sessions with `in_progress` status, `'completed'` for `completed` sessions. |
| `workout_set_logs.isWarmup` column | Existing sets have `NULL` → treated as `0` | Safe default. Migration sets `0` for all existing rows. |
| Inline logging removed from ExerciseListScreen | Existing habit of logging from the list | UX change — users must now tap into exercise detail. The list becomes a "table of contents" only. |

### 10.2 Rollback Strategy

Each phase is independently revertible:
- **Phase 1** (screen rewrite) — If the new ExerciseLogScreen has issues, revert to the old version. The ExerciseListScreen still works (just restore the old input panel).
- **Phase 2** (schema changes) — Column additions are additive; rollback means removing the columns and reverting the migration.
- **Phase 3** (cleanup) — Easy revert: restore `rest.tsx` and `_layout.tsx`.

### 10.3 Testing Focus Areas

| Area | What to Test |
|---|---|
| **Exercise lifecycle** | pending → active → completed transitions, status persistence across app restarts |
| **Rest timer inline** | Auto-start after last set, skip, adjust, expire, background/foreground |
| **Beat the Logbook** | First-time exercise (no history), existing history, PR detection |
| **Substitution** | Pre-logging sub, mid-logging sub, re-hydration after sub |
| **Warmup tracking** | Optional logging, warmup set creation, exclusion from stats |
| **Session resume** | Resume with active exercise, resume after exercise completed |
| **Complete workout** | All exercises done, partial completion, validation alerts |

---

## Appendix A: Redlined Changes to Types

```typescript
// ============================================================
// types.ts — COMPLETE REDLINE
// ============================================================

// ADDED
export type ExerciseStatus = 'pending' | 'active' | 'completed';

// MODIFIED — isComplete and isWarmup added
export interface ActiveSet {
  setLogId: string;
  setIndex: number;
  weight: number;
  reps: number;
  loggedRpe: number | null;
  loggedAt: string | null;
  isWarmup: boolean;        // NEW
  isComplete: boolean;      // NEW (true when weight > 0 || reps > 0)
}

// MODIFIED — status and warmupSets added
export interface ActiveExercise {
  exerciseLogId: string;
  prescribedExerciseName: string;
  exerciseName: string;
  sortOrder: number;
  substitutionNote: string | null;
  prescription?: ExercisePrescription;
  sets: ActiveSet[];
  status: ExerciseStatus;   // NEW
  warmupSets: ActiveSet[];  // NEW
}

// ADDED
export type LoggingPhase =
  | 'intro'
  | 'logging'
  | 'sets_completed'
  | 'resting'
  | 'finished';

// ADDED
export interface ExerciseHistoryComparison {
  lastSession: {
    date: string;
    weekNumber: number;
    sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[];
  } | null;
  prs: {
    setIndex: number;
    weight: number;
    reps: number;
    previousBest: number | null;
  }[];
  progressionSuggestion: ProgressionSuggestion;
}
```

## Appendix B: Key Implementation Notes

### B1. Rest Timer Inline Integration

The `useRestTimer` hook works as-is for the inline timer. Key difference: the timer is controlled by the `LoggingPhase` state machine rather than by navigation:

```typescript
// Inside ExerciseLogScreen
const [phase, setPhase] = useState<LoggingPhase>('intro');
const restSeconds = pres ? parseRestSeconds(pres.rest) : 90;
const timer = useRestTimer(restSeconds);

// When last set is logged
useEffect(() => {
  if (allSetsLogged && phase === 'logging') {
    setPhase('sets_completed');
    // Brief delay, then auto-start
    const timeout = setTimeout(() => {
      setPhase('resting');
      timer.start();
    }, 1000);
    return () => clearTimeout(timeout);
  }
}, [allSetsLogged, phase]);

// When timer expires
useEffect(() => {
  if (timer.isExpired && phase === 'resting') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('finished');
    // Auto-navigate back after 2s
    const timeout = setTimeout(() => router.back(), 2000);
    return () => clearTimeout(timeout);
  }
}, [timer.isExpired, phase]);
```

### B2. Beat the Logbook Data Fetching

Fetched once when entering the exercise detail screen:

```typescript
const [comparison, setComparison] = useState<ExerciseHistoryComparison | null>(null);

useEffect(() => {
  if (state.phase === 'intro' || state.phase === 'logging') {
    getExerciseHistoryComparison(exercise.exerciseName, pres?.repRange ?? '')
      .then(setComparison);
  }
}, [exercise.exerciseName]);
```

### B3. "Start Exercise" on the List

The exercise list screen (workout/index) becomes a pure overview:

```typescript
// Each ExerciseRow now shows a "Start Exercise" button when status is 'pending'
// Tap → router.push(`/workout/${exercise.exerciseLogId}`)

// ExerciseRow already has status-based styling (pending/active/done)
// We just change the tap behavior and remove inline input
```

The `findCurrentExercise()` and `findCurrentSet()` functions can be removed from `workout/index.tsx` since they were only used for the inline logging panel.
