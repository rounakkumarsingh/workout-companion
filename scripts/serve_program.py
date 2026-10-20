#!/usr/bin/env python3
"""
Local verification server: PDF-extracted program data vs src/data/program.ts.

    python3 scripts/serve_program.py                 # http://127.0.0.1:8765
    python3 scripts/serve_program.py --refresh       # re-run the extractor first
    python3 scripts/serve_program.py --port 9000

The extracted data lives in docs/extraction/program.extracted.json (produced by
scripts/extract_program.py from docs/program.pdf; nothing here reads the PDF
text). program.ts is re-parsed on every request, so after fixing the data you
only need to reload the page.

Each week page shows, per day, the PDF values next to the app's values with
differences highlighted, and the original PDF page rendered as an image
(pdftoppm) so a row can be checked by eye. Verified ticks are kept in the
browser (localStorage) only.

Standard library only; poppler-utils is needed for the page images.
"""

from __future__ import annotations

import argparse
import html
import itertools
import json
import re
import subprocess
import sys
import tempfile
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_program as vp  # noqa: E402  (parser for program.ts)

PROGRAM_TS = ROOT / "src" / "data" / "program.ts"
PDF = ROOT / "docs" / "program.pdf"
EXTRACTOR = ROOT / "scripts" / "extract_program.py"
DEFAULT_JSON = ROOT / "docs" / "extraction" / "program.extracted.json"
DAY_ORDER = ["Upper", "Lower", "Pull", "Push", "Legs"]
PAGE_CACHE = Path(tempfile.gettempdir()) / "workout-companion-pdf-pages"

FIELDS = [
    ("warmup_sets", "Warm-up"),
    ("working_sets", "Sets"),
    ("reps", "Reps"),
    ("early_rpe", "Early RPE"),
    ("last_rpe", "Last RPE"),
    ("rest", "Rest"),
    ("technique", "Technique"),
]


# ---------------------------------------------------------------- data ----
def load_extraction(path: Path) -> dict:
    return json.loads(path.read_text())


def load_app() -> tuple[dict, dict, list]:
    by_week, videos, problems = vp.parse_program(PROGRAM_TS.read_text())
    src = PROGRAM_TS.read_text()
    notes = {
        vp._unescape(m.group(1)): vp._unescape(m.group(2))
        for m in re.finditer(
            r"^  '((?:[^'\\]|\\.)*)': \{\n    name: '[^']*',\n    demoVideoUrl: (?:null|'[^']*'),\n"
            r"    notes:\s*\n?\s*'((?:[^'\\]|\\.)*)'",
            src,
            re.M,
        )
    }
    return by_week, {"videos": videos, "notes": notes}, problems


def match_days(pdf_days: list[dict], app_week: dict) -> list[tuple[dict, str | None]]:
    """Pair each PDF page with an app day by exercise-name overlap.

    The PDF's day label is unreliable, so it is only displayed, never trusted.
    """
    types = [t for t in DAY_ORDER if t in app_week] + [t for t in app_week if t not in DAY_ORDER]
    names = {t: {r["name"] for r in app_week[t]} for t in types}

    def score(day: dict, t: str) -> int:
        return len({e["name"] for e in day["exercises"]} & names[t])

    best, best_perm = -1, None
    slots = types + [None] * max(0, len(pdf_days) - len(types))
    for perm in itertools.permutations(slots, len(pdf_days)):
        total = sum(score(d, t) for d, t in zip(pdf_days, perm) if t)
        if total > best:
            best, best_perm = total, perm
    return list(zip(pdf_days, best_perm or []))


def warmup_text(row: dict) -> str:
    lo, hi = row["wmin"], row["wmax"]
    return str(lo) if lo == hi else f"{lo}-{hi}"


def app_value(row: dict, key: str) -> str | None:
    return {
        "warmup_sets": warmup_text(row),
        "working_sets": str(row["sets"]),
        "reps": row["reps"],
        "early_rpe": row["early"],
        "last_rpe": row["last"],
        "rest": row["rest"],
        "technique": row["technique"],
    }[key]


def same(key: str, pdf_val, app_val) -> bool:
    if key == "warmup_sets":
        a = re.match(r"^(\d+)(?:\s*-\s*(\d+))?$", str(pdf_val or "").strip())
        b = re.match(r"^(\d+)(?:-(\d+))?$", str(app_val or ""))
        if a and b:
            return (int(a[1]), int(a[2] or a[1])) == (int(b[1]), int(b[2] or b[1]))
    if key in ("technique", "rest", "reps", "working_sets"):
        return vp.norm_lower(pdf_val) == vp.norm_lower(app_val)
    return vp.val_eq(pdf_val, app_val)


