# Implementation Plan — Closing the Gaps

**Status:** Plan  
**Author:** Codex + UX Research  
**Date:** 2026-06-02  

---

## Overview

The app has a fully built data layer (schema, repositories, session engine) for all features. The gaps are purely UI/UX — screens and components that need to connect to existing repositories.

A UX research audit identified four severity tiers of issues. This plan incorporates all findings, prioritizing P0 (ship-blocking) and P1 (high impact) alongside the original items.

---

## P0 — Critical (Ship-Blocking)

---

### P0.1 Fix Silent Failure on Empty Set Log

**Problem:** `updateSet()` in `session-executor.ts:91-93` silently skips the write when both weight and reps are 0. The user taps "Log Set → Rest" but the set isn't saved — no feedback is given. This results in data loss the user is unaware of.

**Files to modify:**
- `src/features/workout-session/session-executor.ts` — In `updateSet()`, validate weight > 0 and reps > 0 before write. Return a result object with `{ success: boolean; reason?: string }`.
- `app/workout/[exerciseLogId]/index.tsx` — In the `handleLogSet` handler, check the return value. If validation fails, show an inline error message or shake the inputs rather than silently doing nothing.
- `components/workout/SetLogRow.tsx` — Add visual validation state (red border, error message) when weight or reps are empty.

---

### P0.2 Complete Workout — Allow Override for Incomplete Sessions

**Problem:** `app/workout/index.tsx` line 389–392: "Complete Workout" button is `disabled` until all exercises have `status === 'completed'`. No way to finish a session with incomplete exercises.

**Files to modify:**
- `app/workout/index.tsx` — In `handleComplete`:
  - Remove the `disabled` prop from the button
  - Check if all exercises are completed inside the handler
  - If not all complete, show `Alert.alert`:
    - Title: `"X exercises not started"`
    - Message: `"Complete anyway? Unstarted exercises will be skipped."`
    - Options: "Complete" (marks unstarted exercises as abandoned, completes session), "Cancel"
  - If all complete, proceed directly without alert

---

### P0.3 Progress Screen Overhaul (Charts, Adherence, Trends)

**Problem:** Current progress screen (`app/(tabs)/progress/index.tsx`) is a flat list of completed sessions grouped by month. Missing per the MVP spec: week-by-week summaries, adherence rate, volume trends, exercise progression. This fails the core product principle "Make progression highly visible."

Repositories already provide all data:
- `getSessionsWithVolume(limit)` — volume per session
- `getSessionCountByWeek()` — adherence per week
- `getBodyweightWeeklyAverages()` — bodyweight trends
- `getExerciseHistory(exerciseName)` — per-exercise progression

**Files to create:**
- `features/progress/AdherenceGrid.tsx` — 12-week grid showing sessions completed per week (0–5). Color-coded cells. Tap navigates to week tab.
- `features/progress/VolumeTrendChart.tsx` — SVG bar chart using `react-native-svg` (already a dependency). Total volume per completed week, dashed outlines for future weeks.
- `features/progress/WeekSummaryCard.tsx` — Quick stats for a given week: sessions completed / 5, total volume, top 3 exercises.
- `features/progress/ExerciseProgressionCard.tsx` — Weight/reps history for a single exercise. Most recent sessions, comparison arrows. Top N exercises by volume shown.

**Files to modify:**
- `app/(tabs)/progress/index.tsx` — Restructure as a scrollable dashboard:
  1. Weekly Adherence Grid (12-week overview)
  2. Volume Trend (bar chart)
  3. Exercise Progression (top exercises by volume)
  4. Session History (collapsible at bottom, same as current)

---

### P0.4 Fix Touch Targets Below 44pt Minimum

**Problem:** Multiple interactive components fall below the 44×44pt minimum touch target (Apple HIG, WCAG). These are used frequently during workouts when users may have sweaty fingers.

| Component | Current Size | Location |
|---|---|---|
| Weight stepper −/+ buttons | ~36×36px | `components/workout/SetLogRow.tsx` |
| Check circles on exercise rows | ~22×22px | `components/workout/ExerciseRow.tsx` |
| SetPill indicators | ~34×22px | `components/workout/SetPill.tsx` |
| RPE selector buttons | ~36×36px | `components/workout/RpeSelector.tsx` |

**Fix approach:** Apply `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}` to all undersized touch targets. For stepper buttons, increase the `TouchableOpacity` padding to achieve 44×44px minimum. Create a shared `MIN_TAP_SIZE` constant.

