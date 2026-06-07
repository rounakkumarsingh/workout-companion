# PLAN: Workout Flow Redesign

## Overview

Three workstreams to align the app with the BTS Beginner Program:

- **A: Dynamic Exercises** — verify the prescription engine correctly derives week-appropriate exercises
- **B: Redesigned Logging Flow** — replace per-set inline logging + per-set rest timer with exercise-hub + per-exercise rest
- **C: Make It Real** — surface all exercise metadata (video, notes, warmup, progression data) that's currently buried

---

## A: Dynamic Exercises

**Status: mostly working already.** `PROGRAM.weeks[]` has per-week data (week1–week12). `getPrescription()` at `src/features/workout-session/session-executor.ts:16` reads `PROGRAM.weeks[weekNumber - 1]` and finds the correct exercise for that week/day. Each week's exercises have correct per-week `workingSets`, `repRange`, `technique`, `rpe`, etc.

### Verification checklist (blocking before B and C):

- [ ] Week 1 vs Week 3: `45° Incline Barbell Press` has `workingSets: 1` (W1) vs `workingSets: 2` (W3)
- [ ] Week 5 vs Week 6: exercises change (Foundation → Ramping block)
- [ ] Week 6 vs Week 7: `workingSets: 1` (deload) vs `workingSets: 2-3`
- [ ] `High-Cable Lateral Raise` appears in Upper AND Push days with different prescriptions
- [ ] `Standing Calf Raise` appears in Lower AND Legs with different prescriptions

No code changes needed — just validation.

---

## B: Redesigned Logging Flow

### B1: Before/After

| Aspect | Current (broken) | Proposed |
|--------|-----------------|----------|
| **Exercise list** | Has inline set logging footer + "View Detail" | Pure table of contents — tap row to enter exercise hub |
| **Exercise detail** | Push screen (detour) accessed via "View Detail" | THE primary logging surface — accessed by tapping a row |
| **Set logging** | Inline on list + separate detail screen | Free-form editable rows on the exercise hub |
| **Rest timer** | Per-set, separate screen (`rest.tsx`), navigated after each set | Per-exercise, separate screen, navigated after ALL sets of an exercise are done |
| **Warmup** | Not surfaced | Collapsible optional logging section on exercise hub |
| **Progression data** | Tiny badge on exercise row | Full "Beat the Logbook" card on exercise hub |
| **Demo video** | Not surfaced | "▶ Watch Demo" link on exercise hub |
| **Technique notes** | Not surfaced | Expandable section on exercise hub |
| **Substitution** | Hidden on detail screen | Prominent pre-logging cards on exercise hub |

### B2: Navigation Flow

```
ExerciseListScreen (workout/index)
  │  Tap any exercise row
  │   → router.push(`/workout/${exerciseLogId}`)
  │
  ▼
ExerciseLogScreen (workout/[exerciseLogId]/index)
  │
  │  Phase: INTRO → LOGGING
  │  Shows: warmup (collapsible), Beat the Logbook card,
  │         prescription targets, demo video, technique notes,
  │         substitution options, all working sets as editable rows
  │
  │  User fills sets freely (weight/reps/RPE)
  │
  │  Phase: ALL SETS LOGGED
  │    → "Exercise Complete" button becomes active
  │    → Tap → router.push(`/workout/rest?from=${exerciseLogId}`)
  │
  ▼
RestScreen (workout/rest — MODIFIED)
  │  Per-exercise rest timer (counts down from prescription.rest)
  │  Shows: last set summary, next exercise preview with last session data
  │  Timer expires / Skip → router.back()
  │
  ▼
ExerciseListScreen — next exercise highlighted, repeat
  │
  │  All exercises done → "Complete Workout" button
  │    → PrCelebrationScreen → WorkoutSummaryScreen → dismissAll()
```

### B3: ExerciseLogScreen Layout (THE HUB)

```
┌──────────────────────────────────────┐
│ ← Back to exercises                  │
│                                      │
│  [Exercise Name]                     │
│  3 × 10-12 · RPE ~8, Last ~9        │
│  [▶ Watch Demo]                      │
│                                      │
│  ┌── BEAT THE LOGBOOK ──────────┐   │
│  │  Last time (Week 4):         │   │
│  │  Set 1: 30kg × 10            │   │
│  │  Set 2: 30kg × 9             │   │
│  │  ─────────────────           │   │
│  │  ↑ Ready for weight inc.!    │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌── WARMUP ────────────────────┐   │
│  │  Prescribed: 2-3 warmup sets │   │
│  │  [Log warmup sets ▸]         │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌── WORKING SETS ──────────────┐   │
│  │  Set 1: [30] kg × [10] reps  │   │
│  │  Set 2: [__] kg × [__] reps  │   │
│  │  Set 3: [__] kg × [__] reps  │   │
│  │                              │   │
│  │  RPE: [6] [7] [8] [9] [10]  │   │
│  │  [Log Set]                   │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌── SUBSTITUTION ──────────────┐   │
│  │  Not your exercise?          │   │
│  │  [Option 1: Incline DB]      │   │
│  │  [Option 2: Machine CP]      │   │
│  └──────────────────────────────┘   │
│                                      │
│  [▶ Technique notes & form cues]     │
│                                      │
│  [Exercise Complete]                  │
└──────────────────────────────────────┘
```

