# resolve-signal — Plain English Guide

## What This Does
When a client sees an AI signal card on their dashboard and clicks its action button (like "Mark Resolved"), this function runs. It marks the signal as done and records who resolved it and when.

## The Analogy: Checking Off a To-Do Item

Imagine the AI assistant leaves sticky notes on your desk (signals). When you deal with one, you peel it off and put it in the "done" pile. This function is the act of peeling the sticky note off. It:

1. Verifies you are who you say you are (authentication)
2. Confirms the sticky note belongs to YOUR desk (project authorization via RLS)
3. Marks it as done in the database
4. Writes in the activity log that you resolved it and when

## Security Note
This function uses your personal credentials (JWT token) to ensure you can only resolve signals on your own projects. You cannot accidentally (or intentionally) resolve signals for another client's project.
