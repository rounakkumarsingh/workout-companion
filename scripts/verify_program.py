#!/usr/bin/env python3
"""
Verify src/data/program.ts against docs/program.pdf.

The PDF is the source of truth for the training system, so the expectations
are read from it at run time rather than transcribed into this file. An
earlier version hardcoded all 372 expected rows; that is how a 5-exercise
Foundation Push day was recorded as correct when the PDF prescribes 7.

    python3 scripts/verify_program.py                  # extract, then compare
    python3 scripts/verify_program.py --from-json X    # reuse an extraction

Exits 0 when program.ts matches the PDF, 1 otherwise. Requires poppler-utils
(`pdftohtml`) for the extraction, unless --from-json is given.
"""
from __future__ import annotations

import argparse
import bisect
import collections
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROGRAM_TS = ROOT / "src" / "data" / "program.ts"
EXTRACTOR = ROOT / "scripts" / "extract_program.py"
PDF = ROOT / "docs" / "program.pdf"

# Canonical training-day order. The PDF's own rotated day label is unreliable:
# pages 5 and 6 both print "Lower (Strength Focus)", so the label is not used
# to decide which day a page is. Page 6 is corrected below from its content.
PDF_DAY = ["Upper", "Lower", "Pull", "Push", "Legs"]


def die(msg: str) -> "None":
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def load_pdf(from_json: str | None) -> dict:
    if from_json:
        path = Path(from_json)
        if not path.exists():
            die(f"--from-json: no such file: {path}")
        return json.loads(path.read_text())

    if not PDF.exists():
        die(f"missing source PDF: {PDF}")
    if shutil.which("pdftohtml") is None:
        die(
            "pdftohtml not found, so the PDF cannot be read and this check "
            "cannot run. Install poppler-utils, or pass --from-json with a "
            "previous `scripts/extract_program.py` run."
        )

    proc = subprocess.run(
        [sys.executable, str(EXTRACTOR), "--pdf", str(PDF), "--quiet"],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        die(f"extractor failed ({proc.returncode}):\n{proc.stderr.strip()}")
    return json.loads(proc.stdout)


# ---------- program.ts parsing ----------
# program.ts is TypeScript, so it is read structurally rather than evaluated:
# call arguments are split with a quote/bracket-aware scanner so that commas
# inside string literals and nested calls do not split a row.
def balanced(src: str, i: int) -> str | None:
    """Return the text inside the brackets starting at src[i] == '(' or '['."""
    if i >= len(src) or src[i] not in "([":
        return None
    open_c, close_c = src[i], ")" if src[i] == "(" else "]"
    depth, in_str, quote, esc = 0, False, "", False
    for j in range(i, len(src)):
        ch = src[j]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                in_str = False
            continue
        if ch in "'\"`":
            in_str, quote = True, ch
        elif ch == open_c:
            depth += 1
        elif ch == close_c:
            depth -= 1
            if depth == 0:
                return src[i + 1 : j]
    return None


def split_args(body: str) -> list[str]:
    args, cur, depth, in_str, quote, esc = [], "", 0, False, "", False
    for ch in body:
        if in_str:
            cur += ch
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == quote:
                in_str = False
            continue
        if ch in "'\"`":
            in_str, quote = True, ch
            cur += ch
        elif ch in "([{":
            depth += 1
            cur += ch
        elif ch in ")]}":
            depth -= 1
            cur += ch
        elif ch == "," and depth == 0:
            args.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        args.append(cur.strip())
    return args


_UNICODE = re.compile(r"\\u([0-9a-fA-F]{4})")


def _unescape(s: str) -> str:
    s = s.replace("\\'", "'").replace("\\\\", "\\")
    return _UNICODE.sub(lambda m: chr(int(m.group(1), 16)), s)


def unq(a: str):
    a = a.strip()
    if a == "null":
        return None
    if a.startswith("'"):
        return _unescape(a[1:-1])
    try:
        return int(a)
    except ValueError:
        return a


def parse_program(src: str) -> tuple[dict, dict]:
    """Return ({(week, dayType): [exercise rows]}, {exerciseName: videoUrl})."""
    by_week: dict[int, dict[str, list]] = collections.defaultdict(dict)
    problems: list[str] = []

    spans = []
    for m in re.finditer(r"(?<!function )\btrainingDay\(", src):
        body = balanced(src, m.end() - 1)
        if body is None:
            continue
        # `body` is a contiguous slice of `src` starting at m.end(), so an
        # offset found inside it must be rebased before being used against src.
        base = m.end()
        args = split_args(body)
        if len(args) < 4:
            continue
        spans.append((m.start(), unq(args[1])))
        rows = []
        for e in re.finditer(r"(?<!function )\bex\(", body):
            eb = balanced(src, base + e.end() - 1)
            if eb is None:
                problems.append("unbalanced ex() call")
                continue
            v = [unq(x) for x in split_args(eb)]
            if len(v) != 10:
                problems.append(f"ex() with {len(v)} args (expected 10) in day {unq(args[1])}")
                continue
            rows.append(
                {
                    "name": v[0], "order": v[1], "technique": v[2],
                    "wmin": v[3], "wmax": v[4], "sets": v[5],
                    "reps": v[6], "early": v[7], "last": v[8], "rest": v[9],
                }
            )
        spans[-1] = (spans[-1][0], spans[-1][1], rows)

    # Two declaration shapes exist: weeks 1-6 name the day in a const declared
    # *before* its weekNumber block, so nearby weekNumber is the wrong anchor;
    # weeks 7-12 declare the day inline, where weekNumber is the only anchor.
    wknums = [(m.start(), int(m.group(1))) for m in re.finditer(r"weekNumber:\s*(\d+)", src)]
    wstarts = [w[0] for w in wknums]

    for pos, dt, rows in spans:
        lead = src[max(0, pos - 70) : pos]
        nm = re.search(r"const _w(\d+)_(?:upper|lower|pull|push|legs)\s*(?::[^=]*)?=\s*$", lead)
        if nm:
            week = int(nm.group(1))
        else:
            idx = bisect.bisect_right(wstarts, pos) - 1
            if idx < 0:
                problems.append(f"trainingDay({dt}) could not be mapped to a week")
                continue
            week = wknums[idx][1]
        if dt in by_week[week]:
            problems.append(f"duplicate day {dt} in week {week}")
        by_week[week][dt] = rows

    vid_re = re.compile(
        r"^  '((?:[^'\\]|\\.)*)': \{\n    name: '[^']*',\n    demoVideoUrl: (null|'[^']*'),",
        re.M,
    )
    videos = {
        _unescape(m.group(1)): (None if m.group(2) == "null" else _unescape(m.group(2)[1:-1]))
        for m in vid_re.finditer(src)
    }
    return by_week, videos, problems


# ---------- comparison helpers ----------
def as_range(v):
    if v is None:
        return None
    m = re.match(r"^(\d+)\s*-\s*(\d+)$", str(v).strip())
    return (int(m.group(1)), int(m.group(2))) if m else None


def norm(v) -> str:
    return "" if v is None else re.sub(r"\s+", "", str(v))


def norm_lower(v) -> str:
    return norm(v).lower()


# The PDF prints the literal "N/A" in cells the program leaves unset, while
# program.ts spells that absence as null. Treat the two as the same value
# rather than reporting a discrepancy for every unset RPE.
UNSET = {"", "N/A", "NA", "-"}


def val_eq(pdf_val, code_val) -> bool:
    if pdf_val is None or norm(pdf_val).upper() in UNSET:
        return code_val is None
    if code_val is None:
        return False
    return norm(pdf_val) == norm(code_val)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--from-json", help="use a previous extractor run instead of re-extracting")
    args = ap.parse_args()

    if not PROGRAM_TS.exists():
        die(f"missing {PROGRAM_TS}")
    src = PROGRAM_TS.read_text()
    pdf = load_pdf(args.from_json)

    code, code_videos, problems = parse_program(src)

    issues: dict[str, list[str]] = collections.defaultdict(list)

    pdf_by_week: dict[int, dict[str, dict]] = collections.defaultdict(dict)
    for day in pdf["days"]:
        dt = day["day_type_from_label"]
        if day["page"] == 6:
            # Source-PDF typo: page 6 prints "Lower (Strength Focus)" but holds
            # the Pull day (Cable Pulldown variants). Keyed on content, not label.
            dt = "Pull"
        pdf_by_week[day["week"]][dt] = day
    for day in pdf["days"]:
        for w in day.get("warnings", []) or []:
            issues["extractor_warning"].append(f"p{day['page']}: {w}")

    for week in sorted(pdf_by_week):
        for dt in PDF_DAY:
            pday = pdf_by_week[week].get(dt)
            if pday is None:
                issues["missing_day"].append(f"week {week} {dt} absent from the PDF")
                continue
            cday = code.get(week, {}).get(dt)
            if cday is None:
                issues["missing_day"].append(f"week {week} {dt} absent from program.ts")
                continue

            pex = [e for e in pday["exercises"] if e["name"]]
            pnames = [e["name"] for e in pex]
            cnames = [e["name"] for e in cday]
            if pnames != cnames:
                only_pdf = [n for n in pnames if n not in cnames]
                only_code = [n for n in cnames if n not in pnames]
                if only_pdf or only_code:
                    issues["exercise_set"].append(
                        f"week {week} {dt}: missing from code {only_pdf}; not in PDF {only_code}"
                    )
                else:
                    issues["exercise_order"].append(f"week {week} {dt}: order differs")
                if len(pnames) != len(cnames):
                    issues["exercise_count"].append(
                        f"week {week} {dt}: pdf {len(pnames)} rows, code {len(cnames)}"
                    )

            pmap = {e["name"]: e for e in pex}
            cmap = {e["name"]: e for e in cday}
            for name in [n for n in pnames if n in cmap]:
                p, c = pmap[name], cmap[name]
                if p["working_sets"] != str(c["sets"]):
                    issues["working_sets"].append(
                        f"week {week} {dt} {name}: pdf {p['working_sets']!r} code {c['sets']!r}"
                    )
                wu = as_range(p["warmup_sets"])
                if wu is not None and wu != (c["wmin"], c["wmax"]):
                    issues["warmup_sets"].append(
                        f"week {week} {dt} {name}: pdf {p['warmup_sets']!r} code {c['wmin']}-{c['wmax']}"
                    )
                if norm(p["reps"]) != norm(c["reps"]):
                    issues["reps"].append(f"week {week} {dt} {name}: pdf {p['reps']!r} code {c['reps']!r}")
                if not val_eq(p["early_rpe"], c["early"]):
                    issues["early_rpe"].append(
                        f"week {week} {dt} {name}: pdf {p['early_rpe']!r} code {c['early']!r}"
                    )
                if not val_eq(p["last_rpe"], c["last"]):
                    issues["last_rpe"].append(
                        f"week {week} {dt} {name}: pdf {p['last_rpe']!r} code {c['last']!r}"
                    )
                if norm_lower(p["rest"]) != norm_lower(c["rest"]):
                    issues["rest"].append(f"week {week} {dt} {name}: pdf {p['rest']!r} code {c['rest']!r}")

    pdf_video_count = 0
    for day in pdf["days"]:
        for e in day["exercises"]:
            for slot in ("option1", "option2"):
                name, vid = e[slot], e[f"{slot}_video"]
                if not name or not vid:
                    continue
                pdf_video_count += 1
                if name not in code_videos:
                    issues["video_missing_entry"].append(f"{name!r} has a PDF video but no EXERCISES entry")
                elif code_videos[name] != vid:
                    issues["video_mismatch"].append(
                        f"{name!r}: pdf {vid} code {code_videos[name]}"
                    )

    for p in problems:
        issues["program_ts_parse"].append(p)

    print(f"source: {PDF if not args.from_json else args.from_json}")
    print(f"  weeks          : {len(pdf_by_week)}")
    print(f"  pdf rows       : {sum(d['exercise_count'] for d in pdf['days'])}")
    print(f"  code rows      : {sum(len(v) for d in code.values() for v in d.values())}")
    print(f"  EXERCISES      : {len(code_videos)}")
    print(f"  pdf videos     : {pdf_video_count}")

    order = [
        "program_ts_parse", "extractor_warning", "missing_day", "exercise_set",
        "exercise_order", "exercise_count", "working_sets", "warmup_sets",
        "reps", "early_rpe", "last_rpe", "rest", "video_mismatch",
        "video_missing_entry",
    ]
    total = 0
    for key in order:
        found = issues.get(key, [])
        total += len(found)
        if not found:
            continue
        print(f"\n{key} ({len(found)}):")
        for line in found[:15]:
            print(f"  - {line}")
        if len(found) > 15:
            print(f"  ... and {len(found) - 15} more")

    if total == 0:
        print("\nPASS: program.ts matches the PDF on every checked field")
        return 0
    print(f"\nFAIL: {total} discrepancy(ies) against the PDF")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
