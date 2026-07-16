-- Auditor writes here instead of overwriting the original staged evidence,
-- so the raw scrape and the auditor's verified/enriched version stay
-- distinguishable. Deliberately NO default (stays NULL until first
-- audited) — every downstream read does `cleaned_evidence ?? evidence`,
-- and a `{}`::jsonb default would break that fallback (an empty object is
-- truthy in JS, so it would always win over the real evidence column).
ALTER TABLE agent_directives ADD COLUMN cleaned_evidence JSONB;