**Files to modify:**
- `components/workout/SetLogRow.tsx` — Wrap stepper buttons with hitSlop expansion
- `components/workout/ExerciseRow.tsx` — Add hitSlop to check circle and expand icon container
- `components/workout/SetPill.tsx` — Add hitSlop to pill touchable
- `components/workout/RpeSelector.tsx` — Increase button padding, add hitSlop
- Create `constants/ui.ts` — Export `MIN_TAP_SIZE = 44` for consistent usage

---

## P1 — High Impact

---

### P1.1 Add Rest Timer Pulse Animation & Haptic Cadence

**Problem:** The inline rest timer in `ExerciseLogScreen` lacks the escalating pulse animation and threshold-based haptics specified in `docs/ux/microinteractions-polonis.md §2a–2b`. The timer currently counts down without haptic feedback until expiry.

**Files to modify:**
- `app/workout/[exerciseLogId]/index.tsx` — In the rest timer section (lines 576–665):
  - At `<= 10s`: gentle scale pulse (1↔1.03) + `ImpactFeedbackStyle.Light`
  - At `<= 5s`: larger amplitude + color shift gold→green + `ImpactFeedbackStyle.Medium`
  - At `<= 3s`: `ImpactFeedbackStyle.Heavy`
  - At `0s`: `ImpactFeedbackStyle.Success` (already partially implemented)
- Respect `useReducedMotion()` — skip pulse, keep haptics.

---

### P1.2 Scroll to Active Exercise on List Screen

**Problem:** When resuming a workout or completing an exercise, the exercise list does not auto-scroll to the current active exercise. The user must manually scroll to find where they left off, adding friction mid-workout.

**Files to modify:**
- `app/workout/index.tsx`:
  - Track the active exercise index via a `useEffect` watching `session.exercises`
  - Call `flatListRef.current?.scrollToIndex({ index: activeIndex, animated: true })` when active exercise changes
  - Respect `useReducedMotion()` — use `animated: false` on reduced motion

---

### P1.3 Fix Week Strip to Show Real Session Data

**Problem:** `app/workout/index.tsx` lines 304–310 generate `DayStatus[]` based on the current day of the week (e.g., Monday through Sunday), not actual session data from the database. This shows "done" dots for days that may have been missed and "upcoming" for days already completed.

**Files to modify:**
- `app/workout/index.tsx` — Replace the mock `weekDays` computation with a real query to `getSessionsByWeek()` for the current week. Map returned sessions to `DayStatus` with correct `done`, `today`, `upcoming`, or `missed` status.
- `src/db/repositories/sessions.ts` — Verify `getSessionsByWeek()` returns all session statuses (completed, in_progress, abandoned) for accurate display.

---

### P1.4 Show Abandoned Sessions in History

**Problem:** `app/(tabs)/progress/index.tsx` line 29 filters to only `status === 'completed'` sessions. Abandoned (partial) sessions are completely invisible. Users who had to cut a workout short can never review or learn from their partial work.

**Files to modify:**
- `app/(tabs)/progress/index.tsx` — Change filter to include `'abandoned'` sessions alongside `'completed'`. Add visual differentiation (dimmed styling, "Incomplete" badge instead of "Done").
- `src/db/repositories/sessions.ts` — Verify `getSessionsWithVolume()` accepts a status filter parameter.

---

### P1.5 Rename "History" Tab to Match Its Content

**Problem:** The third tab is labeled "History" but the route is `(tabs)/progress`. The screen shows a date-grouped log of completed sessions — this is history, not progress. Users expecting progress trends (charts, adherence, volume graphs) will be disappointed. After the P0.3 overhaul adds actual progress charts, the tab name should reflect both log and progress content.

**Files to modify:**
- `app/(tabs)/_layout.tsx` — Change tab title from "History" to "Progress" (line 67)
- `app/(tabs)/progress/index.tsx` — Update `ScreenHeader` subtitle from "Your log" to "Your progress" or keep both: "Progress · History" in subtitle
- After P0.3, ensure the screen title aligns with the new dashboard content

---

### P1.6 Route to Program Completion Celebration

**Problem:** When the 12-week program is complete, `resolveCurrentSchedule()` returns `{ status: 'programCompleted' }`. The home screen shows a basic "Program Complete" message (lines 216–225) with no fanfare, while a rich completion view exists at `app/completed.tsx` but is never automatically navigated to.

