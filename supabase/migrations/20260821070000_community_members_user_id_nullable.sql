-- A MEMBER CAN NOW EXIST BEFORE AN AUTH USER DOES.
--
-- THE FAILURE THIS FIXES, seen in a real Instagram thread: the agent offered an
-- account, the person replied with their email, and got back "Something went
-- wrong setting that up on my end." Twice. The insert was failing on
--
--   null value in column "user_id" of relation "community_members"
--   violates not-null constraint                            (SQLSTATE 23502)
--
-- WHY THE COLUMN WAS NOT NULL, and why that was right at the time. Every way of
-- becoming a member ran through Supabase Auth first — a form, a magic link, an
-- OAuth callback — so an auth user always existed before the member row, and
-- the constraint recorded that. It was true for every path that existed.
--
-- WHAT CHANGED. The Instagram DM agent collects an email inside the thread,
-- because sending someone out of Instagram to a signup form is the one thing
-- this channel exists to avoid. At that moment we have an address nobody has
-- proved control of and no auth user. The member is real — they asked for the
-- account and they get the higher allowance and the remembered situation in
-- that conversation immediately — but Supabase Auth has never heard of them.
--
-- SO THE NULL IS THE HONEST STATE, not a loophole: this person is a member who
-- has not yet signed in anywhere. Creating a confirmed auth user for an
-- unverified address to satisfy the constraint would have been the dishonest
-- option, and it would have asserted control of a mailbox we cannot check.
--
-- HOW IT GETS FILLED. app/auth/callback adopts a row like this by email the
-- first time they use a magic link — the code exchange having just proved the
-- mailbox, which is the same standard the invite flow already uses to decide
-- who an invite belongs to. Without that adoption this change would quietly
-- produce two member rows per person, one holding the DM thread and the other
-- the login.
--
-- NOTHING ELSE DEPENDS ON IT. One consumer reads the column —
-- prune-unconfirmed-users, which filters `user_id IN (ids)`; a null simply does
-- not match, which is correct, because a member with no auth user has no
-- unconfirmed auth user to prune. The UNIQUE index still holds: Postgres treats
-- NULLs as distinct, so any number of not-yet-linked members can coexist while
-- two rows still cannot share one auth user. The foreign key still holds too —
-- it constrains non-null values only.

ALTER TABLE public.community_members ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.community_members.user_id IS
  'Supabase Auth user. NULL means the member joined somewhere that had no login - today that is the Instagram DM agent, which collects an email in the thread rather than sending someone to a form. app/auth/callback adopts the row by email on first sign-in.';
