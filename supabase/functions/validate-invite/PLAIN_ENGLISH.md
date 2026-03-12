# validate-invite — Plain English Guide

## What This Does
When someone clicks an invite link and lands on the page, the first thing we need to do is check: "Is this invite still valid?" This function does that check — before they even see the sign-up form. It's the **bouncer at the door** who checks the pass before letting you in.

## What It Checks

1. **Does this invite exist?** If someone types a random URL or the link was corrupted, we reject it.
2. **Has it expired?** Invite links are only valid for 7 days. After that, the agency needs to send a new one.
3. **Has it already been used?** Each invite is single-use. Once someone signs up with it, it's done.

## What Happens Next
If the invite is valid, this function hands back the email address and the role so the frontend can pre-fill the sign-up form. The user just needs to enter their name and create a password — everything else is already set.

If any check fails, it sends back a specific error code so the page can show a helpful message like "This invite has expired. Please contact your agency contact for a new one."
