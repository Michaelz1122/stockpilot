-- =====================================================
-- 0006: Fix Negative Inventory Trigger Column Reference
-- =====================================================

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
    -- FIX: The view column is product_id, not id.
    SELECT current_stock INTO v_stock
    FROM public.v_product_stock
    WHERE product_id = NEW.product_id;

    IF v_stock < 0 THEN
        SELECT name INTO v_product_name FROM public.products WHERE id = NEW.product_id;
        RAISE EXCEPTION 'NEGATIVE_INVENTORY: Cannot complete transaction. Stock for "%" would drop below zero.', v_product_name USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
