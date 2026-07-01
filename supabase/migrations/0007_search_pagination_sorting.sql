-- 0007_search_pagination_sorting.sql

-- Drop existing search functions
drop function if exists public.search_products(uuid, text, int, text);
drop function if exists public.search_products(uuid, text, int);

create or replace function public.search_products(
  p_store_id uuid, 
  p_query text, 
  p_limit int default 50,
  p_sort_by text default 'relevance',
  p_offset int default 0
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
    case when p_sort_by = 'most-sold' then (
      select coalesce(sum(quantity), 0) from public.sales_invoice_items sii where sii.product_id = p.id
    ) else null end desc nulls last,
    case when p_sort_by = 'favorites' then case when p.is_favorite then 1 else 0 end else null end desc nulls last,
    case when p_sort_by = 'newest' then p.created_at else null end desc nulls last,
    case when p_sort_by = 'oldest' then p.created_at else null end asc nulls last,
    case when p_sort_by = 'out-of-stock' then case when coalesce(vs.current_stock, 0) <= 0 then 0 else 1 end else null end asc nulls last,
    case when p_sort_by = 'low-stock' then case when coalesce(vs.current_stock, 0) <= p.minimum_stock then 0 else 1 end else null end asc nulls last,
    -- Default is relevance
    case when p_sort_by = 'relevance' and p_query is not null and p_query <> '' 
      then similarity(p.search_blob, public.normalize_arabic(p_query)) 
      else null end desc nulls last,
    p.is_favorite desc,
    p.recently_used_at desc nulls last,
    p.name
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_products(uuid, text, int, text, int) to authenticated;
