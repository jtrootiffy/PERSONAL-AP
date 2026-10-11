# Admin Panel

A personal admin dashboard for running a small freelance/studio business: projects,
tasks, deadlines, clients, invoices, payments, expenses and income — all backed by a
real PostgreSQL database with authentication.

Built with **Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS ·
Recharts · Zod + React Hook Form · Supabase (Postgres + Auth + Row Level Security)**.

---

## Features

- **Dashboard** — summary cards, income vs. expenses chart, project/task breakdowns,
  upcoming deadlines and a recent-activity feed.
- **Projects** — card and table views, a detail page with tasks, invoices, payments,
  notes and activity. Status, priority, budget and automatic/manual progress.
- **Tasks** — list, kanban board and a calendar view. Priorities, due dates,
  estimates vs. actual hours, subtasks and recurring tasks. Tasks become **overdue**
  automatically when their due date passes (never stored, always computed).
- **Calendar** — month / week / day views combining events, task due dates, invoice
  due dates and project deadlines. Drag an event to reschedule it.
- **Clients** — list/grid, detail page, and a duplicate warning on similar name/email.
- **Invoices** — line items, tax, discount, partial payments, statuses (draft, sent,
  partially paid, paid, overdue, cancelled), and a **print-to-PDF** invoice page.
- **Payments** — every recorded payment. *Only recorded payments count as income.*
- **Expenses** — categorised costs, filters and per-category totals.
- **Notes**, **Reports** (with CSV export + print) and **Settings** (profile, business
  details, invoice defaults, notifications, dashboard cards, appearance).
- **Global search**, in-app notifications, light/dark theme, responsive layout, and
  proper loading / empty / error states throughout.
- **Security** — Supabase Auth with Row Level Security. Every row is owned by a user
  and protected by policy. The `service_role` key is never exposed to the browser.

### Business rules enforced

- Only money from **recorded payments** is treated as income.
- Invoice status is derived from the balance and due date (a paid invoice can't be
  "un-paid" by accident — you record/remove payments instead).
- Payments can never exceed the invoice total (database trigger + server validation).
- Deleting a client or project never destroys financial records — invoices and
  payments are preserved (foreign keys `ON DELETE SET NULL`).
- Completed tasks are never counted as overdue.
- Destructive actions always require confirmation.
- Email notifications are **off by default** and only run if you configure delivery;
  the app never pretends to send email it can't.

---

## Getting started

### 1. Prerequisites

- Node.js 18.17+ (developed on Node 20/24)
- A free [Supabase](https://supabase.com/dashboard) project

### 2. Install dependencies

```bash
npm install
```

> On Windows PowerShell, use `npm.cmd` / `npx.cmd` if script execution is blocked.

### 3. Create a Supabase project & apply the schema

Create a project, then apply the SQL migrations in `supabase/migrations/` **in order**:

1. `0001_schema.sql` — tables, enums, indexes
2. `0002_functions.sql` — triggers (invoice totals, overpayment guard, new-user setup)
3. `0003_rls.sql` — Row Level Security policies

**Option A — `npm run migrate` (easiest)**

With `DATABASE_URL` set in `.env.local` (step 4), run:

```bash
npm run migrate
```

It applies every file in `supabase/migrations/` in order and refreshes the REST
API schema cache when it's done.

**Option B — Supabase CLI**

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option C — SQL editor**

Open the Supabase dashboard → SQL Editor → New query, and run the contents of each
migration file in order.

**Option D — psql with `DATABASE_URL`**

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_functions.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_rls.sql
```

> If `create:admin` or the app reports `Could not find the table 'public.profiles'
> in the schema cache`, the migrations have not been applied (or were applied to a
> different project). Apply them above, then run
> `notify pgrst, 'reload schema';` in the SQL editor if the message persists.

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill it in:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (scripts) | **Server only.** Used by the setup scripts, never shipped to the browser |
| `DATABASE_URL` | optional | Database connection string — used by `npm run migrate` (and `psql`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` locally, your domain in production |
| `SETUP_TOKEN` | optional | Gate for the one-time `/setup` route |
| `RESEND_API_KEY` / `EMAIL_FROM` / `SMTP_*` | optional | Email delivery — off unless fully configured |

> The browser client only ever uses the **anon** key. RLS ensures users can only read
> and write their own rows. The service-role key is read exclusively inside
> `scripts/` and the server-only setup path.

### 5. Create your admin user

There is **no public sign-up**. Create the first user one of two ways:

**Setup page** — set `SETUP_TOKEN` in `.env.local`, start the app, and visit
`/setup`, then enter the token and your desired email/password.

**Script**

```bash
npm run create:admin -- you@example.com "a-strong-password" "Your Name"
```

### 6. Run it

```bash
npm run dev
```

Open http://localhost:3000 and sign in at `/login`.

### 7. (Optional) Seed sample data

```bash
npm run seed -- you@example.com
```

Adds realistic clients, projects, tasks, invoices, payments, expenses, events and
notes so every screen has something to show. Use `--force` to add it more than once.

---

## Project structure

```
app/
  (auth)/            login, forgot-password, reset-password
  (app)/             authenticated shell: dashboard, projects, tasks, calendar,
                     clients, invoices, payments, expenses, notes, reports, settings
  api/
    search/          global search endpoint
    export/          CSV export endpoint (?type=invoices|payments|expenses|clients|projects)
  print/invoice/[id] print-optimised invoice (opens the browser print dialog → PDF)
  setup/             one-time first-admin creation (gated by SETUP_TOKEN)
components/
  ui/                hand-written UI kit (button, input, card, modal, table, …)
  layout/            sidebar, topbar, global search, notifications, user menu
  dashboard/ projects/ tasks/ calendar/ clients/ invoices/ payments/
  expenses/ notes/ reports/ settings/ common/ auth/ print/
lib/
  actions/           server actions (all mutations)
  server/            server-only data helpers (dashboard aggregates, …)
  supabase/          browser / server / admin / middleware clients
  business.ts        invoice status, balances, overdue — computed at read time
  validation.ts      Zod schemas shared by forms and server actions
supabase/migrations/ database schema, functions/triggers, RLS policies
scripts/             create-admin.mjs, seed.mjs
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |
| `npm run create:admin -- <email> "<password>" ["Name"]` | Create an admin user |
| `npm run seed -- <email>` | Seed sample data |

---

## Deploying to Vercel (with Supabase)

1. Push this folder to a Git repository.
2. Import it in Vercel.
3. Add the environment variables from `.env.example` (use your production
   `NEXT_PUBLIC_APP_URL`, e.g. `https://your-app.vercel.app`).
   `SUPABASE_SERVICE_ROLE_KEY` is only needed if you plan to run the scripts; you can
   omit it from Vercel.
4. Deploy.
5. In Supabase → Authentication → URL Configuration, set the **Site URL** and add
   `https://your-app.vercel.app/auth/callback` to the **Redirect URLs** so password
   reset links work.

### Notes on email

Password-reset emails rely on Supabase's built-in email service (Authentication →
Email Templates / SMTP). In-app notifications work with no configuration. If you also
want the app to send its own notifications, configure `RESEND_API_KEY` (or the
`SMTP_*` variables) — until then email stays disabled and nothing is faked.

---

## License

Private / personal use.
"# PERSONAL-AP" 
"# PERSONAL-AP" 
"# PERSONAL-AP" 
"# PERSONAL-AP" 
"# PERSONAL-AP" 
"# PERSONAL-AP" 
"# PERSONAL-AP" 