def fold(text: str | None) -> str:
    """Notes comparison ignores case, spacing, dashes and punctuation."""
    t = (text or "").lower().replace("–", "-").replace("—", "-")
    return re.sub(r"[^a-z0-9]", "", t)


def compare_week(extraction: dict, week: int) -> dict:
    by_week, app_meta, problems = load_app()
    app_week = by_week.get(week, {})
    pdf_days = [d for d in extraction["days"] if d["week"] == week]
    out_days, mismatches = [], 0
    for pdf_day, app_type in match_days(pdf_days, app_week):
        app_rows = {r["name"]: r for r in app_week.get(app_type, [])} if app_type else {}
        pdf_names = [e["name"] for e in pdf_day["exercises"]]
        rows = []
        for idx, e in enumerate(pdf_day["exercises"], 1):
            a = app_rows.get(e["name"])
            cells = {}
            for key, _ in FIELDS:
                ok = a is not None and same(key, e.get(key), app_value(a, key))
                cells[key] = {
                    "pdf": e.get(key),
                    "app": None if a is None else app_value(a, key),
                    "ok": ok,
                }
            opts = []
            for slot in ("option1", "option2"):
                name = e.get(slot)
                if not name:
                    continue
                pv, av = e.get(f"{slot}_video"), app_meta["videos"].get(name, "MISSING")
                opts.append(
                    {
                        "name": name,
                        "pdf_video": pv,
                        "app_video": None if av == "MISSING" else av,
                        "in_app": av != "MISSING",
                        "ok": av != "MISSING" and av == pv,
                    }
                )
            app_note = app_meta["notes"].get(e["name"])
            rows.append(
                {
                    "idx": idx,
                    "name": e["name"],
                    "in_app": a is not None,
                    "order_ok": a is not None and a["order"] == idx,
                    "app_order": None if a is None else a["order"],
                    "cells": cells,
                    "options": opts,
                    "pdf_note": e.get("notes"),
                    "app_note": app_note,
                    "note_ok": fold(e.get("notes")) == fold(app_note),
                    "app_video": app_meta["videos"].get(e["name"]),
                    "pdf_video": e.get("video"),
                    "video_ok": e.get("video") == app_meta["videos"].get(e["name"])
                    or e.get("video") is None,
                }
            )
        extra = [n for n in app_rows if n not in pdf_names]
        bad = sum(
            (not r["in_app"])
            + sum(1 for c in r["cells"].values() if not c["ok"])
            + sum(1 for o in r["options"] if not o["ok"])
            + (0 if r["video_ok"] else 1)
            for r in rows
        ) + len(extra)
        mismatches += bad
        out_days.append(
            {
                "page": pdf_day["page"],
                "label": pdf_day["day_label"],
                "app_type": app_type,
                "rows": rows,
                "extra_in_app": extra,
                "mismatches": bad,
                "warnings": pdf_day.get("warnings", []),
            }
        )
    missing_days = [t for t in app_week if t not in {d["app_type"] for d in out_days}]
    return {"week": week, "days": out_days, "mismatches": mismatches + len(missing_days),
            "missing_days": missing_days, "parse_problems": problems}


# ---------------------------------------------------------------- html ----
CSS = """
:root{--bg:#0f0f0f;--fg:#ece9e2;--dim:#9a9894;--card:#171717;--line:#2a2a2a;--ok:#4d9a4d;--bad:#ff6b5e;--warn:#e8c547}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}
a{color:#e8c547}header{position:sticky;top:0;z-index:5;background:#0f0f0fee;border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
header b{font-size:16px}nav a{margin-right:8px;padding:3px 8px;border:1px solid var(--line);border-radius:6px;text-decoration:none;color:var(--fg)}
nav a.cur{background:#e8c547;color:#111;border-color:#e8c547}main{padding:20px;max-width:1500px;margin:auto}
section.day{background:var(--card);border:1px solid var(--line);border-radius:10px;margin:0 0 22px;padding:14px 16px}
h2{margin:0 0 4px;font-size:18px}.meta{color:var(--dim);font-size:12px;margin-bottom:10px}
table{border-collapse:collapse;width:100%}th,td{padding:6px 8px;border-top:1px solid var(--line);text-align:left;vertical-align:top}
th{color:var(--dim);font-weight:600;font-size:12px}td.name{font-weight:600;min-width:210px}
.bad{background:#3a1512}.bad .a{color:var(--bad)}.a{display:block;font-size:12px}.miss{color:var(--bad);font-weight:700}
.pill{display:inline-block;padding:1px 8px;border-radius:10px;font-size:12px;border:1px solid var(--line)}
.pill.ok{color:var(--ok);border-color:var(--ok)}.pill.bad{color:var(--bad);border-color:var(--bad);background:none}
.warn{color:var(--warn)}details{margin-top:2px}summary{cursor:pointer;color:var(--dim);font-size:12px}
.opts td{border:0;padding:2px 8px;font-size:12px}.note{font-size:12px;color:var(--dim);max-width:900px}
.pg{max-width:100%;border:1px solid var(--line);border-radius:6px;margin-top:10px}
.verify{float:right}.idx td,.idx th{font-size:15px}.tick{accent-color:#e8c547;transform:scale(1.2)}
"""


