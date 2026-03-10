# How the Activity Feed Works (Plain English)

The "Recent Activity" section is like the **"Security Camera Monitor"** for your business. It records every important action taken by the AI or the users and displays it in real-time.

## 🏢 The Three Departments

### 1. The Watchman (The Activity Service)
This is the person watching the cameras 24/7.
- **What it does**: It stays connected to the database and alerts the app the second a new action is recorded (like a shipment going out or a lead signing up).
- **Why it matters**: It ensures you don't have to "refresh" the page to see what's happening; it happens live.

### 2. The Log Keeper (The Logic Hook)
This is the person writing the events into the official journal.
- **What it does**: It takes the raw alerts from the Watchman, calculates how long ago they happened (e.g., "5m ago"), and makes sure the journal only shows the most recent 10 events so it stays clean.
- **Why it matters**: It turns raw database records into readable, human-friendly history.

### 3. The Monitor (The Interface)
This is the physical screen where you read the activity.
- **What it does**: It shows the list of events with smooth animations. It also shows a "Live Feed" light (the green pulse) to let you know the system is currently connected and watching.
- **Why it matters**: It provides a high-end, professional look that gives you confidence the systems are active.

---

## 🛡️ The "Safety Promise"

Because the **Watchman** department is isolated, we can change which database tables it watches without ever breaking how the **Monitor** looks. This keeps the dashboard stable even as we add more complex integrations behind the scenes.
