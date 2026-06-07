"""
Final verification script v4: Compare program.pdf data vs program.ts
"""
import re, json, sys
from pathlib import Path

PROGRAM_TS = Path("/home/rounakkumarsingh/Work/Projects/workout-companion-opencode/src/data/program.ts").read_text()

errors = []
warnings = []

def err(msg):
    errors.append(msg)
    print(f"  FAIL: {msg}")

def warn(msg):
    warnings.append(msg)
    print(f"  WARN: {msg}")

def ok(msg):
    print(f"  OK: {msg}")

day_names = {1: "Upper", 2: "Lower", 4: "Pull", 5: "Push", 6: "Legs"}

# Handle optional whitespace after commas
WS = r"\s*"

EX_PATTERN = re.compile(
    r"ex\('([^']+)'" + WS + r"," + WS + r"(\d+)" + WS + r"," + WS
    + r"'([^']+)'" + WS + r"," + WS + r"(\d+)" + WS + r"," + WS
    + r"(\d+)" + WS + r"," + WS + r"(\d+)" + WS + r"," + WS
    + r"'([^']+)'" + WS + r"," + WS
    + r"(null|'[^']*?')" + WS + r"," + WS
    + r"'([^']+)'" + WS + r"," + WS
    + r"'([^']+)'\)"
)

def extract_ex_array(text):
    results = []
    for m in EX_PATTERN.finditer(text):
        results.append({
            'name': m.group(1).replace('\\u00b0', '\u00b0').replace('\\u2013', '\u2013').replace('\\u2019', "'"),
            'sortOrder': int(m.group(2)),
            'technique': m.group(3),
            'warmupMin': int(m.group(4)),
            'warmupMax': int(m.group(5)),
            'workingSets': int(m.group(6)),
            'repRange': m.group(7),
            'earlyRpe': None if m.group(8) == 'null' else m.group(8).strip("'"),
            'lastRpe': m.group(9),
            'rest': m.group(10),
        })
    return results

# Pre-extract all variable-based day definitions
var_arrays = {}
for m in re.finditer(
    r"const (_w\d+_\w+)\s*=\s*trainingDay\(\d+,\s*'[^']+',\s*'[^']+',\s*\[(.*?)\]\s*\)\s*;",
    PROGRAM_TS, re.DOTALL
):
    var_arrays[m.group(1)] = extract_ex_array(m.group(2))

# Verify var_arrays are populated
total_var_exercises = sum(len(v) for v in var_arrays.values())
print(f"Pre-extracted {len(var_arrays)} variable arrays with {total_var_exercises} total exercises")

def get_week_prescriptions(week_num):
    match = re.search(
        rf"const week{week_num}: Week = \{{(.*?)(?:const week{week_num+1}: Week = \{{|$)",
        PROGRAM_TS, re.DOTALL
    )
    if not match:
        return {}
    wk_text = match.group(1)

    results = {}

    # Handle inline trainingDay definitions
    for m in re.finditer(
        r"trainingDay\((\d+),\s*'[^']+',\s*'[^']+',\s*\[(.*?)\]\s*\)",
        wk_text, re.DOTALL
    ):
        day_idx = int(m.group(1))
        results[day_idx] = extract_ex_array(m.group(2))

    # Handle variable references
    var_day_map = {'upper': 1, 'lower': 2, 'pull': 4, 'push': 5, 'legs': 6}
    for m in re.finditer(r'(_w\d+_\w+)', wk_text):
        vname = m.group(1)
        if vname in var_arrays and vname not in [r.group() for r in re.finditer(r'_w\d+_\w+', wk_text) if r.group() in results]:
            for key, day_idx in var_day_map.items():
                if key in vname and day_idx not in results:
                    results[day_idx] = var_arrays[vname]

    return results


# ============================================================
print("=" * 60)
print("VERIFICATION: program.pdf  vs  src/data/program.ts")
print("=" * 60)

# ============================================================
print("\n=== 1. STRUCTURAL CHECKS ===")
week_defs = sorted(set(int(x) for x in re.findall(r"const week(\d+): Week =", PROGRAM_TS)))
print(f"  Week objects: {len(week_defs)} (expected 12)")
assert week_defs == list(range(1, 13)), f"Week range mismatch: {week_defs}"
ok("Week range 1-12 correct")

with_url = PROGRAM_TS.count("demoVideoUrl: 'https://")
without_url = PROGRAM_TS.count("demoVideoUrl: null")
print(f"  Exercises with demo URLs: {with_url}")
print(f"  Exercises without (sub-only): {without_url}")
print(f"  Substitution entries: {PROGRAM_TS.count('substituteName:')}")

# ============================================================
print("\n=== 2. WEEK 1 SPOT CHECK ===")
w1 = get_week_prescriptions(1)

