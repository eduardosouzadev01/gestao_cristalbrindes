-- ============================================================================
-- MIGRATION 004: Adição de product_image_url e atualização do save_order
-- ============================================================================

-- 1. Adicionar coluna product_image_url na tabela order_items
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_image_url') THEN
        ALTER TABLE public.order_items ADD COLUMN product_image_url TEXT;
        RAISE NOTICE '[OK] Coluna order_items.product_image_url adicionada';
    ELSE
        RAISE NOTICE '[SKIP] Coluna order_items.product_image_url já existe';
    END IF;
END
$$;

-- 2. Atualizar a função save_order para processar product_image_url
CREATE OR REPLACE FUNCTION public.save_order(
    p_order jsonb,
    p_items jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_order_id UUID;
    v_item jsonb;
    v_order_number TEXT;
BEGIN
    -- 1. Usar o order_number fornecido ou gerar um novo (se nulo)
    v_order_number := p_order->>'order_number';
    
    IF v_order_number IS NULL OR v_order_number = '' THEN
        v_order_number := 'PED-' || nextval('public.order_number_seq')::text;
    END IF;

    -- 2. Inserir o pedido (orders)
    INSERT INTO public.orders (
        budget_id,
        order_number,
        salesperson,
        status,
        budget_date,
        order_date,
        client_id,
        issuer,
        billing_type,
        payment_method,
        payment_due_date,
        shipping_type,
        supplier_departure_date,
        invoice_number,
        total_amount,
        entry_amount,
        entry_forecast_date,
        entry_confirmed,
        remaining_amount,
        remaining_forecast_date,
        remaining_confirmed,
        purchase_order,
        layout_info,
        observations
    ) VALUES (
        (p_order->>'budget_id')::uuid,
        v_order_number,
        p_order->>'salesperson',
        COALESCE(p_order->>'status', 'AGUARDANDO PAGAMENTO ENTRADA'),
        p_order->>'budget_date',
        p_order->>'order_date',
        (p_order->>'client_id')::uuid,
        p_order->>'issuer',
        p_order->>'billing_type',
        p_order->>'payment_method',
        p_order->>'payment_due_date',
        p_order->>'shipping_type',
        p_order->>'supplier_departure_date',
        p_order->>'invoice_number',
        (p_order->>'total_amount')::numeric,
        (p_order->>'entry_amount')::numeric,
        p_order->>'entry_forecast_date',
        (p_order->>'entry_confirmed')::boolean,
        (p_order->>'remaining_amount')::numeric,
        p_order->>'remaining_forecast_date',
        (p_order->>'remaining_confirmed')::boolean,
        p_order->>'purchase_order',
        p_order->>'layout_info',
        p_order->>'observations'
    ) RETURNING id INTO v_order_id;

    -- 3. Inserir os itens (order_items)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            product_name,
            product_code,
            product_color,
            product_description,
            product_image_url,
            supplier_id,
            quantity,
            unit_price,
            customization_cost,
            supplier_transport_cost,
            client_transport_cost,
            extra_expense,
            layout_cost,
            calculation_factor,
            bv_pct,
            extra_pct,
            total_item_value,
            tax_pct,
            margin_pct,
            unforeseen_pct,
            real_unit_price,
            real_customization_cost,
            real_supplier_transport_cost,
            real_client_transport_cost,
            real_extra_expense,
            real_layout_cost,
            supplier_payment_date,
            customization_payment_date,
            transport_payment_date,
            layout_payment_date,
            extra_payment_date,
            supplier_departure_date,
            customization_supplier_id,
            transport_supplier_id,
            client_transport_supplier_id,
            layout_supplier_id,
            extra_supplier_id
        ) VALUES (
            v_order_id,
            COALESCE(v_item->>'product_name', 'Produto sem nome'),
            v_item->>'product_code',
            v_item->>'product_color',
            v_item->>'product_description',
            v_item->>'product_image_url',
            (v_item->>'supplier_id')::uuid,
            (v_item->>'quantity')::numeric,
            (v_item->>'unit_price')::numeric,
            (v_item->>'customization_cost')::numeric,
            (v_item->>'supplier_transport_cost')::numeric,
            (v_item->>'client_transport_cost')::numeric,
            (v_item->>'extra_expense')::numeric,
            (v_item->>'layout_cost')::numeric,
            (v_item->>'calculation_factor')::numeric,
            (v_item->>'bv_pct')::numeric,
            (v_item->>'extra_pct')::numeric,
            (v_item->>'total_item_value')::numeric,
            (v_item->>'tax_pct')::numeric,
            (v_item->>'margin_pct')::numeric,
            (v_item->>'unforeseen_pct')::numeric,
            COALESCE((v_item->>'real_unit_price')::numeric, (v_item->>'unit_price')::numeric),
            COALESCE((v_item->>'real_customization_cost')::numeric, (v_item->>'customization_cost')::numeric),
            COALESCE((v_item->>'real_supplier_transport_cost')::numeric, (v_item->>'supplier_transport_cost')::numeric),
            COALESCE((v_item->>'real_client_transport_cost')::numeric, (v_item->>'client_transport_cost')::numeric),
            COALESCE((v_item->>'real_extra_expense')::numeric, (v_item->>'extra_expense')::numeric),
            COALESCE((v_item->>'real_layout_cost')::numeric, (v_item->>'layout_cost')::numeric),
            v_item->>'supplier_payment_date',
            v_item->>'customization_payment_date',
            v_item->>'transport_payment_date',
            v_item->>'layout_payment_date',
            v_item->>'extra_payment_date',
            v_item->>'supplier_departure_date',
            (v_item->>'customization_supplier_id')::uuid,
            (v_item->>'transport_supplier_id')::uuid,
            (v_item->>'client_transport_supplier_id')::uuid,
            (v_item->>'layout_supplier_id')::uuid,
            (v_item->>'extra_supplier_id')::uuid
        );
    END LOOP;

    RETURN v_order_id::text;
END;
$$;
