# Phase 1: Frontend Audit — Technical Reference (As-Built)

---

## Metadata

| Field         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| **Status**    | ✅ Complete — As-Built Snapshot                                      |
| **Last Updated** | 2026-03-03                                                       |
| **Stack**     | Next.js 16 · React 19 · TypeScript 5.7 · Tailwind CSS v4 · Supabase JS |
| **Authored By** | Phase 1 Discovery Protocol (Senior Solutions Architect Pass)      |
| **Scope**     | All files in `/app`, `/components`, `/lib`, `/hooks`, `globals.css` |

---

## 1. Application Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER / BROWSER                              │
│   (Next.js App Router — React 19, Client-Side Hydration)            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     VERCEL CDN / EDGE                               │
│   Static assets, font delivery (Inter, JetBrains Mono via Google)  │
│   @vercel/analytics tracking injected in layout.tsx                  │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NEXT.JS APP ROUTER (Next 16.1.6)                       │
│                                                                     │
│  app/layout.tsx ──────► RootLayout (Google Fonts, Analytics)        │
│  app/page.tsx ─────────► Marketing Landing Page (SSR / Static)      │
│  app/login/page.tsx ───► Login Page (Client Component)              │
│  app/select-portal/    ► Portal Selector (Client Component)         │
│  app/dashboard/        ► Dashboard (Client Component + Suspense)    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ Supabase JS SDK (Browser Client)
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│               SUPABASE (PostgreSQL + Auth)                          │
│   lib/supabase.ts ─► createClient(URL, ANON_KEY)                    │
│   ⚠️  Single browser-only client — no Server/Admin client split     │
└─────────────────────────────────────────────────────────────────────┘
```

**Data Flow Notes:**
- There is **no middleware.ts** file — all routing is unguarded at the Next.js level.
- Authentication is **mocked** (simulated `setTimeout` in `login/page.tsx`). No real Supabase Auth calls are wired yet.
- All components marked `"use client"` — no React Server Component data fetching is in use.
- **Production URL:** `https://agency.innergcomplete.com` (deployed to Vercel)
- **Kane's Bookstore** and **Plenty of Hearts** are **mock/demo clients only** — not real active clients. All dashboard data is placeholder values to showcase the platform.
- The `/free-ebook/` flow is a **separate microsite in a separate repository** — it is NOT part of this Next.js project and should not be documented here.

---

## 2. Directory Structure

```
/AI_Blockchain_Enterprise_Services
├── app/
│   ├── globals.css              # Design system: OKLCH tokens, glass utilities, animations
│   ├── layout.tsx               # RootLayout: fonts, viewport, SEO metadata, Analytics
│   ├── page.tsx                 # Marketing homepage (10-section composition)
│   ├── login/
│   │   └── page.tsx             # Client-side login form (mock auth)
│   ├── select-portal/
│   │   └── page.tsx             # Agency portal selector (hardcoded project list)
│   └── dashboard/
│       └── page.tsx             # Main client dashboard (Suspense-wrapped)
├── components/
│   ├── navbar.tsx               # Responsive marketing nav (scroll-aware)
│   ├── hero-section.tsx         # Landing hero w/ CTAs and pillars
│   ├── services-section.tsx     # 6-service card grid
│   ├── process-section.tsx      # Engagement process steps
│   ├── feature-highlight.tsx    # Feature deep-dive section
│   ├── founders-vision.tsx      # Founder narrative block
│   ├── solutions-section.tsx    # AI/Blockchain solution tiers
│   ├── results-section.tsx      # Metrics / social proof section
│   ├── testimonials-section.tsx # Client quote cards
│   ├── cta-section.tsx          # Contact form (Growth Audit request)
│   ├── footer.tsx               # Site footer with links
│   ├── theme-provider.tsx       # next-themes wrapper
│   ├── dashboard/
│   │   └── chat-interface.tsx   # AI Growth Assistant chat UI (mock responses)
│   └── ui/                      # 57 shadcn/ui primitives (Radix-based)
│       ├── button.tsx, input.tsx, textarea.tsx, card.tsx ...
│       ├── sidebar.tsx (21 KB – full sidebar system)
│       ├── chart.tsx (recharts wrapper)
│       └── [54 other primitives]
├── lib/
│   ├── supabase.ts              # Browser Supabase client (single instance)
│   └── utils.ts                 # cn() helper: clsx + tailwind-merge
├── hooks/
│   ├── use-mobile.ts            # Breakpoint detection hook (≤768px)
│   └── use-toast.ts             # Toast state manager (Radix Toast)
├── docs/
│   ├── discovery-call.md
│   ├── phase1-master-audit-prompt.md
│   ├── phase2-master-backend-modeling-prompt.md
│   ├── phase3-master-api-design-prompt.md
│   └── phase4-master-backend-architecture-prompt.md
├── public/
│   ├── icon-light-32x32.png
│   ├── icon-dark-32x32.png
│   └── icon.svg
├── styles/
├── package.json
├── tsconfig.json
├── next.config.mjs
└── .env.example
```

