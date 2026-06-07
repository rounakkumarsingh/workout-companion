# Workout Schema — BTS Beginner Program

Extracted from `docs/program.pdf`. Describes the structural schema of the program without enumerating every exercise.

---

## Program Structure (Top-Down)

### 1. Block

The program is divided into two blocks:

| Block | Weeks | Description |
|-------|-------|-------------|
| Foundation Block | 1–5 | Lower volume; technique mastery; 1 working set per exercise |
| Ramping Block | 6–12 | Higher volume; intensification techniques; 2–3 working sets per exercise |

### 2. Weekly Cycle

Each week follows a fixed 7-day rotation:

| Day | Type | Sub-Type | Activity |
|-----|------|----------|----------|
| 1 | Upper | Strength Focus | Training |
| 2 | Lower | Strength Focus | Training |
| 3 | Optional Cardio / HIIT | — | User-optional; logged if performed |
| 4 | Pull | Hypertrophy Focus | Training |
| 5 | Push | Hypertrophy Focus | Training |
| 6 | Legs | Hypertrophy Focus | Training |
| 7 | Full Rest | — | No training; no tracking |

### 3. Day (Workout / Rest)

Each training day (Upper, Lower, Pull, Push, Legs) contains an ordered list of exercises. Day 3 (Optional Cardio / HIIT) contains no structured exercise list — the user may optionally log cardio duration/type. Day 7 (Full Rest) contains no activity at all.

The exercises and their parameters are fixed per day per week. Some exercises span weeks (same exercise, different prescription). Others rotate in/out between blocks.

### 4. Exercise

Each row in the workout table represents one exercise with the following structural fields.

---

## Table Columns (Program-Defined)

These columns are prescribed by the program and define the workout plan.

| Column | Label in PDF | Type | Description |
|--------|-------------|------|-------------|
| `name` | Exercise | string | Exercise name. May span two lines in the PDF (e.g. "45° Incline Barbell" / "Press"). |
| `technique` | Technique | enum | `"N/A"` or `"Failure"`. Indicates intensification technique for the exercise. |
| `warmup_sets` | Warm-up Sets | integer range (min–max) | Number of warm-up sets prescribed (e.g. `2-3` = 2 to 3 sets). |
| `working_sets` | SETS | integer | Number of prescribed working sets for the exercise (1, 2, or 3). |
| `rep_range` | Reps | string | Target rep range (e.g. `"6-8"`, `"8-10"`, `"10-12"`, `"12-15"`, `"15-20"`, `"10-20"`). |
| `set_rpe` | Set RPE | string or null | RPE target for *early* (non-last) working sets. `null` when `working_sets` = 1. Values: `"N/A"`, `"~6"`, `"~7"`, `"~8"`, `"~7-8"`, `"~8-9"`. |
| `last_set_rpe` | Last Set RPE | string | RPE target for the *last* working set. Values: `"~6"`, `"~7"`, `"~8"`, `"~7-8"`, `"~8-9"`, `"10"`. |
| `rest` | Rest | string | Rest period between sets (e.g. `"3-5 min"`, `"2-3 min"`, `"1-2 min"`). |
| `sub_option_1` | Substitution Option 1 | string | First alternative exercise to substitute if the primary is unavailable. |
| `sub_option_2` | Substitution Option 2 | string | Second alternative exercise. |
| `notes` | NOTES | string | Free-text execution cues, form tips, setup instructions, and programming notes. |

---

## Table Columns (User-Tracking / Logging)

These columns are the interface between the program prescription and the user's actual performance. The PDF's column header labels them as `SET 1`, `SET 2`, `SET 3`, `SET 4` under the "Tracking Load and Reps" section.

| Column | Description |
|--------|-------------|
| `set_1` | Logged data for working set 1 (weight + reps) |
| `set_2` | Logged data for working set 2 (present only when `working_sets >= 2`) |
| `set_3` | Logged data for working set 3 (present only when `working_sets >= 3`) |
| `set_4` | Logged data for working set 4 (never populated in the current program; reserved for future expansion) |

Each SET column stores:
- **weight** (numeric, lbs or kg based on user preference)
- **reps** (numeric, actual reps completed)

---

## Column Count Variation by Week

The number of displayed SET columns and the presence of the `set_rpe` column depend on `working_sets`:

| Weeks | Working Sets | SET Columns Shown | `set_rpe` Column |
|-------|-------------|-------------------|------------------|
| 1–2 | 1 | SET 1 | Hidden (value is `"N/A"`) |
| 3–5 | 2 | SET 1, SET 2 | Present |
| 6–12 | 1–3 | SET 1–SET 3 | Present (or `"N/A"` when 1 set) |

---

## Relationships

```
Block (Foundation 1-5 | Ramping 6-12)
 └── Week (1-12)
      └── Day (Upper | Lower | Optional Cardio/HIIT | Pull | Push | Legs | Full Rest)
           ├── day_type: enum of 7 types
           ├── focus_type: Strength Focus | Hypertrophy Focus
           ├── activity: Training | Optional Cardio/HIIT | Full Rest
           └── Exercise (ordered list, training days only)
                ├── Program-defined fields (name, technique, warmup_sets, working_sets, rep_range, set_rpe, last_set_rpe, rest, sub_option_1, sub_option_2, notes)
                └── User-logged fields (set_1, set_2, set_3, set_4)
                     ├── Each set: { weight: number, reps: number }
```

### Cardinality

- A **Block** contains many **Weeks**.
- A **Week** contains exactly 7 **Days** (fixed rotation).
- A **Day** has one `day_type`, an `activity` (Training | Optional Cardio/HIIT | Full Rest), and a `focus_type` (Strength Focus | Hypertrophy Focus) on training days.
- A **training Day** (Upper, Lower, Pull, Push, Legs) contains 1+ **Exercises** (ordered).
- **Optional Cardio/HIIT Day** contains no structured exercises — user may optionally log cardio duration/type.
- **Full Rest Day** contains no activity or tracking.
- An **Exercise** has exactly 1 set of program-defined parameters per occurrence.
- An **Exercise** in a Day has N **Set Logs** where N = `working_sets` (1–3).

---

## Key Terminology (Preserved from Original Program)

| Original Term | Canonical Field |
|---------------|----------------|
| Early Sets | All working sets before the Last Set |
| Last Set | The final working set, pushed closer to failure |
| Last-Set Intensity | Grouping header for `set_rpe` + `last_set_rpe` |
| Set RPE | RPE target for early sets |
| Last Set RPE | RPE target for the last set |
| Working Sets | Number of prescribed work sets |
| Warm-Up Sets | Sets performed before working sets at lighter weight |
| Tracking Load and Reps | Section header for the SET 1–4 logging columns |
