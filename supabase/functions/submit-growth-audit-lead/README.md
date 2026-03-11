# submit-growth-audit-lead — Technical README

## What This Function Does
Handles the public-facing "Growth Audit" lead capture form submission. Validates the data, saves the lead locally in `growth_audit_leads`, and pushes the contact to GoHighLevel (GHL V2 / LeadConnector API) with duplicate handling.

## File Map & Guardrails

| File | Purpose | Edit When? |
|---|---|---|
| `index.ts` | Full orchestrator. Validate → save locally → push to GHL. | When changing the form fields or GHL sync behavior. |
| `types.ts` | Zod schema and typed lead payload. | When adding/removing form fields. |

## Architecture
```
HTTP POST { full_name, email, phone, company_name, challenge? }
      │
index.ts
      │
      ├──► Zod validation (leadSchema)
      ├──► INSERT into growth_audit_leads (status: "new")
      ├──► If GHL credentials available:
      │     ├──► POST to /contacts (GHL V2)
      │     ├──► If 400 + "duplicated" → extract existing contactId
      │     └──► POST tags to /contacts/:id/tags
      └──► Return { lead_id, ghl_synced: bool }
```

## Rules for AI Coding Agents

1. **The local `growth_audit_leads` INSERT happens BEFORE the GHL call.** We never lose a lead, even if GHL is down. Do not reorder these steps.
2. **GHL duplicate handling is intentional.** A 400 with "duplicated" in the message is a success path — extract the contactId and continue tagging.
3. **This function is public — no auth required.** It is accessible from the public marketing site. Do NOT add auth checks.
4. **Zod schema is the validation contract.** Add new form fields to `leadSchema` in `types.ts` first.

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GHL_API_KEY`
- `GHL_LOCATION_ID`
