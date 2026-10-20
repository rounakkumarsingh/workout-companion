# Workout Companion: project status

Short, current status. History lives in git (`git log`) and the merged PRs; the old audit plan was removed once its phases shipped.

## What has shipped

| Area                              | What it delivered                                                                                                                                                                                                                                                                                                                                                   | Where                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Boot and migrations (old Phase 0) | Fresh installs boot; migrations are transactional and recorded only after their DDL succeeds; boot errors show a Retry screen; warm-up sets above 3 allowed                                                                                                                                                                                                         | #1, `38ae05f`                       |
| Silent data loss (old Phase 1)    | Newest-50 history order, partial set edits, double-tap guards, wall-clock rest timer, stale-list refresh, FK-safe dev clear                                                                                                                                                                                                                                         | #1, `a3c7b8b`, `3d464f4`, `712555f` |
| Program fidelity (old Phase 2)    | Page-streamed PDF extractor (`scripts/extract_program.py`, output in `docs/extraction/`); `scripts/verify_program.py` checks every row, RPE, rest and exercise/substitution video link against the PDF (`npm run verify:program`); local viewer (`npm run serve:program`); video title check (`scripts/verify_video_titles.py`, 99 videos); 15 exercise links fixed | `e6c669d`, #5                       |
| Double progression                | Suggests +2.5 kg at the range floor once every set hit the top of the range (`WEIGHT_INCREMENT_KG`)                                                                                                                                                                                                                                                                 | #3 (`ccedbff`)                      |
| UI polish                         | Home and workout list redesign, body figures, global colour tokens                                                                                                                                                                                                                                                                                                  | #3                                  |
| Flexible schedule                 | Choose today's workout; a week advances after its five workouts; 7-day lock; CI for lint and format                                                                                                                                                                                                                                                                 | #2                                  |
| Progress tracking (old Phase 3)   | Daily skippable weigh-in, 7-day-average trend chart, monthly photos (camera/library, comparison, delete)                                                                                                                                                                                                                                                            | #6                                  |
| Hygiene (old Phase 4)             | 44px tap targets, accessibility roles/labels, strict types (`noUncheckedIndexedAccess`), dead code removed, iOS bundle id                                                                                                                                                                                                                                           | #4                                  |
| Workout screens                   | "Last time" chip and sheet; substitutions ask "just this time" or "always"                                                                                                                                                                                                                                                                                          | #7                                  |
| Small fixes                       | Week 6 shown as the deload; weigh-in sheet also on resume                                                                                                                                                                                                                                                                                                           | #8                                  |

## Decisions on record

- **Flexible schedule overrides the fixed weekly cycle** (#2). The exercises, prescriptions, progression and RPE rules stay fixed; the weekly order is user-chosen (`AGENTS.md`, `docs/PROJECT_CONTEXT.md`).
- **Two users, each with their own local history.** The iPhone route is **Expo Go + EAS Update** (no paid account). Expo Go supports only the latest SDK, so the project must move from SDK 54 to the current one; updates are published without a `runtimeVersion` because Expo Go cannot load those.
- **The SDK upgrade is owned by another session** (its own worktree and branch), together with the EAS Update setup, the "Export my data" button and `docs/ROLLOUT.md`.
- Photos are copied into the app's document directory; a new photo set is due every 30 days.

## Open

**Needs a device (nothing since the UI polish has run on a phone):** Home picker and states, workout list and quick log, weigh-in sheet and chart, photo capture/permissions/restart, last-time chip and sheet, the substitution prompt, Week 6 label.

**Owned by the SDK session:** SDK 54 to 58 upgrade, EAS Update (`preview` and `stable` branches), "Export my data", `docs/ROLLOUT.md`. Unverified there: whether the iPhone can open the update without project access, and whether the rest-timer notifications (`expo-notifications`) work in Expo Go.

**Not built:** import/restore of an export; Phase 2 extras (warm-up load ladder, loop back to week 1 after week 12, bodyweight chart).

**Design-board gaps:** the program-complete screen has no PR count or best streak; no cardio icon on rows; the old "almost ready" badge is no longer shown (`progressionStatus: 'almost'` is still in `ExerciseRow`'s props but unused); the timer shows whole minutes; Home margins are 20px, the board shows 16px.

**Lint:** 0 errors, about 36 warnings (hook dependencies, `set-state-in-effect`, purity). They were left alone because fixing them can change when effects run.

**Still to check by hand:** video titles cannot prove the right movement. Single-Arm DB Row ("DB ROW") and DB Bench Press ("Dumbbell Chest Press") were confirmed fine by the owner, as was the Walking Lunge video shared by two exercise names.
