# App Shell Architecture — Workout Companion

## 1. App Shell Architecture

### 1.1 Root Layout Responsibilities

The root `app/_layout.tsx` owns the outermost `Stack` navigator and is responsible for three sequential initialization phases:

**Phase 1 — Database initialization** (synchronous, runs before render completes):
- Open expo-sqlite connection (already done in `src/db/client.ts`)
- Run pending migrations via `src/db/migrations.ts:runMigrations()`
- This happens at module scope or inside a `useEffect` with a loading gate; once complete, the app can proceed

**Phase 2 — Program start date resolution** (synchronous, queries SQLite):
- Call `resolveCurrentSchedule()` from the session engine
- Returns `ScheduleResolution`: `onboarding`, `active`, or `programCompleted`
- This determines the initial route the user sees

**Phase 3 — Route gating**:
- If `onboarding` → redirect to onboarding flow
- If `active` → render main tab navigator
- If `programCompleted` → render completed state or allow restart

```
Root Stack
├── (onboarding)     — shown only when no program start date is set
├── (tabs)           — main app experience (requires active program)
└── workout          — active session, presented as modal over everything
```

### 1.2 Database Initialization and Migration Execution Point

DB initialization happens **once per app launch** before any meaningful screen renders. The pattern:

```tsx
// app/_layout.tsx (conceptual — not component code)
// 1. Open DB + run migrations at module level (synchronous with expo-sqlite)
// 2. Gate root layout render behind migration completion
// 3. After migrations, resolve schedule to determine initial route
```

Because expo-sqlite's `openDatabaseSync` and drizzle's `.run()` are synchronous, migrations can complete before the first React render. The root layout holds a `isReady` state (or renders `null` / a splash screen) until migrations finish.

Migration source: `src/db/migrations.ts` — applies pending versions sequentially.
DB client: `src/db/client.ts` — singleton `expoDb` wrapped by drizzle.

### 1.3 Program Start Date Resolution Point

Program start date is resolved at two points:

1. **App launch** (in root layout) — determines initial route destination
2. **Home screen** (on focus) — the home tab re-checks to stay current as weeks advance

The resolution happens via `resolveCurrentSchedule()` (from `src/features/workout-session/schedule.ts`), which reads from the `app_settings` table. No caching needed — the query is a single indexed key lookup (~microsecond).

### 1.4 Onboarding Gate Logic

```
resolveCurrentSchedule()
├── null start date   → ScheduleResolution.status === 'onboarding'
│                        → render (onboarding) group, tabs are inaccessible
├── start date set    → ScheduleResolution.status === 'active'
│                        → render (tabs) group, onboarding is inaccessible
├── week > 12         → ScheduleResolution.status === 'programCompleted'
│                        → render program completed screen or restart prompt
```

The gate is enforced at the root layout level using expo-router's `Redirect` component. No nested guards needed because the root layout is the single entry point.

### 1.5 Global Provider Boundaries

The provider tree is minimal:

```
<ThemeProvider>              ← from @react-navigation/native
  <RootLayout>              ← Stack navigator (expo-router)
    <OnboardingGroup />     ← or
    <TabsGroup />           ← or
    <WorkoutModal />        ← presented over current context
```

No auth provider. No global state provider. No API provider.

The only global concern is the **active session identity** (the session ID of any currently in-progress workout). This is resolved by querying the database (`getActiveSession()`) rather than holding it in React state — because it needs to survive app relaunch. Screens read the active session ID from the DB when they need it, not from a provider.

### 1.6 Startup Routing Behavior

```
User opens app
  ↓
Root layout mounts
  ↓
Run migrations (module-level sync)
  ↓
Resolve schedule
  ↓
┌──────────────────────────────────────────────┐
│  onboarding  →  Redirect to /onboarding      │
│  active      →  Redirect to /(tabs)/home     │
│  completed   →  Redirect to /completed       │
└──────────────────────────────────────────────┘
```

