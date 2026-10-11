-- ===========================================================================
-- 0001_schema.sql  --  Core schema for the Personal Admin Dashboard
-- ---------------------------------------------------------------------------
-- Run with the Supabase CLI:   supabase db push
-- or paste into the Supabase SQL editor.
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin create type project_status as enum
  ('planning','not_started','in_progress','on_hold','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type task_status as enum
  ('todo','in_progress','in_review','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin create type invoice_status as enum
  ('draft','sent','partially_paid','paid','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin create type client_status as enum ('active','archived');
exception when duplicate_object then null; end $$;

do $$ begin create type event_type as enum
  ('task','meeting','reminder','personal','invoice_due','project_deadline');
exception when duplicate_object then null; end $$;

do $$ begin create type notification_type as enum
  ('deadline','overdue','payment','project','system');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings  (1:1 with the user)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  business_name       text default '',
  business_email      text default '',
  business_phone      text default '',
  business_address    text default '',
  logo_url            text,
  currency            text not null default 'PHP',
  date_format         text not null default 'MMM d, yyyy',
  timezone            text not null default 'Asia/Manila',
  theme               text not null default 'system',
  invoice_prefix      text not null default 'INV-',
  invoice_next_number integer not null default 1,
  payment_terms_days  integer not null default 14,
  default_tax_rate    numeric(5,2) not null default 0,
  default_discount    numeric(5,2) not null default 0,
  notify_in_app       boolean not null default true,
  notify_email        boolean not null default false,
  notify_days_before  integer[] not null default '{7,3,1,0}',
  dashboard_cards     jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  company         text,
  email           text,
  phone           text,
  billing_address text,
  contact_person  text,
  notes           text,
  status          client_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists clients_user_idx on public.clients(user_id);
create index if not exists clients_status_idx on public.clients(status);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id     uuid references public.clients(id) on delete set null,
  title         text not null,
  description   text,
  category      text,
  start_date    date,
  deadline      date,
  status        project_status not null default 'planning',
  priority      priority not null default 'medium',
  budget        numeric(14,2) not null default 0,
  progress      integer not null default 0 check (progress between 0 and 100),
  progress_mode text not null default 'auto' check (progress_mode in ('auto','manual')),
  archived      boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects(user_id);
create index if not exists projects_client_idx on public.projects(client_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_deadline_idx on public.projects(deadline);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id       uuid references public.projects(id) on delete set null,
  client_id        uuid references public.clients(id) on delete set null,
  title            text not null,
  description      text,
  priority         priority not null default 'medium',
  status           task_status not null default 'todo',
  start_date       date,
  due_date         timestamptz,
  completed_at     timestamptz,
  estimated_hours  numeric(8,2) default 0,
  actual_hours     numeric(8,2) default 0,
  recurrence       text not null default 'none' check (recurrence in ('none','daily','weekly','monthly')),
  parent_task_id   uuid references public.tasks(id) on delete set null,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists tasks_user_idx on public.tasks(user_id);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_idx on public.tasks(due_date);

-- ---------------------------------------------------------------------------
-- subtasks
-- ---------------------------------------------------------------------------
create table if not exists public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id    uuid not null references public.tasks(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists subtasks_task_idx on public.subtasks(task_id);

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id         uuid references public.clients(id) on delete set null,
  project_id        uuid references public.projects(id) on delete set null,
  number            text not null,
  issue_date        date not null default current_date,
  due_date          date,
  currency          text not null default 'PHP',
  discount_type     text not null default 'none' check (discount_type in ('none','fixed','percent')),
  discount_value    numeric(14,2) not null default 0,
  tax_rate          numeric(5,2) not null default 0,
  subtotal          numeric(14,2) not null default 0,
  discount_amount   numeric(14,2) not null default 0,
  tax_amount        numeric(14,2) not null default 0,
  total             numeric(14,2) not null default 0,
  amount_paid       numeric(14,2) not null default 0,
  status            invoice_status not null default 'draft',
  notes             text,
  terms             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, number)
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_client_idx on public.invoices(client_id);
create index if not exists invoices_project_idx on public.invoices(project_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_due_idx on public.invoices(due_date);

-- ---------------------------------------------------------------------------
-- invoice_items
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  description text not null default '',
  quantity    numeric(12,2) not null default 1,
  unit_price  numeric(14,2) not null default 0,
  amount      numeric(14,2) not null default 0,
  sort_order  integer not null default 0
);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount     numeric(14,2) not null check (amount > 0),
  paid_on    date not null default current_date,
  method     text,
  reference  text,
  notes      text,
  created_at timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);
create index if not exists payments_invoice_idx on public.payments(invoice_id);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  name         text not null,
  category     text,
  expense_date date not null default current_date,
  amount       numeric(14,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists expenses_user_idx on public.expenses(user_id);
create index if not exists expenses_project_idx on public.expenses(project_id);
create index if not exists expenses_date_idx on public.expenses(expense_date);

-- ---------------------------------------------------------------------------
-- events  (calendar)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null,
  description text,
  type       event_type not null default 'personal',
  start_at   timestamptz not null,
  end_at     timestamptz,
  all_day    boolean not null default false,
  client_id  uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  task_id    uuid references public.tasks(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists events_user_idx on public.events(user_id);
create index if not exists events_start_idx on public.events(start_at);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  task_id    uuid references public.tasks(id) on delete set null,
  client_id  uuid references public.clients(id) on delete set null,
  title      text not null default '',
  content    text,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes(user_id);

-- ---------------------------------------------------------------------------
-- activities  (audit timeline)
-- ---------------------------------------------------------------------------
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  title       text not null,
  description text,
  created_at  timestamptz not null default now()
);
create index if not exists activities_user_idx on public.activities(user_id);
create index if not exists activities_created_idx on public.activities(created_at desc);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type        notification_type not null default 'system',
  title       text not null,
  message     text,
  link        text,
  read        boolean not null default false,
  dedupe_key  text,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id);
-- Unique (user_id, dedupe_key); NULL dedupe_keys are treated as distinct, which
-- lets us upsert generated reminders idempotently while allowing free-form ones.
create unique index if not exists notifications_dedupe_idx
  on public.notifications(user_id, dedupe_key);

-- ---------------------------------------------------------------------------
-- attachments  (link + note, attached to any record)
-- ---------------------------------------------------------------------------
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id   uuid not null,
  name        text not null,
  url         text,
  created_at  timestamptz not null default now()
);
create index if not exists attachments_entity_idx on public.attachments(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','settings','clients','projects','tasks',
                            'invoices','events','notes']
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;
