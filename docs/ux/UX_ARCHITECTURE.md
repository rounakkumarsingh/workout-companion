# UX Architecture & Implementation Specification

Derived from `docs/ux/mockup.html`. Aligned with `docs/PROJECT_CONTEXT.md`, `docs/architecture/app-shell.md`, and `docs/domain/data-model.md`.

---

## 1. Component Architecture

### 1.1 Screen Inventory (7 Screens from Mockup)

| # | Screen ID | Route (expo-router) | Purpose |
|---|-----------|---------------------|---------|
| 1 | Today | `workout/index` | Active workout dashboard: progress ring, stats, exercise list, quick-set |
| 2 | Rest Timer | `workout/rest` | Countdown timer between sets |
| 3 | Exercise Detail | `workout/[exerciseLogId]` | Weight input, set-by-set log, RPE selector |
| 4 | Workout Complete | `workout/summary` | Post-workout stats, streak, completed exercises |
| 5 | History | `(tabs)/progress` | Past sessions grouped by month |
| 6 | Weekly Plan | `(tabs)/week` | 7-day overview with exercise chips |
| 7 | Rest Day (empty) | `(tabs)/home` (rest day) | Recovery day informational state |

### 1.2 Component Tree

```
<AppShell>
  <TabNavigator>
    <TodayScreen>                           // (tabs)/home/index
      <ScreenHeader subtitle="Monday · Week 4" title="Push Day A" />
      <StreakBadge count={12} />
      <ProgressRing percent={0.65} />
      <StatRow sets="4/6" elapsed="42m" kcal="4.2k" />
      <WeekStrip days={DayStatus[]} />
      <SectionLabel>Exercises</SectionLabel>
      <ExerciseList>
        <ExerciseRow status="done" icon="🏋️" name="Bench Press" spec="4×8 · 80kg" />
        <ExerciseRow status="active" icon="🔁" name="Incline Dumbbell" spec="3×12 · 24kg" />
        <ExerciseRow status="pending" icon="📐" name="Tricep Pushdown" spec="3×15 · Cable" />
      </ExerciseList>
      <QuickSets currentExercise="Incline Dumbbell" sets={SetPill[]} />
      <CtaButton label="Log Set → Rest Timer" />
      <GhostButton label="View Exercise Detail" />
    </TodayScreen>

    <WeekScreen>                            // (tabs)/week/index
      <ScreenHeader subtitle="Your Programme" title="Weekly Plan" />
      <DayCardList>
        <DayCard day="MON" name="Push Day A" exercises={4} chips={string[]} />
        <DayCard day="TUE" name="Legs Day" exercises={5} chips={string[]} />
        <RestDayCard day="THU" />
      </DayCardList>
    </WeekScreen>

    <ProgressScreen>                        // (tabs)/progress/index
      <ScreenHeader subtitle="Your Log" title="History" />
      <MonthSection label="May 2026">
        <SessionRow date={30} day="Fri" name="Push Day A" meta="58min · 18 sets" />
        <SessionRow date={28} day="Wed" name="Pull Day" meta="52min · 16 sets" />
      </MonthSection>
    </ProgressScreen>
  </TabNavigator>

  <WorkoutModal>                            // modal from root
    <RestTimerScreen>                       // workout/rest
      <RestHeader context="After Set 2 · Incline Dumbbell" />
      <CountdownRing seconds={84} total={120} />
      <UpNextCard exercise="Incline Dumbbell" set={3} reps={12} weight="24kg" />
      <TimerAdjustRow />
      <CtaButton label="Skip Rest → Start Set" />
    </RestTimerScreen>

    <ExerciseDetailScreen>                  // workout/[exerciseLogId]
      <DetailHeader exercise="Incline Dumbbell" type="CHEST · COMPOUND · 3 SETS" />
      <WeightInput value={24} unit="kg" step={2.5} />
      <SectionLabel>Set Log</SectionLabel>
      <SetLogList>
        <SetRow index={1} reps={12} weight={24} status="done" />
        <SetRow index={2} reps={12} weight={24} status="done" />
        <SetRow index={3} reps={12} weight={24} status="current" />
      </SetLogList>
      <RpeSelector selected={8} />
      <PreviousBest previous="3×12 @ 24kg · RPE 8" />
      <CtaButton label="Complete Set → Rest" />
      <GhostButton label="Finish Workout Early" />
    </ExerciseDetailScreen>

    <SummaryScreen>                         // workout/summary
      <CompleteHero title="Session Done" subtitle="Push Day A · Friday 30 May" />
      <SummaryStats duration={58} streak={13} sets={18} kcal={5.8} />
      <StreakBanner count={13} />
      <SectionLabel>Exercises Completed</SectionLabel>
      <CompletedExerciseList>
        <CompletedExerciseRow icon="🏋️" name="Bench Press" detail="4×8 · 80kg" />
      </CompletedExerciseList>
      <CtaButton label="Back to Home" />
    </SummaryScreen>
  </WorkoutModal>

  <RestDayScreen>                           // (tabs)/home/index (variation)
    <ScreenHeader subtitle="Thursday" title="Rest Day" />
    <EmptyState icon="😴" title="Recovery Day" subtitle="No training today..." />
    <GhostButton label="View Full Plan" />
  </RestDayScreen>
</AppShell>
```

