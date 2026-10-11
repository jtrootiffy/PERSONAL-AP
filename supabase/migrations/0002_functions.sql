-- ===========================================================================
-- 0002_functions.sql  --  Business logic enforced in the database
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- New auth user -> create profile + default settings
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- recalc_invoice: recompute totals (from items + discount + tax),
-- amount_paid (from payments) and the stored payment status.
-- Overdue is intentionally NOT stored; it is derived at read time from the
-- due date + outstanding balance so it can never go stale.
-- ---------------------------------------------------------------------------
create or replace function public.recalc_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_subtotal   numeric(14,2);
  v_dtype      text;
  v_dvalue     numeric(14,2);
  v_tax_rate   numeric(5,2);
  v_discount   numeric(14,2);
  v_tax        numeric(14,2);
  v_total      numeric(14,2);
  v_paid       numeric(14,2);
  v_status     invoice_status;
begin
  select coalesce(sum(amount),0) into v_subtotal
    from public.invoice_items where invoice_id = p_invoice_id;

  select discount_type, discount_value, tax_rate, status
    into v_dtype, v_dvalue, v_tax_rate, v_status
    from public.invoices where id = p_invoice_id;

  if not found then return; end if;

  if v_dtype = 'percent' then
    v_discount := round(v_subtotal * coalesce(v_dvalue,0) / 100.0, 2);
  elsif v_dtype = 'fixed' then
    v_discount := least(coalesce(v_dvalue,0), v_subtotal);
  else
    v_discount := 0;
  end if;

  v_tax   := round((v_subtotal - v_discount) * coalesce(v_tax_rate,0) / 100.0, 2);
  v_total := greatest(round(v_subtotal - v_discount + v_tax, 2), 0);

  select coalesce(sum(amount),0) into v_paid
    from public.payments where invoice_id = p_invoice_id;

  if v_status <> 'cancelled' then
    if v_total > 0 and v_paid >= v_total then
      v_status := 'paid';
    elsif v_paid > 0 then
      v_status := 'partially_paid';
    elsif v_status in ('paid','partially_paid') then
      -- payments were removed -> fall back to sent/draft
      v_status := case when v_paid = 0 then 'sent' else 'partially_paid' end;
    end if;
  end if;

  update public.invoices
     set subtotal = v_subtotal,
         discount_amount = v_discount,
         tax_amount = v_tax,
         total = v_total,
         amount_paid = v_paid,
         status = v_status
   where id = p_invoice_id;
end $$;

-- ---------------------------------------------------------------------------
-- Recalculate after any change to items or payments
-- ---------------------------------------------------------------------------
create or replace function public.trg_recalc_invoice_from_items()
returns trigger language plpgsql as $$
begin
  perform public.recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;

drop trigger if exists recalc_invoice_items on public.invoice_items;
create trigger recalc_invoice_items
  after insert or update or delete on public.invoice_items
  for each row execute function public.trg_recalc_invoice_from_items();

create or replace function public.trg_recalc_invoice_from_payments()
returns trigger language plpgsql as $$
begin
  perform public.recalc_invoice(coalesce(new.invoice_id, old.invoice_id));
  return null;
end $$;

drop trigger if exists recalc_invoice_payments on public.payments;
create trigger recalc_invoice_payments
  after insert or update or delete on public.payments
  for each row execute function public.trg_recalc_invoice_from_payments();

-- ---------------------------------------------------------------------------
-- Guard: recorded payments must never exceed the invoice total.
-- ---------------------------------------------------------------------------
create or replace function public.trg_payment_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_total numeric(14,2);
  v_other numeric(14,2);
begin
  select total into v_total from public.invoices where id = new.invoice_id;
  if v_total is null then
    raise exception 'Invoice % does not exist', new.invoice_id;
  end if;

  select coalesce(sum(amount),0) into v_other
    from public.payments
   where invoice_id = new.invoice_id
     and (tg_op = 'INSERT' or id <> new.id);

  if v_other + new.amount > v_total + 0.001 then
    raise exception 'Payment of % would exceed the invoice total (already recorded %, total %)',
      new.amount, v_other, v_total
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists payment_guard on public.payments;
create trigger payment_guard
  before insert or update on public.payments
  for each row execute function public.trg_payment_guard();

-- ---------------------------------------------------------------------------
-- Recalculate an invoice when its discount / tax / due date changes
-- ---------------------------------------------------------------------------
create or replace function public.trg_invoice_self_recalc()
returns trigger language plpgsql as $$
begin
  perform public.recalc_invoice(new.id);
  return null;
end $$;

drop trigger if exists invoice_self_recalc on public.invoices;
create trigger invoice_self_recalc
  after update of discount_type, discount_value, tax_rate on public.invoices
  for each row execute function public.trg_invoice_self_recalc();
