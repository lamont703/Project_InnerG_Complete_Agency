-- WHICH MESSAGES IN A THREAD HAVE ALREADY BEEN ACTED ON.
--
-- WHY THE OBVIOUS MECHANISMS DO NOT WORK. The poller has to answer "is there
-- anything here I have not handled yet", and the two cheap answers both fail:
--
--   is:unread — the human opens these emails. Reading a request in the Gmail
--   app would mark it handled and the agent would never see it. A state flag
--   that a person can flip by looking at something is not a state flag.
--
--   a "tracked" label on the thread — correct for the OPENING message, useless
--   afterwards. Approvals and revisions arrive as replies INSIDE an
--   already-labelled thread, so the query that finds new work would filter out
--   the reply that grants consent.
--
-- So the unit of "handled" is the MESSAGE, while the unit of work stays the
-- THREAD. A thread is one job; the messages inside it are events against that
-- job, and each is processed exactly once.
--
-- AN ARRAY RATHER THAN A CHILD TABLE, deliberately. These threads are short —
-- a request, a proposal, an approval, maybe a revision. A join table for four
-- rows per job buys nothing and makes the poller's read path two queries.
-- Revisit if threads ever run long enough that the array needs paging, which
-- would itself be a sign the conversation should have been a new request.
alter table public.video_requests
  add column if not exists processed_message_ids text[] not null default '{}';

-- The poller's question is "have I seen this message id", asked against every
-- open job on every run. GIN makes that a containment lookup rather than a scan.
create index if not exists video_requests_processed_msgs_idx
  on public.video_requests using gin (processed_message_ids);

comment on column public.video_requests.processed_message_ids is
  'Gmail message ids already acted on in this thread. The dedupe key — NOT is:unread, which a human reading the mail would clear, and not a thread label, which cannot distinguish a reply from the message that created the thread.';
