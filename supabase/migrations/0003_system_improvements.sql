-- Migration: System Improvements (Multi-Unit, Favorites, Safe Uniques, Edit RPCs)

-- 1. Favorites and Recently Used
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_favorite boolean not null default false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS recently_used_at timestamptz;

-- 2. Multi-Unit System
CREATE TABLE IF NOT EXISTS public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_units_product_idx on public.product_units(product_id);
create unique index if not exists product_units_name_idx on public.product_units(product_id, lower(trim(name)));

alter table public.product_units enable row level security;
do $$ begin
  create policy product_units_select on public.product_units for select to authenticated 
    using (exists (select 1 from public.products p where p.id = product_id and app.is_store_owner(p.store_id)));
  create policy product_units_insert on public.product_units for insert to authenticated 
    with check (exists (select 1 from public.products p where p.id = product_id and app.is_store_owner(p.store_id)));
  create policy product_units_update on public.product_units for update to authenticated 
    using (exists (select 1 from public.products p where p.id = product_id and app.is_store_owner(p.store_id)))
    with check (exists (select 1 from public.products p where p.id = product_id and app.is_store_owner(p.store_id)));
  create policy product_units_delete on public.product_units for delete to authenticated 
    using (exists (select 1 from public.products p where p.id = product_id and app.is_store_owner(p.store_id)));
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger trg_touch_product_units before update on public.product_units
  for each row execute function public.fn_touch_updated_at();
exception when duplicate_object then null; end $$;

-- 3. Alter tables for unit_id
ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS unit_id uuid references public.product_units(id) on delete restrict;
ALTER TABLE public.sales_invoice_items ADD COLUMN IF NOT EXISTS unit_id uuid references public.product_units(id) on delete restrict;
ALTER TABLE public.purchase_invoice_items ADD COLUMN IF NOT EXISTS unit_id uuid references public.product_units(id) on delete restrict;

-- 4. Update Inventory Triggers to include unit_id
create or replace function public.fn_sales_item_inventory()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_store uuid;
begin
  if tg_op = 'INSERT' then
    select store_id into v_store from public.sales_invoices where id = new.invoice_id;
    insert into public.inventory_transactions
      (store_id, product_id, unit_id, type, quantity, unit_cost, reference_type, reference_id, note)
    values
      (v_store, new.product_id, new.unit_id, 'OUT', new.quantity, new.unit_cost, 'sales_invoice_item', new.id, 'Auto: sales');
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.inventory_transactions
     where reference_type = 'sales_invoice_item' and reference_id = old.id;
    return old;
  end if;
  return null;
end $$;

create or replace function public.fn_purchase_item_inventory()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_store uuid;
begin
  if tg_op = 'INSERT' then
    select store_id into v_store from public.purchase_invoices where id = new.invoice_id;
    insert into public.inventory_transactions
      (store_id, product_id, unit_id, type, quantity, unit_cost, reference_type, reference_id, note)
    values
      (v_store, new.product_id, new.unit_id, 'IN', new.quantity, new.unit_cost, 'purchase_invoice_item', new.id, 'Auto: purchase');
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.inventory_transactions
     where reference_type = 'purchase_invoice_item' and reference_id = old.id;
    return old;
  end if;
  return null;
end $$;

-- 5. Create Unit Stock View
create or replace view public.v_product_unit_stock with (security_invoker = true) as
select
  p.id as product_id,
  p.store_id,
  t.unit_id,
  coalesce(sum(case t.type
    when 'IN' then t.quantity
    when 'OUT' then -t.quantity
    when 'ADJUSTMENT' then t.quantity
  end), 0) as current_stock
from public.products p
join public.inventory_transactions t on t.product_id = p.id
group by p.id, p.store_id, t.unit_id;

-- 6. Safe Unique Constraints
DO $$ 
DECLARE
  v_dup_customers boolean;
  v_dup_suppliers boolean;
  v_dup_products boolean;