---

## 3. Route Map

| Route              | Type      | Auth Required | Description                                               |
| ------------------ | --------- | ------------- | --------------------------------------------------------- |
| `/`                | Public    | ❌ None        | Marketing landing page — 10 section scroll composition    |
| `/login`           | Public    | ❌ None        | Login form — **mock only**, no real auth gate             |
| `/select-portal`   | Protected | ⚠️ Mock       | Portal selector — no real session check, no redirect      |
| `/dashboard`       | Protected | ⚠️ Mock       | Client dashboard — no real session check, no redirect     |
| `/dashboard?project=plenty-of-hearts` | Protected | ⚠️ Mock | Alternate project view via URL param |

**⚠️ Critical Gap:** There is **no middleware.ts** enforcing route protection. Any user can navigate directly to `/dashboard` or `/select-portal` without logging in. The `useEffect` in `select-portal/page.tsx` has a completely empty body (`useEffect(() => {}, [])`) — it was built as a placeholder for auth validation that was never implemented.

---

## 4. Component Inventory

### 4a. Global / Layout Components

| Component          | File                        | Role                                            |
| ------------------ | --------------------------- | ----------------------------------------------- |
| `RootLayout`       | `app/layout.tsx`            | HTML shell, fonts, viewport, Vercel Analytics    |
| `Navbar`           | `components/navbar.tsx`     | Fixed top nav, scroll-aware blur, mobile drawer  |
| `Footer`           | `components/footer.tsx`     | Site footer, links                               |
| `ThemeProvider`    | `components/theme-provider.tsx` | next-themes context (dark mode ready)        |

### 4b. Marketing Page Components (Landing `/`)

| Component             | File                             | Role                                      |
| --------------------- | -------------------------------- | ----------------------------------------- |
| `HeroSection`         | `components/hero-section.tsx`    | Full-height hero, headline, 2 CTAs, pillars |
| `ServicesSection`     | `components/services-section.tsx`| 6-card service grid with hover glows      |
| `ProcessSection`      | `components/process-section.tsx` | Step-by-step engagement flow              |
| `FeatureHighlight`    | `components/feature-highlight.tsx`| Deep-dive feature callout block          |
| `FoundersVision`      | `components/founders-vision.tsx` | Narrative / founder statement block       |
| `SolutionsSection`    | `components/solutions-section.tsx`| AI + Blockchain solution tier cards     |
| `ResultsSection`      | `components/results-section.tsx` | Stats / proof metrics                     |
| `TestimonialsSection` | `components/testimonials-section.tsx`| Client quote cards                    |
| `CtaSection`          | `components/cta-section.tsx`     | Contact form (Growth Audit request)       |

### 4c. Dashboard Components

| Component        | File                                      | Role                                         |
| ---------------- | ----------------------------------------- | -------------------------------------------- |
| `DashboardPage`  | `app/dashboard/page.tsx`                  | Suspense shell → renders `DashboardContent`  |
| `DashboardContent` | `app/dashboard/page.tsx` (inner fn)     | Full dashboard: sidebar, header, metrics, chat |
| `ChatInterface`  | `components/dashboard/chat-interface.tsx` | AI assistant chat (mock responses, expandable) |

### 4d. Auth / Portal Components

| Component          | File                         | Role                                        |
| ------------------ | ---------------------------- | ------------------------------------------- |
| `LoginPage`        | `app/login/page.tsx`         | Email + password form, mock 1s timeout login |
| `SelectPortalPage` | `app/select-portal/page.tsx` | Agency project list, search, portal routing  |

### 4e. UI Primitives (`components/ui/`)

57 Radix UI-based shadcn components installed. Key ones in active use:

