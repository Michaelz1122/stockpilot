-- =====================================================
-- 0005: Audit Hardening & Restore Logic
-- =====================================================

-- 1. Prevent Negative Inventory
CREATE OR REPLACE FUNCTION public.check_negative_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_stock numeric;
    v_product_name text;
BEGIN
    -- We bypass the check if replication role is replica (during restore)
    IF current_setting('session_replication_role') = 'replica' THEN
        RETURN NEW;
    END IF;

    -- Calculate current stock from the view for this product
    SELECT current_stock INTO v_stock
    FROM public.v_product_stock
    WHERE id = NEW.product_id;

    IF v_stock < 0 THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'NEGATIVE_INVENTORY: Cannot complete transaction. Stock for "%" would drop below zero.', v_product_name USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_positive_inventory ON public.inventory_transactions;
CREATE TRIGGER ensure_positive_inventory
AFTER INSERT OR UPDATE ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.check_negative_inventory();


-- 2. Restore Data RPC
CREATE OR REPLACE FUNCTION public.restore_data(p_store_id uuid, p_data jsonb)
RETURNS void AS $$
BEGIN
    -- Verify ownership
    IF NOT app.is_store_owner(p_store_id) THEN
        RAISE EXCEPTION 'permission denied' USING ERRCODE = '42501';
    END IF;

    -- Disable triggers and FK constraints temporarily for bulk load
    SET LOCAL session_replication_role = 'replica';

    -- Wipe existing data for this store in reverse dependency order
    DELETE FROM public.payments WHERE store_id = p_store_id;
    DELETE FROM public.inventory_transactions WHERE store_id = p_store_id;
    DELETE FROM public.sales_invoice_items WHERE invoice_id IN (SELECT id FROM public.sales_invoices WHERE store_id = p_store_id);
    DELETE FROM public.sales_invoices WHERE store_id = p_store_id;
    DELETE FROM public.purchase_invoice_items WHERE invoice_id IN (SELECT id FROM public.purchase_invoices WHERE store_id = p_store_id);
    DELETE FROM public.purchase_invoices WHERE store_id = p_store_id;
    DELETE FROM public.customers WHERE store_id = p_store_id;
    DELETE FROM public.suppliers WHERE store_id = p_store_id;
    DELETE FROM public.product_units WHERE product_id IN (SELECT id FROM public.products WHERE store_id = p_store_id);
    DELETE FROM public.products WHERE store_id = p_store_id;

    -- Insert new data (must cast JSON arrays to recordsets)
    IF p_data->'products' IS NOT NULL AND jsonb_array_length(p_data->'products') > 0 THEN
        INSERT INTO public.products SELECT * FROM jsonb_populate_recordset(null::public.products, p_data->'products');
    END IF;

    IF p_data->'product_units' IS NOT NULL AND jsonb_array_length(p_data->'product_units') > 0 THEN
        INSERT INTO public.product_units SELECT * FROM jsonb_populate_recordset(null::public.product_units, p_data->'product_units');
    END IF;

    IF p_data->'customers' IS NOT NULL AND jsonb_array_length(p_data->'customers') > 0 THEN
        INSERT INTO public.customers SELECT * FROM jsonb_populate_recordset(null::public.customers, p_data->'customers');
    END IF;

    IF p_data->'suppliers' IS NOT NULL AND jsonb_array_length(p_data->'suppliers') > 0 THEN
        INSERT INTO public.suppliers SELECT * FROM jsonb_populate_recordset(null::public.suppliers, p_data->'suppliers');
    END IF;

    IF p_data->'sales_invoices' IS NOT NULL AND jsonb_array_length(p_data->'sales_invoices') > 0 THEN
        INSERT INTO public.sales_invoices SELECT * FROM jsonb_populate_recordset(null::public.sales_invoices, p_data->'sales_invoices');
    END IF;

    IF p_data->'sales_invoice_items' IS NOT NULL AND jsonb_array_length(p_data->'sales_invoice_items') > 0 THEN
        INSERT INTO public.sales_invoice_items SELECT * FROM jsonb_populate_recordset(null::public.sales_invoice_items, p_data->'sales_invoice_items');
    END IF;

    IF p_data->'purchase_invoices' IS NOT NULL AND jsonb_array_length(p_data->'purchase_invoices') > 0 THEN
        INSERT INTO public.purchase_invoices SELECT * FROM jsonb_populate_recordset(null::public.purchase_invoices, p_data->'purchase_invoices');
    END IF;

    IF p_data->'purchase_invoice_items' IS NOT NULL AND jsonb_array_length(p_data->'purchase_invoice_items') > 0 THEN
        INSERT INTO public.purchase_invoice_items SELECT * FROM jsonb_populate_recordset(null::public.purchase_invoice_items, p_data->'purchase_invoice_items');
    END IF;

    IF p_data->'inventory_transactions' IS NOT NULL AND jsonb_array_length(p_data->'inventory_transactions') > 0 THEN
        INSERT INTO public.inventory_transactions SELECT * FROM jsonb_populate_recordset(null::public.inventory_transactions, p_data->'inventory_transactions');
    END IF;

    IF p_data->'payments' IS NOT NULL AND jsonb_array_length(p_data->'payments') > 0 THEN
        INSERT INTO public.payments SELECT * FROM jsonb_populate_recordset(null::public.payments, p_data->'payments');
    END IF;

    -- Revert replication role to trigger normally again
    SET LOCAL session_replication_role = 'origin';

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
