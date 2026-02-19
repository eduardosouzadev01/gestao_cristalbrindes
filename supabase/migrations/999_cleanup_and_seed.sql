-- 1. DELETE ALL EXISTING TEST DATA
-- We must follow the dependency order: items -> commissions -> logs -> orders -> (partners, etc.)

TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE commissions CASCADE;
TRUNCATE TABLE order_logs CASCADE;
TRUNCATE TABLE order_change_logs CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE budgets CASCADE;
TRUNCATE TABLE budget_items CASCADE;
TRUNCATE TABLE crm_leads CASCADE;
TRUNCATE TABLE company_expenses CASCADE;
TRUNCATE TABLE partners CASCADE;
TRUNCATE TABLE calculation_factors CASCADE;

-- 2. SEED PARTNERS (CLIENTS & SUPPLIERS)
-- Enum values for partner_type: 'CLIENTE', 'FORNECEDOR'
-- Column for doc: 'doc'

-- Clients
INSERT INTO partners (id, type, name, email, phone, doc, salesperson, created_at) VALUES
(uuid_generate_v4(), 'CLIENTE', 'Indústrias Metalúrgicas Vale do Rio', 'compras@metalvale.com.br', '(11) 98765-4321', '12.345.678/0001-90', 'VENDAS 01', now()),
(uuid_generate_v4(), 'CLIENTE', 'Escola de Idiomas Aprender Mais', 'contato@aprendermas.edu.br', '(11) 99888-7766', '98.765.432/0001-21', 'VENDAS 02', now()),
(uuid_generate_v4(), 'CLIENTE', 'Hospital do Bem Estar', 'adm@hospitalbemestar.com.br', '(11) 97766-5544', '45.678.901/0001-33', 'VENDAS 01', now()),
(uuid_generate_v4(), 'CLIENTE', 'Condomínio Solar das Palmeiras', 'sindico@solarpalmeiras.com.br', '(11) 96655-4433', '11.222.333/0001-44', 'VENDAS 03', now());

-- Suppliers
INSERT INTO partners (id, type, name, email, phone, doc, created_at) VALUES
(uuid_generate_v4(), 'FORNECEDOR', 'Plásticos & Moldes São Paulo', 'vendas@plasticossp.com.br', '(11) 4004-1234', '55.444.333/0001-22', now()),
(uuid_generate_v4(), 'FORNECEDOR', 'Gráfica Expressa Alvorada', 'pedidos@graficaalvorada.com.br', '(11) 4002-8922', '33.222.111/0001-00', now()),
(uuid_generate_v4(), 'FORNECEDOR', 'Tecidos e Brindes do Sul', 'comercial@brindessul.com.br', '(51) 3344-5566', '22.333.444/0001-11', now());

-- 3. SEED CALCULATION FACTORS (PRODUCTS)
INSERT INTO calculation_factors (name, created_at) VALUES
('Caneta Plástica Personalizada', now()),
('Squeeze de Alumínio 500ml', now()),
('Agenda Executiva 2026', now()),
('Mochila Notebook Premium', now()),
('Chaveiro Metal Resinado', now()),
('Copo Térmico Personalizado', now());

-- 4. SEED CRM LEADS
-- Status is TEXT: 'NOVO', 'CRIANDO_ORCAMENTO', 'ORCAMENTO_ENVIADO', 'ACOMPANHAMENTO', 'PEDIDO_ABERTO', 'NAO_APROVADO', 'ENTREGUE', 'POS_VENDA', 'FINALIZADO'
INSERT INTO crm_leads (id, client_name, client_phone, client_email, description, salesperson, status, priority, estimated_value, created_at) VALUES
(uuid_generate_v4(), 'Restaurante Sabor & Arte', '(11) 91234-5678', 'contato@saborearte.com.br', 'Interesse em 500 copos para inauguração', 'VENDAS 01', 'NOVO', 'ALTA', 2500.00, now() - interval '2 days'),
(uuid_generate_v4(), 'Academia Power Fit', '(11) 92345-6789', 'gestao@powerfit.com.br', 'Cotação de 200 squeezes para alunos novos', 'VENDAS 02', 'CRIANDO_ORCAMENTO', 'NORMAL', 1800.00, now() - interval '5 days'),
(uuid_generate_v4(), 'Prefeitura Municipal de Exemplo', '(11) 3344-0000', 'licitacao@exemplo.gov.br', 'Cadernos personalizados para volta às aulas', 'VENDAS 01', 'ORCAMENTO_ENVIADO', 'ALTA', 12000.00, now() - interval '10 day'),
(uuid_generate_v4(), 'Startup Tech Inovação', '(11) 95566-7788', 'rh@techinovacao.io', 'Brindes para kit onboarding (mochila e chaveiro)', 'VENDAS 03', 'ACOMPANHAMENTO', 'BAIXA', 4500.00, now() - interval '15 days'),
(uuid_generate_v4(), 'Evento Casamento Real', '(11) 96677-8899', 'noiva@gmail.com', 'Taças personalizadas para convidados', 'VENDAS 01', 'NAO_APROVADO', 'NORMAL', 1200.00, now() - interval '20 days');

