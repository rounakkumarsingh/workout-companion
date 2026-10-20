#!/usr/bin/env python3
"""Fetch YouTube oEmbed titles for every exercise video and compare them with
the exercise names they are attached to.

Inputs (read-only):
  docs/extraction/program.extracted.json
  src/data/program.ts  (EXERCISES -> demoVideoUrl)
Output:
  docs/extraction/video-titles.json

Fetched titles are untrusted data: they are only tokenised and compared, never
interpreted. Standard library only.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = ROOT / "docs/extraction/program.extracted.json"
PROGRAM_TS = ROOT / "src/data/program.ts"
OUT = ROOT / "docs/extraction/video-titles.json"

UA = "Mozilla/5.0 (compatible; workout-companion-video-verifier/1.0)"
DELAY = 0.4
TIMEOUT = 15
RETRIES = 3

ABBREV = {
    "db": ["dumbbell"],
    "dbs": ["dumbbell"],
    "bb": ["barbell"],
    "rdl": ["romanian", "deadlift"],
    "rdls": ["romanian", "deadlift"],
}
FILLER = {"the", "a", "an", "with", "how", "to", "form", "tutorial", "exercise"}
ID_RE = re.compile(r"(?:youtu\.be/|v=)([A-Za-z0-9_-]{11})")


def video_id(url: str) -> str | None:
    m = ID_RE.search(url or "")
    return m.group(1) if m else None


def tokens(text: str) -> list[str]:
    t = text.lower().replace("w/", " with ")
    t = re.sub(r"[^0-9a-z]+", " ", t)
    out: list[str] = []
    for w in t.split():
        if w in ABBREV:
            out.extend(ABBREV[w])
            continue
        if w in FILLER:
            continue
        # light plural normalisation (presses -> press, curls -> curl)
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        out.append(w)
    return out


def unescape_ts(s: str) -> str:
    s = re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)
    return s.replace("\\'", "'").replace("\\\\", "\\")


def collect_pairs() -> tuple[list[tuple[str, str, str]], set[str], set[str]]:
    """Return ([(source, name, url)], all_names, names_without_url_in_ts)."""
    pairs: list[tuple[str, str, str]] = []
    names: set[str] = set()
    data = json.loads(EXTRACTED.read_text(encoding="utf-8"))
    for day in data["days"]:
        for ex in day["exercises"]:
            for nk, vk, src in (("name", "video", "primary"),
                                ("option1", "option1_video", "option1"),
                                ("option2", "option2_video", "option2")):
                n, v = ex.get(nk), ex.get(vk)
                if n and n not in ("N/A",):
                    names.add(n)
                    if v:
                        pairs.append((src, n, v))
    ts = PROGRAM_TS.read_text(encoding="utf-8")
    entry = re.compile(
        r"'((?:[^'\\]|\\.)*)':\s*\{\s*name:\s*'((?:[^'\\]|\\.)*)',\s*"
        r"demoVideoUrl:\s*(?:'([^']*)'|null)", re.S)
    ts_null: set[str] = set()
    for m in entry.finditer(ts):
        n = unescape_ts(m.group(2))
        names.add(n)
        if m.group(3):
            pairs.append(("app", n, m.group(3)))
        else:
            ts_null.add(n)
    return pairs, names, ts_null


def fetch(vid: str) -> dict:
    url = ("https://www.youtube.com/oembed?url="
           + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}", safe="")
           + "&format=json")
    last: dict = {"status": None, "title": None, "author": None, "error": "unknown"}
    for attempt in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                j = json.loads(r.read().decode("utf-8"))
                return {"status": r.status, "title": j.get("title"),
                        "author": j.get("author_name"), "error": None}
        except urllib.error.HTTPError as e:
            last = {"status": e.code, "title": None, "author": None, "error": str(e)}
            if e.code == 429 or e.code >= 500:
                time.sleep(1.5 * (2 ** attempt))
                continue
            return last
        except Exception as e:  # network / parse
            last = {"status": None, "title": None, "author": None, "error": repr(e)}
            time.sleep(1.5 * (2 ** attempt))
    return last


def classify_name(name: str, title: str) -> tuple[str, str]:
    nt, tt = tokens(name), tokens(title)
    if not nt:
        return "weak", "exercise name has no comparable tokens"
    tset = set(tt)
    present = [w for w in nt if w in tset]
    frac = len(present) / len(nt)
    missing = [w for w in nt if w not in tset]
    if nt == tt or not missing:
        return "match", "all name tokens present in title"
    if frac >= 0.5:
        return "weak", f"{len(present)}/{len(nt)} name tokens present; missing {missing}"
    return "mismatch", f"{len(present)}/{len(nt)} name tokens present; missing {missing}"


def main() -> int:
    pairs, names, ts_null = collect_pairs()
    by_url: dict[str, set[str]] = defaultdict(set)
    by_name: dict[str, set[str]] = defaultdict(set)
    for _src, n, u in pairs:
        vid = video_id(u)
        if not vid:
            print(f"WARN unparseable url {u!r} for {n!r}", file=sys.stderr)
            continue
        by_url[vid].add(n)
        by_name[n].add(vid)

    shared_urls = {v: sorted(n) for v, n in by_url.items() if len(n) > 1}
    multi_url_names = {n: sorted(v) for n, v in by_name.items() if len(v) > 1}
    no_url = sorted(n for n in names if n not in by_name)

    rank = {"mismatch": 0, "error": 1, "unavailable": 2, "weak": 3, "match": 4}
    results = []
    for i, vid in enumerate(sorted(by_url)):
        if i:
            time.sleep(DELAY)
        f = fetch(vid)
        nm = sorted(by_url[vid])
        rec = {"video_id": vid, "url": f"https://youtu.be/{vid}",
               "status": f["status"], "title": f["title"], "author": f["author"],
               "names": nm}
        if f["status"] == 200 and f["title"]:
            worst, reasons = "match", []
            for n in nm:
                c, why = classify_name(n, f["title"])
                reasons.append(f"{n}: {c} ({why})")
                if rank[c] < rank[worst]:
                    worst = c
            rec["classification"], rec["reason"] = worst, "; ".join(reasons)
        elif f["status"] in (401, 403, 404):
            rec["classification"] = "unavailable"
            rec["reason"] = f"HTTP {f['status']}: private, removed or embedding disabled"
        else:
            rec["classification"] = "error"
            rec["reason"] = f"fetch failed: status={f['status']} {f['error']}"
        results.append(rec)
        print(f"{vid} {rec['classification']:11} {rec['title']!r} <- {nm}", flush=True)

    results.sort(key=lambda r: (rank[r["classification"]], r["video_id"]))
    counts = {k: 0 for k in ("match", "weak", "mismatch", "unavailable", "error")}
    for r in results:
        counts[r["classification"]] += 1
    out = {
        "summary": {"unique_urls": len(results), **counts,
                    "urls_shared_by_multiple_names": shared_urls,
                    "names_with_multiple_urls": multi_url_names,
                    "names_without_any_url": no_url,
                    "ts_names_with_null_url": sorted(ts_null)},
        "results": results,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out["summary"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
