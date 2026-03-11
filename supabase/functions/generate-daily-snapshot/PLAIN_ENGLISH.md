# generate-daily-snapshot — Plain English Guide

## What This Does
This function runs automatically every day before sunrise. Think of it as the **overnight accountant** who tallies up all the numbers from the day before and writes a clean report for the morning.

## The Analogy: The Daily Sales Report

Every morning, a business owner wants to know:
- How many new people signed up yesterday?
- How many downloaded the app?
- What's the conversion rate?

This function goes through every active campaign, counts all the relevant data, and writes those numbers into the database. When the client opens their dashboard, the numbers are already there — pre-calculated and ready to display.

## What Numbers Does it Calculate?

1. **Total Signups** — Everyone who has ever signed up, counted from GHL contacts
2. **New Signups Today** — Only people who signed up in the last 24 hours
3. **App Installs** — If the client has a connected database, it counts installs from there. Otherwise, it estimates.
4. **Activation Rate** — What percentage of signups went on to install the app
5. **Social Reach & Engagement** — Currently estimated (real social data integration is planned for Phase 3)

## When Does It Run?
Automatically every morning at 3:00 AM UTC (before business hours). It can also be triggered manually from the agency dashboard.