def esc(x) -> str:
    return html.escape("" if x is None else str(x))


def page(title: str, body: str, nav_week: int | None = None) -> bytes:
    nav = "".join(
        f'<a href="/week/{w}" class="{"cur" if w == nav_week else ""}">W{w}</a>' for w in range(1, 13)
    )
    return (
        f"<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
        f"<title>{esc(title)}</title><style>{CSS}</style>"
        f"<header><b><a href='/' style='text-decoration:none'>Program check</a></b><nav>{nav}</nav>"
        f"<a href='/data.json'>data.json</a></header><main>{body}</main>"
        "<script>document.querySelectorAll('.tick').forEach(function(c){var k='ok:'+c.dataset.k;"
        "try{c.checked=localStorage.getItem(k)==='1'}catch(e){}"
        "c.addEventListener('change',function(){try{localStorage.setItem(k,c.checked?'1':'0')}catch(e){}})});</script>"
    ).encode()


def render_index(extraction: dict) -> bytes:
    rows = []
    for w in range(1, 13):
        c = compare_week(extraction, w)
        n = sum(len(d["rows"]) for d in c["days"])
        pill = (
            '<span class="pill ok">matches</span>'
            if c["mismatches"] == 0
            else f'<span class="pill bad">{c["mismatches"]} difference(s)</span>'
        )
        verified = " ".join(
            f'<label><input type=checkbox class=tick data-k="{w}:{d["app_type"]}"> {esc(d["app_type"])}</label>'
            for d in c["days"]
        )
        rows.append(
            f'<tr><td><a href="/week/{w}">Week {w}</a></td><td>{len(c["days"])} days / {n} exercises</td>'
            f"<td>{pill}</td><td>{verified}</td></tr>"
        )
    body = (
        "<h2>PDF extraction vs src/data/program.ts</h2>"
        f'<p class=meta>{extraction["day_count"]} day tables extracted from docs/program.pdf. '
        "Ticks are your own 'I checked this day' marks, stored in this browser only.</p>"
        "<table class=idx><tr><th>Week<th>Contents<th>Extracted = app?<th>Verified</tr>" + "".join(rows) + "</table>"
    )
    return page("Program check", body)


def cell(c: dict) -> str:
    cls = "" if c["ok"] else ' class="bad"'
    app = "" if c["ok"] else f'<span class="a">app: {esc(c["app"]) if c["app"] is not None else "n/a"}</span>'
    return f"<td{cls}>{esc(c['pdf'])}{app}</td>"


