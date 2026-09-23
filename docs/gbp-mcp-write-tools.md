# Managing a Google Business Profile from the owner's own Claude

The map of the MCP tools that let a barber point their own Claude at their own
listing, what each one wraps, and the one rule that makes it safe to ship.

Status: the **authentication layer is built** (`lib/mcp/connection.ts`,
`/mcp/k/<key>`, plus `Authorization: Bearer` on `/mcp`), and two read tools
ship: `my_shearquery_account` and `my_google_profile_audit`. Everything in the
Propose section below is designed and not yet written. Written 2026-09-22.

**Why the audit shipped first, from a real session.** A connected owner asked
their own Claude to audit their profile and got the PUBLIC audit — 5 checks of
16, scored on what a stranger can see — followed by a link to shearquery.com for
the rest. Correct, and useless: barbers live in Claude and will rarely open the
site. The full audit returns 16 checks and finds different things — the public
tier reported "5 photos, low for a barbershop" where the authenticated one
reports 90 photos covering 1 of the 5 categories customers look for. Same
listing, opposite advice.

---

## The rule the whole design hangs on

**The model drafts. The owner approves. ShearQuery publishes.**

No MCP tool writes to Google. A connection key carries two scopes, `read` and
`propose`, and there is deliberately no third one — see the check constraint in
`supabase/migrations/20260922210000_mcp_connection_keys.sql`. A propose tool
inserts a row into `gbp_change_requests` with `status = 'pending'`; the owner
approves it on shearquery.com; an approval handler on the site calls
`lib/gbp-write.ts`, which snapshots first and reads back after.

Three reasons it is built this way rather than letting the model publish:

1. **The write layer already says so.** `lib/gbp-write.ts` opens with "no write
   should reach this module without the owner having approved that specific
   change." This is that layer, not an exception to it.
2. **Google Posts and review replies are public and in the owner's voice.** A
   post cannot be un-seen. Revertibility does not help; approval does.
3. **A key in a URL is a bearer credential** (it has to be — claude.ai custom
   connectors take a URL and no headers). If the worst case for a leaked link is
   "a stranger queued drafts this owner will reject", that is survivable. If it
   were "a stranger rewrote a live business profile", it is not.

The model is told this in `OWNER_INSTRUCTIONS` (lib/mcp/handler.ts), and every
propose tool's response repeats it, because a model that thinks it published
will tell the owner it published.

---

## Read tools

All require an identity. All are owner-scoped by `memberId` from the key — no
tool takes a business id as an argument, so there is no shape in which one owner
can ask about another owner's listing.

| Tool | Wraps | Notes |
|---|---|---|
| `my_shearquery_account` | `community_members`, `community_member_entity_links`, `gbp_connections` | **Built.** The prerequisite check: claimed listing, Google connected, location selected. Reports each gap as a gap with its fix on the site. |
| `my_google_profile_audit` | `getMemberGbpAudit(memberId)` → `lib/gbp-audit-fetch.ts` + `buildGbpAudit` | **Built.** The full authenticated audit — attributes, search terms, Google's pending edits. Checks worst-first with each fix, area scores, 30-day performance, and the search terms people used. States its own age, because the bundle is cached six hours and a stale score reads as "you did nothing". `openWorldHint: true` — the only tool so far that reaches Google. |
| `my_audit_history` | `recentSnapshots()`, `diffSnapshots()` → `lib/gbp-audit-history.ts` | "What changed since last time" — the tool that makes a weekly cadence possible instead of a one-off audit. |
| `my_google_reviews` | `getGoogleReviewsForEntity()` → `lib/gbp-reviews.ts`, `selectUnanswered()` → `lib/gbp-review-replies.ts` | Unanswered first. Star rating, comment, date, reviewer first name only. |
| `my_photo_coverage` | `analysePhotoCoverage()` → `lib/gbp-photos.ts` | Which of Google's photo categories are empty, against `PHOTO_CATEGORIES`. |
| `my_pending_changes` | `gbp_change_requests` | Everything queued and not yet approved, with its id. This is how the model answers "did that go through?" without guessing. |

`my_shearquery_account` is called first by instruction, because every other tool
here fails in a specific way without a claimed listing or a live Google
connection, and "Google is not connected" is a different sentence from "your
profile has no problems".

---

## Propose tools

Each one writes ONE pending row and returns its id plus the approval URL. None
touches Google. The "applies via" column is what runs **after** the owner
approves, not what the tool calls.

