# connector-sync — Plain English Guide

## What This Does
When a client or the agency connects an external data source (like a GoHighLevel account or another Supabase database), this function is the **data bridge** that keeps those connections synced. It reads data from the external system and copies it into our database so the AI can access it.

## The Analogy: The Data Import Team

Imagine the agency works with clients who each have their own spreadsheets, CRMs, and databases. This function is the import team that:
1. Connects to the external tool (GoHighLevel, external Supabase, etc.)
2. Downloads a fresh copy of the relevant data
3. Saves it into our own organized database
4. Records exactly what was synced, when, and if anything went wrong

## Supported Connections

| Provider | What It Syncs |
|---|---|
| **GoHighLevel (GHL)** | Contacts, opportunities — for CRM tracking |
| **External Supabase** | Any tables specified in the connection config |

## Why Not Just Read from GHL Directly?
Every time we read from GHL directly, it takes 1-3 seconds and can fail if GHL is down. By keeping a local copy, the AI agent can answer questions about contacts and deals in milliseconds, even if GHL is temporarily unavailable.

## When Does It Run?
- When a team member clicks "Sync Now" on the Connections page
- Automatically on a schedule for connections that have auto-sync enabled