BEGIN
  -- Customers
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    GROUP BY store_id, public.normalize_arabic(name)
    HAVING COUNT(*) > 1
  ) INTO v_dup_customers;
  IF NOT v_dup_customers THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS customers_store_name_idx ON public.customers (store_id, public.normalize_arabic(name));';
  ELSE
    RAISE NOTICE 'Skipping customers unique index: duplicates found.';
  END IF;

  -- Suppliers
  SELECT EXISTS (
    SELECT 1 FROM public.suppliers
    GROUP BY store_id, public.normalize_arabic(name)
    HAVING COUNT(*) > 1
  ) INTO v_dup_suppliers;
  IF NOT v_dup_suppliers THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS suppliers_store_name_idx ON public.suppliers (store_id, public.normalize_arabic(name));';
  ELSE
    RAISE NOTICE 'Skipping suppliers unique index: duplicates found.';
  END IF;

  -- Products
  SELECT EXISTS (
    SELECT 1 FROM public.products
    GROUP BY store_id, public.normalize_arabic(name)
    HAVING COUNT(*) > 1
  ) INTO v_dup_products;
  IF NOT v_dup_products THEN
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS products_store_name_idx ON public.products (store_id, public.normalize_arabic(name));';
  ELSE
    RAISE NOTICE 'Skipping products unique index: duplicates found.';
  END IF;
END $$;

-- 7. Update Create RPCs and Add Update RPCs
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
    (invoice_id, product_id, unit_id, quantity, unit_price, unit_cost, discount, line_total)
  select v_invoice_id, 
         (it->>'product_id')::uuid, 
         nullif(it->>'unit_id', '')::uuid,
         (it->>'quantity')::numeric,
         coalesce((it->>'unit_price')::numeric, 0),
         coalesce((it->>'unit_cost')::numeric, 0),
         coalesce((it->>'discount')::numeric, 0), 0
  from jsonb_array_elements(p_items) it;
  
  return v_invoice_id;
end $$;

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
    (invoice_id, product_id, unit_id, quantity, unit_cost, discount, line_total)
  select v_invoice_id, 
         (it->>'product_id')::uuid, 
         nullif(it->>'unit_id', '')::uuid,
         (it->>'quantity')::numeric,
         coalesce((it->>'unit_cost')::numeric, 0),
         coalesce((it->>'discount')::numeric, 0), 0
  from jsonb_array_elements(p_items) it;
  
  return v_invoice_id;
end $$;

