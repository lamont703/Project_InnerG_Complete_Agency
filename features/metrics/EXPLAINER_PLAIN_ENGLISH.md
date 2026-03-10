# How the KPI Metrics Work (Plain English)

The "Campaign Architecture Performance" section at the top of your dashboard is like the **"Financial News Ticker"** for your project. It summarizes your most important numbers so you can see if you are growing at a glance.

## 🏢 The Three Departments

### 1. The Accountant (The Metrics Service)
This department handles all the heavy math.
- **What it does**: It looks at your numbers from today and compares them to your numbers from yesterday. It calculates the green or red "Growth Percentage" so you don't have to do the math yourself.
- **Why it matters**: It ensures the numbers are accurate and standardized across the whole app.

### 2. The Project Manager (The Logic Hook)
This person coordinates the departments.
- **What it does**: It figures out which project we are looking at, finds the right campaign for that project, and gets the latest report from the Accountant.
- **Why it matters**: It handles the "middle-man" work, from showing a loading spinner to deciding what to show if there are no numbers to report yet.

### 3. The Graphic Designer (The Interface)
This is the final presentation you see.
- **What it does**: It puts the numbers into beautiful cards with icons (like a person icon for signups) and colors them emerald for growth or red for decline.
- **Why it matters**: It turns raw, boring data into a professional dashboard that is easy on the eyes.

---

## 🛡️ The "Safety Promise"

Because the **Accountant** (the math) and the **Designer** (the cards) are in separate rooms, we can update the dashboard's look without ever risking a mistake in the math. This separation makes your financial and performance data much safer and more reliable.
