# Schedule Planner

A monthly shift-scheduling web app for teams with rotating shifts, configurable staffing constraints, and per-worker PDF exports.

---

## Features

### Calendar view
- Monthly grid showing every worker's shift assignment at a glance
- Color-coded shift badges with live worker counts vs. minimum requirements
- Red indicator when a day is understaffed; blue indicator for manual overrides
- Click any day to manually override individual worker assignments

### Shift configuration
- Define shifts with name, color, start/end time, and active days
- Two-group rotation: workers are split into two halves that swap shifts every ISO week

### Staffing constraints
- Set minimum and maximum workers per shift per day-group (weekdays, weekends, or any custom combination)
- Violation panel at the bottom of the calendar lists every breach with shift and date

### Worker management
- Add workers with name, color, weekly hours, and preferred days off
- Mark workers active or inactive; inactive workers are excluded from scheduling
- Per-worker detail page with monthly stats (working days, days off, hours per shift)

### Auto-scheduling algorithm
1. Respects each worker's preferred days off when distributing rest days across the week
2. Enforces minimum staffing on every day — workers are pulled from preferred days off if needed, and given a compensating swap day in the same week
3. Enforces maximum caps (hard) after filling shortfalls
4. Reports violations for constraints that cannot be satisfied (e.g. contradictory min/max)

### Exports
- **CSV** — full month schedule with one row per worker per day
- **Worker PDFs** — one A4 page per active worker showing their complete monthly schedule, shift hours, and summary stats

### Responsive design
- Desktop / tablet: collapsible sidebar navigation
- Mobile: bottom tab bar, full-screen config panel, compact calendar cells

---

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| State | Zustand 5 (persisted to localStorage) |
| Dates | date-fns 4 |
| PDF export | jsPDF 4 + jspdf-autotable 5 |
| Runtime | Bun |

---

## Getting started

```bash
# Install dependencies
bun install

# Run the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-time setup

1. Click **Config** in the top bar
2. Under **General**, set working days and days off per week
3. Under **Shifts**, add your shifts (name, time range, active days)
4. Under **Constraints**, set minimum/maximum workers per shift per day group
5. Under **Rotation**, assign which shift each worker group covers on odd weeks
6. Go to **Workers** and add your team members
7. Back on **Schedule**, click **Generate** to produce the monthly schedule

---

## Project structure

```
app/                  Next.js App Router pages
components/
  calendar/           Monthly calendar grid and day-override modal
  config/             Config panel (shifts, constraints, rotation, general)
  layout/             AppShell, Sidebar, TopBar, BottomNav
  ui/                 Shared primitives (Button, Input, Modal, SlideOver…)
  workers/            Worker list, detail view, and monthly grid
lib/
  scheduler.ts        Auto-scheduling algorithm (steps 1–5)
  store.ts            Zustand store with localStorage persistence
  export.ts           CSV export
  export-pdf.ts       Per-worker PDF generation
  types.ts            Shared TypeScript types
  calendar-utils.ts   Date helpers (ISO weeks, month grid, formatting)
```
