-- ===========================================================================
-- 0004_fix_invoice_triggers.sql
-- ---------------------------------------------------------------------------
-- Bug fix: the invoice-recalculation trigger wrappers were SECURITY INVOKER.
-- They fire as the signed-in `authenticated` role and called the security-
-- definer helper `recalc_invoice(uuid)`, whose EXECUTE is revoked from
-- anon/authenticated (see 0003_rls.sql). Result:
--
--     permission denied for function recalc_invoice
--
-- fired on the AFTER INSERT/UPDATE/DELETE triggers of invoice_items and
-- payments (and the self-recalc trigger on invoices). Every invoice/item/
-- payment write rolled back at the database, so invoices could never be
-- created or saved even though the REST/RLS layer was healthy.
--
-- Fix (matching the intent stated in 0003): recreate the wrappers as
-- SECURITY DEFINER with a pinned search_path, and add an ownership guard so
-- a session can only recalculate its own invoices. `recalc_invoice` itself
-- stays revoked from anon/authenticated so it cannot be called over the API.
-- ===========================================================================

create or replace function public.trg_recalc_invoice_from_items()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not exists (
       select 1 from public.invoices iv
       where iv.id = coalesce(new.invoice_id, old.invoice_id)
         and iv.user_id = auth.uid()
     )
  then
    return null;
  end if;

  perform public.recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;

create or replace function public.trg_recalc_invoice_from_payments()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and not exists (
       select 1 from public.invoices iv
       where iv.id = coalesce(new.invoice_id, old.invoice_id)
         and iv.user_id = auth.uid()
     )
  then
    return null;
  end if;

  perform public.recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;

create or replace function public.trg_invoice_self_recalc()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.user_id <> auth.uid() then
    return null;
  end if;

  perform public.recalc_invoice(new.id);
  return null;
end $$;