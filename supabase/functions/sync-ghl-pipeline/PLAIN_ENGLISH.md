# sync-ghl-pipeline — Plain English Guide

## What This Does
This function is like a **nightly courier** that goes to GoHighLevel (your CRM), picks up all the latest deals, contacts, and pipeline stages, and delivers them into your own database so the AI can read them.

## The Analogy: The Stock Room Delivery

- **GoHighLevel (GHL)** = The Supplier's warehouse. It has all your live sales data.
- **This function** = The delivery truck. It drives to the warehouse on a schedule (or when you press a button), loads up all the fresh data, and drives back.
- **ghl-client.ts** = The truck's GPS and CB radio. It knows how to communicate with the supplier.
- **Supabase (our DB)** = Our own stock room. Once the data is delivered here, our AI can read it instantly without needing to call GHL every time.

## Why We Do It This Way
The AI agent cannot call GoHighLevel directly every time a user asks a question — that would be too slow. Instead, we keep a "mirror" of the GHL data in our own database. The AI reads the mirror; the sync function keeps the mirror up to date.

## What Gets Synced
1. **Pipelines** — The sales pipeline (e.g., "Client Software Development Pipeline")
2. **Stages** — The stages within the pipeline (e.g., "Discovery", "Proposal", "Closed Won")
3. **Opportunities** — Individual deals (client names, deal values, current stage)
4. **Contacts** — The people attached to each deal (name, email, phone)

## When Does It Run?
Either on a schedule (e.g., nightly at 2 AM) or manually when you trigger it from the Agency Dashboard.