-- Update RPCs (Atomic)
create or replace function public.update_sale_invoice(
  p_invoice_id uuid, p_customer_id uuid, p_invoice_number text,
  p_discount numeric, p_paid numeric, p_notes text, p_items jsonb
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_store_id uuid;
begin
  select store_id into v_store_id from public.sales_invoices where id = p_invoice_id;
  if v_store_id is null or not app.is_store_owner(v_store_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item required' using errcode = 'P0001';
  end if;
  
  -- Update header
  update public.sales_invoices set
    customer_id = p_customer_id,
    invoice_number = nullif(p_invoice_number, ''),
    discount = coalesce(p_discount, 0),
    paid = coalesce(p_paid, 0),
    notes = nullif(p_notes, '')
  where id = p_invoice_id;
  
  -- Delete old items (triggers inventory reversal automatically)
  delete from public.sales_invoice_items where invoice_id = p_invoice_id;
  
  -- Insert new items (triggers inventory deduction automatically)
  insert into public.sales_invoice_items
    (invoice_id, product_id, unit_id, quantity, unit_price, unit_cost, discount, line_total)
  select p_invoice_id, 
         (it->>'product_id')::uuid, 
         nullif(it->>'unit_id', '')::uuid,
         (it->>'quantity')::numeric,
         coalesce((it->>'unit_price')::numeric, 0),
         coalesce((it->>'unit_cost')::numeric, 0),
         coalesce((it->>'discount')::numeric, 0), 0
  from jsonb_array_elements(p_items) it;
end $$;

create or replace function public.update_purchase_invoice(
  p_invoice_id uuid, p_supplier_id uuid, p_invoice_number text,
  p_discount numeric, p_paid numeric, p_notes text, p_items jsonb
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_store_id uuid;
begin
  select store_id into v_store_id from public.purchase_invoices where id = p_invoice_id;
  if v_store_id is null or not app.is_store_owner(v_store_id) then
    raise exception 'permission denied' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'at least one item required' using errcode = 'P0001';
  end if;
  
  -- Update header
  update public.purchase_invoices set
    supplier_id = p_supplier_id,
    invoice_number = nullif(p_invoice_number, ''),
    discount = coalesce(p_discount, 0),
    paid = coalesce(p_paid, 0),
    notes = nullif(p_notes, '')
  where id = p_invoice_id;
  
  -- Delete old items
  delete from public.purchase_invoice_items where invoice_id = p_invoice_id;
  
  -- Insert new items
  insert into public.purchase_invoice_items
    (invoice_id, product_id, unit_id, quantity, unit_cost, discount, line_total)
  select p_invoice_id, 
         (it->>'product_id')::uuid, 
         nullif(it->>'unit_id', '')::uuid,
         (it->>'quantity')::numeric,
         coalesce((it->>'unit_cost')::numeric, 0),
         coalesce((it->>'discount')::numeric, 0), 0
  from jsonb_array_elements(p_items) it;
end $$;

-- 8. Enhanced Search RPC
drop function if exists public.search_products(uuid, text, int);

create or replace function public.search_products(
  p_store_id uuid, 
  p_query text, 
  p_limit int default 50,
  p_sort_by text default 'relevance'
)
returns table (
  id uuid, store_id uuid, name text, description text, category text, barcode text, sku text,
  purchase_price numeric, sale_price numeric, minimum_stock numeric, current_stock numeric,
  is_favorite boolean, recently_used_at timestamptz,
  created_at timestamptz, updated_at timestamptz
) language sql stable security invoker set search_path = public, extensions, pg_temp as $$
  select p.id, p.store_id, p.name, p.description, p.category, p.barcode, p.sku,
         p.purchase_price, p.sale_price, p.minimum_stock,
         coalesce(vs.current_stock, 0)::numeric, 
         p.is_favorite, p.recently_used_at,
         p.created_at, p.updated_at
  from public.products p
  left join public.v_product_stock vs on vs.product_id = p.id
  where p.store_id = p_store_id
    and (p_query is null or p_query = ''
         or p.search_blob ilike '%' || public.normalize_arabic(p_query) || '%'
         or p.search_blob % public.normalize_arabic(p_query))
  order by 
    case when p_sort_by = 'a-z' then public.normalize_arabic(p.name) else null end asc nulls last,
    case when p_sort_by = 'z-a' then public.normalize_arabic(p.name) else null end desc nulls last,
    case when p_sort_by = 'highest-stock' then coalesce(vs.current_stock, 0) else null end desc nulls last,
    case when p_sort_by = 'lowest-stock' then coalesce(vs.current_stock, 0) else null end asc nulls last,
    case when p_sort_by = 'newest' then p.created_at else null end desc nulls last,
    case when p_sort_by = 'oldest' then p.created_at else null end asc nulls last,
    case when p_sort_by = 'recently-updated' then p.updated_at else null end desc nulls last,
    -- Default is relevance
    case when p_sort_by = 'relevance' and p_query is not null and p_query <> '' 
      then similarity(p.search_blob, public.normalize_arabic(p_query)) 
      else null end desc nulls last,
    p.is_favorite desc,
    p.recently_used_at desc nulls last,
    p.name
  limit greatest(coalesce(p_limit, 50), 1);
$$;
grant execute on function public.search_products(uuid, text, int, text) to authenticated;
