import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ORDER_STATUSES = [
    'EM ABERTO', 'EM PRODUÇÃO', 'AGUARDANDO APROVAÇÃO',
    'AGUARDANDO NF', 'AGUARDANDO PAGAMENTO',
    'AGUARDANDO PERSONALIZAÇÃO', 'FINALIZADO', 'ENTRE FINALIZADO'
];

const CLIENTS = [
    { name: 'Tech Solutions LTDA', doc: '12.345.678/0001-90', phone: '(11) 98765-4321', email: 'contato@techsolutions.com.br', type: 'CLIENTE', salesperson: 'VENDAS 01' },
    { name: 'Marketing Criativo SA', doc: '98.765.432/0001-10', phone: '(21) 91234-5678', email: 'financeiro@marketingcriativo.com.br', type: 'CLIENTE', salesperson: 'VENDAS 02' },
    { name: 'Eventos &festas', doc: '11.222.333/0001-44', phone: '(31) 99887-7665', email: 'eventos@festas.com', type: 'CLIENTE', salesperson: 'VENDAS 01' },
    { name: 'Consultoria Global', doc: '55.444.333/0001-22', phone: '(41) 98765-1234', email: 'admin@globalconsult.com', type: 'CLIENTE', salesperson: 'VENDAS 02' },
    { name: 'Escola Futuro', doc: '66.777.888/0001-99', phone: '(51) 91234-0987', email: 'diretoria@escolafuturo.edu.br', type: 'CLIENTE', salesperson: 'VENDAS 01' }
];

const SUPPLIERS = [
    { name: 'Asia Imports', doc: '00.111.222/0001-33', phone: '(11) 3333-4444', email: 'vendas@asiaimports.com', type: 'FORNECEDOR' },
    { name: 'National Gifts', doc: '11.222.333/0001-44', phone: '(11) 5555-6666', email: 'comercial@nationalgifts.com.br', type: 'FORNECEDOR' },
    { name: 'Grafica Rapida', doc: '22.333.444/0001-55', phone: '(11) 7777-8888', email: 'atendimento@graficarapida.com.br', type: 'FORNECEDOR' }
];

const PRODUCTS = [
    { name: 'Caneta Metal Premium', description: 'Caneta esferográfica de metal com estojo', unit_price: 15.00, cost_price: 8.00, category: 'Escritório' },
    { name: 'Caderno Personalizado A5', description: 'Caderno capa dura com logo', unit_price: 25.00, cost_price: 12.00, category: 'Papelaria' },
    { name: 'Garola Térmica 500ml', description: 'Garrafa inox parede dupla', unit_price: 45.00, cost_price: 22.00, category: 'Drinkware' },
    { name: 'Powerbank 10000mAh', description: 'Carregador portátil', unit_price: 85.00, cost_price: 45.00, category: 'Tecnologia' },
    { name: 'Mochila Notebook', description: 'Mochila poliéster reforçada', unit_price: 120.00, cost_price: 65.00, category: 'Bolsas' },
    { name: 'Sacola Ecobag', description: 'Sacola algodão cru', unit_price: 12.00, cost_price: 5.00, category: 'Ecológico' },
    { name: 'Chaveiro Metal', description: 'Chaveiro formato personalizado', unit_price: 5.00, cost_price: 1.50, category: 'Chaveiros' },
    { name: 'Pen Drive 32GB', description: 'Pen drive giratório', unit_price: 22.00, cost_price: 10.00, category: 'Tecnologia' }
];

const LEADS = [
    { client_name: 'Novo Cliente A', status: 'NOVO', priority: 'ALTA', description: 'Interesse em brindes de final de ano', salesperson: 'VENDAS 01' },
    { client_name: 'Cliente B', status: 'CRIANDO_ORCAMENTO', priority: 'NORMAL', description: 'Cotando garrafas térmicas', salesperson: 'VENDAS 02' },
    { client_name: 'Empresa C', status: 'ORCAMENTO_ENVIADO', priority: 'ALTA', description: 'Aguardando aprovação diretoria', salesperson: 'VENDAS 01' },
    { client_name: 'Loja D', status: 'ACOMPANHAMENTO', priority: 'BAIXA', description: 'Follow-up semana que vem', salesperson: 'VENDAS 01' },
    { client_name: 'Startup E', status: 'NAO_APROVADO', priority: 'NORMAL', description: 'Fechou com concorrente por preço', lost_reason: 'PREÇO', salesperson: 'VENDAS 02' },
    { client_name: 'Grupo F', status: 'FINALIZADO', priority: 'ALTA', description: 'Venda realizada com sucesso', salesperson: 'VENDAS 01' }
];

