-- StockPilot AI — production schema (Supabase / Postgres 17)
-- This is the migration source-of-truth. It exactly matches what is deployed.

create extension if not exists pgcrypto;
create schema if not exists extensions;
grant usage on schema extensions to public;
create extension if not exists pg_trgm  schema extensions;
create extension if not exists unaccent schema extensions;
create schema if not exists app;
grant usage on schema app to authenticated, anon;

-- =====================================================
-- Arabic-tolerant normalization (immutable for indexing)
-- =====================================================
create or replace function public.normalize_arabic(input text)
returns text language sql immutable strict parallel safe
set search_path = public, extensions, pg_temp as $$
  select case
    when input is null then null
    else lower(
      regexp_replace(
        translate(
          regexp_replace(
            extensions.unaccent(input),
            '[ً-ٰٟؐ-ؚۖ-ۭـ]', '', 'g'
          ),
          'إأآاىؤئة', 'اااايويه'
        ),
        '\s+', ' ', 'g'
      )
    )
  end;
$$;

-- =====================================================
-- STORES
-- =====================================================
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  store_type text not null default 'general',
  currency text not null default 'EGP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stores_owner_idx on public.stores(owner_id);

-- =====================================================
-- PRODUCTS
-- =====================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text,
  category text,
  barcode text,
  sku text,
  purchase_price numeric(14,2) not null default 0 check (purchase_price >= 0),
  sale_price numeric(14,2) not null default 0 check (sale_price >= 0),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0),
  search_blob text generated always as (
    coalesce(public.normalize_arabic(name),'') || ' ' ||
    coalesce(public.normalize_arabic(sku),'') || ' ' ||
    coalesce(public.normalize_arabic(barcode),'') || ' ' ||
    coalesce(public.normalize_arabic(category),'') || ' ' ||
    coalesce(public.normalize_arabic(description),'')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_store_idx on public.products(store_id);
create index products_name_idx  on public.products(store_id, name);
create index products_search_trgm on public.products using gin (search_blob extensions.gin_trgm_ops);
create unique index products_sku_unique on public.products(store_id, sku) where sku is not null and sku <> '';
create unique index products_barcode_unique on public.products(store_id, barcode) where barcode is not null and barcode <> '';

-- =====================================================
-- CUSTOMERS / SUPPLIERS
-- =====================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text,
  address text,
  notes text,
  opening_balance numeric(14,2) not null default 0,
  search_blob text generated always as (
    coalesce(public.normalize_arabic(name),'') || ' ' ||
    coalesce(public.normalize_arabic(phone),'') || ' ' ||
    coalesce(public.normalize_arabic(address),'')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_store_idx on public.customers(store_id);
create index customers_search_trgm on public.customers using gin (search_blob extensions.gin_trgm_ops);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  phone text,
  address text,
  notes text,
  opening_balance numeric(14,2) not null default 0,
  search_blob text generated always as (
    coalesce(public.normalize_arabic(name),'') || ' ' ||
    coalesce(public.normalize_arabic(phone),'') || ' ' ||
    coalesce(public.normalize_arabic(address),'')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suppliers_store_idx on public.suppliers(store_id);
create index suppliers_search_trgm on public.suppliers using gin (search_blob extensions.gin_trgm_ops);

-- =====================================================
-- INVENTORY TRANSACTIONS (source of truth)
-- =====================================================
create type public.inventory_tx_type as enum ('IN','OUT','ADJUSTMENT');

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  type public.inventory_tx_type not null,
  quantity numeric(14,3) not null,
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index inv_tx_store_idx on public.inventory_transactions(store_id);
create index inv_tx_product_idx on public.inventory_transactions(product_id);
create index inv_tx_ref_idx on public.inventory_transactions(reference_type, reference_id);
create index inv_tx_created_idx on public.inventory_transactions(store_id, created_at desc);

-- =====================================================
-- SALES INVOICES + ITEMS
-- =====================================================
create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text,
  invoice_date timestamptz not null default now(),
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  paid numeric(14,2) not null default 0 check (paid >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index sales_store_idx on public.sales_invoices(store_id, invoice_date desc);
create index sales_customer_idx on public.sales_invoices(customer_id);

create table public.sales_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.sales_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  line_total numeric(14,2) not null
);
create index sales_items_invoice_idx on public.sales_invoice_items(invoice_id);
create index sales_items_product_idx on public.sales_invoice_items(product_id);

-- =====================================================
-- PURCHASE INVOICES + ITEMS
-- =====================================================
create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  invoice_number text,
  invoice_date timestamptz not null default now(),
  subtotal numeric(14,2) not null default 0,
  discount numeric(14,2) not null default 0 check (discount >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  paid numeric(14,2) not null default 0 check (paid >= 0),
  notes text,
  created_at timestamptz not null default now()
);
create index purchase_store_idx on public.purchase_invoices(store_id, invoice_date desc);
create index purchase_supplier_idx on public.purchase_invoices(supplier_id);

create table public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null check (unit_cost >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  line_total numeric(14,2) not null
);
create index purchase_items_invoice_idx on public.purchase_invoice_items(invoice_id);
create index purchase_items_product_idx on public.purchase_invoice_items(product_id);

-- =====================================================
-- Helper: is_store_owner (private, security-definer)
-- =====================================================
create or replace function app.is_store_owner(p_store uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.stores s
    where s.id = p_store and s.owner_id = auth.uid()
  );
$$;
revoke all on function app.is_store_owner(uuid) from public;
grant execute on function app.is_store_owner(uuid) to authenticated;

-- =====================================================
-- Trigger functions
-- =====================================================
create or replace function public.fn_sales_item_inventory()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_store uuid;
begin
  if tg_op = 'INSERT' then
    select store_id into v_store from public.sales_invoices where id = new.invoice_id;
    insert into public.inventory_transactions
      (store_id, product_id, type, quantity, unit_cost, reference_type, reference_id, note)
    values
      (v_store, new.product_id, 'OUT', new.quantity, new.unit_cost, 'sales_invoice_item', new.id, 'Auto: sales');
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.inventory_transactions
     where reference_type = 'sales_invoice_item' and reference_id = old.id;
    return old;
  end if;
  return null;
end $$;
revoke execute on function public.fn_sales_item_inventory() from public, anon, authenticated;

create or replace function public.fn_purchase_item_inventory()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_store uuid;
begin
  if tg_op = 'INSERT' then
    select store_id into v_store from public.purchase_invoices where id = new.invoice_id;
    insert into public.inventory_transactions
      (store_id, product_id, type, quantity, unit_cost, reference_type, reference_id, note)
    values
      (v_store, new.product_id, 'IN', new.quantity, new.unit_cost, 'purchase_invoice_item', new.id, 'Auto: purchase');
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.inventory_transactions
     where reference_type = 'purchase_invoice_item' and reference_id = old.id;
    return old;
  end if;
  return null;
end $$;
revoke execute on function public.fn_purchase_item_inventory() from public, anon, authenticated;

create trigger trg_sales_item_inv
after insert or delete on public.sales_invoice_items
for each row execute function public.fn_sales_item_inventory();

create trigger trg_purchase_item_inv
after insert or delete on public.purchase_invoice_items
for each row execute function public.fn_purchase_item_inventory();

-- Line-total computation
create or replace function public.fn_compute_line_total()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare price numeric;
begin
  if tg_table_name = 'sales_invoice_items' then
    price := new.unit_price;
  else
    price := new.unit_cost;
  end if;
  new.line_total := round(new.quantity * price - coalesce(new.discount, 0), 2);
  return new;
end $$;

create trigger trg_sales_line_total
before insert or update on public.sales_invoice_items
for each row execute function public.fn_compute_line_total();

create trigger trg_purchase_line_total
before insert or update on public.purchase_invoice_items
for each row execute function public.fn_compute_line_total();

-- updated_at touch
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text;
begin
  for t in select unnest(array['stores','products','customers','suppliers']) loop
    execute format('create trigger trg_touch_%I before update on public.%I
                    for each row execute function public.fn_touch_updated_at();', t, t);
  end loop;
end $$;

-- Invoice header total resync
create or replace function public.fn_resync_sales_totals(p_invoice uuid)
returns void language sql set search_path = public, pg_temp as $$
  update public.sales_invoices i set
    subtotal = coalesce((select sum(quantity * unit_price - discount) from public.sales_invoice_items where invoice_id = p_invoice), 0),
    total    = greatest(0, coalesce((select sum(quantity * unit_price - discount) from public.sales_invoice_items where invoice_id = p_invoice), 0) - i.discount)
  where i.id = p_invoice;
$$;

create or replace function public.fn_resync_purchase_totals(p_invoice uuid)
returns void language sql set search_path = public, pg_temp as $$
  update public.purchase_invoices i set
    subtotal = coalesce((select sum(quantity * unit_cost - discount) from public.purchase_invoice_items where invoice_id = p_invoice), 0),
    total    = greatest(0, coalesce((select sum(quantity * unit_cost - discount) from public.purchase_invoice_items where invoice_id = p_invoice), 0) - i.discount)
  where i.id = p_invoice;
$$;

create or replace function public.fn_sales_item_totals()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin perform public.fn_resync_sales_totals(coalesce(new.invoice_id, old.invoice_id)); return coalesce(new, old); end $$;

create or replace function public.fn_purchase_item_totals()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin perform public.fn_resync_purchase_totals(coalesce(new.invoice_id, old.invoice_id)); return coalesce(new, old); end $$;

create trigger trg_sales_item_totals
after insert or update or delete on public.sales_invoice_items
for each row execute function public.fn_sales_item_totals();

create trigger trg_purchase_item_totals
after insert or update or delete on public.purchase_invoice_items
for each row execute function public.fn_purchase_item_totals();

-- =====================================================
-- VIEWS (security_invoker so RLS on base tables applies)
-- =====================================================
create or replace view public.v_product_stock with (security_invoker = true) as
select
  p.id as product_id,
  p.store_id,
  coalesce(sum(case t.type
    when 'IN' then t.quantity
    when 'OUT' then -t.quantity
    when 'ADJUSTMENT' then t.quantity
  end), 0) as current_stock
from public.products p
left join public.inventory_transactions t on t.product_id = p.id
group by p.id, p.store_id;

create or replace view public.v_customer_balance with (security_invoker = true) as
select c.id as customer_id, c.store_id,
       c.opening_balance + coalesce(sum(s.total - s.paid), 0) as balance
from public.customers c
left join public.sales_invoices s on s.customer_id = c.id
group by c.id, c.store_id;

create or replace view public.v_supplier_balance with (security_invoker = true) as
select s.id as supplier_id, s.store_id,
       s.opening_balance + coalesce(sum(p.total - p.paid), 0) as balance
from public.suppliers s
left join public.purchase_invoices p on p.supplier_id = s.id
group by s.id, s.store_id;

create or replace view public.v_product_with_stock with (security_invoker = true) as
select p.*, coalesce(vs.current_stock, 0) as current_stock
from public.products p
left join public.v_product_stock vs on vs.product_id = p.id;

-- =====================================================
-- RLS
-- =====================================================
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_items enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;

create policy stores_select on public.stores for select to authenticated using (owner_id = (select auth.uid()));
create policy stores_insert on public.stores for insert to authenticated with check (owner_id = (select auth.uid()));
create policy stores_update on public.stores for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy stores_delete on public.stores for delete to authenticated using (owner_id = (select auth.uid()));

do $$ declare t text;
begin
  for t in select unnest(array[
    'products','customers','suppliers',
    'inventory_transactions','sales_invoices','purchase_invoices'
  ]) loop
    execute format('create policy %I_select on public.%I for select to authenticated using (app.is_store_owner(store_id));', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (app.is_store_owner(store_id));', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (app.is_store_owner(store_id)) with check (app.is_store_owner(store_id));', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (app.is_store_owner(store_id));', t, t);
  end loop;
end $$;

create policy sales_items_select on public.sales_invoice_items for select to authenticated
  using (exists (select 1 from public.sales_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));
create policy sales_items_insert on public.sales_invoice_items for insert to authenticated
  with check (exists (select 1 from public.sales_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));
create policy sales_items_update on public.sales_invoice_items for update to authenticated
  using (exists (select 1 from public.sales_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)))
  with check (exists (select 1 from public.sales_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));
create policy sales_items_delete on public.sales_invoice_items for delete to authenticated
  using (exists (select 1 from public.sales_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));

create policy purchase_items_select on public.purchase_invoice_items for select to authenticated
  using (exists (select 1 from public.purchase_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));
create policy purchase_items_insert on public.purchase_invoice_items for insert to authenticated
  with check (exists (select 1 from public.purchase_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));
create policy purchase_items_update on public.purchase_invoice_items for update to authenticated
  using (exists (select 1 from public.purchase_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)))
  with check (exists (select 1 from public.purchase_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));
create policy purchase_items_delete on public.purchase_invoice_items for delete to authenticated
  using (exists (select 1 from public.purchase_invoices i where i.id = invoice_id and app.is_store_owner(i.store_id)));

-- =====================================================
-- Business RPCs
-- =====================================================
create or replace function public.create_sale_invoice(
  p_store_id uuid, p_customer_id uuid, p_invoice_number text,
  p_discount numeric, p_paid numeric, p_notes text, p_items jsonb
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_invoice_id uuid;
begin
  if not app.is_store_owner(p_store_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item required' using errcode = 'P0001';
  end if;
  insert into public.sales_invoices(store_id, customer_id, invoice_number, discount, paid, notes)
  values (p_store_id, p_customer_id, nullif(p_invoice_number,''), coalesce(p_discount,0), coalesce(p_paid,0), nullif(p_notes,''))
  returning id into v_invoice_id;
  insert into public.sales_invoice_items
    (invoice_id, product_id, quantity, unit_price, unit_cost, discount, line_total)
  select v_invoice_id, (it->>'product_id')::uuid, (it->>'quantity')::numeric,
         coalesce((it->>'unit_price')::numeric, 0),
         coalesce((it->>'unit_cost')::numeric, 0),
         coalesce((it->>'discount')::numeric, 0), 0
  from jsonb_array_elements(p_items) it;
  return v_invoice_id;
end $$;
grant execute on function public.create_sale_invoice(uuid,uuid,text,numeric,numeric,text,jsonb) to authenticated;

create or replace function public.create_purchase_invoice(
  p_store_id uuid, p_supplier_id uuid, p_invoice_number text,
  p_discount numeric, p_paid numeric, p_notes text, p_items jsonb
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_invoice_id uuid;
begin
  if not app.is_store_owner(p_store_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item required' using errcode = 'P0001';
  end if;
  insert into public.purchase_invoices(store_id, supplier_id, invoice_number, discount, paid, notes)
  values (p_store_id, p_supplier_id, nullif(p_invoice_number,''), coalesce(p_discount,0), coalesce(p_paid,0), nullif(p_notes,''))
  returning id into v_invoice_id;
  insert into public.purchase_invoice_items
    (invoice_id, product_id, quantity, unit_cost, discount, line_total)
  select v_invoice_id, (it->>'product_id')::uuid, (it->>'quantity')::numeric,
         coalesce((it->>'unit_cost')::numeric, 0),
         coalesce((it->>'discount')::numeric, 0), 0
  from jsonb_array_elements(p_items) it;
  return v_invoice_id;
end $$;
grant execute on function public.create_purchase_invoice(uuid,uuid,text,numeric,numeric,text,jsonb) to authenticated;

-- Search RPCs
create or replace function public.search_products(p_store_id uuid, p_query text, p_limit int default 50)
returns table (
  id uuid, store_id uuid, name text, description text, category text, barcode text, sku text,
  purchase_price numeric, sale_price numeric, minimum_stock numeric, current_stock numeric,
  created_at timestamptz, updated_at timestamptz
) language sql stable security invoker set search_path = public, extensions, pg_temp as $$
  select p.id, p.store_id, p.name, p.description, p.category, p.barcode, p.sku,
         p.purchase_price, p.sale_price, p.minimum_stock,
         coalesce(vs.current_stock, 0)::numeric, p.created_at, p.updated_at
  from public.products p
  left join public.v_product_stock vs on vs.product_id = p.id
  where p.store_id = p_store_id
    and (p_query is null or p_query = ''
         or p.search_blob ilike '%' || public.normalize_arabic(p_query) || '%'
         or p.search_blob % public.normalize_arabic(p_query))
  order by case when p_query is null or p_query = '' then 1
                else similarity(p.search_blob, public.normalize_arabic(p_query)) end desc nulls last,
           p.name
  limit greatest(coalesce(p_limit, 50), 1);
$$;
grant execute on function public.search_products(uuid, text, int) to authenticated;

create or replace function public.search_customers(p_store_id uuid, p_query text, p_limit int default 50)
returns setof public.customers language sql stable security invoker set search_path = public, extensions, pg_temp as $$
  select * from public.customers c
   where c.store_id = p_store_id
     and (p_query is null or p_query = '' or c.search_blob ilike '%' || public.normalize_arabic(p_query) || '%')
   order by c.name limit greatest(coalesce(p_limit,50), 1);
$$;
grant execute on function public.search_customers(uuid, text, int) to authenticated;

create or replace function public.search_suppliers(p_store_id uuid, p_query text, p_limit int default 50)
returns setof public.suppliers language sql stable security invoker set search_path = public, extensions, pg_temp as $$
  select * from public.suppliers s
   where s.store_id = p_store_id
     and (p_query is null or p_query = '' or s.search_blob ilike '%' || public.normalize_arabic(p_query) || '%')
   order by s.name limit greatest(coalesce(p_limit,50), 1);
$$;
grant execute on function public.search_suppliers(uuid, text, int) to authenticated;

-- Reports / dashboard RPCs
create or replace function public.dashboard_summary(p_store_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare v jsonb;
begin
  if not app.is_store_owner(p_store_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  with
    p_count as (select count(*)::int n from public.products where store_id = p_store_id),
    c_count as (select count(*)::int n from public.customers where store_id = p_store_id),
    s_count as (select count(*)::int n from public.suppliers where store_id = p_store_id),
    inv as (
      select coalesce(sum(coalesce(vs.current_stock,0) * p.purchase_price), 0) as value,
             count(*) filter (where coalesce(vs.current_stock,0) <= p.minimum_stock and coalesce(vs.current_stock,0) > 0) as low,
             count(*) filter (where coalesce(vs.current_stock,0) <= 0) as out
      from public.products p
      left join public.v_product_stock vs on vs.product_id = p.id
      where p.store_id = p_store_id
    ),
    rev as (
      select coalesce(sum(total), 0) as revenue
      from public.sales_invoices
      where store_id = p_store_id and invoice_date >= now() - interval '30 days'
    ),
    prof as (
      select coalesce(sum((it.unit_price - it.unit_cost) * it.quantity - it.discount), 0) as profit
      from public.sales_invoice_items it
      join public.sales_invoices i on i.id = it.invoice_id
      where i.store_id = p_store_id and i.invoice_date >= now() - interval '30 days'
    ),
    trend as (
      select to_char(date_trunc('day', i.invoice_date), 'YYYY-MM-DD') as day,
             sum(i.total) as sales,
             coalesce(sum((it.unit_price - it.unit_cost) * it.quantity - it.discount), 0) as profit
      from public.sales_invoices i
      left join public.sales_invoice_items it on it.invoice_id = i.id
      where i.store_id = p_store_id and i.invoice_date >= now() - interval '30 days'
      group by 1 order by 1
    )
  select jsonb_build_object(
    'totalProducts',  (select n from p_count),
    'totalCustomers', (select n from c_count),
    'totalSuppliers', (select n from s_count),
    'inventoryValue', (select value from inv),
    'lowStockCount',  (select low from inv),
    'outOfStockCount',(select out from inv),
    'revenue30d',     (select revenue from rev),
    'profit30d',      (select profit from prof),
    'salesTrend',     coalesce((select jsonb_agg(jsonb_build_object('day', day, 'sales', sales, 'profit', profit)) from trend), '[]'::jsonb)
  ) into v;
  return v;
end $$;
grant execute on function public.dashboard_summary(uuid) to authenticated;

create or replace function public.sales_by_period(p_store_id uuid, p_period text)
returns table (key text, total numeric)
language sql stable security invoker set search_path = public, pg_temp as $$
  select case p_period
           when 'day'   then to_char(date_trunc('day',   invoice_date), 'YYYY-MM-DD')
           when 'week'  then to_char(date_trunc('week',  invoice_date), 'IYYY-"W"IW')
           when 'month' then to_char(date_trunc('month', invoice_date), 'YYYY-MM')
           when 'year'  then to_char(date_trunc('year',  invoice_date), 'YYYY')
           else to_char(date_trunc('day', invoice_date), 'YYYY-MM-DD')
         end,
         sum(total)::numeric
  from public.sales_invoices
  where store_id = p_store_id
  group by 1 order by 1;
$$;
grant execute on function public.sales_by_period(uuid, text) to authenticated;

create or replace function public.top_customers(p_store_id uuid, p_limit int default 10)
returns table (customer_id uuid, customer_name text, phone text, total numeric)
language sql stable security invoker set search_path = public, pg_temp as $$
  select c.id, c.name, c.phone, coalesce(sum(s.total), 0)::numeric
  from public.customers c
  left join public.sales_invoices s on s.customer_id = c.id
  where c.store_id = p_store_id
  group by c.id, c.name, c.phone
  order by 4 desc
  limit greatest(coalesce(p_limit, 10), 1);
$$;
grant execute on function public.top_customers(uuid, int) to authenticated;

create or replace function public.low_stock(p_store_id uuid)
returns table (id uuid, name text, sku text, minimum_stock numeric, current_stock numeric)
language sql stable security invoker set search_path = public, pg_temp as $$
  select p.id, p.name, p.sku, p.minimum_stock, coalesce(vs.current_stock, 0)
  from public.products p
  left join public.v_product_stock vs on vs.product_id = p.id
  where p.store_id = p_store_id
    and coalesce(vs.current_stock, 0) <= p.minimum_stock
  order by coalesce(vs.current_stock, 0);
$$;
grant execute on function public.low_stock(uuid) to authenticated;

-- =====================================================
-- Demo / seed function (Arabic Egyptian retail data)
-- =====================================================
create or replace function public.seed_demo_store()
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_store uuid;
  v_user uuid := auth.uid();
  v_cust uuid; v_sup uuid;
  p_meftah uuid; p_breeza uuid; p_lamba uuid; p_marwaha uuid; p_motanawel uuid;
begin
  if v_user is null then raise exception 'must be signed in' using errcode = '42501'; end if;
  insert into public.stores(owner_id, name, store_type, currency)
  values (v_user, 'محل التجربة', 'electrical', 'EGP') returning id into v_store;

  insert into public.products(store_id, name, sku, category, purchase_price, sale_price, minimum_stock)
  values (v_store, 'مفتاح كهرباء أحادي', 'SW-1', 'مفاتيح', 18, 30, 10) returning id into p_meftah;
  insert into public.products(store_id, name, sku, category, purchase_price, sale_price, minimum_stock)
  values (v_store, 'بريزة دوبلكس', 'PR-2', 'بريزات', 22, 40, 12) returning id into p_breeza;
  insert into public.products(store_id, name, sku, category, purchase_price, sale_price, minimum_stock)
  values (v_store, 'لمبة LED 12 وات', 'LED-12', 'إضاءة', 35, 60, 20) returning id into p_lamba;
  insert into public.products(store_id, name, sku, category, purchase_price, sale_price, minimum_stock)
  values (v_store, 'مروحة غسالة أوتوماتيك', 'FAN-WM', 'قطع غيار', 90, 150, 5) returning id into p_marwaha;
  insert into public.products(store_id, name, sku, category, purchase_price, sale_price, minimum_stock)
  values (v_store, 'منظم بوتاجاز', 'REG-GAS', 'إكسسوار', 80, 130, 4) returning id into p_motanawel;

  insert into public.customers(store_id, name, phone, address, opening_balance)
  values (v_store, 'أحمد محمد', '01000000001', 'القاهرة', 0) returning id into v_cust;
  insert into public.customers(store_id, name, phone, address, opening_balance)
  values (v_store, 'منى علي', '01000000002', 'الجيزة', 200);
  insert into public.customers(store_id, name, phone, address, opening_balance)
  values (v_store, 'محمود سامي', '01000000003', 'الإسكندرية', 0);

  insert into public.suppliers(store_id, name, phone, address, opening_balance)
  values (v_store, 'شركة النور للكهرباء', '0220000000', 'العتبة', 0) returning id into v_sup;
  insert into public.suppliers(store_id, name, phone, address, opening_balance)
  values (v_store, 'مؤسسة المصرية لقطع الغيار', '0234567890', 'القاهرة', 0);

  perform public.create_purchase_invoice(
    v_store, v_sup, 'PO-001', 0, 0, 'مشتريات افتتاحية',
    jsonb_build_array(
      jsonb_build_object('product_id', p_meftah,   'quantity', 100, 'unit_cost', 18),
      jsonb_build_object('product_id', p_breeza,   'quantity',  80, 'unit_cost', 22),
      jsonb_build_object('product_id', p_lamba,    'quantity', 150, 'unit_cost', 35),
      jsonb_build_object('product_id', p_marwaha,  'quantity',  70, 'unit_cost', 90),
      jsonb_build_object('product_id', p_motanawel,'quantity',  40, 'unit_cost', 80)
    )
  );

  perform public.create_sale_invoice(
    v_store, v_cust, 'SV-001', 0, 100, 'فاتورة عميل',
    jsonb_build_array(
      jsonb_build_object('product_id', p_meftah, 'quantity', 5, 'unit_price', 30, 'unit_cost', 18),
      jsonb_build_object('product_id', p_lamba,  'quantity', 3, 'unit_price', 60, 'unit_cost', 35)
    )
  );

  perform public.create_sale_invoice(
    v_store, v_cust, 'SV-002', 0, 0, null,
    jsonb_build_array(jsonb_build_object('product_id', p_marwaha,'quantity', 1, 'unit_price', 150,'unit_cost', 90))
  );

  return v_store;
end $$;
grant execute on function public.seed_demo_store() to authenticated;