### B4: Screen Ownership Changes

#### `workout/index` — ExerciseListScreen (HEAVILY MODIFIED)

| Aspect | Change |
|--------|--------|
| **Role** | Pure table of contents. Each row shows name, prescription summary, progression indicator, status badge. |
| **Inline set input** | ❌ **Removed entirely** — delete the bottom panel with SetPill, RpeSelector, "Log Set" button |
| **Tap behavior** | Tap ANYWHERE on an exercise row → `router.push(\`/workout/${exerciseLogId}\`)` |
| **Owns** | ActiveSession (hydrated), elapsed time |
| **Mutates** | Only `completeSession()` / `abandonSession()` — no set mutations |
| **Complete workout** | Button enables only when all exercises have status `completed` |
| **Remove dead code** | `findCurrentExercise()`, `findCurrentSet()` can be removed |

#### `workout/[exerciseLogId]/index` — ExerciseLogScreen (NEW HUB)

| Aspect | Detail |
|--------|--------|
| **Role** | Single-exercise logging hub with 5 phases: `intro → logging → sets_completed → resting → finished` |
| **Owns** | Logging phase state machine, current set focus, warmup collapsed/expanded |
| **Reads** | `hydrateActiveSession()`, `getExerciseHistoryComparison()`, `getLastCompletedSessionForExercise()`, `getProgressionSuggestions()`, `getSubstitutionOptions()` |
| **Mutates** | `updateSet()` per-set, `substituteExercise()` if user swaps, `logWarmupSet()` if opted |
| **New components** | `BeatTheLogbookCard`, `WarmupSection`, `SubstitutionCard`, `DemoVideoLink`, `TechniqueNotes` |
| **Navigation** | On "Exercise Complete" → `router.push('/workout/rest?fromExLogId=...')` |

#### `workout/rest` — RestScreen (MODIFIED)

| Aspect | Change |
|--------|--------|
| **Trigger** | After ALL sets of an exercise completed, not per-set |
| **Route params** | `fromExLogId: string` (which exercise just finished), `sessionId: string` |
| **Content addition** | "Next Exercise" preview card with last session data |
| **Back behavior** | On timer end/skip → `router.back()` to ExerciseListScreen (next exercise highlighted) |
| **Existing code** | Timer UI, haptics, adjust buttons stay. Remove per-set navigation logic. |

### B5: New Components

```
components/workout/
  BeatTheLogbookCard.tsx    — Last session data, PRs, progression suggestion
  WarmupSection.tsx         — Collapsible warmup logging (weight/reps)
  SubstitutionCard.tsx      — Two tappable option cards for exercise swap
  DemoVideoLink.tsx         — "▶ Watch Demo" that opens YouTube URL
  TechniqueNotes.tsx         — Expandable form cues from exercise metadata
```

### B6: Set Logging Interaction

- All working sets are pre-created during `initializeSession()` (as now) — no warmup sets created yet
- Each working set shows as an editable row with weight stepper (+/-2.5kg) + reps stepper (+/-1) + RPE selector
- User fills in any order, weight/reps prefilled from history (as now)
- "Log Set" button saves the currently focused set via `updateSet()`, moves to next incomplete set
- When ALL working sets have weight > 0 and reps > 0 → "Exercise Complete" button activates
- Warmup sets created on-demand via `logWarmupSet()` when user expands warmup section

---

## C: Making It Real

### C1: Surface Buried Exercise Metadata

| Metadata | Source | Current | Target |
|----------|--------|---------|--------|
| `demo_video_url` | `PROGRAM.exercises[name].demoVideoUrl` | ❌ Not surfaced | ✅ "▶ Watch Demo" link opens YouTube |
| `notes` | `PROGRAM.exercises[name].notes` | ❌ Not surfaced | ✅ Expandable technique section |
| `warmup_sets_min/max` | `ExercisePrescription` | ❌ Not surfaced | ✅ Warmup section shows prescribed range |
| `early_set_rpe` + `last_set_rpe` | `ExercisePrescription` | ⚠️ Only `lastSetRpe` shown | ✅ Show both inline with each set target |
| `exercise_history` | `getExerciseHistory()` query | ⚠️ Used for prefill only | ✅ Beat the Logbook card visible during logging |
| `progression_suggestion` | `checkProgression()` | ⚠️ Tiny badge on list | ✅ Prominent card on exercise hub |
| `substitution_options` | `getSubstitutionOptions()` | ⚠️ Hidden on detail | ✅ Pre-logging cards on exercise hub |

### C2: Beat the Logbook — New Type

```typescript
// src/features/workout-session/types.ts — ADD
export interface ExerciseHistoryComparison {
  lastSession: {
    date: string;
    weekNumber: number;
    sets: { setIndex: number; weight: number; reps: number; loggedRpe: number | null }[];
  } | null;
  prs: {
    weight: number;
    reps: number;
    previousBest: number | null;
  }[];
  progressionSuggestion: ProgressionSuggestion;
}
```

