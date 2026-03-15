# discover-external-tables

## What This Does

Fetches a list of available tables from an external data provider (like another
Supabase project) to allow for selective syncing.

## Trigger

- HTTP POST to `/functions/v1/discover-external-tables`

## Auth

- Requires: `super_admin`

## Request Body

| Field    | Type   | Required | Description                          |
| -------- | ------ | -------- | ------------------------------------ |
| provider | enum   | ✅       | The provider type (e.g., "supabase") |
| config   | object | ✅       | The configuration (URL, keys, etc.)  |

## Response

```json
{
    "data": {
        "success": true,
        "tables": ["users", "orders", "products"]
    },
    "error": null
}
```

## Environment Variables Required

| Variable                  | Description             |
| ------------------------- | ----------------------- |
| SUPABASE_URL              | Agency Supabase URL     |
| SUPABASE_SERVICE_ROLE_KEY | Agency Service role key |