async function seed() {
    console.log('Starting seed process...');

    // 1. Clean up
    console.log('Cleaning existing data...');

    try {
        const { error: errNotif } = await supabase.from('notifications').delete().neq('id', 0);
        if (errNotif && errNotif.code !== '42P01') console.error('Error clearing notifications:', errNotif);
    } catch (e) {
        console.log('Notifications table check failed, continuing.');
    }

    const { error: errLogC } = await supabase.from('order_change_logs').delete().neq('id', 0);
    if (errLogC) console.error('Error clearing change logs:', errLogC);

    await supabase.from('order_logs').delete().neq('id', 0);
    await supabase.from('commissions').delete().neq('id', 0);
    await supabase.from('order_items').delete().neq('id', 0);

    const { error: errOrd } = await supabase.from('orders').delete().neq('id', 'novo');
    if (errOrd) console.error('Error clearing orders:', errOrd);

    await supabase.from('budget_items').delete().neq('id', 0);
    await supabase.from('budgets').delete().neq('id', 0);
    await supabase.from('crm_leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await supabase.from('products').delete().neq('id', 0);
    await supabase.from('partners').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('Data cleaned.');

    // 2. Insert Partners
    console.log('Inserting Partners...');
    await supabase.from('partners').insert(CLIENTS);
    await supabase.from('partners').insert(SUPPLIERS);

    // Fetch all partners
    const { data: allPartnersData } = await supabase.from('partners').select('*');
    const clients = allPartnersData?.filter(p => p.type === 'CLIENTE') || [];
    const suppliersData = allPartnersData?.filter(p => p.type === 'FORNECEDOR') || [];

    // 3. Insert Products
    console.log('Inserting Products...');
    // Assign random supplier to products. Using suppliersData if available.
    const productsWithSupplier = PRODUCTS.map(p => ({
        ...p,
        supplier_id: suppliersData && suppliersData.length > 0 ? suppliersData[Math.floor(Math.random() * suppliersData.length)].id : null
    }));

    await supabase.from('products').insert(productsWithSupplier);

    // Fetch all products
    const { data: products } = await supabase.from('products').select('*');

    // 4. Insert Leads
    console.log('Inserting Leads...');
    const { error: errL } = await supabase.from('crm_leads').insert(LEADS);
    if (errL) console.error('Error inserting leads:', errL);

    // 5. Insert Orders & Budgets
    console.log('Inserting Orders & Budgets...');

    if (!clients || clients.length === 0) {
        console.error('No clients to attach orders to.');
        return;
    }

    // Create one order for each status
    for (let i = 0; i < ORDER_STATUSES.length; i++) {
        const status = ORDER_STATUSES[i];
        const client = clients[i % clients.length];
        // Sequential 4-digit number
        const orderNum = (i + 1).toString().padStart(4, '0');

        // Create Order
        const { data: order, error: errOrder } = await supabase.from('orders').insert([{
            order_number: orderNum,
            salesperson: client.salesperson || 'VENDAS 01',
            status: status,
            client_id: client.id,
            total_amount: 0, // Will calculate
            issuer: 'CRISTAL',
            created_at: new Date().toISOString(),
            order_date: new Date().toISOString()
        }]).select().single();

        if (errOrder) {
            console.error(`Error creating order for status ${status}:`, errOrder);
            continue;
        }

        // Create Order Items
        // Pick 1-3 random products
        const numItems = Math.floor(Math.random() * 3) + 1;
        let totalOrderValue = 0;

        for (let j = 0; j < numItems; j++) {
            if (!products || products.length === 0) break;
            const product = products[Math.floor(Math.random() * products.length)];
            const qty = Math.floor(Math.random() * 50) + 10;
            const unitPrice = product.unit_price;
            const totalItem = qty * unitPrice;

            await supabase.from('order_items').insert([{
                order_id: order.id,
                product_name: product.name,
                quantity: qty,
                unit_price: unitPrice,
                total_item_value: totalItem, // Approximate
                supplier_id: product.supplier_id
                // Add other cost fields if needed (omitted for brevity)
            }]);

            totalOrderValue += totalItem;
        }

        // Update order total and financial splits
        const entryVal = totalOrderValue * 0.5;
        const remainingVal = totalOrderValue - entryVal;

        await supabase.from('orders').update({
            total_amount: totalOrderValue,
            entry_amount: entryVal,
            remaining_amount: remainingVal,
            entry_date: new Date().toISOString(), // Due now
            remaining_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
            entry_confirmed: status === 'FINALIZADO' || status === 'ENTRE FINALIZADO', // Paid if finished
            remaining_confirmed: status === 'FINALIZADO' || status === 'ENTRE FINALIZADO'
        }).eq('id', order.id);

        // Create corresponding Budget (optional but good for completeness)
        const budgetNum = (i + 1).toString().padStart(4, '0');
        await supabase.from('budgets').insert([{
            budget_number: budgetNum,
            total_value: totalOrderValue,
            status: 'APROVADO', // Since it's an order
            client_name: client.name,
            salesperson: client.salesperson,
            created_at: new Date().toISOString(),
            validity: 10
        }]);

        // Create Commission
        // Commission: 3% of total
        const commissionVal = totalOrderValue * 0.03;
        await supabase.from('commissions').insert([{
            order_id: order.id,
            salesperson: order.salesperson,
            amount: commissionVal,
            status: (status === 'FINALIZADO' || status === 'ENTRE FINALIZADO') ? 'LIBERADO' : 'PENDENTE',
            type: 'VENDA',
            created_at: new Date().toISOString()
        }]);

        console.log(`Created Order ${orderNum} with status ${status} and commission ${commissionVal.toFixed(2)}`);
    }

    // Create some Budgets that are NOT orders yet
    console.log('Creating standalone Budgets...');
    for (let k = 0; k < 3; k++) {
        // Continue sequence from orders
        const budgetNum = (ORDER_STATUSES.length + k + 1).toString().padStart(4, '0');
        const client = clients[k % clients.length];
        await supabase.from('budgets').insert([{
            budget_number: budgetNum,
            total_value: Math.floor(Math.random() * 5000) + 1000,
            status: 'PENDENTE',
            client_name: client.name,
            salesperson: 'VENDAS 01',
            created_at: new Date().toISOString(),
            validity: 7
        }]);
    }

    console.log('Seed completed successfully!');
}

seed().catch(console.error);
