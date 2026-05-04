-- ============================================================================
-- MIGRATION 002: Correção completa do esquema de Orders & Order Items
-- Corrige o erro "column does not exist" (PostgreSQL 42703) bloqueando o fluxo
-- de geração de pedidos (save_order RPC).
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== INICIANDO MIGRAÇÃO 002: CORREÇÃO DO ESQUEMA DE PEDIDOS ===';
END
$$;

-- ============================================================================
-- 1. NOVAS COLUNAS NA TABELA orders
-- ============================================================================

-- 1.1 budget_id: vincula pedido ao orçamento de origem
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'budget_id') THEN
    ALTER TABLE orders ADD COLUMN budget_id UUID REFERENCES budgets(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_budget_id ON orders(budget_id);
    RAISE NOTICE '[OK] Coluna orders.budget_id adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna orders.budget_id já existe';
END IF;

-- 1.2 management_approved: flag de aprovação de margem mínima pela gestão
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'management_approved') THEN
    ALTER TABLE orders ADD COLUMN management_approved BOOLEAN DEFAULT false;
    RAISE NOTICE '[OK] Coluna orders.management_approved adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna orders.management_approved já existe';
END IF;

-- 1.3 delivery_date_expected: data prevista de entrega ao cliente
-- Força tipo TEXT mesmo se a coluna já existir como DATE
IF EXISTS (SELECT 1 FROM information_schema.columns 
           WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_date_expected') THEN
    ALTER TABLE orders ALTER COLUMN delivery_date_expected TYPE TEXT USING delivery_date_expected::TEXT;
    RAISE NOTICE '[OK] Coluna orders.delivery_date_expected convertida para TEXT';
ELSE
    ALTER TABLE orders ADD COLUMN delivery_date_expected TEXT;
    RAISE NOTICE '[OK] Coluna orders.delivery_date_expected adicionada (TEXT)';
END IF;

-- 1.4 delivery_date_actual: data real de entrega ao cliente
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_date_actual') THEN
    ALTER TABLE orders ADD COLUMN delivery_date_actual TEXT;
    RAISE NOTICE '[OK] Coluna orders.delivery_date_actual adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna orders.delivery_date_actual já existe';
END IF;

-- ============================================================================
-- 2. NOVAS COLUNAS NA TABELA order_items
-- ============================================================================

-- 2.1 product_code: código do produto (referência)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_code') THEN
    ALTER TABLE order_items ADD COLUMN product_code TEXT;
    RAISE NOTICE '[OK] Coluna order_items.product_code adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna order_items.product_code já existe';
END IF;

-- 2.2 product_color: cor do produto
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_color') THEN
    ALTER TABLE order_items ADD COLUMN product_color TEXT;
    RAISE NOTICE '[OK] Coluna order_items.product_color adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna order_items.product_color já existe';
END IF;

-- 2.3 product_description: descrição detalhada do produto
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'product_description') THEN
    ALTER TABLE order_items ADD COLUMN product_description TEXT;
    RAISE NOTICE '[OK] Coluna order_items.product_description adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna order_items.product_description já existe';
END IF;

-- 2.4 extra_pct: percentual de despesa extra
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'extra_pct') THEN
    ALTER TABLE order_items ADD COLUMN extra_pct NUMERIC;
    RAISE NOTICE '[OK] Coluna order_items.extra_pct adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna order_items.extra_pct já existe';
END IF;

-- 2.5 supplier_departure_date: data de saída do fornecedor (por item)
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'supplier_departure_date') THEN
    ALTER TABLE order_items ADD COLUMN supplier_departure_date TEXT;
    RAISE NOTICE '[OK] Coluna order_items.supplier_departure_date adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna order_items.supplier_departure_date já existe';
END IF;

-- 2.6 client_transport_supplier_id: fornecedor de transporte do cliente
IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'client_transport_supplier_id') THEN
    ALTER TABLE order_items ADD COLUMN client_transport_supplier_id UUID REFERENCES partners(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_order_items_ct_supplier ON order_items(client_transport_supplier_id);
    RAISE NOTICE '[OK] Coluna order_items.client_transport_supplier_id adicionada';
ELSE
    RAISE NOTICE '[SKIP] Coluna order_items.client_transport_supplier_id já existe';
END IF;

-- ============================================================================
-- 3. SEQUÊNCIA PARA order_number (geração atômica de números de pedido)
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'order_number_seq') THEN
    CREATE SEQUENCE order_number_seq START 1000;
    RAISE NOTICE '[OK] Sequence order_number_seq criada (início: 1000)';
    
    -- Setup starting value based on existing maximum order number
    -- (tenta extrair o maior número numérico existente)
    PERFORM setval('order_number_seq', GREATEST(
        (SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::int), 0)
         FROM orders WHERE order_number ~ '[0-9]'),
        1000
    ));
ELSE
    RAISE NOTICE '[SKIP] Sequence order_number_seq já existe';
END IF;

-- ============================================================================
-- 4. RECRIAÇÃO DA FUNÇÃO save_order (DROP + CREATE para garantir atomicidade)
-- ============================================================================

DROP FUNCTION IF EXISTS save_order(p_order jsonb, p_items jsonb);

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
        v_order_number := 'PED-' || LPAD(nextval('order_number_seq')::TEXT, 5, '0');
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

ALTER FUNCTION save_order(p_order jsonb, p_items jsonb) OWNER TO postgres;

-- ============================================================================
-- 5. PERMISSÕES E COMENTÁRIOS
-- ============================================================================

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION save_order(p_order jsonb, p_items jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION save_order(p_order jsonb, p_items jsonb) TO anon;

-- Comentários nas novas colunas
COMMENT ON COLUMN orders.budget_id IS 'FK para budgets - vincula pedido ao orçamento de origem';
COMMENT ON COLUMN orders.management_approved IS 'Aprovação da gestão sobre a margem mínima';
COMMENT ON COLUMN orders.delivery_date_expected IS 'Data prevista de entrega ao cliente';
COMMENT ON COLUMN orders.delivery_date_actual IS 'Data real de entrega ao cliente';
COMMENT ON COLUMN order_items.product_code IS 'Código interno do produto';
COMMENT ON COLUMN order_items.product_color IS 'Cor do produto';
COMMENT ON COLUMN order_items.product_description IS 'Descrição detalhada do produto';
COMMENT ON COLUMN order_items.extra_pct IS 'Percentual de despesa extra sobre o item';
COMMENT ON COLUMN order_items.supplier_departure_date IS 'Data de saída do fornecedor para este item';
COMMENT ON COLUMN order_items.client_transport_supplier_id IS 'FK para partners - fornecedor de transporte do cliente';

DO $$
BEGIN
    RAISE NOTICE '=== MIGRAÇÃO 002 CONCLUÍDA COM SUCESSO ===';
END
$$;