UPDATE crm_leads SET lost_reason = '[PREÇO] Cliente achou o valor do frete abusivo para a região.' WHERE status = 'NAO_APROVADO';

-- 5. SEED SOME EXPENSES
INSERT INTO company_expenses (description, amount, due_date, paid, category, issuer, created_at) VALUES
('Aluguel Galpão Fevereiro', 3500.00, '2026-02-10', true, 'FIXO', 'CRISTAL', now()),
('Energia Elétrica - Enel', 850.20, '2026-02-15', false, 'FIXO', 'CRISTAL', now()),
('Internet Fibra Óptica', 199.90, '2026-02-20', false, 'FIXO', 'CRISTAL', now()),
('Limpeza e Conservação', 450.00, '2026-02-05', true, 'FIXO', 'CRISTAL', now()),
('Marketing Digital - Meta Ads', 1200.00, '2026-02-28', false, 'VARIAVEL', 'CRISTAL', now());

-- 6. SEED SAMPLE ORDERS/BUDGETS TO SHOW DATA ON DASHBOARD
-- Order Status enum: 'EM ABERTO', 'EM PRODUÇÃO', 'AGUARDANDO APROVAÇÃO', 'AGUARDANDO NF', 'AGUARDANDO PAGAMENTO', 'AGUARDANDO PERSONALIZAÇÃO', 'FINALIZADO'
DO $$
DECLARE
    v_client_id uuid;
    v_client_id_2 uuid;
    v_client_id_3 uuid;
    v_supplier_id uuid;
    v_supplier_id_2 uuid;
    v_order_id uuid;
    v_order_id_2 uuid;
    v_order_id_3 uuid;
