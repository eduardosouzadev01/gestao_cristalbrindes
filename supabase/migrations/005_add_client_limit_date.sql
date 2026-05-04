-- Add client_limit_date to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS client_limit_date TEXT;

-- Update save_order RPC to handle client_limit_date
CREATE OR REPLACE FUNCTION save_order(
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
    v_order_number TEXT;
    v_item JSONB;
    v_budget_id UUID;
    v_salesperson TEXT;
BEGIN
    -- 4.1 Extrair budget_id (se vier do fluxo de aprovação de orçamento)
    v_budget_id := (p_order->>'budget_id')::UUID;
    
    -- 4.2 Extrair salesperson (necessário para RLS)
    v_salesperson := p_order->>'salesperson';
    
    -- 4.3 Gerar order_number
    v_order_number := p_order->>'order_number';
    IF v_order_number IS NULL OR v_order_number = '' OR UPPER(v_order_number) = 'AUTO' THEN
        v_order_number := 'PED-' || LPAD(nextval('public.order_number_seq')::TEXT, 5, '0');
    END IF;
    
    -- 4.4 Inserir ou atualizar o pedido (UPSERT via p_order.id)
    INSERT INTO public.orders (
        id,
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
        supplier_departure_date,
        invoice_number,
        total_amount,
        entry_amount,
        entry_date,
        entry_confirmed,
        remaining_amount,
        remaining_date,
        remaining_confirmed,
        purchase_order,
        layout_info,
        observations,
        management_approved,
        delivery_date_expected,
        delivery_date_actual
    ) VALUES (
        COALESCE((p_order->>'id')::UUID, gen_random_uuid()),
        v_budget_id,
        v_order_number,
        v_salesperson,
        COALESCE(p_order->>'status', 'AGUARDANDO PAGAMENTO ENTRADA'),
        p_order->>'budget_date',
        p_order->>'order_date',
        (p_order->>'client_id')::UUID,
        p_order->>'issuer',
        p_order->>'billing_type',
        p_order->>'payment_method',
        p_order->>'payment_due_date',
        p_order->>'supplier_departure_date',
        p_order->>'invoice_number',
        (p_order->>'total_amount')::NUMERIC,
        COALESCE((p_order->>'entry_amount')::NUMERIC, 0),
        p_order->>'entry_date',
        COALESCE((p_order->>'entry_confirmed')::BOOLEAN, false),
        COALESCE((p_order->>'remaining_amount')::NUMERIC, 0),
        p_order->>'remaining_date',
        COALESCE((p_order->>'remaining_confirmed')::BOOLEAN, false),
        p_order->>'purchase_order',
        p_order->>'layout_info',
        p_order->>'observations',
        COALESCE((p_order->>'management_approved')::BOOLEAN, false),
        p_order->>'delivery_date_expected',
        p_order->>'delivery_date_actual'
    )
    ON CONFLICT (id) DO UPDATE SET
        budget_id = COALESCE(EXCLUDED.budget_id, orders.budget_id),
        order_number = EXCLUDED.order_number,
        salesperson = EXCLUDED.salesperson,
        status = EXCLUDED.status,
        budget_date = EXCLUDED.budget_date,
        order_date = EXCLUDED.order_date,
        client_id = EXCLUDED.client_id,
        issuer = EXCLUDED.issuer,
        billing_type = EXCLUDED.billing_type,
        payment_method = EXCLUDED.payment_method,
        payment_due_date = EXCLUDED.payment_due_date,
        supplier_departure_date = EXCLUDED.supplier_departure_date,
        invoice_number = EXCLUDED.invoice_number,
        total_amount = EXCLUDED.total_amount,
        entry_amount = EXCLUDED.entry_amount,
        entry_date = EXCLUDED.entry_date,
        entry_confirmed = EXCLUDED.entry_confirmed,
        remaining_amount = EXCLUDED.remaining_amount,
        remaining_date = EXCLUDED.remaining_date,
        remaining_confirmed = EXCLUDED.remaining_confirmed,
        purchase_order = EXCLUDED.purchase_order,
        layout_info = EXCLUDED.layout_info,
        observations = EXCLUDED.observations,
        management_approved = EXCLUDED.management_approved,
        delivery_date_expected = EXCLUDED.delivery_date_expected,
        delivery_date_actual = EXCLUDED.delivery_date_actual,
        updated_at = now()
    RETURNING id INTO v_order_id;
    
    -- 4.5 Inserir itens (remove itens existentes do pedido primeiro para evitar duplicatas)
    IF v_order_id IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        -- Deleta itens existentes para este pedido (se for UPDATE)
        DELETE FROM public.order_items WHERE order_id = v_order_id;
        
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO public.order_items (
                id,
                order_id,
                product_name,
                product_code,
                product_color,
                product_description,
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
                unit_price_paid,
                customization_paid,
                supplier_transport_paid,
                client_transport_paid,
                extra_expense_paid,
                layout_paid,
                supplier_payment_date,
                customization_payment_date,
                transport_payment_date,
                layout_payment_date,
                extra_payment_date,
                supplier_departure_date,
                client_limit_date,
                customization_supplier_id,
                transport_supplier_id,
                client_transport_supplier_id,
                layout_supplier_id,
                extra_supplier_id
            ) VALUES (
                COALESCE((v_item->>'id')::UUID, gen_random_uuid()),
                v_order_id,
                COALESCE(v_item->>'product_name', 'Produto sem nome'),
                v_item->>'product_code',
                v_item->>'product_color',
                v_item->>'product_description',
                (v_item->>'supplier_id')::UUID,
                COALESCE((v_item->>'quantity')::INT, 0),
                COALESCE((v_item->>'unit_price')::NUMERIC, 0),
                COALESCE((v_item->>'customization_cost')::NUMERIC, 0),
                COALESCE((v_item->>'supplier_transport_cost')::NUMERIC, 0),
                COALESCE((v_item->>'client_transport_cost')::NUMERIC, 0),
                COALESCE((v_item->>'extra_expense')::NUMERIC, 0),
                COALESCE((v_item->>'layout_cost')::NUMERIC, 0),
                COALESCE((v_item->>'calculation_factor')::NUMERIC, 0),
                COALESCE((v_item->>'bv_pct')::NUMERIC, 0),
                COALESCE((v_item->>'extra_pct')::NUMERIC, 0),
                COALESCE((v_item->>'total_item_value')::NUMERIC, 0),
                COALESCE((v_item->>'tax_pct')::NUMERIC, 0),
                COALESCE((v_item->>'margin_pct')::NUMERIC, 0),
                COALESCE((v_item->>'unforeseen_pct')::NUMERIC, 0),
                (v_item->>'real_unit_price')::NUMERIC,
                (v_item->>'real_customization_cost')::NUMERIC,
                (v_item->>'real_supplier_transport_cost')::NUMERIC,
                (v_item->>'real_client_transport_cost')::NUMERIC,
                (v_item->>'real_extra_expense')::NUMERIC,
                (v_item->>'real_layout_cost')::NUMERIC,
                (v_item->>'unit_price_paid')::BOOLEAN,
                (v_item->>'customization_paid')::BOOLEAN,
                (v_item->>'supplier_transport_paid')::BOOLEAN,
                (v_item->>'client_transport_paid')::BOOLEAN,
                (v_item->>'extra_expense_paid')::BOOLEAN,
                (v_item->>'layout_paid')::BOOLEAN,
                v_item->>'supplier_payment_date',
                v_item->>'customization_payment_date',
                v_item->>'transport_payment_date',
                v_item->>'layout_payment_date',
                v_item->>'extra_payment_date',
                v_item->>'supplier_departure_date',
                v_item->>'client_limit_date',
                (v_item->>'customization_supplier_id')::UUID,
                (v_item->>'transport_supplier_id')::UUID,
                (v_item->>'client_transport_supplier_id')::UUID,
                (v_item->>'layout_supplier_id')::UUID,
                (v_item->>'extra_supplier_id')::UUID
            );
        END LOOP;
    END IF;
    
    -- 4.6 Retornar o ID do pedido gerado
    RETURN v_order_id::TEXT;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log detalhado do erro para debug
        RAISE WARNING 'save_order ERROR: % | SQLSTATE: % | p_order: % | p_items count: %',
            SQLERRM, SQLSTATE, p_order::TEXT, jsonb_array_length(p_items);
        RAISE;
END;
$$;
