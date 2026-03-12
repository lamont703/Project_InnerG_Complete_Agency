# generate-invite-link — Plain English Guide

## What This Does
When you want to bring a new client, developer, or admin onto the platform, you can't just hand them a login — they don't have an account yet. This function creates a **secure, one-time invite link** that you can send them. When they click the link, it takes them to a page where they can set their password and complete sign-up.

## The Analogy: A VIP Door Pass

Imagine a members-only club. You can't walk in off the street without a pass. This function creates a custom door pass for a specific person. The pass:

- **Has a name on it** — It's tied to a specific email address
- **Has an expiry date** — It expires after 7 days if not used
- **Is single-use** — Once they walk through the door, the pass deactivates
- **Has a role level** — It determines what rooms they can access (client, developer, admin)

## Security Rules
There is a strict rule called **Business Rule B-19**: A developer can only invite regular client users. They cannot use this to create other developer or admin accounts — only the super admin (Lamont) can do that. This prevents any one team member from escalating access levels.

## How It Works
1. You (an agency staff member) fill out an invite form: email, role, and which client they belong to
2. This function creates a secret random code tied to that email
3. The function returns a link like: `https://agency.innergcomplete.com/accept-invite?token=abc123...`
4. You copy that link and send it to the person (via email or Slack)
5. They click it, create their password, and they're in