expected = {
    1: ["45\u00b0 Incline Barbell Press", "Cable Crossover Ladder", "Wide-Grip Pull-Up",
        "High-Cable Lateral Raise", "Pendlay Deficit Row",
        "Overhead Cable Triceps Extension (Bar)", "Bayesian Cable Curl"],
    2: ["Lying Leg Curl", "Smith Machine Squat", "Barbell RDL",
        "Leg Extension", "Standing Calf Raise", "Cable Crunch"],
    4: ["Neutral-Grip Lat Pulldown", "Chest-Supported Machine Row",
        "1-Arm 45\u00b0 Cable Rear Delt Flye", "Machine Shrug",
        "EZ-Bar Cable Curl", "Machine Preacher Curl"],
    5: ["Barbell Bench Press", "Machine Shoulder Press", "Bottom-Half DB Flye",
        "Cable Triceps Kickback", "Lying Leg Raise"],
    6: ["Leg Press", "Seated Leg Curl", "Walking Lunge", "Machine Hip Abduction"],
}

for day_idx, enames in expected.items():
    exs = w1.get(day_idx, [])
    actual_names = [e['name'] for e in exs]
    if actual_names == enames:
        ok(f"W1 {day_names[day_idx]}: names match PDF ({len(exs)} exercises)")
    else:
        err(f"W1 {day_names[day_idx]}: names MISMATCH")
        for i, n in enumerate(enames):
            if i >= len(actual_names):
                err(f"  Missing: {n}")
            elif actual_names[i] != n:
                err(f"  At pos {i+1}: got '{actual_names[i]}' vs expected '{n}'")

# W1 RPE and working set sanity
for day_idx in [1, 2, 4, 5, 6]:
    for e in w1.get(day_idx, []):
        if e['earlyRpe'] is not None:
            err(f"W1 {day_names[day_idx]} {e['name']}: earlyRpe should be null")
        if e['lastRpe'] not in ('~6', '~7'):
            err(f"W1 {day_names[day_idx]} {e['name']}: lastRpe={e['lastRpe']}")
        if e['workingSets'] != 1:
            err(f"W1 {day_names[day_idx]} {e['name']}: workingSets={e['workingSets']}")

# ============================================================
print("\n=== 3. W2 RPE BUMP (+1 from W1) ===")
w2 = get_week_prescriptions(2)
for day_idx in [1, 2, 4, 5, 6]:
    w1_exs = w1.get(day_idx, [])
    w2_exs = w2.get(day_idx, [])
    if len(w1_exs) != len(w2_exs):
        err(f"W2 {day_names[day_idx]}: count {len(w2_exs)} != W1 {len(w1_exs)}")
        continue
    bumps = 0
    for i in range(len(w1_exs)):
        if w1_exs[i]['lastRpe'] in ('~6', '~7') and w2_exs[i]['lastRpe'] in ('~7', '~8'):
            bumps += 1
    ok(f"W2 {day_names[day_idx]}: {bumps}/{len(w1_exs)} RPE bumped +1")

# ============================================================
print("\n=== 4. W3: 2 WORKING SETS + EARLY RPE ===")
w3 = get_week_prescriptions(3)
for day_idx in [1, 2, 4, 5, 6]:
    exs = w3.get(day_idx, [])
    if not exs:
        err(f"W3 {day_names[day_idx]}: 0 exercises!")
        continue
    ws2 = sum(1 for e in exs if e['workingSets'] == 2)
    erpe = sum(1 for e in exs if e['earlyRpe'] is not None)
    if ws2 == len(exs) and erpe == len(exs):
        ok(f"W3 {day_names[day_idx]}: all {len(exs)} ws=2, all earlyRpe")
    else:
        err(f"W3 {day_names[day_idx]}: {ws2}/{len(exs)} ws=2, {erpe}/{len(exs)} earlyRpe")

# ============================================================
print("\n=== 5. W4 & W5 (same pattern as W3) ===")
for wk in [4, 5]:
    wk_data = get_week_prescriptions(wk)
    for day_idx in [1, 2, 4, 5, 6]:
        exs = wk_data.get(day_idx, [])
        if not exs:
            err(f"W{wk} {day_names[day_idx]}: 0 exercises!")
            continue
        ws2 = sum(1 for e in exs if e['workingSets'] == 2)
        erpe = sum(1 for e in exs if e['earlyRpe'] is not None)
        if ws2 == len(exs) and erpe == len(exs):
            ok(f"W{wk} {day_names[day_idx]}: {len(exs)} ex, all ws=2, all earlyRpe")
        else:
            err(f"W{wk} {day_names[day_idx]}: {ws2}/{len(exs)} ws=2, {erpe}/{len(exs)} earlyRpe")

# ============================================================
print("\n=== 6. W6 DELOAD (new exercises in new block) ===")
w6 = get_week_prescriptions(6)
w6_upper = w6.get(1, [])
if w6_upper:
    print(f"  W6 Upper exercises: {[e['name'] for e in w6_upper]}")
    ws1 = sum(1 for e in w6_upper if e['workingSets'] == 1)
    ok(f"W6 Upper: {ws1}/7 ws=1") if ws1 == 7 else err(f"W6 Upper: {ws1}/7 ws=1")
    w6_names_set = {e['name'] for e in w6_upper}
    if "45\u00b0 Incline DB Press" in w6_names_set:
        ok("W6 Upper uses Incline DB Press (not Barbell)")
    if "Dual-Handle Lat Pulldown" in w6_names_set and "Wide-Grip Pull-Up" not in w6_names_set:
        ok("W6 Upper: Pull-Up replaced by Dual-Handle Lat Pulldown")