**Files to modify:**
- `app/(tabs)/home/index.tsx` — In the `programCompleted` render branch, automatically navigate to `completed.tsx` via `router.replace()` on first mount. The `completed.tsx` screen should show total volume, adherence stats, and a restart option.
- `app/completed.tsx` — Enhance with total program stats (volume, adherence rate, top PRs).

---

### P1.7 Show Streak on Workout Summary Screen

**Problem:** `app/workout/summary.tsx` does not compute or display streak data. The UX architecture specifies a `StreakBanner` component, and the micro-interactions plan details a count-up animation. Streak is a core adherence motivator but is absent from the post-session closure screen.

**Files to modify:**
- `app/workout/summary.tsx` — Import `computeStreak()` (or equivalent from session repository). Add `StreakBanner` component below the stats grid. Animate the count using the shared `useSharedValue` pattern.
- `components/ui/StreakBanner.tsx` — Already exists, may need `prevCount` prop for count-up animation (per microinteractions-polonis.md §4c).

---

## P2 — Medium Impact

---

### P2.1 Add "Quick Log" for Experienced Users

**Problem:** The redesign moved all logging to the exercise detail hub, adding one extra navigation step per exercise. Experienced users who know their weights and just want to track quickly may find this tedious.

**Files to create:**
- `components/workout/QuickLogOverlay.tsx` — Minimal logging overlay triggered by long-press on an `ExerciseRow` in the list. Shows weight stepper, reps input, RPE selector, and "Log Set" button. Full-screen modal-light presentation (semi-transparent backdrop, centered card).

**Files to modify:**
- `app/workout/index.tsx` — Add long-press handler on `ExerciseRow` that opens `QuickLogOverlay`. The overlay logs the set directly without navigating to the detail screen.
- `components/workout/ExerciseRow.tsx` — Add `onLongPress` prop.

---

### P2.2 Fix Gold-Dim Text on Gold-Surface Contrast

**Problem:** `ExerciseRow.tsx` line 239 uses `colors.goldDim` on `colors.goldSurface` for active exercise spec text. At 13px (`monoBody`), this pair fails WCAG AA (3.2:1 < 4.5:1).

**Files to modify:**
- `src/theme/tokens.ts` — Either darken `goldDim` to a higher-contrast variant (e.g., `#9a8520`), or adjust the `specActive` style to use a lighter color (e.g., `colors.gold`) on `goldSurface` for small text.
- `components/workout/ExerciseRow.tsx` — Update `specActive` style to use the corrected color.

---

### P2.3 Show Global Program Completion Percentage

**Problem:** Nowhere in the app can the user see their overall program completion status (e.g., "Week 5 of 12 — 42% complete"). This data exists in the schedule resolver (`resolveCurrentSchedule()`) but is never surfaced.

**Files to modify:**
- `app/(tabs)/home/index.tsx` — In the "ready" and "in-progress" states, add a program-level progress indicator below the session state card. Show "Week {n} of 12" and a thin progress bar representing overall program completion.
- `components/ui/ProgramProgressBar.tsx` — New shared component: thin horizontal bar with week count, percentage, and block label.

---

### P2.4 Add Accessibility Labels on Emoji Icons

**Problem:** `ExerciseRow.tsx` lines 109–111 use emoji characters for exercise icons without `accessibilityLabel`. Screen readers announce these inconsistently (e.g., "flexed biceps" for 💪, "hammer" for 🔨).

**Files to modify:**
- `components/workout/ExerciseRow.tsx` — Add `accessibilityLabel` prop matching the icon emoji to its exercise name context. E.g.: `accessibilityLabel={\`Exercise: ${name}\`}`
- `components/workout/SetLogRow.tsx` — Same for any emoji usage in set rows.

---

### P2.5 Merge PR Celebration + Summary Flow

**Problem:** Completing a session navigates through 3 screens: PR celebration → tap "Continue" → summary screen → tap "Back to Home". This fragmented flow dilutes the emotional payoff and adds unnecessary taps.

**Files to modify:**
- `app/workout/pr-celebration.tsx` — Integrate the summary statistics into the PR celebration screen (duration, volume, sets, exercises). Remove the separate `summary.tsx` screen from the completion flow.
- `app/workout/summary.tsx` — After merge, this screen is only accessible via back-navigation from history (not from the completion flow). Add a route guard that redirects to `pr-celebration` if the session was just completed.

---