BEGIN
    -- Get client and supplier IDs
    SELECT id INTO v_client_id FROM partners WHERE type = 'CLIENTE' AND name LIKE '%Metalúrgicas%' LIMIT 1;
    SELECT id INTO v_client_id_2 FROM partners WHERE type = 'CLIENTE' AND name LIKE '%Idiomas%' LIMIT 1;
    SELECT id INTO v_client_id_3 FROM partners WHERE type = 'CLIENTE' AND name LIKE '%Hospital%' LIMIT 1;
    SELECT id INTO v_supplier_id FROM partners WHERE type = 'FORNECEDOR' AND name LIKE '%Plásticos%' LIMIT 1;
    SELECT id INTO v_supplier_id_2 FROM partners WHERE type = 'FORNECEDOR' AND name LIKE '%Gráfica%' LIMIT 1;

    -- Create sample Budgets
    INSERT INTO budgets (budget_number, client_id, salesperson, status, total_amount, created_at)
    VALUES 
        ('ORC-2026-001', v_client_id, 'VENDAS 01', 'PROPOSTA ACEITA', 3700.00, now() - interval '3 days'),
        ('ORC-2026-002', v_client_id_2, 'VENDAS 02', 'AGUARDANDO RETORNO', 5200.00, now() - interval '5 days'),
        ('ORC-2026-003', v_client_id_3, 'VENDAS 01', 'PROPOSTA ACEITA', 8900.00, now() - interval '7 days');

    -- ===== ORDER 1: Entry paid, remaining pending =====
    INSERT INTO orders (
        order_number, salesperson, status, order_date, client_id, issuer, billing_type, payment_due_date,
        total_amount, entry_amount, entry_date, entry_confirmed, remaining_amount, remaining_date, remaining_confirmed, created_at
    )
    VALUES (
        'PED-2026-001', 'VENDAS 01', 'EM PRODUÇÃO', now() - interval '5 days', v_client_id, 'CRISTAL', '50_50', now() + interval '15 days',
        3700.00, 1850.00, now() - interval '4 days', true, 1850.00, now() + interval '20 days', false, now() - interval '5 days'
    )
    RETURNING id INTO v_order_id;

    -- Add items to order 1
    INSERT INTO order_items (order_id, product_name, supplier_id, quantity, unit_price, customization_cost, supplier_transport_cost, total_item_value, real_unit_price, real_customization_cost, real_supplier_transport_cost, unit_price_paid, customization_paid, supplier_transport_paid)
    VALUES 
        (v_order_id, 'Squeeze de Alumínio 500ml', v_supplier_id, 100, 37.00, 500.00, 200.00, 3700.00, 15.50, 450.00, 180.00, false, false, false);

    -- Create commission for the entry (already paid)
    INSERT INTO commissions (order_id, salesperson, amount, type, status, commission_percent, created_at)
    VALUES (v_order_id, 'VENDAS 01', 18.50, 'ENTRADA', 'PENDING', 1.00, now() - interval '4 days');

    -- ===== ORDER 2: Both entry and remaining paid =====
    INSERT INTO orders (
        order_number, salesperson, status, order_date, client_id, issuer, billing_type, payment_due_date,
        total_amount, entry_amount, entry_date, entry_confirmed, remaining_amount, remaining_date, remaining_confirmed, created_at
    )
    VALUES (
        'PED-2026-002', 'VENDAS 02', 'FINALIZADO', now() - interval '10 days', v_client_id_2, 'NATUREZA', '30_70', now() - interval '2 days',
        5200.00, 1560.00, now() - interval '9 days', true, 3640.00, now() - interval '1 day', true, now() - interval '10 days'
    )
    RETURNING id INTO v_order_id_2;

    -- Add items to order 2
    INSERT INTO order_items (order_id, product_name, supplier_id, quantity, unit_price, layout_cost, total_item_value, real_unit_price, real_layout_cost, unit_price_paid, layout_paid)
    VALUES 
        (v_order_id_2, 'Agenda Executiva 2026', v_supplier_id_2, 200, 26.00, 200.00, 5200.00, 18.00, 150.00, true, true);

    -- Create commissions for order 2 (both paid)
    INSERT INTO commissions (order_id, salesperson, amount, type, status, commission_percent, created_at)
    VALUES 
        (v_order_id_2, 'VENDAS 02', 15.60, 'ENTRADA', 'PAID', 1.00, now() - interval '9 days'),
        (v_order_id_2, 'VENDAS 02', 36.40, 'RESTANTE', 'PAID', 1.00, now() - interval '1 day');

    -- ===== ORDER 3: Entry and remaining both pending =====
    INSERT INTO orders (
        order_number, salesperson, status, order_date, client_id, issuer, billing_type, payment_due_date,
        total_amount, entry_amount, entry_date, entry_confirmed, remaining_amount, remaining_date, remaining_confirmed, created_at
    )
    VALUES (
        'PED-2026-003', 'VENDAS 01', 'AGUARDANDO PAGAMENTO', now() - interval '2 days', v_client_id_3, 'ESPIRITO', '40_60', now() + interval '10 days',
        8900.00, 3560.00, now() + interval '5 days', false, 5340.00, now() + interval '30 days', false, now() - interval '2 days'
    )
    RETURNING id INTO v_order_id_3;

    -- Add items to order 3
    INSERT INTO order_items (order_id, product_name, supplier_id, quantity, unit_price, customization_cost, client_transport_cost, extra_expense, total_item_value, real_unit_price, real_customization_cost, real_client_transport_cost, real_extra_expense, unit_price_paid, customization_paid, client_transport_paid, extra_expense_paid)
    VALUES 
        (v_order_id_3, 'Mochila Notebook Premium', v_supplier_id, 150, 59.00, 800.00, 250.00, 100.00, 8900.00, 42.00, 750.00, 220.00, 80.00, false, false, false, false);

END $$;

