# Workout Companion — Audit Remediation Plan

**Status:** Plan
**Date:** 2026-09-28
**Scope:** All 4 phases.

---

## Why this plan exists

A four-agent audit of the data layer, UI layer, program fidelity, and cross-cutting
concerns produced ~90 findings. The load-bearing ones were independently verified by
reading the source; a small number of agent claims did not reproduce and are corrected
below. Program data changes are gated on a structural extraction script (Phase 2, step 11)
because ad-hoc column extraction proved unreliable.

### The headline finding

**A fresh install cannot boot the app.** Verified, not inferred:

- `src/db/client.ts` opens the DB and sets PRAGMAs only — it never creates `schema_version`
- `src/db/migrations.ts:174` INSERTs into `schema_version` _before_ running migration 1's statements
- `schema_version` is created by migration 1 at `migrations.ts:90` — 14 statements too late
- Fresh DB → `no such table: schema_version` → ROLLBACK → `throw` (`:183`) → boot catches, sets `dbStatus: 'error'`
- `app/_layout.tsx:65` computes `ready = dbStatus === 'ready' && …`, so the `if (!ready)` guard
  at `:73` returns "Initialising…" forever; the error branch at `:81` is unreachable, and
  `SplashScreen.hideAsync()` never fires

The app only runs on a device whose DB predates the migration-tracking code.
`DevClearDbButton` exists precisely because a wipe is unrecoverable.

### Corrections to audit findings

- **Foundation Push (PDF p.7) is a swap, not an omission.** The PDF has
  `High-Cable Lateral Raise` and `Overhead Cable Triceps Extension`; the code has neither.
  But the code _also_ has `Cable Triceps Kickback`, which appears **zero** times on p.7.
  A naive "add the two missing" fix would leave an invented exercise in the program.
- **Foundation Legs (PDF p.8) is not confirmed.** The PDF shows `Leg Press`,
  `Seated Leg Curl`, `Walking Lunge` plus a substitution option reading `Seated Calf Raise`
  — not the `Standing Calf Raise` claimed missing. No missing prescribed exercise established.
- **Column extraction by regex is unreliable.** A column regex missed `Machine Hip Abduction`
  on p.8 because the wide table wraps exercise names across lines and interleaves columns.
  This is why Phase 2 requires a positional extractor, not greps.
- **PDF day labels are unreliable.** p.6 is a PULL day (Neutral-Grip Lat Pulldown,
  Chest-Supported Machine Row, 1-Arm 45° Cable Rear Delt Flye, Machine Shrug — matching
  `program.ts` `_w3_pull`) but carries a stray "Lower (Strength Focus)" heading between rows.
  The extractor must key rows on **exercise name**, never on the day label.

### Verified finding summary

| Claim                                             | Status                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fresh install cannot boot                         | Verified (code path conclusive)                                                            |
| `_layout.tsx` error branch unreachable            | Verified by read                                                                           |
| `client.ts:44` retry reset is a no-op on native   | Verified — `initDb()` throws synchronously before `getDb():51` assigns `_initPromise`      |
| Rest timer opens at `0:00` after first expiry     | Verified — `reset()` then `start()`, whose `:31` clobbers with the pre-reset closure value |
| `getExerciseHistory` returns the _oldest_ 50 rows | Verified — `orderBy(asc(startedAt))` + `LIMIT 50`                                          |
| `updateSet` treats an omitted field as `0`        | Verified (`session-executor.ts:90-95`)                                                     |
| `SpaceMono_800ExtraBold` used but never loaded    | Verified (`pr-celebration.tsx:280` vs `_layout.tsx:5,32`)                                  |
| `MIN_TAP_SIZE = 44` has zero importers            | Verified                                                                                   |
| Foundation Push / Legs exercise counts            | Corrected above; gated on Phase 2 step 11                                                  |

---

## Phase 0 — Unblock new users — **DONE**

_Gate for everything else. Blocks all new-user onboarding._

1. **`src/db/migrations.ts`** — ~~hoist `CREATE TABLE schema_version` out of migration 1's
   statement list~~ done. Also **record the migration version only after its DDL succeeds**
   (was: before). See "Defect found during Phase 0" below. DDL failures now propagate instead
   of being `console.warn`-ed into a half-migrated DB.