## Original Items (Carried Forward)

---

## 1. Cardio/HIIT Logging (Day 3)

**Problem:** Rest day screen shows "Recovery Day" with no logging interaction. The `cardio` repository (`src/db/repositories/cardio.ts`) and `cardio_sessions` table exist but have no UI.

**Files to create:**
- `components/cardio/CardioLogger.tsx` — Form with intensity type toggle (low_moderate / high_intensity), activity text input, duration stepper, optional note, submit button
- `components/cardio/CardioHistory.tsx` — Recent cardio logs for current week

**Files to modify:**
- `app/(tabs)/home/index.tsx` — In the `restDay` render branch (~lines 315–349), replace static "Recovery Day" with a layout that shows the rest message plus an expandable `CardioLogger` section
- `components/home/types.ts` — No changes needed

**Data integration:**
```typescript
import { createCardioSession, getCardioSessionsByWeek } from '@/src/db/repositories/cardio'
```

---

## 2. Home Screen — Fix Missed Session Hardcoded Data

**Problem:** `app/(tabs)/home/index.tsx` lines 235, 243 use `"Wednesday · Week 4"` and `"Tuesday 27 May"` instead of real data from `wasTrainingDayMissed()`.

The function returns `{ missedDate, missedDayType, daysAgo }` but this isn't stored in the state type.

**Files to modify:**
- `components/home/types.ts` — Extend the `missed` status to include:
  ```typescript
  | {
      status: 'missed';
      weekNumber: number;
      dayPrescription: DayPrescription;
      blockName: string;
      missedDate: string;
      missedDayType: string;
      daysAgo: number;
    }
  ```
- `app/(tabs)/home/index.tsx` — In `computeScreenState()`, thread missed session data into state. In the `missed` render branch (~lines 228–311), replace hardcoded strings with `screenState.missedDate`, `screenState.missedDayType`, `screenState.daysAgo`. Compute the display day name and date from the real values instead of hardcoded strings.

---

## 3. Session Resume — Navigate to Active Exercise (Polish)

**Problem:** Resuming a session navigates to the exercise list (`workout/index`), not directly to the in-progress exercise.

**Files to modify:**
- `app/(tabs)/home/index.tsx` — In `handleStartOrResume`, on resume path:
  - Hydrate the active session
  - Find exercise with `status === 'active'`
  - If found, navigate to `workout/{exerciseLogId}`
  - If none active, navigate to `workout` list as before

---

## 4. Bodyweight Tracking

**Problem:** `bodyweight` repository (`src/db/repositories/bodyweight.ts`) and `bodyweight_entries` table exist. No UI.

**Files to create:**
- `features/bodyweight/BodyweightInput.tsx` — Quick-input form: weight number input, unit toggle (lbs/kg), optional note, "Log" button. Shows last logged value + date for reference.
- `features/bodyweight/BodyweightChart.tsx` — SVG line chart of weekly averages over last 12 weeks using `react-native-svg`.

**Files to modify:**
- `app/(tabs)/progress/index.tsx` — Add a "Bodyweight" section between volume trend and photos. Shows latest entry, trend direction, "+" button to log new entry. Expandable chart.

---

## 5. Progress Photos

**Problem:** `photos` repository (`src/db/repositories/photos.ts`) and `progress_photos` table exist. No UI. Needs `expo-image-picker`.

**Dependency to add:**
```bash
npx expo install expo-image-picker
```

**Files to create:**
- `features/progress-photos/PhotoCapture.tsx` — Camera roll picker + angle selector (front/side/rear). Shows comparison with last photo of same angle.
- `features/progress-photos/PhotoGallery.tsx` — Scrollable grid of all progress photos grouped by date, tagged with angle.

**Files to modify:**
- `app/(tabs)/progress/index.tsx` — Add a "Progress Photos" section. Thumbnail strip of latest 3 photos (one per angle). "Add Photos" button triggers `PhotoCapture`. Tap thumbnail opens gallery.

**Lighter alternative:** Skip `expo-image-picker` and show a placeholder with guidance text ("Take photos every 2–3 months from front, side, and rear"). User captures externally, app stores the URI. Keeps scope smaller.

---

## 5. Bodyweight Tracking

**Problem:** `bodyweight` repository (`src/db/repositories/bodyweight.ts`) and `bodyweight_entries` table exist. No UI.

