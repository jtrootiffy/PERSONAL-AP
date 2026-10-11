-- ===========================================================================
-- 0003_rls.sql  --  Row Level Security: every row is scoped to its owner
-- ---------------------------------------------------------------------------
-- The app talks to Postgres through PostgREST using the signed-in user's JWT,
-- so these policies guarantee a user can only ever read/write their own data.
-- The service-role key (server-only, used by scripts) bypasses RLS.
-- ===========================================================================

-- profiles keyed by id
alter table public.profiles enable row level security;
drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- every other table keyed by user_id
do $$
declare t text;
begin
  foreach t in array array[
    'settings','clients','projects','tasks','subtasks','invoices',
    'invoice_items','payments','expenses','events','notes','activities',
    'notifications','attachments'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all
         using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_owner_all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Lock down internal, security-definer helpers: they are only meant to be
-- invoked by triggers, never called directly over the API.
-- ---------------------------------------------------------------------------
revoke execute on function public.recalc_invoice(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