2. **`app/_layout.tsx:65-88`** — `dbStatus === 'error'` is now tested _before_ the `!ready`
   guard, so the error screen is reachable; the splash hides on both paths. Added a **Retry**
   button, which also makes the `client.ts` retry reachable instead of dead capability.
   Dropped the `cancelled` guard (it could strand state on unmount) and the unused
   `colorScheme`.
3. **`src/db/client.ts`** — the `_initPromise` reset moved into a new `initOnce()` helper so it
   runs _after_ assignment; a failure between `openDatabaseSync` and the PRAGMAs now closes the
   handle instead of leaking a file descriptor.

**Verified with a real-SQLite harness** (`/tmp/opencode/repro_migrations.mjs`) that drives the
actual `migrations.ts` against `node:sqlite`, swapping only the driver. Run against both
`git HEAD` and the working tree:

| Case                             | Before                            | After                                                     |
| -------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Fresh install                    | ✗ `no such table: schema_version` | ✓ all 3 migrations, 8 tables, migration 3 columns present |
| Re-run ×2 (idempotent)           | ✗ same error                      | ✓ no duplicate versions                                   |
| Genuine DDL failure propagates   | (unreachable)                     | ✓ throws `views may not be indexed`                       |
| Mid-migration failure self-heals | (unreachable)                     | ✓ v1 left unrecorded, 2nd boot completes the schema       |

`tsc --noEmit` clean; `expo lint` 112 → 111 warnings (removed the unused `colorScheme`), 0 errors.

### Defect found during Phase 0

The original code recorded each migration's version **before** running its DDL, reasoning that
SQLite DDL auto-commits and so must never be retried. That reasoning is inverted. A
mid-migration failure still left the version committed, so the next boot skipped that migration
permanently; two launches later `pending` came back empty and **the app reported itself ready
while `exercise_logs` and `workout_set_logs` did not exist** — every repository query on those
tables would then throw at runtime with no boot-time signal. The idempotency guards
(`CREATE TABLE IF NOT EXISTS`, the `columnExists` check) exist precisely to make a re-run safe,
so recording the version last means a failure just leaves the migration pending and the retry
converges. Proven by the fourth harness case above.

This also un-breaks `DevClearDbButton`, which wipes `schema_version` and previously left the
app permanently unable to migrate again.

### Not addressed (out of Phase 0 scope, noted for later)

- `ready` requires `fontsLoaded || fontsError`; a hung font fetch would still block `settled`
  and the splash indefinitely. Low risk — `@expo-google-fonts` bundles TTFs locally, so this is
  not a network fetch.
- Legacy drift from a much older build (a table missing a column that only `ALTER` adds) still
  reports ready, because `CREATE TABLE IF NOT EXISTS` cannot add columns.
- `drizzle-schema.ts:41,71` name CHECK constraints `chk_sessions_status`/`chk_exercise_status`
  while the raw DDL at `migrations.ts:19,20` creates them unnamed — cosmetic, but it will
  confuse any future `drizzle-kit` diff.

---

## Phase 1 — Stop silent data loss — **DONE**

Six commits, each with a harness. Landing order put the two user-visible
behaviour changes in their own commits (`c02fd4d`, `fa5aff7`) so any shift in
a user's numbers is attributable.

| #   | Item                                                                 | Commit    | Verified by                             |
| --- | -------------------------------------------------------------------- | --------- | --------------------------------------- |
| 4   | `useRestTimer` — `start()` clobbered the ref from its render closure | `fa5aff7` | state-machine replay, 3 cases + control |
| 5   | `getExerciseHistory` — `asc` + `LIMIT` returned the _oldest_ 50      | `c02fd4d` | 60-session SQLite case + control        |
| 6   | In-flight guards on 3 handlers                                       | `eb05b28` | concurrent double-invocation replay     |
| 7   | `updateSet` — `?? 0` rejected partial edits                          | `3115cf8` | 7-case truth table, no regressions      |
| 8   | Stale workout list on back-navigation                                | `ffc77fc` | React dep-semantics simulation          |
| 9   | `setExerciseStatus` missing `invalidateCachedSession`                | `3115cf8` | 6-mutator audit                         |
| 10  | `clearAllTables` — FK left off, cache left warm                      | `f0fc911` | real SQLite, 4 cases incl. failure path |

