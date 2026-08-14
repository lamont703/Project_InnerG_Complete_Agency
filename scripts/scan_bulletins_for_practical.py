#!/usr/bin/env python3
"""
Counts how often each archived bulletin says "practical", per state.

THE CALIFORNIA METHOD. California's combined bulletin contains the word
"practical" ZERO times across 26 pages — no mannequin, no model, no kit — while
mentioning "written examination" eleven times. That single count is what
established California licenses on a written exam alone, and it is the first
thing worth knowing about any state, because it decides whether the kit-list
page format applies at all.

It is also the rare question that scales. Extracting 40 kit items with correct
label rules from a PDF is judgement and cannot be automated safely. Counting a
word is not judgement.

WHAT THIS PRODUCES IS EVIDENCE, NOT A VERDICT. A high count means the bulletin
discusses a practical exam; it does not prove the state administers one, and a
zero could mean the practical is documented somewhere else entirely. Alaska is
the cautionary case: it has no state practical at all, but you would only learn
that from the board's examination page, because the change was a 2020 rule
amendment replacing the practical with a school-administered proficiency exam.

So the counts are written to _urlmap.json under practicalEvidence.bulletinScan
and hasPracticalExam is left alone. A human sets that field, with a source.

Usage:  python3 scripts/scan_bulletins_for_practical.py [State ...]
"""

import json
import os
import re
import sys

REFERENCE = os.path.join(os.path.dirname(__file__), "..", "reference")

try:
    from pypdf import PdfReader
except ImportError:
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        print("needs pypdf or PyPDF2 (try: venv/bin/python3 scripts/scan_bulletins_for_practical.py)")
        sys.exit(1)

WORDS = {
    "practical": re.compile(r"\bpractical\b", re.I),
    "mannequin": re.compile(r"\bmannequin\b", re.I),
    "model": re.compile(r"\bmodel\b", re.I),
    "kit": re.compile(r"\bkit\b", re.I),
    "written": re.compile(r"\bwritten\b", re.I),
}


def scan_pdf(path):
    try:
        reader = PdfReader(path)
        text = " ".join((p.extract_text() or "") for p in reader.pages)
    except Exception as e:
        return {"error": str(e)[:120]}
    return {"pages": len(reader.pages), **{w: len(rx.findall(text)) for w, rx in WORDS.items()}}


def main():
    only = sys.argv[1:]
    folders = sorted(
        d for d in os.listdir(REFERENCE)
        if d.endswith("Exam Prep Files") and os.path.isdir(os.path.join(REFERENCE, d))
    )

    for folder in folders:
        state = folder.replace(" Exam Prep Files", "")
        if only and state not in only:
            continue
        d = os.path.join(REFERENCE, folder)
        pdfs = sorted(f for f in os.listdir(d) if f.lower().endswith(".pdf"))
        if not pdfs:
            continue

        per_file = {}
        totals = {w: 0 for w in WORDS}
        for f in pdfs[:40]:  # cap: some states hold hundreds of unrelated forms
            r = scan_pdf(os.path.join(d, f))
            if "error" in r:
                continue
            per_file[f] = r
            for w in WORDS:
                totals[w] += r.get(w, 0)

        verdict = "no bulletin mentions 'practical'" if totals["practical"] == 0 else \
                  f"{totals['practical']} mentions of 'practical' across {len(per_file)} documents"
        print(f"{state:<22} practical={totals['practical']:<5} mannequin={totals['mannequin']:<5} "
              f"model={totals['model']:<5} kit={totals['kit']:<5} written={totals['written']:<5} ({len(per_file)} pdfs)")

        map_path = os.path.join(d, "_urlmap.json")
        if not os.path.exists(map_path):
            continue
        with open(map_path) as fh:
            m = json.load(fh)
        ev = m.get("practicalEvidence") or {}
        if not isinstance(ev, dict):
            ev = {}
        ev["bulletinScan"] = {
            "totals": totals,
            "documentsScanned": len(per_file),
            "summary": verdict,
            "caveat": "Word counts are EVIDENCE, not a verdict. Zero mentions is the California signal "
                      "(written-exam-only), but Alaska proves a state can have no practical while its "
                      "bulletins say nothing either way — that came from a board rule change. "
                      "hasPracticalExam is set by a human, with a source.",
        }
        m["practicalEvidence"] = ev
        with open(map_path, "w") as fh:
            json.dump(m, fh, indent=2)
            fh.write("\n")


if __name__ == "__main__":
    main()