| Primitive    | Used By                          |
| ------------ | -------------------------------- |
| `button.tsx` | Navbar, Hero, Dashboard, Login, CTA |
| `input.tsx`  | Login, SelectPortal, ChatInterface, CTA |
| `textarea.tsx` | CTA contact form               |
| `chart.tsx`  | Installed, not yet actively rendered |
| `sidebar.tsx`| Installed (21KB), not yet used in Dashboard (custom sidebar built inline) |
| `toast.tsx / toaster.tsx / sonner.tsx` | Installed, no active toast triggers found |

---

## 5. Data Models (TypeScript)

**Defined Inline — No centralized types file exists.**

### `Message` (`components/dashboard/chat-interface.tsx`)

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}
```

### `Project` (anonymous inline — `app/select-portal/page.tsx`)

```typescript
// Inferred from usage (no explicit interface declared)
type Project = {
  id: string;
  name: string;
  client: string;
  status: "Active" | string;
  type: string;
  campaign: string;
  lastActivity: string;
  metrics: string;
  icon: LucideIcon;
  href: string;
}
```

### `StatusItem` (anonymous inline — `app/dashboard/page.tsx`)

```typescript
// Inferred from usage
type StatusItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  status: string;
  details: string;
  color: string;
}
```

### `Service` (anonymous inline — `components/services-section.tsx`)

```typescript
// Inferred from usage
type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: string[];
}
```

**⚠️ Debt:** No `/types` directory or shared `types.ts` file. All interfaces are local, anonymous, or inferred. This will cause friction as the codebase scales.

---

## 6. State Management

### Strategy: Local React State Only (No Global Manager)

| State Variable   | Location                      | Type                    | Purpose                              |
| ---------------- | ----------------------------- | ----------------------- | ------------------------------------ |
| `email`          | `login/page.tsx`              | `string`                | Controlled email input               |
| `password`       | `login/page.tsx`              | `string`                | Controlled password input            |
| `isLoading`      | `login/page.tsx`              | `boolean`               | Submission loading state             |
| `searchQuery`    | `select-portal/page.tsx`      | `string`                | Client-side project search filter    |
| `userName`       | `dashboard/page.tsx`          | `string`                | Display name, derived from searchParams |
| `currentTime`    | `dashboard/page.tsx`          | `Date`                  | Live clock (1s interval timer)       |
| `mounted`        | `dashboard/page.tsx`          | `boolean`               | Hydration guard for time display     |
| `latencies`      | `dashboard/page.tsx`          | `Record<string, number>`| Random simulated latencies on mount  |
| `isSidebarOpen`  | `dashboard/page.tsx`          | `boolean`               | Mobile sidebar drawer toggle         |
| `messages`       | `chat-interface.tsx`          | `Message[]`             | Chat history array                   |
| `input`          | `chat-interface.tsx`          | `string`                | Controlled chat text input           |
| `isLoading`      | `chat-interface.tsx`          | `boolean`               | AI response pending indicator        |
| `isExpanded`     | `chat-interface.tsx`          | `boolean`               | Chat panel full-screen expand toggle |
| `submitted`      | `cta-section.tsx`             | `boolean`               | Form submission success toggle       |
| `isScrolled`     | `navbar.tsx`                  | `boolean`               | `window.scrollY > 20` for nav blur   |
| `isMobileOpen`   | `navbar.tsx`                  | `boolean`               | Mobile nav drawer toggle             |

### localStorage / sessionStorage
- **None used.** No persistence mechanism exists for user session, preferences, or state.

### URL / Search Params
- `dashboard/page.tsx` uses `useSearchParams()` to read `?project=plenty-of-hearts`, which togoles the entire dashboard's content and data (the only form of "routing" between project views).

---

## 7. Authentication & Authorization

### Current State: Mock Authentication

```
User fills login form
        │
        ▼
handleLogin() called
        │
        ▼
e.preventDefault() → setIsLoading(true)
        │
        ▼
setTimeout(1000ms) ← ⚠️ Simulated delay — NO real auth call
        │
        ▼
router.push('/select-portal')  ← Any credentials work
```

### Supabase Client Configuration (`lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Notes:**
- `createClient` is called at module initialization — this is a **browser-only** singleton.
- The `!` non-null assertion means the app will **throw a runtime error** if env vars are missing.
- No `onAuthStateChange` listener. No session persistence check.
- No `supabase.auth.signInWithPassword()` is called anywhere in the codebase.

### Role-Based Access Control
- **Absent.** No role checking, no admin guards, no middleware.
- The dashboard "distinguishes" between projects via `?project=` URL param, but this is a UI rendering toggle — not a security boundary.