If an in-progress session exists (`getActiveSession()` returns a row), the UI should show a "Resume Workout" affordance on the home screen, but does **not** automatically navigate into the workout — the user explicitly taps to resume. This avoids disrupting the user's context on launch.

---

## 2. Navigation Structure

### 2.1 Full Route Tree

```
app/
├── _layout.tsx                           ← Root Stack
├── index.tsx                             ← Splash / redirect logic (Redirect to onboarding or tabs)
├── _sitemap.tsx                          ← Auto-generated (expo-router)
│
├── (onboarding)/                         ← Stack group (no tabs)
│   ├── _layout.tsx
│   ├── index.tsx                         ← Welcome / Get Started
│   └── set-start-date.tsx                ← Calendar picker to set program start
│
├── (tabs)/                               ← Main tab navigator
│   ├── _layout.tsx                       ← Tab configuration (2–3 tabs)
│   ├── home/
│   │   ├── _layout.tsx                   ← Stack for home tab
│   │   └── index.tsx                     ← Today's schedule card + Start Workout
│   ├── week/
│   │   ├── _layout.tsx                   ← Stack for week tab
│   │   └── index.tsx                     ← Week overview (all 7 days)
│   └── progress/
│       ├── _layout.tsx                   ← Stack for progress tab
│       └── index.tsx                     ← Weekly summaries, volume charts
│
├── workout/                              ← Stack group (presented as modal from root)
│   ├── _layout.tsx
│   ├── index.tsx                         ← Active workout main screen (exercise list)
│   ├── [exerciseLogId]/
│   │   └── index.tsx                     ← Per-exercise detail (set logging)
│   └── summary.tsx                       ← Session completed summary
│
└── completed.tsx                         ← Post-program-12 screen (program completed state)
```

### 2.2 Tab Structure (Minimal — Execution-Focused)

| Tab | Label | Icon | Purpose |
|-----|-------|------|---------|
| home | Today | house | See what today's training is, start/resume workout |
| week | Week | calendar | View current week's 7-day overview |
| progress | Progress | chart.bar | Adherence, volume history, progression data |

**Why 3 tabs**: The app is session-centric, not dashboard-heavy. The "Today" tab is the primary surface. Week view provides context for what's ahead. Progress is a single page of derived data.

### 2.3 Nested Stack Routes per Tab

