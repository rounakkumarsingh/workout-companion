# Day Muscle Map

`src/data/day-muscles.ts` decides which muscle groups the `DayFigure` silhouette
highlights for each training day (Home week strip, today's preview card, rest and
program-complete states).

**This is app metadata, not from the program PDF.** The PDF names exercises but
never lists target muscles per day. The map came from the UI polish design and was
checked against the Week 1 exercises in `src/data/program.ts`. It is display only and
does not affect scheduling, prescriptions or progression.

## Check against Week 1 exercises

| Day | Exercises | Primary groups | Result |
| --- | --- | --- | --- |
| Upper | 45° Incline Barbell Press, Cable Crossover Ladder, Wide-Grip Pull-Up, High-Cable Lateral Raise, Pendlay Deficit Row, Overhead Cable Triceps Extension, Bayesian Cable Curl | chest, deltFront, deltSide, rearDelts, lats, upperBack, biceps, triceps (secondary: traps, forearms) | Matches |
| Lower | Lying Leg Curl, Smith Machine Squat, Barbell RDL, Leg Extension, Standing Calf Raise, Cable Crunch | glutes, hamstrings, quads, calves, abs (secondary: lowerBack, obliques) | Matches |
| Pull | Neutral-Grip Lat Pulldown, Chest-Supported Machine Row, 1-Arm Cable Rear Delt Flye, Machine Shrug, EZ-Bar Cable Curl, Machine Preacher Curl | lats, upperBack, traps, rearDelts, biceps (secondary: forearms) | Matches |
| Push | Barbell Bench Press, Machine Shoulder Press, Bottom-Half DB Flye, High-Cable Lateral Raise, Overhead Cable Triceps Extension, Cable Triceps Kickback, Lying Leg Raise | chest, deltFront, deltSide, triceps | **Changed:** added `abs` as secondary for Lying Leg Raise, which the design omitted |
| Legs | Leg Press, Seated Leg Curl, Walking Lunge, Machine Hip Abduction, Standing Calf Raise | quads, hamstrings, glutes, calves | Matches |

Rest has no highlighted groups. Per-exercise muscle maps are deliberately not
included.