---

## 8. Client Configurations

### Supabase (`lib/supabase.ts`)

| Client Type    | File              | Options         | Notes                              |
| -------------- | ----------------- | --------------- | ---------------------------------- |
| Browser Client | `lib/supabase.ts` | Default (anon)  | Single export, no auth hooks wired |
| Server Client  | ❌ Not created    | —               | No `createServerComponentClient`   |
| Admin Client   | ❌ Not created    | —               | No `createClient` with service key |

### Next.js (`next.config.mjs`)

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
```
Minimal config. No custom headers, rewrites, or image domains defined.

### TypeScript (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES6",
    "module": "esnext",
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./*"] }
  }
}
```
Strict mode is enabled. `@/` path alias maps to project root.

### CSS System (`app/globals.css`)

Tailwind CSS v4 with OKLCH color tokens. No light/dark toggle — the app is **dark mode only** (`colorScheme: 'dark'` in `layout.tsx` viewport).

Custom utility classes defined:

| Class                | Effect                                      |
| -------------------- | ------------------------------------------- |
| `.glass-panel`       | Blurred glass with `blur(24px)` backdrop    |
| `.glass-panel-strong`| Heavier glass with `blur(40px)` backdrop    |
| `.glow-primary`      | Dual box-shadow OKLCH primary glow          |
| `.glow-accent`       | Box-shadow OKLCH accent glow                |
| `.text-gradient`     | 3-stop diagonal gradient text clip         |
| `.text-gradient-subtle` | Softer 2-stop gradient text clip        |
| `.animate-float`     | 6s vertical float keyframe                  |
| `.animate-float-delayed` | Delayed float (2s offset)               |
| `.animate-pulse-glow`| 4s opacity pulse keyframe                   |

---

## 9. Login & Portal Flow Implementation (Primary Complex Feature)

The login and portal selection flow is the current primary "protected" path. Here is the complete logic sequence:

```
[User] → GET /login
         └► LoginPage renders:
              email, password inputs
              "Forgot Password" Link → href="#" (⚠️ No-op)
              "Request a Growth Audit" → href="/#contact"

[User] → Submits form (handleLogin)
         └► e.preventDefault()
             setIsLoading(true)
             setTimeout(1000ms) → {
                router.push('/select-portal')
             }
             ⚠️ No credential validation — any input works.

[User] → GET /select-portal
         └► SelectPortalPage renders:
              Header: "Enterprise Client Portals"
              User identity: hardcoded "System Administrator / Master Access"
              useEffect(() => {}, []) ← ⚠️ Empty, auth check placeholder

              Projects array (hardcoded, 2 entries):
              ┌────────────────────────────────────────────────────┐
              │ 1. Project Kanes Bookstore → href="/dashboard"     │
              │ 2. Project Plenty of Hearts → href="/dashboard?    │
              │    project=plenty-of-hearts"                       │
              └────────────────────────────────────────────────────┘

              Search: filters by project.name || project.client (client-side)
              "Request New Portal" button: ⚠️ No action wired.
              "Status: Active" filter button: ⚠️ No filter logic.

[User] → Clicks Portal Card → router navigates to /dashboard[?project=]
```

---

## 10. Dashboard Implementation (Secondary Complex Feature)

The dashboard is the primary client-facing product. It is a fully client-rendered, data-stubbed UI.

