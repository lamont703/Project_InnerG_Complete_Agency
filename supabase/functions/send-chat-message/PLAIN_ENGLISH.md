# The Client Chat Agent — Plain English Guide

## The Analogy: A Restaurant Kitchen

Think of this function like a restaurant. Here's how the parts map:

- **The Customer** = The client user typing in the chat
- **The Waiter (index.ts)** = Takes the order and coordinates everything. He doesn't cook and he doesn't decide the menu.
- **The Menu & Recipe Book (prompt-engineer.ts)** = Tells the chef how to cook every dish. If you want the AI to sound different, talk differently, or follow new rules — you change the recipe book, not the waiter.
- **The Chef (Gemini API, via _shared/lib/gemini.ts)** = Does the actual cooking. Reads the recipe and produces the response.
- **The Stockroom (_shared/lib/auth.ts)** = Only authorized staff can enter. The waiter checks credentials before every order.
- **The Filing System (signal-processor.ts)** = After the meal, if the chef flagged something important (like a bug report), the filing system writes it down and files it correctly in the database.
- **The Kitchen Rules (_shared/lib/response.ts)** = Every plate that leaves the kitchen looks the same. No plate goes out in a different format.

## What Happens When a Client Sends a Message

1. The message arrives at the waiter (index.ts).
2. The waiter checks your ID (auth.ts) — are you allowed to be here?
3. The waiter checks your membership data — which information the AI is allowed to see from your project.
4. The waiter searches the "knowledge library" (RAG) to find recent data relevant to your question.
5. The waiter brings all of this to the chef (Gemini) along with the recipe book (prompt-engineer.ts).
6. The chef cooks the response — a JSON object with a "message" and optionally a "signal."
7. The filing system (signal-processor.ts) reads the signal. If a bug was reported and confirmed, it creates a ticket in the database.
8. The waiter delivers the response back in a standardized format (response.ts).

## What Each File Is For (In Plain English)

| File | In Plain English |
|---|---|
| `index.ts` | The waiter. Controls the flow. |
| `types.ts` | The dictionary. Defines every word used. |
| `prompt-engineer.ts` | The recipe book. Controls what the AI says and how. |
| `signal-processor.ts` | The filing clerk. Saves the AI's decisions to the database. |

## The Golden Rule
If the AI is saying the wrong thing → edit **prompt-engineer.ts**.  
If the wrong data is being saved → edit **signal-processor.ts**.  
If the function returns the wrong format → edit **_shared/lib/response.ts**.  
If you're not sure which file → read **index.ts** from top to bottom to follow the flow.
