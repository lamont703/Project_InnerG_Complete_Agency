# GitHub Intelligence (Plain English)

The **GitHub Intelligence** system is like a **"X-Ray Machine"** for your
project's development. It allows the Agency to see inside the actual work being
done on the software without needing to understand complex code.

## 🏢 The Three Departments

### 1. The Scout (The GitHub Connector Sync)

This is a backend worker that lives outside the main app.

- **What it does**: Every few hours (or whenever you click 'Sync'), it visits
  the GitHub repository, gathers all the latest updates (commits and pull
  requests), and brings them "home" to our secure database.
- **Why it matters**: It ensures that our Chat Agent has a "Memory" of what the
  developers are building, even if GitHub is offline.

### 2. The Translator (The Intelligence Service)

This department lives inside our app and speaks "Business."

- **What it does**: It takes raw technical data (like "merged PR #42") and
  translates it into something you care about (like "The new checkout feature is
  100% complete and ready for testing").
- **Why it matters**: It bridges the gap between the technical team and the
  strategic stakeholders.

### 3. The Dashboard Display (The Interface)

This is the visual part you see on the screen.

- **What it does**: It organizes the project's health into simple charts and
  "Heartbeat" icons. It shows you if the team is moving fast (High Velocity) or
  if the project has stalled.
- **Why it matters**: It gives you "Peace of Mind" that the project is moving
  according to the plan.

---

## 🛡️ The "Privacy & Security" Promise

We never store your actual code files in our chat database. We only store the
**"Metadata"** — which is like the _table of contents_ of your work. This keeps
your intellectual property 100% secure while still giving the AI enough
information to be helpful and strategic.