```
DashboardPage (Suspense shell)
    └► DashboardContent (Client Component)
          │
          ├── Reads useSearchParams() → projectType
          ├── Sets userName from projectType ("Kane" vs "Admin")
          │
          ├── useEffect on mount:
          │     setMounted(true)
          │     Initialize latencies (Math.random) for status card animations
          │     setInterval(1000ms) → setCurrentTime(new Date())
          │
          ├── Sidebar (Desktop: sticky `aside`, 288px wide)
          │     - Logo link → /
          │     - "Switch Portal" → /select-portal
          │     - "Dashboard" (active) → /dashboard
          │     - "Monitoring" button → ⚠️ No action
          │     - "Infrastructure" button → ⚠️ No action
          │     - "Sign Out" → router.push('/')
          │
          ├── Mobile Sidebar (slide-in `aside`, 280px, z-[101])
          │     - Controlled by isSidebarOpen state
          │     - Backdrop overlay dismisses drawer
          │
          ├── Header Bar (sticky top, h-20, backdrop-blur)
          │     - Hamburger menu (mobile only)
          │     - Live date/time display (mounted guard)
          │     - Bell notification icon → ⚠️ No notification system
          │     - User avatar + role label (from isPlentyOfHearts)
          │
          ├── Connection Status Grid (4 cards)
          │     Kanes Bookstore view:        Plenty of Hearts view:
          │     - Database Connection        - Database Connection
          │     - AI Agent Engine            - AI Agent Engine
          │     - GoHighLevel Sync           - GoHighLevel Sync
          │     - Instagram API       →      - TikTok API (swapped via map())
          │     All show "Valid" ✅ badge and random latency ms
          │
          ├── Main Performance Section (conditional on !isPlentyOfHearts)
          │     Kanes Bookstore: Campaign stats block
          │       - 4 KPI metric cards (Total Signups, App Installs, Conv Rate, IG Reach)
          │       - All values: hardcoded static strings
          │
          │     Plenty of Hearts: "Workspace Initialized" welcome banner
          │       - TikTok Status card
          │       - Database Status card
          │
          ├── Detailed Analysis Grid
          │     Left Column (always shown):
          │       └► <ChatInterface /> (mock AI assistant)
          │
          │     Right Column (Kanes only):
          │       ├── Instagram Social Analytics panel (hardcoded bar chart, sentiment)
          │       └── Acquisition Funnel (progress bar visualization, hardcoded data)
          │
          ├── Campaign Funnel Intelligence (Kanes only)
          │     3 signal cards:
          │     - Inventory Signal (Database) → "Automate Restock Order" button ⚠️ no action
          │     - Conversion Signal (GHL) → "Trigger Retargeting Flow" button ⚠️ no action
          │     - Social Signal (Instagram) → "Deploy Bio-Link Update" button ⚠️ no action
          │
          └── Recent Activity Feed (Kanes only, max-w-xl)
                4 hardcoded activity items
                "View Historical Audit Data" button ⚠️ no action
```

### ChatInterface Logic Sequence (`components/dashboard/chat-interface.tsx`)

```
Initial state: messages = [{ role: "assistant", content: "Hello! I'm your Inner G Growth Assistant..." }]

[User types → handleSend()]
    └► Creates userMessage, appends to messages[]
        setInput("") → clears field
        setIsLoading(true)
        setTimeout(1500ms) → {
            getMockResponse(userInput) → keyword-matched string response
            "database" | "scale" → architecture response
            "ghl" | "gohighlevel" → CRM sync response
            "automation" → bottleneck response
            (default) → generic strategy response
            Appends assistantMessage → setIsLoading(false)
        }

UX Features:
    - Expandable to fixed fullscreen (isExpanded toggle → fixed inset)
    - Auto-scroll on new message (scrollToBottom via scrollContainerRef.scrollTo)
    - Smooth scroll behavior
    - Loader2 spinner "thinking" indicator during setTimeout
    - Minimize/Maximize2 icon toggle
```

---

## 11. Forms & Validation

| Form          | Location              | Fields                          | Validation             | Submission Handler             |
| ------------- | --------------------- | ------------------------------- | ---------------------- | ------------------------------ |
| Login         | `app/login/page.tsx`  | `email`, `password`             | HTML5 `required` only  | Mock `setTimeout` → redirect   |
| Growth Audit  | `components/cta-section.tsx` | `name`, `email`, `company`, `message (optional)` | HTML5 `required` on first 3 | `setSubmitted(true)` — no API call |

**Libraries Available but Unused for Auth/Contact:**
- `react-hook-form` `^7.54.1` — installed, not used in any current form.
- `zod` `^3.24.1` — installed, not used for any schema validation.
- `@hookform/resolvers` `^3.9.1` — installed, not used.

**Current UX Feedback Pattern:**
- Login: button text changes from "Sign Into Portal" → "Signing in..." during timeout.
- Contact Form: entire form panel swaps to a "Audit Requested" confirmation state.
- No error states, no field-level validation messages, no `toast()` notifications triggered.

---

## 12. API Communication Patterns

| Pattern              | Status   | Location                          | Notes                                       |
| -------------------- | -------- | --------------------------------- | ------------------------------------------- |
| **Supabase Direct SDK** | ⚠️ Wired, Unused | `lib/supabase.ts` | Client created, never called (`supabase.from(...)` not used anywhere) |
| **Next.js API Routes** | ❌ None  | `/app/api/` (does not exist)      | No `route.ts` files created                 |
| **Next.js Server Actions** | ❌ None | — | No `"use server"` actions defined         |
| **Supabase Edge Functions** | ❌ None | — | No `supabase.functions.invoke()` calls     |
| **External REST APIs** | ❌ None | — | GoHighLevel, Instagram, TikTok APIs referenced in UI but not actually called |
| **`fetch()` calls** | ❌ None  | —                                 | No direct fetch calls in the codebase       |

