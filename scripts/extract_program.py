#!/usr/bin/env python3
"""
Structural, page-streamed extractor for docs/program.pdf.

Design constraints (see PLAN.md Phase 2 step 11):
  * NEVER load the PDF whole. Each page is converted on its own via
    `pdftohtml -xml -f N -l N` and the temp file is discarded immediately.
  * Key on the exercise NAME, never on the page order or the day label.
    docs/program.pdf p.5 and p.6 carry the SAME "Lower (Strength Focus)"
    label while p.6 contains Pull movements, so the label is unreliable and
    the page order is not authoritative.
  * Emit a machine-comparable record per day so it can be diffed against
    src/data/program.ts.

Layout facts this relies on (verified against pages 4-9, 14):
  * Every table cell is an absolutely positioned <text> node. `left` is the
    column, `top` the row.
  * The exercise name is VERTICALLY CENTERED in its row and may wrap to
    several lines, so a wrapped name has a *different* `left` on each line
    ("Lean-In DB Lateral" left=2427, "Raise" left=2490). Grouping cells by
    exact `left` therefore splits names. Names are reassembled as line
    blocks and attached to the nearest row anchor instead.
  * The day label is rotated text: single characters stacked in a narrow
    left band, readable bottom-to-top. Left as-is it produces garbage like
    "sucoFyhporterpyH(hsuP".
  * Week 1-2 pages have one working set per exercise with the "Set RPE"
    column reading N/A. Week 3+ pages carry 2-4 working sets and populate
    BOTH the "Early" (x~1818) and "Last Set" (x~1962) RPE columns, so a
    naive scan for ~N tokens double-counts and conflates the two columns.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PDF = REPO_ROOT / "docs" / "program.pdf"

# Leaf column headers and their x positions come from the page itself; these
# are just the order they must be interpolated between.
HEADER_ORDER = [
    ("exercise", "Exercise"),
    ("technique", "Technique"),
    ("warmup_sets", "Sets"),
    ("working_sets", "SETS"),
    ("reps", "Reps"),
    ("early_rpe", "Set RPE"),
    ("last_rpe", "RPE"),
    ("rest", "Rest"),
    ("option1", "Option 1"),
    ("option2", "Option 2"),
    ("notes", "NOTES"),
]

# Vertical line pitch inside one cell (wrapped lines are ~27 apart).
WRAP_PITCH = 40
# How far any cell may sit from its row's name-block centre.
CELL_SLACK = 100

# Trailing page captions, not exercise data.
FOOTNOTE_RE = re.compile(r"Rest\s*Day", re.I)

HEADER_TEXTS = {text for _, text in HEADER_ORDER}

# The rotated day-label watermark lives in the left margin. Restricting the
# vertical-text search to this band matters: a page-wide "stacked short nodes"
# heuristic also matches the reps column ("6-8") and the RPE column ("~7"),
# and those short cells sit at the same pitch, so an unrestricted search
# swallows the left half of the table.
MARGIN_MAX_X = 250
MARGIN_FALLBACK_X = 210


def _stacked_margin_groups(cells: list[Cell]) -> dict[int, list[Cell]]:
    """x-bucketed runs of one-character nodes in the left margin."""
    by_x: dict[int, list[Cell]] = defaultdict(list)
    for c in cells:
        if c.left < MARGIN_MAX_X:
            by_x[round(c.left / 8) * 8].append(c)
    return {
        x: m for x, m in by_x.items()
        if len(m) >= 4 and max(len(n.text) for n in m) <= 2
    }

DAY_PATTERNS = [
    ("OptionalCardioHIIT", re.compile(r"CARDIO|HIIT", re.I)),
    ("FullRest", re.compile(r"REST\s*DAY", re.I)),
    ("Push", re.compile(r"\bPUSH\b", re.I)),
    ("Pull", re.compile(r"\bPULL\b", re.I)),
    ("Legs", re.compile(r"\bLEGS?\b", re.I)),
    ("Upper", re.compile(r"\bUPPER\b", re.I)),
    ("Lower", re.compile(r"\bLOWER\b", re.I)),
]


@dataclass
class Cell:
    top: int
    left: int
    width: int
    text: str
    href: str | None = None


@dataclass
class DayRecord:
    page: int
    week: int | None = None
    day_label: str | None = None
    day_type_from_label: str | None = None
    exercises: list[dict] = field(default_factory=list)
    footnotes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def pdf_page_count(pdf: Path) -> int:
    out = subprocess.run(
        ["pdfinfo", str(pdf)], capture_output=True, text=True, check=True
    ).stdout
    m = re.search(r"^Pages:\s+(\d+)", out, re.M)
    if not m:
        raise SystemExit("could not read page count from pdfinfo")
    return int(m.group(1))


def extract_page_nodes(pdf: Path, page: int) -> tuple[list[Cell], str | None, int | None, list[str]]:
    """
    Convert exactly one page to XML and return its cells.

    Also returns the rotated margin text (the day label) and the WEEK number.
    """
    warnings: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        prefix = str(Path(tmp) / "page")
        proc = subprocess.run(
            ["pdftohtml", "-xml", "-i", "-f", str(page), "-l", str(page), str(pdf), prefix],
            capture_output=True,
            text=True,
        )
        # poppler names the XML after the output *prefix* when a single page is
        # converted, and only falls back to "prefix-N.xml" for multi-page runs.
        candidates = [Path(prefix + ".xml"), Path(prefix + f"-{page}.xml")]
        xml_path = next((c for c in candidates if c.exists()), None)
        if proc.returncode != 0 or xml_path is None:
            warnings.append(
                f"pdftohtml failed (exit {proc.returncode}): {proc.stderr.strip()[:200]}"
            )
            return [], None, None, warnings
        root = ET.parse(xml_path).getroot()

    page_el = root.find("page")
    if page_el is None:
        return [], None, None, warnings

    cells: list[Cell] = []
    for node in page_el.findall("text"):
        text = "".join(node.itertext()).strip()
        if not text:
            continue
        anchor = node.find("a")
        cells.append(
            Cell(
                top=int(node.get("top")),
                left=int(node.get("left")),
                width=int(node.get("width") or 0),
                text=text,
                href=anchor.get("href") if anchor is not None else None,
            )
        )
    if not cells:
        return [], None, None, warnings

    margin = _read_rotated_margin(cells)
    week = _read_week(cells)
    return cells, margin, week, warnings


def _read_rotated_margin(cells: list[Cell]) -> str | None:
    """
    The day label is rotated 90deg: one character per <text> node stacked in a
    narrow left band, in bottom-to-top reading order. Reading them in raw
    order yields reversed garbage, so group by x, then order by descending y.
    """
    fragments = [
        "".join(n.text for n in sorted(members, key=lambda n: n.top, reverse=True))
        for _, members in sorted(_stacked_margin_groups(cells).items())
    ]
    if not fragments:
        return None
    return re.sub(r"\s+", " ", " ".join(fragments)).strip() or None


def _margin_x(cells: list[Cell]) -> int:
    """
    Right edge of the rotated margin, derived per page so a re-layout that
    shifts the watermark does not silently pull label characters into the
    Exercise column.
    """
    stacked = _stacked_margin_groups(cells)
    return max(stacked) + 12 if stacked else MARGIN_FALLBACK_X


def _read_week(cells: list[Cell]) -> int | None:
    for c in cells:
        m = re.fullmatch(r"WEEK\s+(\d+)", c.text, re.I)
        if m:
            return int(m.group(1))
    return None


def _cluster_by_x(cells: list[Cell], gap: int = 60) -> list[tuple[int, list[Cell]]]:
    """
    Group cells into columns by x. Wrapped lines are re-centred individually,
    so one cell's lines scatter across ~70px (e.g. a name at left=281 and its
    second line at left=345) while true column gaps are >=116px.
    """
    clusters: list[tuple[int, list[Cell]]] = []
    for c in sorted(cells, key=lambda c: c.left):
        if clusters and c.left - clusters[-1][0] <= gap:
            clusters[-1][1].append(c)
        else:
            clusters.append((c.left, [c]))
    return clusters


def _header_end(cells: list[Cell], margin_x: int) -> int | None:
    """Bottom edge of the two-row table header, so data rows can be isolated."""
    tops = [c.top for c in cells if c.left >= margin_x and c.text in HEADER_TEXTS]
    return max(tops) + 30 if tops else None


def _find_anchor_cluster(clusters: list[tuple[int, list[Cell]]]) -> int | None:
    """
    Locate the "WORKING SETS" column without hardcoding x. It is the only
    column whose every cell is a bare integer in 1..5: warm-up is usually a
    range ("2-3"), reps a range ("6-8") and rest a duration ("3-5 min"). If
    several columns qualify, the rightmost is the working-set count.
    """
    best = None
    for idx, (_, members) in enumerate(clusters):
        if not members:
            continue
        if all(re.fullmatch(r"[1-9]", m.text) for m in members):
            best = idx
    return best


def _column_bounds(cells: list[Cell], margin_x: int) -> tuple[dict[str, list[Cell]] | None, str | None]:
    """
    Self-calibrating column assignment.

    Bands come from the table header (the exercise column, technique column and
    numeric columns are stable at the same x on all 60 program pages). A plain
    x-gap clustering cannot be used instead: one cell's wrapped lines are
    re-centred individually, so an exercise name spans left=281..353 and a
    substitution name spans 2212..2283. That ~72px intra-column spread sits
    uncomfortably close to the ~124px gap between real columns.

    NOTES needs one extra rule. Its header sits at x=3000 but its content is
    left-aligned at a constant x=2667, i.e. INSIDE the band the header
    midpoints assign to Option 2. Substitution cells always carry a video
    href; notes cells never do, which separates the two columns without
    relying on x. The modal x of the non-href cells is checked to be a single
    column so a substitution that is missing its video is surfaced as a
    warning rather than silently folded into the notes.
    """
    header_lefts: dict[str, int] = {}
    for c in sorted(cells, key=lambda c: c.top):
        for key, text in HEADER_ORDER:
            if c.text == text and key not in header_lefts:
                header_lefts[key] = c.left
    missing = [k for k, _ in HEADER_ORDER if k not in header_lefts]
    if missing:
        return None, f"header row missing column(s) {missing}"

    order = [k for k, _ in HEADER_ORDER]
    xs = [header_lefts[k] for k in order]
    bands = {}
    for idx, key in enumerate(order):
        lo = margin_x if idx == 0 else (xs[idx - 1] + xs[idx]) // 2
        hi = 10**9 if idx == len(order) - 1 else (xs[idx] + xs[idx + 1]) // 2
        bands[key] = (lo, hi)

    hend = _header_end(cells, margin_x)
    if hend is None:
        return None, "no table header found; page is not a program table"
    body = [c for c in cells if c.left >= margin_x and c.top > hend]

    working = [c for c in body if bands["working_sets"][0] <= c.left < bands["working_sets"][1]]
    working = [c for c in working if re.fullmatch(r"\d+", c.text)]
    if not working:
        return None, "no integer working-set counts found in the working_sets band"
    floor = max(c.top for c in working) + 160
    body = [c for c in body if c.top <= floor]

    out: dict[str, list[Cell]] = {k: [] for k in order}
    opt2_lo = bands["option2"][0]
    tail_href, tail_plain = [], []
    for c in body:
        if c.left < bands["option2"][0]:
            for key, (lo, hi) in bands.items():
                if key == "option2":
                    continue
                if lo <= c.left < hi:
                    out[key].append(c)
                    break
        else:
            (tail_href if c.href else tail_plain).append(c)

    out["option2"] = tail_href
    out["notes"] = tail_plain

    # Self-check: notes are one left-aligned column, so every plain cell should
    # sit at (near) the same x. Otherwise a video-less substitution is hiding
    # in here and the row's notes would be garbage.
    if tail_plain:
        counts: dict[int, int] = defaultdict(int)
        for c in tail_plain:
            counts[round(c.left / 20) * 20] += 1
        modal, n = max(counts.items(), key=lambda kv: kv[1])
        strays = {c.text for c in tail_plain if abs(c.left - modal) > 25}
        if n < 0.8 * len(tail_plain) and strays:
            return None, (f"notes column is not a single left-aligned column; "
                          f"{len(tail_plain) - n} stray non-link cell(s), e.g. {sorted(strays)[:2]}")
    return out, None


def _line_blocks(cells: list[Cell]) -> list[list[Cell]]:
    """Group cells into wrapped-line blocks: consecutive lines <= WRAP_PITCH apart."""
    if not cells:
        return []
    ordered = sorted(cells, key=lambda c: c.top)
    blocks: list[list[Cell]] = [[ordered[0]]]
    for c in ordered[1:]:
        if c.top - blocks[-1][-1].top <= WRAP_PITCH:
            blocks[-1].append(c)
        else:
            blocks.append([c])
    return blocks


def _block_text(block: list[Cell]) -> str:
    """
    Join a wrapped cell's lines. A line ending in "-" continues the same word
    across the break ("Seated Super-" + "Bayesian High" + "Cable Curl" is one
    name, not three), so those are joined without a space.
    """
    ordered = sorted(block, key=lambda c: c.top)
    out = ""
    for c in ordered:
        if out and not out.endswith("-"):
            out += " "
        out += c.text
    return out.strip()


def _block_href(block: list[Cell]) -> str | None:
    for c in block:
        if c.href:
            return c.href
    return None


def _normalise_video(url: str | None) -> str | None:
    """
    Canonicalise to https://youtu.be/<id>.

    The PDF mixes both link forms for the same video (youtu.be/<id> on some
    rows, youtube.com/watch?v=<id> on others, the latter often carrying a
    &si= tracking parameter). Truncating at "?" would collapse
    "watch?v=zGXvPjlgVkk" to the useless ".../watch", so the 11-character id is
    pulled out and rebuilt instead.
    """
    if not url:
        return None
    m = re.search(r"(?:youtu\.be/|v=)([A-Za-z0-9_-]{11})", url)
    return f"https://youtu.be/{m.group(1)}" if m else url.split("?")[0]


def _page_record(cells: list[Cell], page: int, week: int | None, label: str | None,
                 warnings: list[str]) -> DayRecord:
    rec = DayRecord(page=page, week=week, day_label=label)
    if label:
        for dt, pat in DAY_PATTERNS:
            if pat.search(label):
                rec.day_type_from_label = dt
                break

    cols, err = _column_bounds(cells, _margin_x(cells))
    if err:
        rec.warnings.append(err)
        return rec

    # Rows are defined by the exercise-name blocks: there is exactly one block
    # per row, they are vertically centred, and consecutive rows are ~173px
    # apart while a block spans at most ~81px. Every other column is then
    # attached to the nearest block, because a single cell can wrap far
    # outside its row -- the 5-line notes cell for "Bayesian Cable Curl" spans
    # 108px, so anchoring long cells to the numeric row top would clip its
    # first and last lines.
    name_blocks = _line_blocks(cols.get("exercise", []))
    if not name_blocks:
        rec.warnings.append("no exercise names found")
        return rec
    centres = [sum(c.top for c in b) / len(b) for b in name_blocks]

    def attach(cells: list[Cell]) -> list[list[Cell]]:
        rows: list[list[Cell]] = [[] for _ in name_blocks]
        for cell in cells:
            idx = min(range(len(centres)), key=lambda i: abs(centres[i] - cell.top))
            if abs(centres[idx] - cell.top) > CELL_SLACK:
                # Lower and Legs pages carry a trailing "Rest Day" caption that
                # belongs to the page, not to any exercise row.
                if FOOTNOTE_RE.fullmatch(cell.text.strip()):
                    rec.footnotes.append(cell.text.strip())
                else:
                    rec.warnings.append(
                        f"stray cell {cell.text[:32]!r} at y={cell.top} is "
                        f"{abs(centres[idx] - cell.top):.0f}px from its row")
                continue
            rows[idx].append(cell)
        return rows

    attached = {key: attach(cols.get(key, [])) for key in
                ("technique", "warmup_sets", "working_sets", "reps", "early_rpe",
                 "last_rpe", "rest", "option1", "option2", "notes")}

    for i, block in enumerate(name_blocks):
        def val(key: str) -> str | None:
            got = attached[key][i]
            return _block_text(got) if got else None

        sets_cells = attached["working_sets"][i]
        if len(sets_cells) != 1:
            rec.warnings.append(
                f"row {i + 1} ({_block_text(block)[:32]!r}) has "
                f"{len(sets_cells)} working-set counts")
        rec.exercises.append({
            "name": _block_text(block),
            "technique": val("technique"),
            "warmup_sets": val("warmup_sets"),
            "working_sets": val("working_sets"),
            "reps": val("reps"),
            "early_rpe": val("early_rpe"),
            "last_rpe": val("last_rpe"),
            "rest": val("rest"),
            "option1": val("option1"),
            "option1_video": _normalise_video(_block_href(attached["option1"][i])),
            "option2": val("option2"),
            "option2_video": _normalise_video(_block_href(attached["option2"][i])),
            "notes": val("notes"),
        })

    names = [e["name"] for e in rec.exercises]
    if len(names) != len(set(names)):
        rec.warnings.append("duplicate exercise names on page; row association is suspect")
    return rec


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    ap.add_argument("--pages", type=str, default=None,
                    help="1-based inclusive page range, e.g. 4-8 (default: all)")
    ap.add_argument("--out", type=Path, default=None, help="write JSON here instead of stdout")
    ap.add_argument("--quiet", action="store_true", help="suppress the per-page summary on stderr")
    args = ap.parse_args()

    if not args.pdf.exists():
        print(f"error: {args.pdf} not found", file=sys.stderr)
        return 2
    for tool in ("pdfinfo", "pdftohtml"):
        if subprocess.run(["which", tool], capture_output=True).returncode != 0:
            print(f"error: {tool} is required but not installed", file=sys.stderr)
            return 2

    total = pdf_page_count(args.pdf)
    if args.pages:
        m = re.fullmatch(r"(\d+)(?:-(\d+))?", args.pages.strip())
        if not m:
            print("error: --pages must look like 4 or 4-8", file=sys.stderr)
            return 2
        first = int(m.group(1))
        last = int(m.group(2) or m.group(1))
    else:
        first, last = 1, total
    first = max(1, first)
    last = min(total, last)

    days: list[DayRecord] = []
    for page in range(first, last + 1):
        cells, label, week, warnings = extract_page_nodes(args.pdf, page)
        rec = _page_record(cells, page, week, label, warnings)
        if rec.exercises:
            days.append(rec)
        if not args.quiet:
            tag = f"week {rec.week} {rec.day_label or ''}".strip()
            print(
                f"p{page:>2}  {tag:<34} {rec.day_type_from_label or '-':<18} "
                f"{len(rec.exercises)} exercises"
                + (f"  [warn: {'; '.join(rec.warnings)}]" if rec.warnings else ""),
                file=sys.stderr,
            )

    payload = {
        "source": str(args.pdf.relative_to(REPO_ROOT) if args.pdf.is_relative_to(REPO_ROOT) else args.pdf),
        "pages_scanned": [first, last],
        "day_count": len(days),
        "days": [
            {
                "page": d.page, "week": d.week, "day_label": d.day_label,
                "day_type_from_label": d.day_type_from_label,
                "exercise_count": len(d.exercises), "exercises": d.exercises,
                "footnotes": d.footnotes,
                "warnings": d.warnings,
            }
            for d in days
        ],
    }
    text = json.dumps(payload, indent=2)
    if args.out:
        args.out.write_text(text + "\n")
        if not args.quiet:
            print(f"wrote {args.out}", file=sys.stderr)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
