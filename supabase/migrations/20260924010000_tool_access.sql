-- tool_access: which tools are open on which door.
--
-- One row per tool that has been touched in the admin UI. A tool with NO row
-- uses the registry default in lib/tool-access.ts — deliberately, so that
-- adding a tool to the code does not require a database write before it
-- behaves correctly, and so the defaults stay readable in one file rather than
-- being spread across rows nobody reviews.
--
-- The table cannot open a sensitive tool on the public connector: lib/tool-access.ts
-- drops those from the MCP set after reading, whatever the row says. This is
-- storage, not the policy.
--
-- RLS on, no policies: only the service-role client touches this, from the
-- admin page's server actions and from the two door checks.

CREATE TABLE IF NOT EXISTS tool_access (
  tool_id      text PRIMARY KEY,
  mcp_enabled  boolean NOT NULL DEFAULT false,
  chat_enabled boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text
);

ALTER TABLE tool_access ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE tool_access IS
  'Per-tool visibility for the public MCP connector and the site chat. No row = registry default in lib/tool-access.ts. Sensitive tools are blocked from MCP in code regardless of the row here.';