**Summary:** The application is entirely a **static UI demo**. All data shown (metrics, funnel numbers, activity feed, chat responses) is hardcoded or mock-generated. No real API calls are made to any backend, external API, or database.

---

## 13. Known Gaps & Technical Debt

| ID   | Category              | Location                                      | Description                                           | Priority |
| ---- | --------------------- | --------------------------------------------- | ----------------------------------------------------- | -------- |
| T-01 | **Security**          | All routes                                    | No `middleware.ts` — `/dashboard` and `/select-portal` are publicly accessible without auth | 🔴 Critical |
| T-02 | **Authentication**    | `app/login/page.tsx`                          | `handleLogin` uses `setTimeout` — no real Supabase Auth call | 🔴 Critical |
| T-03 | **Authentication**    | `app/select-portal/page.tsx:59`               | `useEffect(() => {}, [])` — empty, intended auth check never implemented | 🔴 Critical |
| T-04 | **Data**              | `app/dashboard/page.tsx`                      | All KPI metrics, funnel data, activity feed are hardcoded strings — not fetched from DB | 🔴 Critical |
| T-05 | **Data**              | `app/select-portal/page.tsx`                  | Projects array is hardcoded — not fetched from a database | 🟠 High |
| T-06 | **Forms**             | `components/cta-section.tsx`                  | Contact form has no backend submission — `setSubmitted(true)` only, no data is stored | 🟠 High |
| T-07 | **Forms**             | `app/login/page.tsx`, `components/cta-section.tsx` | `react-hook-form` and `zod` installed but unused; HTML5 `required` only | 🟠 High |
| T-08 | **Types**             | Entire codebase                               | No centralized `/types` directory — all interfaces are inline and anonymous | 🟡 Medium |
| T-09 | **UI Buttons**        | `app/dashboard/page.tsx`                      | "Automate Restock Order", "Trigger Retargeting Flow", "Deploy Bio-Link Update", "Export Report", "View Historical Audit Data" — non-functional buttons. **"Request New Portal"** is planned for super_admin only (creates new project + assigns developer + client). **"Monitoring"** and **"Infrastructure"** sidebar links are to be removed until real pages exist. | 🟡 Medium |
| T-10 | **Navigation**        | `app/login/page.tsx:72`                       | "Forgot password?" links to `href="#"` — no recovery flow | 🟡 Medium |
| T-11 | **UI Dashboard**      | `app/dashboard/page.tsx`                      | Bell notification icon has a red dot indicator but no notification system | 🟡 Medium |
| T-12 | **Supabase Config**   | `lib/supabase.ts`                             | Single browser client — no Server Component client or Admin client configured | 🟡 Medium |
| T-13 | **UI Components**     | `components/ui/sidebar.tsx`                   | Full shadcn sidebar system installed (21KB) but not used — dashboard uses a custom inline sidebar | 🟢 Low |
| T-14 | **UI Components**     | `components/ui/chart.tsx`, `sonner.tsx`, `toast.tsx` | Installed but not actively used in any current page | 🟢 Low |
| T-15 | **Services Section**  | `components/services-section.tsx:73`          | Conditional badge checks for `service.title === "AI Strategy & Architecture"` — this service title does not match. Correct title is **"Scalable AI & Blockchain Strategy"** — fix the badge condition | 🟡 Medium |
| T-16 | **Mock Data**         | `app/dashboard/page.tsx`, `app/select-portal/page.tsx` | Kane's Bookstore and Plenty of Hearts are **mock/demo clients only** — all metrics, funnel data, signal cards, and activity entries are placeholder values showcasing the platform. No real client data exists yet. | 🟡 Medium (documentation context) |
| T-16 | **Scroll Restoration** | `app/layout.tsx:57`                          | `history.scrollRestoration = 'manual'` is set globally — may cause UX issues on browser back navigation to non-dashboard pages | 🟢 Low |
| T-17 | **SEO**               | `app/login/page.tsx`, `app/select-portal/page.tsx`, `app/dashboard/page.tsx` | No per-page `<title>` or `<meta description>` tags — only the root `layout.tsx` metadata is set | 🟢 Low |
