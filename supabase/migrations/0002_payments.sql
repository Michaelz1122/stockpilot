-- Migration: Add payments and receipts
create type public.payment_direction as enum ('IN', 'OUT');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  direction public.payment_direction not null,
  amount numeric(14,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_store_idx on public.payments(store_id, payment_date desc);
create index payments_customer_idx on public.payments(customer_id);
create index payments_supplier_idx on public.payments(supplier_id);

alter table public.payments enable row level security;
create policy payments_select on public.payments for select to authenticated using (app.is_store_owner(store_id));
create policy payments_insert on public.payments for insert to authenticated with check (app.is_store_owner(store_id));
create policy payments_update on public.payments for update to authenticated using (app.is_store_owner(store_id)) with check (app.is_store_owner(store_id));
create policy payments_delete on public.payments for delete to authenticated using (app.is_store_owner(store_id));

create trigger trg_touch_payments before update on public.payments
for each row execute function public.fn_touch_updated_at();

-- Recreate views to factor in payments
create or replace view public.v_customer_balance with (security_invoker = true) as
select c.id as customer_id, c.store_id,
       c.opening_balance 
       + coalesce((select sum(s.total - s.paid) from public.sales_invoices s where s.customer_id = c.id), 0)
       - coalesce((select sum(p.amount) from public.payments p where p.customer_id = c.id and p.direction = 'IN'), 0)
       + coalesce((select sum(p.amount) from public.payments p where p.customer_id = c.id and p.direction = 'OUT'), 0)
       as balance
from public.customers c;

create or replace view public.v_supplier_balance with (security_invoker = true) as
select s.id as supplier_id, s.store_id,
       s.opening_balance 
       + coalesce((select sum(pi.total - pi.paid) from public.purchase_invoices pi where pi.supplier_id = s.id), 0)
       - coalesce((select sum(p.amount) from public.payments p where p.supplier_id = s.id and p.direction = 'OUT'), 0)
       + coalesce((select sum(p.amount) from public.payments p where p.supplier_id = s.id and p.direction = 'IN'), 0)
       as balance
from public.suppliers s;