**Files to create:**
- `features/bodyweight/BodyweightInput.tsx` — Quick-input form: weight number input, unit toggle (lbs/kg), optional note, "Log" button. Shows last logged value + date for reference.
- `features/bodyweight/BodyweightChart.tsx` — SVG line chart of weekly averages over last 12 weeks using `react-native-svg`.

**Files to modify:**
- `app/(tabs)/progress/index.tsx` — Add a "Bodyweight" section between volume trend and photos. Shows latest entry, trend direction, "+" button to log new entry. Expandable chart.

---

## 6. Progress Photos

**Problem:** `photos` repository (`src/db/repositories/photos.ts`) and `progress_photos` table exist. No UI. Needs `expo-image-picker`.

**Dependency to add:**
```bash
npx expo install expo-image-picker
```

**Files to create:**
- `features/progress-photos/PhotoCapture.tsx` — Camera roll picker + angle selector (front/side/rear). Shows comparison with last photo of same angle.
- `features/progress-photos/PhotoGallery.tsx` — Scrollable grid of all progress photos grouped by date, tagged with angle.

**Files to modify:**
- `app/(tabs)/progress/index.tsx` — Add a "Progress Photos" section. Thumbnail strip of latest 3 photos (one per angle). "Add Photos" button triggers `PhotoCapture`. Tap thumbnail opens gallery.

**Lighter alternative:** Skip `expo-image-picker` and show a placeholder with guidance text ("Take photos every 2–3 months from front, side, and rear"). User captures externally, app stores the URI. Keeps scope smaller.

---

## 7. Session Resume — Navigate to Active Exercise (Polish)

**Problem:** Resuming a session navigates to the exercise list (`workout/index`), not directly to the in-progress exercise.

**Files to modify:**
- `app/(tabs)/home/index.tsx` — In `handleStartOrResume`, on resume path:
  - Hydrate the active session
  - Find exercise with `status === 'active'`
  - If found, navigate to `workout/{exerciseLogId}`
  - If none active, navigate to `workout` list as before

---

## Implementation Phases

| Phase | Items | Effort | Rationale |
|-------|-------|--------|-----------|
| **P0** | Fix silent set log failure (P0.1) | Small | Prevents silent data loss — users think sets logged when they aren't |
| **P0** | Complete workout override (P0.2) | Trivial (< 30 lines) | Unblocks users who need to finish early |
| **P0** | Progress screen overhaul (P0.3) | Large | Fails core product principle "make progression highly visible" |
| **P0** | Fix undersized touch targets (P0.4) | Small | WCAG violation + real-world usability issue in gym |
| **P1** | Rest timer pulse + haptic cadence (P1.1) | Small | Missing micro-interaction reduces coaching feel |
| **P1** | Scroll to active exercise (P1.2) | Trivial | User manually searches for current exercise mid-workout |
| **P1** | Fix week strip to use real data (P1.3) | Small | Currently shows misleading fictional data |
| **P1** | Show abandoned sessions (P1.4) | Trivial | Partial workouts are invisible to users |
| **P1** | Rename "History" tab (P1.5) | Trivial | Expectation mismatch — tab says Progress, shows log |
| **P1** | Program completion celebration (P1.6) | Small | Missed emotional payoff for 12-week achievement |
| **P1** | Show streak on summary (P1.7) | Small | Streak is core adherence motivator, absent from post-session |
| **P2** | Quick Log for experienced users (P2.1) | Medium | Reduces friction for fast loggers |
| **P2** | Fix gold-dim contrast (P2.2) | Trivial | Fails WCAG AA, easy fix |
| **P2** | Global completion % (P2.3) | Small | Long-term motivation signal |
| **P2** | Accessibility labels on emoji (P2.4) | Trivial | Screen reader UX |
| **P2** | Merge PR + summary flow (P2.5) | Medium | Cuts 3-screen session closure to 1 |
| **–** | Cardio/HIIT logging (orig §1) | Small | Day 3 affects every user every week |
| **–** | Missed session fix (orig §2) | Trivial (< 20 lines) | Hardcoded data is actively misleading |
| **–** | Session resume fix (orig §3) | Small | Polish, not blocking |
| **–** | Bodyweight tracking (orig §4) | Medium | Integrates with progress overhaul |
| **–** | Progress photos (orig §5) | Medium | Every 2–3 months per program, lower urgency |

P0 items are ship-blocking. P1 items deliver high UX impact. P2 items are polish and accessibility. Original items are ordered by user frequency. All phases are independent and can be reordered without conflict.
