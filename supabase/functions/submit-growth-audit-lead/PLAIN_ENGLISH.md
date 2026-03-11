# submit-growth-audit-lead — Plain English Guide

## What This Does
When someone on the public website fills out the "Book a Growth Audit" form and hits submit, this function catches the submission and does two things: saves it in our own database and sends it to GoHighLevel so the sales team can follow up.

## The Analogy: The Front Desk Receptionist

Imagine a law firm's receptionist. When a potential client calls, she:
1. Writes down their name, contact info, and reason for calling in the firm's own records (our database)
2. Emails the relevant lawyer's assistant to add the contact to their system (GHL)

She does these in order — the filing comes FIRST. Even if the email to the assistant gets lost, the firm still has the lead on record.

## What Makes This Special: Duplicate Handling

GoHighLevel is smart about duplicates. If someone submits the form twice with the same email, GHL doesn't create a duplicate contact — it recognizes the existing one and we just update their tags. This function handles that automatically and invisibly.

## Who Can Use This
Anyone on the public internet. This form is on the marketing website — no login required. That's intentional — it's a top-of-funnel lead capture tool.

## What Happens to the Lead
After this runs:
- The lead appears in our `growth_audit_leads` table (viewable by agency staff)
- The lead appears in GoHighLevel with the tags `website_lead` and `growth_audit_requested`
- The GHL automation (if set up) will start a follow-up sequence automatically
