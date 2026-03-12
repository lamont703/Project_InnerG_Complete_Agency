# process-kpi-aggregation — Plain English Guide

## What This Does
This function is a **data detective**. When the daily snapshot needs to know "how many users installed the client's app today?", it can't get that number from GoHighLevel — it has to go directly to the client's own database. This function does that by temporarily connecting to an external database and running a count.

## The Analogy: The Meter Reader

A utility company periodically sends a meter reader to your house to read your electricity usage. They don't guess — they go to the source. This function does the same:

- **The Client's External Database** = Your house's electricity meter
- **This Function** = The meter reader who connects, reads the number, and reports back
- **The Result** = The app install count that gets added to today's KPI snapshot

## Security: Handling Connection Strings

The connection string to the client's database is sensitive information. This function treats it like a password:
- It never logs it to the console
- It establishes the connection, reads the one number it needs, and immediately disconnects
- The connection is always closed, even if something goes wrong

## When Does It Run?
It is called automatically by the `generate-daily-snapshot` function during the nightly report. It never runs on its own.
