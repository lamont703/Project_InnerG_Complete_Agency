# process-embedding-jobs — Plain English Guide

## What This Does
Think of this as a **library card catalog system**. Every time new data is added to the database (a new lead, a new sales signal, a new activity log), this function converts that data into a "library card" — a special number sequence called an **embedding** — that the AI can search through instantly.

## The Analogy: The Library Indexer

- **New DB Rows** = New books arriving at the library
- **This function** = The librarian who catalogs every new book
- **Gemini Embed API** = The special machine that reads the book and creates a unique card for it
- **document_embeddings table** = The card catalog drawer
- **RAG Search (in the chat functions)** = A student searching the card catalog to find relevant books before answering a question

## Why Is This Needed?
The AI chat agent needs to find relevant context before answering questions. Instead of reading every row in the database every time, it searches the card catalog (embeddings) to instantly find the 8 most relevant chunks of data. This is Retrieval-Augmented Generation (RAG).

## Two Types of Indexing

1. **Per Row (e.g., AI Signals, System Connections)** — Each record gets its own individual library card.
2. **Daily Summary (e.g., Activity Log, GHL Contacts)** — All records from a single day for a single project get rolled into one summary card. This prevents the catalog from getting too large.

## When Does It Run?
Usually automatically after new data is inserted (via database triggers). It can also be triggered manually via HTTP.
