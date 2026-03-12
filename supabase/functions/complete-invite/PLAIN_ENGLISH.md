# complete-invite — Plain English Guide

## What This Does
This function is the **final step of onboarding**. After validating the invite link, the new user enters their name and password and presses "Create Account." This function takes care of everything that happens in the background to actually create and configure their account.

## What Happens When "Create Account" is Pressed

1. **Double-check the invite** — We re-verify the link hasn't been used by anyone else in the last few seconds (race condition protection)
2. **Create the account** — Their email and password are registered in the authentication system, pre-confirmed (no email verification needed — the invite is the verification)
3. **Retire the invite link** — The link is marked as "used" so nobody else can use it
4. **Grant the right access:**
   - **If they're a developer** — They get a developer access pass that covers all projects for that client
   - **If they're a client user** — They get access to all the projects currently belonging to their client's portfolio

## The Analogy: The New Employee's First Day

The invite link was the job offer letter. Accepting it (clicking the link) confirmed they wanted the job. This function is HR setting them up on their first day:
- Creating their employee login
- Setting their access badge for the right rooms
- Filing their paperwork

After this runs, the user can log in and everything is ready for them.