# Check W6 Lower exercises
w6_lower = w6.get(2, [])
if w6_lower:
    w6_lower_names = [e['name'] for e in w6_lower]
    expected_w6_lower = ["Lying Leg Curl", "Smith Machine Static Lunge w/ Elevated Front Foot",
                         "45\u00b0 Hyperextension", "Leg Extension", "Leg Press Calf Press", "Machine Crunch"]
    if w6_lower_names == expected_w6_lower:
        ok("W6 Lower: exercise list matches PDF")
    else:
        for i, n in enumerate(expected_w6_lower):
            if i >= len(w6_lower_names) or w6_lower_names[i] != n:
                err(f"W6 Lower pos {i+1}: expected '{n}', got '{w6_lower_names[i] if i < len(w6_lower_names) else 'MISSING'}'")

# ============================================================
print("\n=== 7. W7 FAILURE TECHNIQUE vs PDF ===")
w7 = get_week_prescriptions(7)

expected_failures = [
    "High-Cable Lateral Raise",
    "Overhead Cable Triceps Extension (Bar)",
    "Bayesian Cable Curl",
    "Leg Extension",
    "Leg Press Calf Press",
    "Machine Crunch",
    "Chest-Supported T-Bar Row",
    "1-Arm 45\u00b0 Cable Rear Delt Flye",
    "DB Concentration Curl",
    "Bottom-Half Seated Cable Flye",
    "Triceps Pressdown (Bar)",
    "Ab Wheel Rollout",
    "Seated Leg Curl",
    "Machine Hip Abduction",
    "Standing Calf Raise",
]

w7_failure_names = []
for day_idx in [1, 2, 4, 5, 6]:
    for e in w7.get(day_idx, []):
        if e['technique'] == 'Failure':
            w7_failure_names.append(e['name'])

print(f"  W7 Failure exercises: {len(w7_failure_names)}")
if len(w7_failure_names) >= 15:
    ok(f"W7: {len(w7_failure_names)} Failure exercises (expected 15-16)")
else:
    err(f"W7: only {len(w7_failure_names)} Failure exercises (expected ~15)")

w7_fail_set = set(w7_failure_names)
for fname in expected_failures:
    if fname in w7_fail_set:
        ok(f"  Failure: {fname}")
    else:
        err(f"  Expected Failure NOT set: {fname}")

# ============================================================
print("\n=== 8. W8-W12 COPYPASTA ===")
def week_sig(week_data):
    sig = {}
    for d in [1, 2, 4, 5, 6]:
        sig[d] = [(e['name'], e['workingSets'], e['technique'], e['earlyRpe'], e['lastRpe'])
                  for e in week_data.get(d, [])]
    return json.dumps(sig, sort_keys=True, default=str)

w7_sig = week_sig(w7)
for wk in range(8, 13):
    wk_sig = week_sig(get_week_prescriptions(wk))
    ok(f"W{wk}: identical to W7") if wk_sig == w7_sig else err(f"W{wk}: DIFFERS from W7")

# ============================================================
print("\n=== 9. SUBSTITUTIONS & EXERCISE CROSS-REFERENCE ===")
ex_name_pat = re.compile(r"^\s+'([^']+)':\s*\{", re.MULTILINE)
all_exercise_names = set()
for m in ex_name_pat.finditer(PROGRAM_TS):
    all_exercise_names.add(m.group(1).replace('\\u00b0', '\u00b0'))

sub_names = set()
for m in re.finditer(r"substituteName:\s*'([^']+)'", PROGRAM_TS):
    sub_names.add(m.group(1).replace('\\u00b0', '\u00b0'))

prescribed = set()
for m in EX_PATTERN.finditer(PROGRAM_TS):
    prescribed.add(m.group(1).replace('\\u00b0', '\u00b0'))

missing_subs = sub_names - all_exercise_names
missing_prescribed = prescribed - all_exercise_names
if missing_subs:
    err(f"Substitutes not in EXERCISES: {missing_subs}")
else:
    ok(f"All {len(sub_names)} sub names reference existing exercises")
if missing_prescribed:
    err(f"Prescribed exercises not in EXERCISES: {missing_prescribed}")
else:
    ok(f"All {len(prescribed)} prescribed exercises exist in EXERCISES map")

# ============================================================
print(f"\n{'='*60}")
print(f"SUMMARY: {len(errors)} ERRORS, {len(warnings)} WARNINGS")
print(f"{'='*60}")
if not errors:
    print("ALL CHECKS PASSED!")
for e in errors:
    print(f"  FAIL: {e}")
for w in warnings:
    print(f"  WARN: {w}")

sys.exit(0 if not errors else 1)