**home/** stack:
| Route | Screen | Presentation |
|-------|--------|-------------|
| `home/index` | TodaySchedule | Default |
| `home/exercise-detail?name=X` | ExerciseDetail | Push (optional, if tapping an exercise from the home card) |

**week/** stack:
| Route | Screen | Presentation |
|-------|--------|-------------|
| `week/index` | WeekOverview | Default |

**progress/** stack:
| Route | Screen | Presentation |
|-------|--------|-------------|
| `progress/index` | ProgressDashboard | Default |

### 2.4 Modal Presentation Strategy

The active workout flow uses **modal presentation** from the root stack, not a tab. Rationale:

- The user should not be able to tap a tab bar and accidentally navigate away from an active workout
- The modal stack is presented above the tab navigator, covering it completely
- The tab bar is hidden during the workout
- When the workout is completed or abandoned, the modal dismisses and the user returns to the home tab

In expo-router v4:
```tsx
// app/_layout.tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
  <Stack.Screen name="workout" options={{ presentation: 'modal', headerShown: false }} />
  <Stack.Screen name="completed" options={{ presentation: 'modal', headerShown: false }} />
</Stack>
```

The `workout/` group internally uses a Stack for sub-navigation:
- `workout/index` — scrollable exercise list with set inputs
- `workout/[exerciseLogId]` — per-exercise detail (for substitution, technique video, focused set logging)
- `workout/summary` — post-completion stats (volume, PRs, duration)

### 2.5 Proposed File/Folder Layout Under app/

```
app/
  _layout.tsx                              ← Root stack + migration gate + schedule gate
  index.tsx                                ← Splash → redirect
  (onboarding)/
    _layout.tsx                            ← Stack for onboarding
    index.tsx                              ← Welcome screen
    set-start-date.tsx                     ← Set program start date
  (tabs)/
    _layout.tsx                            ← Tab bar (home, week, progress)
    home/
      _layout.tsx                          ← Stack for home
      index.tsx                            ← TodayScheduleScreen
    week/
      _layout.tsx                          ← Stack for week
      index.tsx                            ← WeekOverviewScreen
    progress/
      _layout.tsx                          ← Stack for progress
      index.tsx                            ← ProgressDashboardScreen
  workout/
    _layout.tsx                            ← Stack for workout flow
    index.tsx                              ← ActiveWorkoutScreen (exercise list)
    [exerciseLogId]/
      index.tsx                            ← ExerciseDetailScreen
    summary.tsx                            ← WorkoutSummaryScreen
  completed.tsx                            ← ProgramCompletedScreen
```

---

## 3. Screen Ownership

### 3.1 Screen Data Map

| Screen | Owns (local state) | Reads (from session engine / repos) | Mutates (via session engine / repos) | Receives via props |
|--------|-------------------|--------------------------------------|--------------------------------------|-------------------|
| **set-start-date** | Selected date (local useState) | — | `setProgramStartDate()` | None |
| **home/index (TodaySchedule)** | — | `resolveCurrentSchedule()`, `getActiveSession()`, `getSessionsForToday()`, `getSessionProgress()` | — | None |
| **home/exercise-detail** | — | `PROGRAM.exercises[name]`, `getExerciseHistory()` | — | `name` (route param) |
| **week/index** | — | `PROGRAM.weeks[weekNumber]`, `getSessionsByWeek()` | — | None (reads week from schedule) |
| **progress/index** | — | `getSessionsWithVolume()`, `getSessionCountByWeek()`, `getExerciseHistory()`, `getBodyweightWeeklyAverages()` | — | None |
| **workout/index (ActiveWorkout)** | ActiveSession in useState | `hydrateActiveSession()` on mount | `updateSet()`, `substituteExercise()`, `completeSession()`, `abandonSession()` | None (initializes from schedule) |
| **workout/[exerciseLogId]** | — | prescription from ActiveSession | `updateSet()`, `substituteExercise()` | `exerciseLogId` (route param) |
| **workout/summary** | — | `computeAllStatistics()`, `detectPersonalRecords()` | — | None (reads from last completed session) |
| **completed** | — | — | `clearProgramStartDate()` (to restart) | None |

### 3.2 What Each Screen Reads vs. Mutates

**Read-only screens** (no mutations):
- `home/index` — reads schedule, active session status
- `week/index` — reads program data + session summary
- `progress/index` — reads aggregated history
- `workout/summary` — reads computed stats
- `completed` — reads nothing meaningful

**Mutating screens** (writes to DB):
- `set-start-date` — writes program_start_date
- `workout/index` — writes set logs, session status
- `workout/[exerciseLogId]` — writes set logs, exercise substitutions

### 3.3 Prop vs. Self-Fetch Boundary

No props are passed between screens in the expo-router model. Each screen fetches its own data using:
- Session engine functions (`src/features/workout-session/`)
- Repository functions (`src/db/repositories/`)
- The `PROGRAM` constant (`src/data/program.ts`)

The **only cross-screen data** is:
- Route params (e.g., `exerciseLogId` in workout detail)
- The active session ID (read from DB, never passed as prop)

### 3.4 Session Engine Delegation

Screens delegate to the session engine for:

| Operation | Screen(s) | Engine Function |
|-----------|-----------|-----------------|
| Resolve schedule | home/index | `resolveCurrentSchedule()` |
| Create session | workout/index | `initializeSession()` |
| Log set data | workout/index, workout/[id] | `updateSet()` |
| Substitute exercise | workout/[id] | `substituteExercise()` |
| Complete session | workout/index | `completeSession()` |
| Abandon session | workout/index | `abandonSession()` |
| Get progress | workout/index | `getSessionProgress()` |
| Check progression | home/index, progress/index | `checkProgression()` |
| Compute stats | workout/summary | `computeAllStatistics()` |
| Detect PRs | workout/summary | `detectPersonalRecords()` |
| Substitution options | workout/[id] | `getSubstitutionOptions()` |

### 3.5 Repository Delegation

Screens delegate to repositories for:

| Operation | Screen(s) | Repository |
|-----------|-----------|------------|
| Get sessions by week | week/index | `sessions.getSessionsByWeek()` |
| Get sessions with volume | progress/index | `sessions.getSessionsWithVolume()` |
| Get adherence rate | progress/index | `sessions.getAdherenceRate()` |
| Get exercise history | progress/index | `exercises.getExerciseHistory()` |
| Get bodyweight data | progress/index | `bodyweight.getBodyweightWeeklyAverages()` |

---

## 4. Active Session Lifecycle

### 4.1 Session Persistence Across Navigation

The active session lives in SQLite (not in-memory React state). This means:

- Navigating between tabs **does not interrupt** an active workout — the session data remains intact in the DB
- The home screen reads `getActiveSession()` to show a "Resume Workout" button when appropriate
- The workout modal reads the session ID from route setup (just-initialized) or from `getActiveSession()` (resume)

**Flow:**
```
User taps "Start Workout" on home/index
  → initializeSession(weekNumber, dayType, dayPrescription)
  → navigates to workout/ (modal) with session ID
  → workout/index calls hydrateActiveSession(id) to get initial state
  → user logs sets → each mutation calls updateSet() + re-hydrates
  → session stays in DB throughout

User backgrounds app, gym session continues later:
  → app relaunches
  → home/index checks getActiveSession()
  → shows "Resume Workout" button
  → tapping resume navigates to workout/ modal
  → workout/index calls hydrateActiveSession(id)
```

### 4.2 Session Resume Behavior on App Relaunch

On every app launch (including cold start):
1. Root layout runs migrations (idempotent)
2. Home tab renders
3. Home screen calls `getActiveSession()` — returns any session with `status === 'in_progress'`
4. If found, show banner/card: "Resume your Upper workout from today"
5. User taps → navigate to `workout/` modal with session ID
6. `workout/index` calls `hydrateActiveSession(id)` → full state restored

The resume check uses the `getActiveSession()` repository function (filters by `status = 'in_progress'`, ordered by `startedAt DESC`, limit 1).

### 4.3 Protection from Navigation Interruption

The workout flow is presented as a **modal from the root stack**, not a tab. This provides:

- **Tab bar hidden** — user cannot accidentally tap a tab while logging sets
- **Cannot swipe back to home** — the modal must be explicitly dismissed (by completing or abandoning the workout)
- **OS-level interruptions** (phone call, app switch) — session persists in SQLite; resuming re-hydrates from DB
- **Navigation gestures do not close** — the workout modal is a stack with its own internal navigation; dismissing only happens programmatically

### 4.4 Modal vs. Stack Strategy for Active Workout Flow

```
Root Stack
├── (tabs)          ← regular tab navigation
└── workout         ← modal (covers full screen, tab bar hidden)
    ├── index       ← exercise list + set inputs (main surface)
    ├── [id]        ← exercise detail (video, substitution)
    └── summary     ← post-workout stats (dismiss button returns to home)
```

Why not push to a stack inside tabs:
- Tab bar would remain visible during the workout
- Back gesture could accidentally exit the workout
- The workout is a distinct mode, not a destination within a tab

Why modal instead of a separate route group:
- expo-router modal presentation (`presentation: 'modal'`) covers the screen and hides the navigator below
- The workout stack can be dismissed all at once when the session completes
- The modal relationship communicates "this is a temporary mode" vs. "this is a destination"

---

## 5. Route Responsibilities

### 5.1 Per-Route: Owns, Reads, Delegates, Mutates

#### `app/(onboarding)/index` — WelcomeScreen
| Category | Detail |
|----------|--------|
| **Owns** | None |
| **Reads** | `getProgramStartDate()` (to check if already set) |
| **Delegates** | None |
| **Mutates** | None |
| **Navigation** | Links to `set-start-date` screen |

#### `app/(onboarding)/set-start-date` — SetStartDateScreen
| Category | Detail |
|----------|--------|
| **Owns** | Selected date (local useState), calendar picker state |
| **Reads** | None |
| **Delegates** | `schedule.setProgramStartDate()` |
| **Mutates** | Writes `program_start_date` to `app_settings` table |
| **Navigation** | On save, `router.replace('/(tabs)/home')` (or root re-resolves and auto-redirects) |

#### `app/(tabs)/home/index` — TodayScheduleScreen
| Category | Detail |
|----------|--------|
| **Owns** | None (reads on every focus via `useFocusEffect`) |
| **Reads** | `resolveCurrentSchedule()`, `getActiveSession()`, `getSessionsForToday()`, `getSessionProgress()`, `getProgressionSuggestions()` |
| **Delegates** | No mutations — delegates to session engine only for reads |
| **Mutates** | None (no mutations from home) |
| **Navigation** | Links to `workout/` with session params; links to `home/exercise-detail` |

#### `app/(tabs)/week/index` — WeekOverviewScreen
| Category | Detail |
|----------|--------|
| **Owns** | None |
| **Reads** | `PROGRAM.weeks[currentWeek]`, `sessions.getSessionsByWeek()` |
| **Delegates** | `sessions` repository for week session data |
| **Mutates** | None |
| **Navigation** | None (single screen) |

#### `app/(tabs)/progress/index` — ProgressDashboardScreen
| Category | Detail |
|----------|--------|
| **Owns** | None |
| **Reads** | `sessions.getSessionsWithVolume()`, `sessions.getSessionCountByWeek()`, `exercises.getExerciseHistory()`, `bodyweight.getBodyweightWeeklyAverages()` |
| **Delegates** | All read operations go to repositories |
| **Mutates** | None |
| **Navigation** | None (single screen) |

#### `app/workout/index` — ActiveWorkoutScreen
| Category | Detail |
|----------|--------|
| **Owns** | ActiveSession state (useState, hydrated from DB on mount). Elapsed time timer (useEffect interval). |
| **Reads** | `hydrateActiveSession(id)`, `getSessionProgress()`, `getElapsedMinutes()` |
| **Delegates** | `session-initializer.initializeSession()` (on start), `session-executor.updateSet()`, `session-executor.completeSession()`, `session-executor.abandonSession()` |
| **Mutates** | Writes set logs, session status |
| **Navigation** | Pushes `workout/[exerciseLogId]` for detail; pushes `workout/summary` on completion |

#### `app/workout/[exerciseLogId]/index` — ExerciseDetailScreen
| Category | Detail |
|----------|--------|
| **Owns** | Current set focus (which set is being edited) |
| **Reads** | ActiveExercise from session (by route param `exerciseLogId`), `getSubstitutionOptions()` |
| **Delegates** | `session-executor.updateSet()`, `session-executor.substituteExercise()` |
| **Mutates** | Writes set weight/reps/RPE; writes substitution |
| **Navigation** | Pops back to parent `workout/index` on save |

#### `app/workout/summary` — WorkoutSummaryScreen
| Category | Detail |
|----------|--------|
| **Owns** | None |
| **Reads** | Last completed session (hydrated from DB after completion), `computeAllStatistics()`, `detectPersonalRecords()` |
| **Delegates** | `statistics` module for all computations |
| **Mutates** | None |
| **Navigation** | `router.dismissAll()` to return to `(tabs)/home` |

#### `app/completed` — ProgramCompletedScreen
| Category | Detail |
|----------|--------|
| **Owns** | None |
| **Reads** | `getSessionsWithVolume()` for final stats summary |
| **Delegates** | `schedule.clearProgramStartDate()` (to restart from week 1) |
| **Mutates** | Optionally clears start date to allow restart |
| **Navigation** | Dismisses to root which re-resolves to onboarding |

### 5.2 Session Flow vs. Non-Session Flow Boundary

```
NON-SESSION FLOW (tabs, no workout active)
  (onboarding) → set-start-date
  (tabs)/home  → (tabs)/week
               → (tabs)/progress
               → home/exercise-detail (optional peek)

SESSION FLOW (workout active, modal over tabs)
  workout/index → workout/[exerciseLogId] (per-exercise)
               → workout/summary (completion)
               → dismiss to (tabs)/home
```

The two flows never interleave. The session flow covers the full screen and hides the tab bar. The non-session flow includes the tab bar. The only bridge between them is the "Start Workout" / "Resume Workout" button on the home screen.

---

## 6. State Management Assessment

### 6.1 Per-Screen State Classification

| Screen | Local State | Lifted State | Shared Global State |
|--------|------------|--------------|-------------------|
| **set-start-date** | Selected date (useState) | None | None |
| **home/index** | None | None | None (all reads go to DB) |
| **week/index** | None | None | None |
| **progress/index** | None | None | None |
| **workout/index** | ActiveSession object (useState), elapsed time counter (useEffect/useState) | None | None |
| **workout/[exerciseLogId]** | Focused set index (useState) | None | None |
| **workout/summary** | None | None | None |
| **completed** | None | None | None |

### 6.2 State That Genuinely Crosses Screen Boundaries

The following data crosses screen boundaries and therefore requires some coordination:

| Data | Crosses | Current Proposal |
|------|---------|-----------------|
| Active session ID | workout/index → workout/[id] → workout/summary | Passed as route param `sessionId` or read from DB via `getActiveSession()` |
| Program start date | set-start-date → home/index | Persisted in `app_settings` table, read by any screen via `getProgramStartDate()` |
| Elapsed workout time | workout/index only | Local to the workout screen (useEffect interval) — destroyed on unmount. On resume, recomputed from `session.startedAt` |

**No data needs to cross between tabs.** Each tab is self-sufficient: it reads what it needs from SQLite repositories and computes rendered content locally.

### 6.3 Minimal Zustand Surface Recommendation

**Recommended: no Zustand stores for the MVP.**

Rationale:

1. **No persistent state crosses screen boundaries** — the active session ID is the only data that multiple screens need, and it's already persisted in SQLite (the DB is the single source of truth)
2. **Tab screens are read-only** — home, week, and progress screens all fetch data from repositories on mount/focus and render immediately. They never mutate shared state
3. **Workout flow is isolated** — the active session is local to the workout modal stack. The session ID is a route param or DB lookup, not global state
4. **Elapsed time is local** — only the workout screen cares about counting seconds; on app relaunch it recomputes from `startedAt`
5. **Adding Zustand adds coupling** — screens would need to import a store, subscribe to selectors, and coordinate dispatches. The DB-as-state pattern (read on mount, write on mutation) is simpler and survives app relaunch

**If Zustand is added later**, the boundary would be:
```typescript
// Store: activeSessionStore
// Holds: current ActiveSession | null (for instant reads during workout)
// Hydrates from: hydrateActiveSession() on app launch or session start
// Persists to: SQLite (source of truth)
// Purpose: avoid repeated DB reads during high-frequency set logging
```

This is a valid optimization for the workout screen where the user logs 20+ sets per session and re-renders after each input. But it is **not required for the MVP** — `hydrateActiveSession()` is a synchronous SQLite read that completes in <1ms.

**Conclusion:** Start with zero Zustand stores. If profiling shows the workout screen re-renders are perceptibly slow during rapid set logging (e.g., the user taps through 3 sets of 5 exercises), add a lightweight Zustand store scoped to the workout modal only.
