-- Migration: Data Health (Duplicate Merging RPCs)

-- 1. Merge Customers
create or replace function public.merge_customers(
  p_primary_id uuid,
  p_secondary_id uuid
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_store_id uuid;
  v_sec_bal numeric;
  v_sec_notes text;
begin
  select store_id, opening_balance, notes into v_store_id, v_sec_bal, v_sec_notes
  from public.customers where id = p_secondary_id;

  if not app.is_store_owner(v_store_id) then
    raise exception 'permission denied';
  end if;

  -- Update references
  update public.sales_invoices set customer_id = p_primary_id where customer_id = p_secondary_id;
  update public.payments set customer_id = p_primary_id where customer_id = p_secondary_id;

  -- Merge opening balance and notes
  update public.customers 
  set opening_balance = opening_balance + coalesce(v_sec_bal, 0),
      notes = concat_ws(E'\n---\nMerged from duplicate:\n', notes, nullif(trim(v_sec_notes), ''))
  where id = p_primary_id;

  -- Delete secondary
  delete from public.customers where id = p_secondary_id;
end $$;

-- 2. Merge Suppliers
create or replace function public.merge_suppliers(
  p_primary_id uuid,
  p_secondary_id uuid
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_store_id uuid;
  v_sec_bal numeric;
  v_sec_notes text;
begin
  select store_id, opening_balance, notes into v_store_id, v_sec_bal, v_sec_notes
  from public.suppliers where id = p_secondary_id;

  if not app.is_store_owner(v_store_id) then
    raise exception 'permission denied';
  end if;

  -- Update references
  update public.purchase_invoices set supplier_id = p_primary_id where supplier_id = p_secondary_id;
  update public.payments set supplier_id = p_primary_id where supplier_id = p_secondary_id;

  -- Merge opening balance and notes
  update public.suppliers 
  set opening_balance = opening_balance + coalesce(v_sec_bal, 0),
      notes = concat_ws(E'\n---\nMerged from duplicate:\n', notes, nullif(trim(v_sec_notes), ''))
  where id = p_primary_id;

  -- Delete secondary
  delete from public.suppliers where id = p_secondary_id;
end $$;

-- 3. Merge Products
create or replace function public.merge_products(
  p_primary_id uuid,
  p_secondary_id uuid
) returns void
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_store_id uuid;
begin
  select store_id into v_store_id from public.products where id = p_secondary_id;

  if not app.is_store_owner(v_store_id) then
    raise exception 'permission denied';
  end if;

  -- Move units over, append unique suffix if name collides
  update public.product_units pu
  set product_id = p_primary_id,
      name = (
        case when exists (select 1 from public.product_units p_primary_u where p_primary_u.product_id = p_primary_id and lower(trim(p_primary_u.name)) = lower(trim(pu.name)))
        then pu.name || ' (merged)'
        else pu.name end
      )
  where pu.product_id = p_secondary_id;

  -- Disable triggers temporarily or handle them
  -- Actually, updating invoice items won't trigger inventory changes if we just update product_id, 
  -- but our triggers watch INSERT/DELETE/UPDATE.
  -- Wait, the triggers on sales_invoice_items and purchase_invoice_items are only for INSERT/DELETE currently?
  -- Let's check. Yes, fn_sales_item_inventory is only INSERT/DELETE. So updating product_id is safe.
  
  update public.sales_invoice_items set product_id = p_primary_id where product_id = p_secondary_id;
  update public.purchase_invoice_items set product_id = p_primary_id where product_id = p_secondary_id;
  update public.inventory_transactions set product_id = p_primary_id where product_id = p_secondary_id;

  -- Delete secondary
  delete from public.products where id = p_secondary_id;
end $$;