def render_week(extraction: dict, week: int) -> bytes:
    c = compare_week(extraction, week)
    parts = [
        f"<h2>Week {week} "
        + (
            '<span class="pill ok">PDF = app</span>'
            if c["mismatches"] == 0
            else f'<span class="pill bad">{c["mismatches"]} difference(s)</span>'
        )
        + "</h2>"
    ]
    if c["missing_days"]:
        parts.append(f'<p class=miss>App days with no PDF page: {esc(", ".join(c["missing_days"]))}</p>')
    for p in c["parse_problems"]:
        parts.append(f"<p class=miss>program.ts parse problem: {esc(p)}</p>")
    for d in c["days"]:
        key = f'{week}:{d["app_type"]}'
        head = "".join(f"<th>{lbl}" for _, lbl in FIELDS)
        body_rows = []
        for r in d["rows"]:
            name_cls = "" if r["in_app"] else ' class="bad"'
            order = "" if r["order_ok"] or not r["in_app"] else f'<span class="a warn">app order {r["app_order"]}</span>'
            nm = esc(r["name"]) + ("" if r["in_app"] else '<span class="a miss">not in app for this day</span>')
            body_rows.append(
                f"<tr><td>{r['idx']}<td class=name{name_cls[7:-1] if name_cls else ''}>{nm}{order}"
                + "".join(cell(r["cells"][k]) for k, _ in FIELDS)
                + "</tr>"
            )
            opt = "".join(
                f"<tr><td>{esc(o['name'])}<td>"
                + (f'<a href="{esc(o["pdf_video"])}" target=_blank>pdf video</a>' if o["pdf_video"] else '<span class=warn>no video in PDF</span>')
                + "<td>"
                + (
                    '<span class="pill ok">same in app</span>'
                    if o["ok"]
                    else f'<span class="pill bad">app: {esc(o["app_video"]) if o["in_app"] else "no EXERCISES entry"}</span>'
                )
                + "</tr>"
                for o in r["options"]
            )
            note_flag = (
                ""
                if r["note_ok"]
                else '<div class="note warn">Notes differ:<br>PDF: '
                f'{esc(r["pdf_note"])}<br>App: {esc(r["app_note"])}</div>'
            )
            body_rows.append(
                f'<tr><td><td colspan=8><details><summary>substitutions, notes, video</summary>'
                f"<table class=opts>{opt}</table>"
                f'<div class="note">Notes (PDF): {esc(r["pdf_note"])}</div>{note_flag}'
                f'<div class="note">Exercise video: '
                + (
                    f'PDF <a href="{esc(r["pdf_video"])}" target=_blank>{esc(r["pdf_video"])}</a>'
                    if r["pdf_video"]
                    else "no link on this PDF row"
                )
                + (
                    ' <span class="pill ok">same in app</span>'
                    if r["video_ok"] and r["app_video"]
                    else f' <span class="pill bad">app: {esc(r["app_video"]) or "none"}</span>'
                    if not r["video_ok"]
                    else ""
                )
                + "</div>"
                f"</details></tr>"
            )
        extra = (
            f'<p class=miss>In app but not on this PDF page: {esc(", ".join(d["extra_in_app"]))}</p>'
            if d["extra_in_app"]
            else ""
        )
        warn = "".join(f"<p class=warn>extractor: {esc(w)}</p>" for w in d["warnings"])
        status = (
            '<span class="pill ok">PDF = app</span>'
            if d["mismatches"] == 0
            else f'<span class="pill bad">{d["mismatches"]} difference(s)</span>'
        )
        parts.append(
            f'<section class=day><label class=verify><input type=checkbox class=tick data-k="{esc(key)}"> verified</label>'
            f'<h2>{esc(d["app_type"] or "unmatched")} {status}</h2>'
            f'<div class=meta>PDF page {d["page"]} (PDF heading: "{esc(d["label"])}"; matched to the app day by exercise names) '
            f'· <a href="/page/{d["page"]}.png" target=_blank>open page image</a></div>'
            f"<table><tr><th>#<th>Exercise (PDF){head}</tr>{''.join(body_rows)}</table>{extra}{warn}"
            f'<details><summary>show PDF page {d["page"]}</summary>'
            f'<img class=pg loading=lazy src="/page/{d["page"]}.png" alt="PDF page {d["page"]}"></details></section>'
        )
    return page(f"Week {week}", "".join(parts), week)


# -------------------------------------------------------------- server ----
def render_pdf_page(n: int) -> bytes | None:
    if not (1 <= n <= 200) or not PDF.exists():
        return None
    PAGE_CACHE.mkdir(parents=True, exist_ok=True)
    out = PAGE_CACHE / f"p{n}"
    png = out.with_suffix(".png")
    if not png.exists():
        subprocess.run(
            ["pdftoppm", "-f", str(n), "-l", str(n), "-r", "70", "-png", "-singlefile", str(PDF), str(out)],
            check=True,
            capture_output=True,
        )
    return png.read_bytes()


def make_handler(extraction_path: Path):
    class Handler(BaseHTTPRequestHandler):
        def send(self, code: int, body: bytes, ctype: str = "text/html; charset=utf-8") -> None:
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:  # noqa: N802
            path = urllib.parse.urlparse(self.path).path
            try:
                extraction = load_extraction(extraction_path)
                if path == "/":
                    return self.send(200, render_index(extraction))
                m = re.fullmatch(r"/week/(\d+)", path)
                if m and 1 <= int(m[1]) <= 12:
                    return self.send(200, render_week(extraction, int(m[1])))
                m = re.fullmatch(r"/page/(\d+)\.png", path)
                if m:
                    img = render_pdf_page(int(m[1]))
                    return self.send(200, img, "image/png") if img else self.send(404, b"no such page", "text/plain")
                if path == "/data.json":
                    return self.send(200, extraction_path.read_bytes(), "application/json")
                self.send(404, b"not found", "text/plain")
            except Exception as e:  # show the error in the browser, keep serving
                self.send(500, f"<pre>{esc(type(e).__name__)}: {esc(e)}</pre>".encode())

        def log_message(self, fmt: str, *args) -> None:
            pass

    return Handler


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--json", type=Path, default=DEFAULT_JSON, help="extraction file to serve")
    ap.add_argument("--refresh", action="store_true", help="re-run the extractor before serving")
    args = ap.parse_args()
    if args.refresh or not args.json.exists():
        args.json.parent.mkdir(parents=True, exist_ok=True)
        print(f"extracting {PDF.name} -> {args.json}")
        subprocess.run([sys.executable, str(EXTRACTOR), "--out", str(args.json), "--quiet"], check=True)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(args.json))
    print(f"serving http://127.0.0.1:{args.port}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
