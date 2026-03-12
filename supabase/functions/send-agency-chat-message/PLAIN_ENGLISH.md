# The Agency Chat Agent — Plain English Guide

## The Analogy: A War Room Briefing

Imagine the agency has a war room where all the intelligence from all client projects flows in. Here's how the parts map:

- **The Intelligence Director (index.ts)** — Controls the entire briefing. He doesn't analyze the data himself; he delegates to the right experts.
- **The Analyst Briefing Book (prompt-engineer.ts)** — The script the Director reads from. It defines the analyst's personality, rules of engagement, and what counts as "worth flagging." Change the analyst's behavior by changing the book — not the Director's schedule.
- **The Intel Database (_shared/lib/gemini.ts)** — The satellite that synthesizes information. Feed it context and a mission, and it delivers intelligence.
- **The Security Detail (_shared/lib/auth.ts)** — Only agency staff (super_admin, developer) are allowed in the war room. No clients.
- **The Report Writer (signal-processor.ts)** — After the briefing, the report writer files the findings. If a bug was reported, she opens a formal incident ticket. If a trend was spotted, she files an intelligence signal.

## What Happens When an Agency Staff Member Sends a Message

1. The message arrives at the Director (index.ts).
2. Security checks the badge (auth.ts) — are you agency staff?
3. The Director gathers the full portfolio briefing — all projects, all recent signals, all pipeline data.
4. The Director consults the Analyst Briefing Book (prompt-engineer.ts) for how to frame the question.
5. The satellite (Gemini) synthesizes all the context and returns an intelligence report (JSON).
6. The Report Writer (signal-processor.ts) files any signals or tickets that were flagged.
7. The Director delivers the briefing back in a standard format (response.ts).

## Key Differences from the Client Chat

| | Client Chat | Agency Chat |
|---|---|---|
| Who can use it | Clients (their own project only) | Agency staff only (all projects) |
| Data scope | One project | All projects |
| Signals created | Visible to client | Agency-only (client never sees them) |
| Future capability | None planned | Tool Calling for live DB queries |

## The Golden Rule
If the AI is saying the wrong thing → edit **prompt-engineer.ts**.  
If signals are being saved wrong → edit **signal-processor.ts**.  
If the wrong people are getting in → edit **_shared/lib/auth.ts**.