### Corrections to the plan as written

- **#4 was not a `reset`/`start` ordering problem.** It was a stale-closure read:
  `start()` re-seeded `remainingRef` from `state.remaining`, and because the rest screen calls
  `reset()` then `start()` in the same tick, it always read the _previous_ period's value. The
  first period worked only by coincidence (90 → 90). Fix is to not re-seed at all —
  `remainingRef` is already the source of truth — rather than to pass an explicit duration.
- **#5 was not an ordering flip.** `progression.ts:16` reads `history[history.length - 1]` as the
  latest session, so the array contract is oldest → newest. Flipping the query to `desc` alone
  would have broken it. Correct fix is `desc` for the `LIMIT` window, then reverse, so only the
  selected _window_ changes. `statistics.ts` PR detection was also affected, not just prefill.
- **#8 could have introduced a worse bug.** `getSessionById` does not filter on status, so
  re-hydrating a session finished while the list sat in the stack would have rendered it as an
  active workout. The focus effect now checks status and redirects home.
- **#10 cache clear went in `DevClearDbButton`, not `clearAllTables`** (option a) — `src/db` does
  not import `src/features`, and the component is the single path all seven usages take.

### Extra defects found while implementing (all fixed)

- `useRestTimer`: the background-resume path built a fresh state with `total: 0`. Latent, not
  user-visible — the consumer guards `total > 0 ? remaining / total : 0` so it rendered
  identically — but it corrupted a public state field. My first write-up claimed it caused an
  "empty ring instead of a full one"; that was wrong and the comment was corrected.
- `useRestTimer`: resume restarted the interval unconditionally, so returning from the background
  during the _logging_ phase left a timer running invisibly and drifting the count.
- The tick body was duplicated between `start` and the resume path — the mechanism by which the
  two above drifted. Both now call one shared `beginInterval`.
- `clearAllTables`: the DELETE loop was untransacted, so a mid-loop failure left a half-cleared
  database _and_ skipped the FK restore. Verified FK is genuinely `0` inside the loop, which is
  why the pragma must precede `BEGIN` (it is a no-op inside a transaction).
- `client.ts`: a failure between `openDatabaseSync` and the PRAGMAs leaked the file descriptor,
  since the handle is not yet reachable via `_rawDb`. (Found during Phase 0.)

### Deliberately deferred

- **Atomicity, not just guards, for #6.** `initializeSession` is still not atomic: it awaits
  `getSessionsForToday()` _before_ creating, so two callers that do not overlap in the same
  frame — or any future programmatic caller — can still both create. The real fix is a
  uniqueness constraint on one in-progress session per day, which is a schema change and belongs
  with the Phase 2 migration work. Guards close the double-tap path, not the race.
  **Update after reconciling with PR #1:** the unique-index approach was tried and dropped.
  PR #1 deliberately allows a make-up session and today's session to be open on the same day
  (`initializeSession` matches on week + day type), so a one-in-progress-per-day index would make
  the second creation throw. `createSessionWithLogs` already runs in one transaction and stale
  sessions from earlier days are auto-closed, so the remaining risk is two concurrent callers
  for the _same_ week/day; a partial unique index on `(week_number, day_type, local day)` would be
  the right constraint if that needs closing.
- **Superseded by PR #1** (`claude/app-issues-deep-scan`): the rest-timer rewrite, the
  `getExerciseHistory` ordering fix, the transactional migrations, the session-cache removal and
  the focus refresh on the workout list. Kept from this branch: boot error screen + Retry,
  `initOnce` retry, dev-clear transaction, `updateSet` partial validation, double-tap guards
  for quick log and log set, the finished-session redirect, and the program data fixes.

---

## Phase 2 — Program fidelity

11. **Write `scripts/extract_program.py` first — structural, page-streamed.** Per page:
    `pdftohtml -xml -f N -l N` → `<text>` nodes with x/y → group into cells by y-band and x-band
    → emit rows. Never load the PDF whole. Key rows on **exercise name**, never the day label
    (p.6 is a PULL day mislabelled "Lower (Strength Focus)"). Emit a per-week/per-day row count
    plus the exercise list, then diff against `program.ts`.