| Tool | Input | Validated by | Applies via | Revertible after publish? |
|---|---|---|---|---|
| `propose_review_reply` | `review_id`, `reply` | `validateDraft()` (`lib/gbp-review-replies.ts`), 4096-char cap | `writeReviewReply()` | Yes — snapshot records the previous reply, or null if there was none |
| `propose_google_post` | `summary`, `cta_type`, `cta_url?`, `photo_url?` | `validatePost()`, `POST_MAX` 1500, `resolveCallToAction()` (`lib/gbp-posts.ts`) | `writeLocalPost()` | No. A post can be deleted, not un-seen — which is why approval matters more here than undo |
| `propose_offer_post` | `summary`, `coupon_code?`, `redeem_url?`, `terms?`, window | `validateOffer()`, `defaultWindow()` (`lib/gbp-post-offers.ts`) | `writeLocalPost()` with `offer` + `event` | No |
| `propose_event_post` | `title`, `start`, `end`, `summary` | `toLocalPostEvent()`, `describeDates()` (`lib/gbp-post-events.ts`) | `writeLocalPost()` with `event` | No |
| `propose_description` | `description` | `validateDescription()`, `DESCRIPTION_MAX` 750, `repeatedTerms()` (`lib/gbp-description.ts`) | `writeLocationFields()` mask `profile.description` | Yes |
| `propose_services` | `services[]` (name, optional price) | `mergeServiceItems()` (`lib/gbp-services.ts`) — merges, never replaces the list | `writeLocationFields()` mask `serviceItems` | Yes |
| `propose_categories` | `primary?`, `additional[]` | `mergeCategories()`, `MAX_ADDITIONAL_CATEGORIES` 9, `assessCategories()` (`lib/gbp-categories.ts`) | `writeLocationFields()` mask `categories` | Yes |
| `propose_holiday_hours` | `date`, `mode` (closed/hours), `open?`, `close?` | `buildHolidayPlan()`, `mergeSpecialHours()` (`lib/gbp-special-hours.ts`) | `writeLocationFields()` mask `specialHours` | Yes |
| `propose_booking_link` | `url` | `validateBookingUrl()`, `isEditable()` (`lib/gbp-place-actions.ts`) | `writePlaceActionLink()` | Yes — snapshot holds the whole link set, since a delete destroys the resource |

### Not proposable from MCP, and why

- **Attributes.** Google's attribute catalogue is a list of factual claims about
  the business — wheelchair accessible, Black-owned, takes walk-ins. Only the
  owner knows which are true, and a model filling them in is a model inventing
  facts about someone's premises under their name. It stays a questionnaire the
  owner answers (`lib/gbp-attribute-questionnaire.ts`,
  `/account/gbp-attributes`). The migration comment on `gbp_change_requests`
  already says this.
- **Photos.** `writeMediaFromUrl()` needs a public https URL Google can fetch,
  which means the file has to exist in our storage first. A model has nothing to
  upload. `my_photo_coverage` tells the owner which categories are empty and
  sends them to `/account/gbp-photos`; generating a photo is a live-session job
  (Higgsfield has no key in this repo).
- **Anything that deletes.** `deleteMedia()` and the delete branch of
  `writePlaceActionLink()` are owner-initiated on the site. There is no propose
  tool whose approval destroys something.
- **Regular opening hours.** Deliberately left out of the first set. Special
  hours are additive and dated; regular hours are the field most likely to be
  wrong in our record and the most damaging to get wrong on Google.

### The response shape every propose tool returns

```
Queued for your approval — nothing has been published.

  What: a reply to Maria's 5-star review from 12 Sep
  Change id: 4c1f…
  Approve it: https://shearquery.com/account/my-requests

Google will not see this until you approve it there.
```

The last line is not decoration. Without it the model summarises the call as
"done", the owner stops looking, and the draft sits pending for a month.

---

## The apply path — not a tool

1. Owner opens `/account/my-requests`, sees the draft in full, approves.
2. The approval handler re-resolves the Google connection
   (`resolveConnection()`, as in `app/api/account/gbp-posts/route.ts`) — a
   proposal can be days old and a refresh token can die in between.
3. It calls the `lib/gbp-write.ts` function from the table above, which
   snapshots into `gbp_write_snapshots`, writes, and reads back from Google.
4. It stamps `gbp_change_requests.status = 'applied'`, `applied_at`, and
   `snapshot_id` — so every published change traces to what it overwrote.
5. On failure: `status = 'failed'` with the error, and the owner sees why.

`my_pending_changes` closes the loop back to the model, so on the next
conversation Claude can say what was approved, what was published, and what is
still waiting — without being told.

---

## Ship order

1. `my_google_profile_audit` — the reason to connect at all. Everything else is
   follow-through on what it found.
2. `propose_review_reply` — highest volume, lowest risk, and the one owners
   already ask for. It also exercises the whole propose → approve → publish →
   snapshot chain end to end on the smallest possible change.
3. `my_google_reviews` + `my_pending_changes` — the two reads that make (2)
   usable in conversation rather than one blind shot.
4. `propose_description`, `propose_services`, `propose_categories` — revertible,
   not public-facing, and where the audit's Foundation failures live.
5. `propose_google_post` and the two post variants — public, so last.

## The external gate, stated once

None of this reaches a stranger until **Google OAuth verification for non-test
users** is granted. Today the connect flow works for test accounts only. An
owner who cannot connect Google gets the public-tier audit and no propose tools,
which `my_shearquery_account` says plainly — so the shape is honest before the
gate lifts, rather than broken.
