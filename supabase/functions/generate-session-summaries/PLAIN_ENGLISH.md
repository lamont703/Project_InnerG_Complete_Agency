# generate-session-summaries — Plain English Guide

## What This Does
Every night, after clients have finished chatting with the AI, this function reads through all the completed conversations and writes a short, clear summary of each one. The next time the AI needs to remember what was discussed, it reads the summary instead of all 50 messages — making it much faster and smarter.

## The Analogy: The Meeting Minutes Writer

After every business meeting, someone writes the minutes — a condensed record of what was discussed, what was decided, and what the next actions are. This function does that for every completed AI chat.

- **Old messages** = The full recording of the meeting
- **The Summary** = The meeting minutes — short, accurate, designed for quick reference
- **Gemini** = The note-taker who reads the full recording and writes great minutes
- **session_summaries table** = The filing cabinet where all the minutes are stored

## Why This Matters for the AI
When you start a new conversation and say "Remember what we discussed last week about my landing page?", the AI doesn't re-read 200 messages. It reads the 3-paragraph summary and instantly has the context it needs. This is what makes the AI feel like it actually knows you over time.

## When Does It Run?
Automatically every night. It only processes conversations that:
- Ended more than 1 hour ago
- Had at least 4 messages
- Don't already have a summary