12. **Hand spot-check** 3-4 pages against the output before trusting it, including p.7 and p.8.
13. **Then fix data** — with the script's output as the check. Known items: the p.7 Push swap
    (add the 2 missing, remove `Cable Triceps Kickback`), 2 last-set RPE values
    (`program.ts:1027,1031` `~7` vs PDF `~8`), 3 wrong video IDs, 23 null `demoVideoUrl`.
14. **Fix `docs/domain/exercise-metadata.md`** where the doc is the corrupted artifact — all 48
    `Demo` fields disagree with the PDF and the _code_ is right 22/48, so fix the doc, not
    `program.ts`. Also the 8 wrong volume splits and the `Standing Calf Raise` block errors.
15. **Implement double-progression step 3** — add weight and drop back to the range floor. Only
    the prefill half exists (`session-initializer.ts:60`).
16. **Rewire the validators** — add `typecheck`, `verify:program`, `verify:links` to
    `package.json`; make both Python scripts path-relative (they hardcode
    `/home/rounakkumarsingh/…`); fix `verify_program.py`, which hardcodes the Foundation Push
    expectation as 5 exercises and therefore _cannot_ catch this class of drift.
17. **Later / optional:** warm-up load ladder (45/60/75/85% — absent from `docs/domain/` and the
    `ExercisePrescription` type), post-week-12 loop, bodyweight chart.

---

## Phase 3 — Progress photos, wired properly

18. `npx expo install expo-image-picker` — the one dependency addition, justified by the feature.
19. Rewrite `PhotoCapture` as a real camera-roll flow (permission request, angle selector,
    comparison against the most recent photo of the same angle); mount `PhotoGallery` on
    `app/(tabs)/progress/index.tsx`; add the `expo-image-picker` plugin +
    `NSPhotoLibraryUsageDescription` / `NSCameraUsageDescription` to `app.json`.
20. Repairs the real defects behind it: `createProgressPhoto` is never called, and no screen
    implements an error state.

---

## Phase 4 — Accessibility, contrast, hygiene

21. **Fix the failing tokens first** (partly addressed by the UI-polish token update: `textSecondary`, `textTertiary`, `successText`, `borderControl`; `textMuted`, `goldDim`/`goldSurface` and the other border tokens are unchanged) — one edit fixes many sites: `textTertiary #555` 2.66:1
    (38 style blocks), `textMuted #444` 2.03:1, `goldDim`/`goldSurface` 2.23:1, and all six
    border tokens under 3:1 (which breaks the documented border-based elevation strategy).
22. **Enforce `MIN_TAP_SIZE`** (currently 0 importers) across the ~14 undersized targets;
    `accessibilityRole`/`State` on `CtaButton`/`GhostButton` (every primary action),
    `radiogroup` on `RpeSelector`, labels on every `TextInput`.
23. **Clear 112 lint warnings** — 54 are one-line `import/no-duplicates`; add the `typecheck`
    script; tighten `tsconfig` with `noUncheckedIndexedAccess` (matters: `program.ts` is
    array-indexed throughout and currently silently typed non-undefined).
24. **Fix the unloaded font** — `SpaceMono_800ExtraBold` used at `pr-celebration.tsx:280` but
    never loaded, so it renders as fallback.
25. **Delete dead code** — ~13 unreferenced template components, `constants/theme.ts` +
    `constants/ui.ts` template remnants, and reconcile the divergent duplicate steppers
    (`SetPill`/`WeightInput`/`RepsInput` are unused while the detail screen re-implements them
    inline). _Confirm this list before deleting._
26. **Docs drift** — README misdirects to `constants/` for design tokens (real tokens are
    `src/theme/tokens.ts`); missing iOS `bundleIdentifier`; `AGENTS.md` names Expo `v54.0.0`
    but the repo pins `~54.0.34`.

---

## Risks

- **Phase 2 step 11 is the highest-uncertainty item.** Regex extraction already proved
  unreliable; the script must be validated against hand-checked pages before any data edit.
- **Phase 4 step 25 is the only step that deletes ~15 files.** Requires explicit confirmation of
  the list first.

## Decisions on record

- Full 4-phase scope in one pass.
- Validators wired into `package.json`; path-relative. No new test dependencies, no CI.
- Program data gated on a structural extraction script plus hand-checked spot pages.
- Photos: wire up properly with `expo-image-picker` rather than delete.