### C3: New Session Executor Functions

```typescript
// src/features/workout-session/session-executor.ts — ADD
getExerciseHistoryComparison(exerciseName, repRange): Promise<ExerciseHistoryComparison>
setExerciseStatus(session, exerciseLogId, status): Promise<ActiveSession>
getNextExercise(session, currentExerciseLogId): ActiveExercise | null
logWarmupSet(session, exerciseLogId, {weight, reps}): Promise<ActiveSession>
```

---

## Schema Changes

### New Columns

```typescript
// exercise_logs — ADD
status: text('status', { enum: ['pending', 'active', 'completed'] })
  .notNull().default('pending'),

// workout_set_logs — ADD  
isWarmup: integer('is_warmup').notNull().default(0),
```

### Migration v2

```
1. ALTER TABLE exercise_logs ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
2. ALTER TABLE workout_set_logs ADD COLUMN is_warmup INTEGER NOT NULL DEFAULT 0
3. UPDATE exercise_logs SET status = 'completed' WHERE id IN (
     SELECT exercise_logs.id FROM exercise_logs
     JOIN workout_set_logs ON exercise_logs.id = workout_set_logs.exercise_log_id
     WHERE workout_set_logs.weight > 0
   )
```

### Type Changes

```typescript
// ActiveSet — ADD
isWarmup: boolean;
isComplete: boolean;

// ActiveExercise — ADD  
status: ExerciseStatus;  // 'pending' | 'active' | 'completed'
warmupSets: ActiveSet[];
```

---

## File Change Checklist

### CREATE (5 new files)

| File | Purpose |
|------|---------|
| `components/workout/BeatTheLogbookCard.tsx` | Renders last session, PRs, progression suggestion |
| `components/workout/WarmupSection.tsx` | Collapsible warmup logging (weight/reps steppers) |
| `components/workout/SubstitutionCard.tsx` | Two tappable cards showing sub options |
| `components/workout/DemoVideoLink.tsx` | "▶ Watch Demo" link that opens YouTube |
| `components/workout/TechniqueNotes.tsx` | Expandable form cues from exercise metadata |

### MODIFY (11 existing files)

| File | What changes |
|------|--------------|
| `app/workout/index.tsx` | Remove inline logging panel (SetPill/RpeSelector/LogSet). Add progression badges on rows. Add tap-triggered nav to exercise hub. Add completion validation (all exercises must be done). |
| `app/workout/[exerciseLogId]/index.tsx` | **Major rewrite** into ExerciseLogScreen hub with 5 phases. Integrate all new components. Show free-form set rows. "Exercise Complete" CTA. |
| `app/workout/rest.tsx` | Trigger per-exercise (not per-set). Add `fromExLogId` param. Add "Next Exercise" preview card with last session data. |
| `src/features/workout-session/types.ts` | Add `ExerciseStatus`, `LoggingPhase`, `ExerciseHistoryComparison`. Extend `ActiveSet`/`ActiveExercise`. |
| `src/features/workout-session/session-executor.ts` | Add 4 new functions. Update `hydrateActiveSession()` for status + warmup. |
| `src/features/workout-session/progression.ts` | Add `getExerciseHistoryComparison()` (reuses existing helpers). |
| `src/db/drizzle-schema.ts` | Add `status` to `exerciseLogs`, `isWarmup` to `workoutSetLogs`. |
| `src/db/migrations.ts` | Add migration v2. |
| `src/db/repositories/exercises.ts` | Add `logWarmupSet()`, `updateExerciseStatus()`. |

### DELETE (none)

`rest.tsx` stays — it now serves per-exercise rest instead of per-set rest.

---

## Implementation Order

### Phase 1: Data Layer (schema + types + repos)

1. Add columns to `drizzle-schema.ts`
2. Create migration v2 in `migrations.ts`
3. Add new types to `types.ts`
4. Extend `ActiveSet` / `ActiveExercise`
5. Add repo functions (`logWarmupSet`, `updateExerciseStatus`)
6. Add session executor functions (`getExerciseHistoryComparison`, `setExerciseStatus`, `getNextExercise`, `logWarmupSet`)

### Phase 2: Exercise Hub Screen

7. Create `BeatTheLogbookCard` component
8. Create `WarmupSection` component
9. Create `SubstitutionCard` component
10. Create `DemoVideoLink` component
11. Create `TechniqueNotes` component
12. Rewrite `[exerciseLogId]/index.tsx` as the full ExerciseLogScreen hub

### Phase 3: Exercise List + Rest Timer

13. Modify `workout/index.tsx` — remove inline logging, add progression badges, activate completion validation
14. Modify `workout/rest.tsx` — per-exercise trigger, next exercise preview, `fromExLogId` param

### Phase 4: Verification

15. Verify prescription engine (spot-check weeks 1, 3, 6, 7 for correct workingSets)
16. Verify substitution re-fetch (Beat the Logbook correct after swap)
17. Verify session resume (resume with active exercise navigates correctly)
18. Test end-to-end flow (full workout: start → log sets → rest → complete → summary)