### 1.3 Shared Component Specs

**ProgressRing**
- Props: `percent: number` (0–1), `size?: number` (default 160), `innerColor?: string`, `outerColor?: string`
- Renders two concentric SVG arcs: outer green (session progress), inner gold (today's exercises)
- Center slot for percentage text + label
- Local state: none (pure presentational)

**ExerciseRow**
- Props: `name: string`, `spec: string`, `icon: string`, `status: 'pending' | 'active' | 'done'`
- Renders icon container, name+spec, check circle
- On press: navigates to `workout/[exerciseLogId]`

**SetRow / SetPill**
- `SetRow`: used in Exercise Detail — shows set number, reps, weight, checkmark
- `SetPill`: used in Today quick-set strip — compact pill showing set status
- Shared props: `index: number`, `status: 'pending' | 'current' | 'done'`

**CtaButton / GhostButton**
- `CtaButton`: gold filled, full-width, uppercase, heavy weight — primary action
- `GhostButton`: transparent with subtle border — secondary action
- Shared: `label: string`, `onPress: () => void`, `disabled?: boolean`

**WeightInput**
- Props: `value: number`, `unit: string`, `step: number`, `onChange: (v: number) => void`
- Local state: `editing: boolean` (could allow direct text input on tap)
- Renders − / value / + with monospace display

**RpeSelector**
- Props: `selected: number | null`, `onSelect: (rpe: number) => void`
- Renders 5 buttons (6–10), selected state with gold border on chosen value

**StreakBanner**
- Props: `count: number`, `nextSessionLabel?: string`
- Renders gold-bordered banner with streak number and encouragement text

---

## 2. Application State

### 2.1 State Classification

| Category | Definition | Persistence |
|----------|------------|-------------|
| **Global persistent** | Survives app restart, shared across screens | SQLite |
| **Session scope** | Lives for duration of workout modal, survives tab switches | SQLite + in-memory hydration |
| **Derived** | Computed from global/session state, never stored | Computed on read |
| **Ephemeral UI** | Component-local, destroyed on unmount | React useState |

### 2.2 Global Persistent State (SQLite)

```typescript
// app_settings table
interface AppSettings {
  programStartDate: string;       // ISO date — set once during onboarding
}

// workout_sessions table
interface WorkoutSessionRecord {
  id: string;                     // UUID
  weekNumber: number;             // 1–12
  dayType: DayType;               // 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs'
  startedAt: string;              // ISO datetime
  completedAt: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  durationMinutes: number | null; // computed on completion
}

// exercise_logs table
interface ExerciseLogRecord {
  id: string;                     // UUID
  workoutSessionId: string;       // FK → workout_sessions
  exerciseName: string;
  sortOrder: number;
  substitutedFrom: string | null;
}

// workout_set_logs table
interface WorkoutSetLogRecord {
  id: string;
  exerciseLogId: string;          // FK → exercise_logs
  setIndex: number;               // 1, 2, 3
  weight: number;
  reps: number;
  loggedRpe: number | null;
  loggedAt: string;
}
```

### 2.3 Session Scope State (Hydrated on Workout Start)

```typescript
interface ActiveSession {
  // Identity
  id: string;
  weekNumber: number;
  dayType: DayType;
  startedAt: Date;

  // Derived program data (read from PROGRAM constant at session init)
  prescription: ExercisePrescription[];  // ordered exercises for today

  // Execution state
  exercises: ActiveExercise[];
  status: 'in_progress' | 'completed' | 'abandoned';
}

interface ActiveExercise {
  logId: string;                  // FK to exercise_logs
  exerciseName: string;
  sortOrder: number;
  prescribedSets: number;         // from prescription (1, 2, or 3)
  sets: LoggedSet[];
}

interface LoggedSet {
  setIndex: number;
  weight: number;
  reps: number;
  rpe: number | null;
  status: 'pending' | 'completed';
}
```

### 2.4 Derived State (Computed, Never Stored)

```typescript
interface SessionProgress {
  completedSets: number;
  totalSets: number;
  completedExercises: number;
  totalExercises: number;
  percentComplete: number;        // 0–1
  elapsedMinutes: number;         // computed from startedAt
}

interface WorkoutSummary {
  durationMinutes: number;
  totalSets: number;
  totalVolume: number;            // Σ(weight × reps)
  estimatedKcal: number;
  newStreak: number;
  exercisesCompleted: number;
  personalRecords: PRDetection[];
}

interface PRDetection {
  exerciseName: string;
  type: 'weight' | 'volume' | 'reps';
  previous: string;
  current: string;
}

interface DayStatus {
  dayIndex: number;               // 0–6 (Mon–Sun)
  label: string;                  // 'M', 'T', 'W', ...
  status: 'done' | 'today' | 'rest' | 'upcoming' | 'missed';
}
```

### 2.5 Ephemeral UI State

```typescript
// RestTimerScreen — local state
interface RestTimerState {
  remainingSeconds: number;
  totalSeconds: number;           // from prescription's rest period
  isRunning: boolean;
  // Derived: displayTime (MM:SS), arcOffset (SVG dash offset)
}

// ExerciseDetailScreen — local state
interface ExerciseDetailUIState {
  editingWeight: boolean;         // whether user is actively adjusting
  weightDraft: number;            // uncommitted weight value
  selectedRpe: number | null;
  focusedSetIndex: number | null; // for inline rep editing
}

// ActiveWorkoutScreen — local state
interface WorkoutUIState {
  isTimerExpanded: boolean;       // rest timer overlay collapsed/expanded
  showFinishConfirmation: boolean; // confirm "finish early" dialog
}
```

### 2.6 State Location Map

| State | Location | Why |
|-------|----------|-----|
| `programStartDate` | SQLite `app_settings` | Must survive restart |
| `WorkoutSessionRecord` | SQLite | Survives crash, enables resume |
| `ExerciseLogRecord` + `WorkoutSetLogRecord` | SQLite | Permanent tracking data |
| `ActiveSession` (hydrated) | `useState` in `workout/index` | Re-renders on set log; re-hydrates from SQLite on mount |
| `remainingSeconds` | `useState` + `useEffect` interval in rest timer | Ephemeral countdown, destroyed on unmount |
| `selectedRpe` | `useState` in ExerciseDetail | Per-exercise UI choice, not persisted per-set |
| `editingWeight` | `useState` in WeightInput | Transient focus state |
| `percentComplete` | Computed (`completedSets / totalSets`) | Pure function of logged sets |
| `DayStatus[]` | Computed from `sessions.getSessionsByWeek()` | Queried on screen focus |
| `WorkoutSummary` | Computed on session completion | Derived from logs + prescription |

---

## 3. Hardcoded Workout Data Model

### 3.1 Program Constant Structure

```typescript
// src/data/program.ts — bundled, never modified at runtime

type DayType = 'Upper' | 'Lower' | 'Pull' | 'Push' | 'Legs';
type DayFocus = 'StrengthFocus' | 'HypertrophyFocus';

interface ProgramDay {
  dayType: DayType;
  dayFocus: DayFocus;
  exercises: ProgramExercise[];
}

interface ProgramExercise {
  name: string;
  icon: string;                     // emoji reference key
  targetMuscle: string;
  movementPattern: string;          // 'compound' | 'isolation'
  substitutionOptions: string[];    // exercise names — 0–2 alternatives

  // Per-week prescription values (weekRanges define which weeks apply)
  weekRanges: WeekRangePrescription[];
}

interface WeekRangePrescription {
  weekStart: number;                // inclusive
  weekEnd: number;                  // inclusive
  workingSets: number;              // 1, 2, or 3
  repRangeMin: number;
  repRangeMax: number;
  earlySetRpe: string | null;       // null when workingSets === 1
  lastSetRpe: string;
  restSeconds: number;              // e.g. 120
  technique: 'normal' | 'failure';
}
```

### 3.2 Example Hardcoded Data

```typescript
const PROGRAM: ProgramBlock[] = [
  {
    name: 'Foundation',
    weekStart: 1,
    weekEnd: 5,
  },
  {
    name: 'Ramping',
    weekStart: 6,
    weekEnd: 12,
  },
];

const PUSH_DAY_A: ProgramDay = {
  dayType: 'Push',
  dayFocus: 'HypertrophyFocus',
  exercises: [
    {
      name: 'Bench Press',
      icon: '🏋️',
      targetMuscle: 'Chest',
      movementPattern: 'compound',
      substitutionOptions: ['Dumbbell Bench Press'],
      weekRanges: [
        { weekStart: 1, weekEnd: 2, workingSets: 1, repRangeMin: 8, repRangeMax: 10, earlySetRpe: null, lastSetRpe: '~7', restSeconds: 120, technique: 'normal' },
        { weekStart: 3, weekEnd: 5, workingSets: 2, repRangeMin: 8, repRangeMax: 10, earlySetRpe: '~7', lastSetRpe: '~7-8', restSeconds: 120, technique: 'normal' },
        { weekStart: 6, weekEnd: 6, workingSets: 1, repRangeMin: 8, repRangeMax: 10, earlySetRpe: null, lastSetRpe: '~6-7', restSeconds: 120, technique: 'normal' },
        { weekStart: 7, weekEnd: 12, workingSets: 3, repRangeMin: 8, repRangeMax: 10, earlySetRpe: '~7-8', lastSetRpe: '9-10', restSeconds: 120, technique: 'failure' },
      ],
    },
    {
      name: 'Overhead Press',
      icon: '💪',
      targetMuscle: 'Shoulders',
      movementPattern: 'compound',
      substitutionOptions: ['Seated Dumbbell Press'],
      weekRanges: [
        { weekStart: 1, weekEnd: 2, workingSets: 1, repRangeMin: 10, repRangeMax: 12, earlySetRpe: null, lastSetRpe: '~7', restSeconds: 90, technique: 'normal' },
        { weekStart: 3, weekEnd: 5, workingSets: 2, repRangeMin: 10, repRangeMax: 12, earlySetRpe: '~7', lastSetRpe: '~7-8', restSeconds: 90, technique: 'normal' },
        { weekStart: 6, weekEnd: 6, workingSets: 1, repRangeMin: 10, repRangeMax: 12, earlySetRpe: null, lastSetRpe: '~6-7', restSeconds: 90, technique: 'normal' },
        { weekStart: 7, weekEnd: 12, workingSets: 3, repRangeMin: 10, repRangeMax: 12, earlySetRpe: '~7-8', lastSetRpe: '9-10', restSeconds: 90, technique: 'failure' },
      ],
    },
    {
      name: 'Incline Dumbbell Press',
      icon: '🔁',
      targetMuscle: 'Upper Chest',
      movementPattern: 'compound',
      substitutionOptions: ['Incline Barbell Press'],
      weekRanges: [
        { weekStart: 1, weekEnd: 2, workingSets: 1, repRangeMin: 12, repRangeMax: 15, earlySetRpe: null, lastSetRpe: '~7', restSeconds: 90, technique: 'normal' },
        { weekStart: 3, weekEnd: 5, workingSets: 2, repRangeMin: 12, repRangeMax: 15, earlySetRpe: '~7', lastSetRpe: '~7-8', restSeconds: 90, technique: 'normal' },
        { weekStart: 6, weekEnd: 6, workingSets: 1, repRangeMin: 12, repRangeMax: 15, earlySetRpe: null, lastSetRpe: '~6-7', restSeconds: 90, technique: 'normal' },
        { weekStart: 7, weekEnd: 12, workingSets: 3, repRangeMin: 12, repRangeMax: 15, earlySetRpe: '~7-8', lastSetRpe: '9-10', restSeconds: 90, technique: 'failure' },
      ],
    },
  ],
};

// Weekly rotation — fixed 7-day schedule
const WEEKLY_ROTATION: DayType[] = [
  'Upper',              // Monday
  'Lower',              // Tuesday
  'Pull',               // Wednesday
  'Push',               // Thursday
  'Legs',               // Friday
  'Upper',              // Saturday  (secondary week — B variant)
  'Lower',              // Sunday
];

// Prescription resolver (runtime):
function getDayPrescription(weekNumber: number, dayType: DayType): ProgramDay {
  // 1. Look up the ProgramDay for dayType in PROGRAM constant
  // 2. For each exercise, find the matching weekRange
  //    where weekRange.weekStart <= weekNumber <= weekRange.weekEnd
  // 3. Return resolved prescription with concrete values
}
```

### 3.3 Progression Metadata

```typescript
interface ProgressionSuggestion {
  exerciseName: string;
  status: 'ready_to_increase' | 'work_on_reps' | 'new_exercise';
  message: string;
  // "ready_to_increase" — all sets hit top of rep range, add 2.5kg next session
  // "work_on_reps" — still building reps within range, target N more reps
}
```

---

## 4. User Flow + State Transitions

### 4.1 Flow Diagram

```
[Home Screen — Training Day]
  │
  ├── Tap "Start Workout"
  │   → initializeSession(weekNumber, dayType)
  │   → insert WorkoutSession (status: in_progress)
  │   → insert ExerciseLog rows for each prescribed exercise
  │   → navigate to workout/index (modal)
  │   → hydrate ActiveSession from DB
  │   → elapsed timer starts
  │
  ├── [Workout Screen]
  │   │
  │   ├── Exercise list shows all exercises with status:
  │   │   • done (green) — all sets logged
  │   │   • active (gold) — current exercise, partial sets
  │   │   • pending (dim) — not yet started
  │   │
  │   ├── Quick-set pills show per-exercise set progress
  │   │
  │   ├── Tap exercise row → navigate to workout/[exerciseLogId]
  │   │
  │   ├── Tap "Log Set → Rest Timer"
  │   │   → create WorkoutSetLog (weight, reps, RPE from current exercise)
  │   │   → navigate to workout/rest
  │   │   → start rest timer (duration from prescription)
  │   │
  │   └── Tap "View Exercise Detail" → workout/[exerciseLogId]
  │
  ├── [Exercise Detail Screen]
  │   │
  │   ├── WeightInput: −/+ buttons adjust working weight
  │   │   • weightDraft stored locally; committed on set log
  │   │
  │   ├── SetLog: scrollable rows for each prescribed set
  │   │   • Current set highlighted (gold)
  │   │   • Done sets show checkmark + logged reps/weight
  │   │
  │   ├── RPE: select before completing set
  │   │
  │   ├── "Complete Set → Rest" button
  │   │   → inserts WorkoutSetLog with { weight, reps, rpe }
  │   │   → marks set as completed
  │   │   → if more sets remain → navigate to rest timer
  │   │   → if all sets completed → mark exercise done, pop back to workout/index
  │   │
  │   └── "Finish Workout Early" → confirmation dialog → complete session
  │
  ├── [Rest Timer Screen]
  │   │
  │   ├── Countdown ring animates from prescription time (e.g. 90s)
  │   │   • SVG arc shrinks as time passes
  │   │   • MM:SS display centered
  │   │
  │   ├── UpNext card shows exercise, set, reps, weight
  │   │
  │   ├── Adjust buttons: −15s, +15s, +30s
  │   │   • Cannot go below 0
  │   │
  │   ├── Timer auto-starts when screen appears
  │   │   • Audio/vibration when reaches 0 (optional)
  │   │
  │   ├── "Skip Rest → Start Set" button
  │   │   → stops timer
  │   │   → navigates back to workout/index or workout/[exerciseLogId]
  │   │
  │   └── Timer reaches 0
  │       → ring turns green
  │       → "Rest Complete" state
  │       → tap to proceed
  │
  ├── [Session Complete]
  │   │
  │   ├── All exercises marked done + all sets completed
  │   │   OR user confirms "Finish Workout Early"
  │   │
  │   ├── → completeSession():
  │   │   • Update WorkoutSession: status = 'completed', completedAt = now
  │   │   • Compute duration (completedAt - startedAt)
  │   │   • Compute streak (count consecutive days with completed sessions)
  │   │   • Detect PRs by comparing to historical ExerciseLogs
  │   │   • Navigate to workout/summary
  │   │
  │   └── → abandonSession():
  │       • Update WorkoutSession: status = 'abandoned'
  │       • No stats computed
  │       • Dismiss modal → return to home
  │
  └── [Summary Screen]
      ├── Display duration, sets, volume, streak, PRs
      ├── "Back to Home" → router.dismissAll() → return to (tabs)/home
      └── Session data now in SQLite for progress/history screens
```

### 4.2 State Transition Table

| Action | From State | To State | Side Effects |
|--------|-----------|----------|--------------|
| Start workout | Home (idle) | Workout active | Insert session + exercise logs, hydrate ActiveSession, start elapsed timer |
| Log set | Set pending | Set completed | Insert WorkoutSetLog, advance to next set, if done → mark exercise complete |
| Complete exercise | Exercise active | Exercise done | Transition next exercise to active, show quick-set for next exercise |
| Start rest | Set just logged | Rest counting | Start countdown timer, show UpNext |
| Skip rest | Rest counting | Workout active | Stop timer, zero remaining |
| Rest expires | Rest counting | Rest complete | Haptic/vibration, show "Ready" state |
| Finish all exercises | Last set done | Session complete | Compute stats, detect PRs, navigate to summary |
| Finish early | Any exercise state | Session complete | Same as above but with unlogged exercises recorded as skipped |
| Abandon workout | Any exercise state | Home (idle) | Set status = abandoned, dismiss modal, no stats |
| App background | Workout active | Workout active | Timer pauses (elapsed + rest), session persists in SQLite |
| App foreground | Workout active | Workout active | Recompute elapsed from startedAt, rest timer shows remaining (if still > 0) |

### 4.3 Rest Timer Behavior Details

- Timer duration = prescription's `restSeconds` for the current exercise (e.g. 90s for accessory, 180s for compounds)
- Timer auto-starts on screen mount
- On app background: timer pauses (captured via `AppState` listener)
- On app foreground: remaining seconds unchanged (timer does NOT run in background)
- On expire: haptic feedback, ring turns green, text changes to "Ready"
- User can adjust: −15, +15, +30 seconds (cannot go below 0)
- Skip button stops timer immediately and navigates back

### 4.4 Weight Defaulting Logic

When entering a set, weight defaults to:
1. Last logged weight for this exercise (from `getExerciseHistory()`)
2. If no history: 0 (user must set before logging first set)
3. User adjusts with −/+ (step size: 2.5kg for compounds, 1kg for isolations)
4. Weight is recorded per-set, allowing intra-exercise weight changes

### 4.5 Reps Defaulting Logic

When entering a set, reps default to:
1. The top of the prescription's rep range (e.g. 12 for 8–12)
2. User can override with a text input spin or inline edit
3. Actual logged reps may differ from prescribed — this is expected

---

## 5. Styling System Recommendations

### 5.1 Color Tokens

```typescript
const colors = {
  // Surface
  background: '#0a0a0a',           // deepest black
  surface: '#111111',              // nav bar, cards
  surfaceElevated: '#161616',      // exercise rows, set logs
  surfaceInteractive: '#1a1a1a',   // stat cards, buttons
  border: '#222222',               // subtle borders (0.5px)
  borderActive: '#2a2a2a',         // hover/focus borders

  // Brand / Accent
  gold: '#e8c547',                 // primary accent — CTAs, active states, streak
  goldDim: '#8a7520',              // muted gold for secondary text
  goldSurface: '#1a1800',          // gold-tinted surface for active rows

  // Status
  success: '#3a7a3a',              // completed sets, exercises
  successDim: '#2e5a2e',           // muted success text
  successSurface: '#121812',       // completed row backgrounds
  successBorder: '#1e3a1e',        // completed borders
  successText: '#4d7a4d',          // completed exercise names

  // Text
  textPrimary: '#f0ede8',          // off-white body text
  textSecondary: '#888888',        // secondary labels
  textTertiary: '#555555',         // section labels, metadata
  textMuted: '#444444',            // nav-inactive, placeholders
  textDim: '#2a2a2a',              // pip dots, dividers

  // Rest
  restSurface: '#111111',          // rest day card
  restBorder: '#1a1a1a',           // rest day border
};
```

### 5.2 Typography Scale

```typescript
const typography = {
  // Display
  display: { family: 'Barlow Condensed', weight: 800, size: 42, lineHeight: 1 },       // complete screen title
  hero:    { family: 'Barlow Condensed', weight: 800, size: 36, lineHeight: 1 },        // exercise detail name
  heading: { family: 'Barlow Condensed', weight: 800, size: 32, lineHeight: 1 },        // screen heading
  subheading: { family: 'Barlow Condensed', weight: 700, size: 22, lineHeight: 1.1 },   // rest context

  // Body
  exerciseName: { family: 'Barlow Condensed', weight: 700, size: 16 },                  // exercise row name
  bodyLarge:    { family: 'Barlow Condensed', weight: 700, size: 20 },                  // plan day name
  body:         { family: 'Barlow Condensed', weight: 600, size: 15 },                  // ghost buttons

  // Monospace (data)
  monoDisplay:  { family: 'Space Mono', weight: 700, size: 64 },                        // rest timer
  monoHero:     { family: 'Space Mono', weight: 700, size: 48 },                        // weight value
  monoLarge:    { family: 'Space Mono', weight: 700, size: 40 },                        // ring percentage
  monoMedium:   { family: 'Space Mono', weight: 700, size: 28 },                        // complete stat value
  monoBody:     { family: 'Space Mono', weight: 400, size: 13 },                        // weight unit, exercise spec
  monoSmall:    { family: 'Space Mono', weight: 400, size: 12 },                        // set pills, RPE buttons
  monoLabel:    { family: 'Space Mono', weight: 400, size: 11 },                        // section labels, screen titles
  monoTiny:     { family: 'Space Mono', weight: 400, size: 10 },                        // nav labels, stat labels

  // CTA
  cta: { family: 'Barlow Condensed', weight: 800, size: 17, letterSpacing: 0.05, transform: 'uppercase' },
};
```

Font pairing rationale:
- **Barlow Condensed** — athletic, compact, high-impact. Used for all headings, exercise names, CTAs. Feels aggressive and gym-appropriate.
- **Space Mono** — data, timing, stats. Communicates precision and measurement. Used wherever numbers appear.

### 5.3 Spacing System

```typescript
const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  section: 32,      // between major sections
};
```

Grid: 4px base unit. All spacing values are multiples of 4px. Content padding from edges: `20px` (the mockup uses 20px consistently).

### 5.4 Border Radius

```typescript
const radii = {
  pill: 20,       // set pills
  card: 14,       // weight input, rest next, plan cards
  row: 12,        // exercise rows, session rows, stat cards, CTAs
  icon: 8,        // exercise icon container
  tab: 8,         // nav items
  dot: 10,        // day dots
  button: 10,     // ghost buttons
};
```

### 5.5 Animation Philosophy

| Use Case | Type | Duration | Easing | Notes |
|----------|------|----------|--------|-------|
| Screen transitions | Slide horizontal | 250ms | easeInOut | Stack push/pop between workout screens |
| Rest timer countdown | SVG arc tween | 1s per tick | linear | Continuous monospace tick, arc updates each second |
| Set completion | Checkmark scale-in | 200ms | spring | Light bounce on checkmark |
| Button press | Opacity scale | 100ms | easeOut | Quick feedback, no long animations |
| Progress ring update | SVG arc tween | 500ms | easeOut | When completing a set, ring animates smoothly |
| Streak counter | Number tick-up | 300ms | spring | Celebration feel on completion screen |

Principle: purposeful, short, never obstructive. Animations serve the gym context — fast feedback, no loading spinners, no 800ms transitions that slow down logging.

### 5.6 Elevation / Shadow System

```
No drop shadows. Use border-based layering:
- Card: 0.5px solid border (#222)
- Elevated card (active): 0.5px gold border (#e8c547)
- Surface differentiation via background color (0a→11→16→1a)
```

In React Native, shadows on Android use `elevation` which adds unwanted overhead. Border-based layering is consistent, performant, and aligns with the industrial flat aesthetic.

---

## 6. Accessibility + UX Risks

### 6.1 Identified Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Small tap targets on set pills** (22px check, 34px icon container) | Medium | Ensure min 44×44pt tap targets per Apple HIG. Set pills and check circles need padding expansion via `hitSlop`. |
| **Weight input −/+ buttons are small** (44×44 in mockup — borderline) | Low | Already at 44px which meets minimum. Keep as-is but test on small screens. |
| **Gold-on-dark contrast for active text** (e.g. `#8a7520` on `#1a1800`) | Medium | Gold-dim text on gold-surface may fail WCAG AA at small sizes. Use `#e8c547` (not `#8a7520`) on gold-surface for small text. |
| **Success green contrast** (`#4d7a4d` on `#121812`) | Low | Passes WCAG AA. Green-dim (`#2e5a2e`) on success-surface (`#121812`) for labels may need checking — prefer `#4d7a4d` for text < 18px. |
| **Monospace readability at small sizes** (10px nav labels, 11px section labels) | Medium | These are label-only (non-critical). Ensure `letterSpacing` is generous (0.08–0.12em) and color contrast is sufficient. Consider bumping nav labels to 11px minimum. |
| **Rest timer runs in background** | Medium | Pause timer on `AppState` 'background' event. Resume elapsed tracking from SQLite `startedAt` on foreground. |
| **Accidental "Finish Workout Early" tap** | High | Add confirmation dialog: "End workout? X exercises not started. [Cancel] [End Session]" |
| **No haptic feedback on timer expiry** | Medium | Add `ImpactFeedbackStyle.Heavy` when timer reaches 0. User may be looking away from phone. |
| **Thumb zone: navigation at bottom** | Managed | Bottom nav + CTA buttons are within thumb reach. Exercise list is scrollable — no critical actions in top 1/3 of screen. |
| **One-handed operation: weight −/+ and RPE** | Low | Both controls are in lower 2/3 of screen. RPE row is near thumb zone during set logging flow. |
| **No swipe gestures for navigation** | Low | Avoid swipe-back during workout to prevent accidental exit. Buttons-only navigation in workout modal. |
| **Small text on stat cards** (10px stat-label) | Low | Labels are secondary; values are large (20px mono). Acceptable for glanceability during workout. |
| **SVG progress rings may flicker on re-render** | Low | Memoize `<ProgressRing>` with `React.memo`. Use `useDerivedValue` for animated arc. |

### 6.2 Accessibility Checklist

| Item | Status | Action |
|------|--------|--------|
| All touch targets ≥ 44pt | Verify | Wrap set pills and icon containers with expanded hitSlop |
| Screen reader labels | Add | `accessibilityLabel` on all icon-only buttons (weight −/+, emoji icons) |
| Timer announces changes | Add | `accessibilityLiveRegion='polite'` on rest timer display |
| High contrast mode | Test | Ensure gold/green on dark meets 4.5:1 ratio at small sizes |
| Reduced motion | Respect | Use `Animated.loop` with `useReducedMotion()` for timer arc |
| Keyboard navigation | N/A | Mobile-only, no keyboard needed |

---

## 7. Implementation Recommendations

### 7.1 Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Expo SDK 54+ | Required by project context. Managed workflow for quick iteration. |
| Navigation | expo-router v4 | File-based routing, modal presentation, deep linking ready. |
| UI | React Native core + custom components | No UI kit. Dark industrial aesthetic is too specific for pre-built kits. Build custom. |
| SVG | react-native-svg | Progress rings, countdown arc. Lightweight, well-supported. |
| Animations | react-native-reanimated | Timer arc animation, progress ring transitions, screen transitions. |
| Haptics | expo-haptics | Timer expiry, set completion feedback. |
| Fonts | expo-font (Barlow Condensed, Space Mono) | Both available on Google Fonts. Use `@expo-google-fonts/*` packages. |
| Persistence | expo-sqlite + drizzle-orm | Aligned with existing architecture doc. |
| State | React useState + SQLite | No global state library for MVP (per app-shell.md §6.3). |

### 7.2 Folder Structure

```
src/
  components/
    shared/
      ProgressRing.tsx
      CtaButton.tsx
      GhostButton.tsx
      ScreenHeader.tsx
      SectionLabel.tsx
      WeightInput.tsx
      RpeSelector.tsx
      StreakBanner.tsx
      SetRow.tsx
      SetPill.tsx
      ExerciseRow.tsx
    workout/
      ExerciseList.tsx
      QuickSets.tsx
      StatRow.tsx
      WeekStrip.tsx
      SetLogList.tsx
      CountdownRing.tsx
      UpNextCard.tsx
      TimerAdjustRow.tsx
      CompletedExerciseList.tsx
      SummaryStats.tsx
    plan/
      DayCard.tsx
      RestDayCard.tsx
    progress/
      MonthSection.tsx
      SessionRow.tsx
    home/
      EmptyState.tsx

  screens/
    workout/
      ActiveWorkoutScreen.tsx
      ExerciseDetailScreen.tsx
      RestTimerScreen.tsx
      WorkoutSummaryScreen.tsx
    home/
      TodayScreen.tsx
      RestDayScreen.tsx
    plan/
      WeekScreen.tsx
    progress/
      ProgressScreen.tsx

  data/
    program.ts           // Hardcoded PROGRAM constant
    exercises.ts         // Exercise metadata (icons, target muscles)
    types.ts             // Shared TypeScript interfaces

  hooks/
    useActiveSession.ts  // Hydrate + manage active workout state
    useRestTimer.ts      // Countdown logic + AppState handling
    useElapsedTimer.ts   // Workout elapsed time counter
    useStreak.ts         // Compute streak from session history
    useProgram.ts        // Resolve prescription for current week/day

  utils/
    progression.ts      // Double progression logic + suggestions
    statistics.ts       // Volume, PR detection, kcal estimates
    schedule.ts         // Week/day resolution from start date
    formatters.ts       // Time, weight, rep-range formatting helpers

  db/
    client.ts           // expo-sqlite + drizzle connection
    migrations.ts       // Schema migrations
    schema.ts           // Drizzle table definitions
    repositories/
      sessions.ts       // WorkoutSession CRUD
      exercises.ts      // ExerciseLog + WorkoutSetLog CRUD
      settings.ts       // AppSettings (program start date)
```

### 7.3 Key Design Decisions

1. **PROGRAM as a TypeScript constant** — No JSON files, no runtime parsing. Import `PROGRAM` directly for type safety and tree-shaking. The 12-week program fits in <500 lines of TS.

2. **Prescription resolver as a pure function** — `getDayPrescription(weekNumber, dayType) → ProgramDay` computes what the user should do. No database involvement. Testable in isolation.

3. **Session hydration pattern** — On mount, `useActiveSession` reads session + logs from SQLite, merges with program prescription, produces a single `ActiveSession` object in state. Mutations (`updateSet`, `completeSet`) write to SQLite and update local state simultaneously.

4. **No mutation caching** — Each set log write goes directly to SQLite. No pending write queue. SQLite writes on mobile take <2ms. No need for optimistic updates.

5. **Streak computed on session completion** — Query: `SELECT DISTINCT date(started_at) FROM workout_sessions WHERE status = 'completed' ORDER BY date DESC LIMIT 60`. Walk consecutive days from today backward until gap. Store nothing — compute each time.

6. **Weight suggestion via local history** — `getLastWeight(exerciseName) → number | null`. Query most recent `workout_set_logs` for this exercise joined to `exercise_logs`. Return last recorded weight.

### 7.4 Performance Notes

| Concern | Approach |
|---------|----------|
| SVG re-renders on timer tick | Use `useAnimatedProps` from reanimated to update arc dashoffset declaratively without JS thread round-trip |
| Exercise list scroll during workout | `FlatList` with `getItemLayout` for fixed-height rows. No virtualization issues with ≤12 items |
| Set log rapid taps | Debounce not needed — SQLite writes are synchronous. Use `useCallback` for set-log handlers |
| Font loading | Load Barlow Condensed + Space Mono in root layout with `useFonts` + `SplashScreen.preventAutoHideAsync()` |
| Images | None in MVP. Progress photos are future scope. No image loading concerns. |

### 7.5 Future Scalability Notes

| Future Concern | Prepared By |
|----------------|-------------|
| Adding new exercises to program | Append to `weekRanges[]` array in `program.ts` |
| Custom workout plans | `ProgramDay` interface already general — load from JSON or SQLite instead of TS constant |
| Wearable integration | Elapsed timer and rest timer are isolated hooks — emit events to a bridge |
| Bodyweight tracking | Standalone entity in data model, separate screen, no architecture changes needed |
| Progress photos | Independent entity, no existing flow depends on it |
| Backend sync | All data access through repositories — swap SQLite for API client behind same interface |
| Theme switching | Color tokens in a single `colors` object — dark/light theme wraps it |

---

*This document should be read alongside `docs/architecture/app-shell.md` for navigation structure, `docs/domain/data-model.md` for entity relationships, and `docs/ux/mockup.html` for visual reference.*
