---
name: industry-claim
description: Source a factual claim about Texas barber/cosmetology licensing, exams or accreditation before publishing it — routing to TDLR, PSI or NACCAS, and the checks that stop a summary being cited as the source. Use before stating any fee, deadline, CE hour, passing score, exam format, rule number or accreditation requirement on a public page.
---

# Sourcing an industry claim

A wrong fee or CE requirement on a public page is not a ranking problem. It
is someone missing a renewal deadline because this site told them the wrong
thing. Every rule here exists because a specific claim was already published
wrong, or nearly was.

`CLAUDE.md` holds the standing rules and the doc locations for all three
authorities. **Read the relevant section there first** — this file is the
procedure, not a second copy of the facts, and a second copy would rot.

---

## 1. Route the claim to the right authority

This is the step that gets skipped, and getting it wrong means citing a real
document that does not govern the thing you are claiming.

| The claim is about | Authority | Where |
|---|---|---|
| Fees, deadlines, renewal cycles, CE hours, rule numbers, eligibility, licence types | **TDLR** | `lib/tdlr-sources.ts` — 26 registered pages, each with what it settles |
| Exam content: question counts, time limits, passing scores, the practical rubric, what is on the test | **PSI** | Candidate Information Bulletin for that **specific licence** |
| Accreditation obligations for schools | **NACCAS** | Numbered policy or standard in the handbook |

**TDLR does not write or administer the exams — PSI does, under contract.** A
TDLR page summarising exam content does not settle a PSI question. And
**NACCAS stacks on top of the state**: a school meets the stricter of the two
on every dimension, so a TDLR rule is never the whole obligation for an
accredited school.

## 2. Fetch the actual document

```
TDLR    → the URL in lib/tdlr-sources.ts for the thing you are claiming
PSI     → https://test-takers.psiexams.com/api/content/bulletin/{id}
NACCAS  → the numbered policy; certificate chain is broken, so curl -k
```

The PSI bulletins are behind **opaque numeric IDs** — nothing in the URL says
which exam you are fetching, so confirm the title on page 1 against what you
meant to fetch. The ID table in `CLAUDE.md` was verified 2026-08-05; it is
recorded to be re-checked, not reused on trust.

For NACCAS, `WebFetch` fails on the certificate ("unable to verify the first
certificate") and the elibrary host is intermittent — retry before concluding
it is down. A fetch failure is not permission to cite a summary.

## 3. Never carry a figure across

**Do not copy a number from a sibling page.** The specialty licences differ
from the operator licences more than their names suggest, which is the entire
reason `lib/tdlr-sources.ts` and `lib/texas-specialty-exams.ts` exist.

A claim inherited from another page in this repo is unsourced. It has the
provenance of whoever wrote that page, which is how the barber pass rate
stayed wrong for months.

## 4. A summary of a source is not the source

The sharpest failure recorded here: **NACCAS Policy VI.02 does not contain a
50% distance-education cap.** Multiple secondary sources say it does, a web
search summary said it did, and it reached a draft in this repo before anyone
read the policy. VI.02 has five elements and no percentage; "50%" appears
once in the whole III.01–IX.02 set, in a refund table. The 50% figures come
from Texas and Alabama independently.

So: if a claim cannot be traced to a numbered policy, a named TDLR page or a
specific bulletin, it is not citable — no matter how many sources repeat it.
Search results are for *finding* the document, never for quoting.

## 5. Some things are genuinely unresolved — say so

**Whether specialty licence holders need continuing education is not
settled.** The at-a-glance PDF says "Barber and Cosmetology Operators
licensees"; the CE page says "your license" with no qualifier. Three fetches
did not resolve it.

A page needing this must state that it is unresolved and point the reader at
TDLR. Guessing is worse than saying you do not know, because a confident
wrong answer is the one people act on.

Also worth re-checking rather than trusting: the late-renewal bands are
rule-based — 1.5× the fee at 90 days or less, 2× beyond that up to 18 months
— and `/texas-barber-license-renewal` states them differently.

## 6. Record what you did

Update the `checked` date in `lib/tdlr-sources.ts` when you re-read a page.
If you settled something previously unresolved, or found a source that
contradicts what is written here, put it in `CLAUDE.md` — that is what stops
the next person re-deriving it.

## Checklist

- [ ] routed to the right authority (TDLR / PSI / NACCAS) — not just "TDLR"
- [ ] fetched the actual document, not a summary or a search snippet
- [ ] for PSI, confirmed the bulletin title matches the licence
- [ ] for NACCAS, traced to a numbered policy; checked whether it stacks on a TDLR rule
- [ ] no figure carried over from a sibling page
- [ ] anything unresolved is stated as unresolved, pointing at the authority
- [ ] `checked` date updated; new findings recorded in `CLAUDE.md`
- [ ] the page and its `.md` twin agree (see `geo-audit`)
