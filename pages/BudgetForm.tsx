import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { formatCurrency, parseCurrencyToNumber } from '../src/utils/formatCurrency';
import { calculateItemTotal } from '../src/utils/formulas';
import { useOrderItems } from '../src/hooks/useOrderItems';
import { getTodayISO } from '../src/utils/dateUtils';


// --- Custom Select Wrapper ---
const CustomSelect: React.FC<{
    label: string;
    options: any[];
    onSelect: (opt: any) => void;
    onAdd: () => void;
    placeholder?: string;
    value?: string;
    error?: boolean;
    disabled?: boolean;
    onSearch?: (term: string) => void;
}> = ({ label, options, onSelect, onAdd, placeholder, value, error, disabled, onSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || '');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearch(value || '');
    }, [value]);

    useEffect(() => {
        if (onSearch && isOpen) {
            const timer = setTimeout(() => {
                onSearch(search);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [search, isOpen]);

    useEffect(() => {
        const click = (e: any) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
        document.addEventListener('mousedown', click);
        return () => document.removeEventListener('mousedown', click);
    }, []);

    const filtered = options.filter(o =>
        o.name.toLowerCase().includes(search.toLowerCase()) ||
        (o.code && o.code.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative" ref={ref}>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{label}</label>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`form-input w-full rounded-lg flex justify-between items-center cursor-pointer bg-white py-2 ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${disabled ? 'bg-gray-100' : ''}`}
            >
                <span className="text-gray-900 truncate">{search || placeholder || "Selecione..."}</span>
                <span className="material-icons-outlined text-gray-400">expand_more</span>
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-100">
                        <input autoFocus className="w-full text-sm border-0 focus:ring-0 p-1" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.map(opt => (
                            <div key={opt.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between group" onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}>
                                <span>{opt.name}</span>
                                {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-400 italic">Nenhum produto encontrado.</div>
                        )}
                        <div className="px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 cursor-pointer border-t" onClick={() => { onAdd(); setIsOpen(false); }}>+ CADASTRAR NOVO</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Budget Form Component ---
const BudgetForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // States
    const [budgetNumber, setBudgetNumber] = useState('');
    const [vendedor, setVendedor] = useState('');
    const [status, setStatus] = useState('EM ABERTO');
    const [dataOrcamento, setDataOrcamento] = useState(getTodayISO());
    const [dataPedido, setDataPedido] = useState(getTodayISO()); // Prediction
    const [issuer, setIssuer] = useState('CRISTAL');
    const [clientData, setClientData] = useState({ id: '', name: '', doc: '', phone: '', email: '', emailFin: '' });

    // Lists
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [suppliersList, setSuppliersList] = useState<any[]>([]);
    const [factors, setFactors] = useState<any[]>([]);

    const location = useLocation();
    const [isClientLocked, setIsClientLocked] = useState(false);

    // --- useOrderItems hook ---
    const {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        duplicateItem
    } = useOrderItems([]);

    useEffect(() => {
        loadBaseData();
        if (id && id !== 'novo') {
            loadBudget();
        } else if (location.state?.clientData) {
            // New Budget from CRM
            const { clientData: cData, vendedor: vend } = location.state;

            // Try to find partner ID if missing
            if (!cData.id) {
                // Async lookup inside useEffect is tricky, reset clientData after async call?
                // Better to do it in a separate async function called here.
                findPartnerId(cData).then(foundId => {
                    setClientData({ ...cData, id: foundId || '' });
                });
            } else {
                setClientData(cData);
            }

            if (vend) setVendedor(vend);
            setIsClientLocked(true);

            // Auto-number placeholder
            setBudgetNumber('AUTO');
        } else if (!id || id === 'novo') {
            setBudgetNumber('AUTO');
        }
    }, [id, location.state]);

    const findPartnerId = async (cData: any) => {
        if (!cData.doc && !cData.email && !cData.name) return null;

        let query = supabase.from('partners').select('id');
        const conditions = [];
        if (cData.doc) conditions.push(`doc.eq.${cData.doc} `);
        if (cData.email) conditions.push(`email.eq.${cData.email} `);
        // Name is less reliable but useful fallback
        if (!cData.doc && !cData.email && cData.name) conditions.push(`name.ilike.${cData.name} `);

        if (conditions.length > 0) {
            const { data } = await query.or(conditions.join(',')).limit(1);
            if (data && data.length > 0) return data[0].id;
        }
        return null;
    };

    const loadBaseData = async () => {
        const { data: c } = await supabase.from('partners').select('*').eq('type', 'CLIENTE');
        // Load only top 50 products initially to avoid payload issues
        const { data: p } = await supabase.from('products').select('*').limit(50);
        const { data: s } = await supabase.from('partners').select('*').eq('type', 'FORNECEDOR');
        const { data: f } = await supabase.from('calculation_factors').select('*');
        setClientsList(c || []);
        setProductsList(p || []);
        setSuppliersList(s || []);
        setFactors(f || []);
    };

    const searchProducts = async (term: string) => {
        if (!term) {
            const { data: p } = await supabase.from('products').select('*').limit(50);
            if (p) setProductsList(p);
            return;
        }
        const { data } = await supabase.from('products')
            .select('*')
            .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
            .limit(50);

        if (data) setProductsList(data);
    };

    const loadBudget = async () => {
        const { data, error } = await supabase.from('budgets').select('*, budget_items(*)').eq('id', id).single();
        if (data) {
            setBudgetNumber(data.budget_number);
            setVendedor(data.salesperson);
            setStatus(data.status);
            setDataOrcamento(data.created_at.split('T')[0]);
            setIssuer(data.issuer);
            // Load client
            const client = clientsList.find((cl: any) => cl.id === data.client_id) as any;
            if (client) setClientData({ id: client.id, name: client.name, doc: client.doc, phone: client.phone, email: client.email, emailFin: client.financial_email });

            // Map items
            setItems(data.budget_items.map((it: any) => ({
                id: it.id,
                productName: it.product_name,
                supplier_id: it.supplier_id,
                quantity: it.quantity,
                priceUnit: it.unit_price,
                custoPersonalizacao: it.customization_cost,
                transpFornecedor: it.supplier_transport_cost,
                transpCliente: it.client_transport_cost,
                despesaExtra: it.extra_expense,
                layoutCost: it.layout_cost,
                fator: it.calculation_factor,
                bvPct: it.bv_pct,
                isApproved: it.is_approved
            })));
        }
    };


    const saveBudget = async () => {
        if (status === 'PROPOSTA ACEITA') {
            toast.error('Este orçamento já foi aprovado e convertido em pedido. Não é possível editá-lo.');
            return;
        }
        if (!budgetNumber || !vendedor || !clientData.name) {
            toast.error('Preencha os campos obrigatórios (Pedido, Vendedor, Cliente).');
            return;
        }
        setLoading(true);
        try {
            let finalBudgetNumber = budgetNumber;
            if (budgetNumber === 'AUTO') {
                // Get next number from DB function
                const { data: numData, error: numError } = await supabase.rpc('get_next_budget_number');
                if (numError) throw numError;
                finalBudgetNumber = numData.toString();
                setBudgetNumber(finalBudgetNumber);
            }

            const payload = {
                budget_number: finalBudgetNumber,
                salesperson: vendedor,
                status,
                client_id: clientData.id || await findPartnerId(clientData) || null,
                issuer,
                total_amount: items.reduce((sum, it) => sum + calculateItemTotal(it), 0)
            };

            let budgetId = id;
            if (!id || id === 'novo') {
                const { data, error } = await supabase.from('budgets').insert([payload]).select().single();
                if (error) throw error;
                budgetId = data.id;
            } else {
                const { error } = await supabase.from('budgets').update(payload).eq('id', id);
                if (error) throw error;
            }

            // Save items
            await supabase.from('budget_items').delete().eq('budget_id', budgetId);
            const itemsPayload = items.map(it => ({
                budget_id: budgetId,
                product_name: it.productName,
                supplier_id: it.supplier_id || null,
                quantity: it.quantity,
                unit_price: it.priceUnit,
                customization_cost: it.custoPersonalizacao,
                supplier_transport_cost: it.transpFornecedor,
                client_transport_cost: it.transpCliente,
                extra_expense: it.despesaExtra,
                layout_cost: it.layoutCost,
                calculation_factor: it.fator,
                bv_pct: it.bvPct,
                total_item_value: calculateItemTotal(it),
                is_approved: it.isApproved
            }));
            if (items.length > 0) {
                await supabase.from('budget_items').insert(itemsPayload);
            }

            toast.success('Orçamento salvo com sucesso!');
            if (!id || id === 'novo') navigate(`/orcamento/${budgetId}`);
        } catch (e: any) {
            toast.error('Erro ao salvar: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const generateOrder = async () => {
        if (!id || budgetNumber === 'AUTO') {
            toast.error('Salve o orçamento antes de gerar o pedido.');
            return;
        }

        const approvedItems = items.filter(it => it.isApproved);
        if (approvedItems.length === 0) {
            toast.error('Aprove pelo menos um item para gerar o pedido.');
            return;
        }

        if (!window.confirm('Confirma a geração do pedido? O orçamento será aprovado e bloqueado para edições.')) return;

        setLoading(true);
        try {
            // 1. Check if order exists
            const { data: existing } = await supabase.from('orders').select('id').eq('order_number', budgetNumber).single();
            if (existing) {
                toast.error('Já existe um pedido com este número.');
                return;
            }

            // 2. Create Order
            const { data: newOrder, error: orderError } = await supabase.from('orders').insert([{
                order_number: budgetNumber,
                salesperson: vendedor,
                status: 'EM ABERTO',
                client_id: clientData.id,
                total_amount: approvedItems.reduce((acc, it) => acc + calculateItemTotal(it), 0),
                issuer: issuer,
                created_at: new Date().toISOString(),
                order_date: new Date().toISOString()
            }]).select().single();

            if (orderError) throw orderError;

            // 3. Create Order Items
            const orderItemsPayload = approvedItems.map(it => ({
                order_id: newOrder.id,
                product_name: it.productName,
                quantity: it.quantity,
                unit_price: it.priceUnit,
                total_item_value: calculateItemTotal(it), // Approximate or recalculate
                supplier_id: it.supplier_id
                // Add margins/costs if needed in order_items schema
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw itemsError;

            // 4. Update Budget Status
            await supabase.from('budgets').update({ status: 'PROPOSTA ACEITA' }).eq('id', id);
            setStatus('PROPOSTA ACEITA');

            toast.success('Pedido gerado com sucesso!');
            // Navigate to Order View (assuming URL)
            navigate(`/orders`); // Or specific order view if available
        } catch (error: any) {
            toast.error('Erro ao gerar pedido: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const duplicateBudget = async () => {
        if (!window.confirm('Deseja duplicar este orçamento?')) return;
        setLoading(true);
        try {
            // Get new number
            const { data: numData, error: numError } = await supabase.rpc('get_next_budget_number');
            const newNum = numData ? numData.toString() : 'AUTO';

            const payload = {
                budget_number: newNum,
                salesperson: vendedor,
                status: 'EM ABERTO',
                client_id: clientData.id || null,
                issuer,
                total_amount: items.reduce((sum, it) => sum + calculateItemTotal(it), 0),
                created_at: new Date().toISOString()
            };

            const { data: newBudget, error: createError } = await supabase.from('budgets').insert([payload]).select().single();
            if (createError) throw createError;

            // Copy items
            const itemsPayload = items.map(it => ({
                budget_id: newBudget.id,
                product_name: it.productName,
                supplier_id: it.supplier_id,
                quantity: it.quantity,
                unit_price: it.priceUnit,
                customization_cost: it.custoPersonalizacao,
                supplier_transport_cost: it.transpFornecedor,
                client_transport_cost: it.transpCliente,
                extra_expense: it.despesaExtra,
                layout_cost: it.layoutCost,
                calculation_factor: it.fator,
                bv_pct: it.bvPct,
                total_item_value: calculateItemTotal(it),
                is_approved: false // Reset approval on duplicate
            }));

            if (items.length > 0) {
                await supabase.from('budget_items').insert(itemsPayload);
            }

            toast.success('Orçamento duplicado!');
            navigate(`/orcamento/${newBudget.id}`);
            window.location.reload(); // Force reload to clear state if needed
        } catch (error: any) {
            toast.error('Erro ao duplicar: ' + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div className="flex-1 flex items-center">
                    <button onClick={() => navigate('/orcamentos')} className="mr-4 p-2 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                        <span className="material-icons-outlined text-xl">arrow_back</span>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-3 uppercase tracking-tighter">
                        <span className="material-icons-outlined text-blue-500 text-3xl">description</span>
                        {id && id !== 'novo' ? 'EDITAR ORÇAMENTO' : 'NOVO ORÇAMENTO'}
                    </h2>
                </div>
                <div className="flex gap-3">
                    {status === 'PROPOSTA ACEITA' ? (
                        <div className="flex gap-3">
                            <button onClick={duplicateBudget} disabled={loading} className="px-6 py-3 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all uppercase flex items-center gap-2">
                                <span className="material-icons-outlined text-sm">content_copy</span> Duplicar
                            </button>
                            <button disabled className="px-6 py-3 rounded-lg shadow-sm text-sm font-bold text-gray-500 bg-gray-100 border border-gray-200 cursor-not-allowed uppercase flex items-center gap-2">
                                <span className="material-icons-outlined text-sm">lock</span> Pedido Gerado
                            </button>
                        </div>
                    ) : (
                        <>
                            <button onClick={duplicateBudget} disabled={loading} className="px-6 py-3 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all uppercase">
                                Duplicar
                            </button>
                            <button onClick={saveBudget} disabled={loading} className="px-6 py-3 rounded-lg shadow-sm text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all uppercase">
                                {loading ? 'Salvando...' : 'Salvar Orçamento'}
                            </button>
                            <button onClick={generateOrder} className="px-6 py-3 rounded-lg shadow-sm text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-all uppercase flex items-center gap-2">
                                <span className="material-icons-outlined text-sm">shopping_cart</span> Gerar Pedido
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Informações Gerais */}
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                    <span className="material-icons-outlined text-blue-500">info</span>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações Gerais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-blue-500 uppercase mb-2">Pedido <span className="text-red-500">*</span></label>
                        <input
                            className={`form - input block w - full text - center rounded - lg font - bold py - 2 border - blue - 500 ${budgetNumber === 'AUTO' ? 'bg-blue-50 text-blue-500' : ''} `}
                            placeholder="GERADO AUTO"
                            value={budgetNumber}
                            readOnly={budgetNumber === 'AUTO' || (!!id && id !== 'novo')}
                            onChange={e => setBudgetNumber(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Vendedor <span className="text-red-500">*</span></label>
                        <select
                            className="form-select block w-full py-2 rounded-lg text-sm font-bold border-gray-300 disabled:bg-gray-100"
                            value={vendedor}
                            onChange={e => setVendedor(e.target.value)}
                            disabled={status === 'PROPOSTA ACEITA'}
                        >
                            <option value="">SELECIONE...</option>
                            <option value="VENDAS 01">VENDAS 01</option>
                            <option value="VENDAS 02">VENDAS 02</option>
                            <option value="VENDAS 03">VENDAS 03</option>
                            <option value="VENDAS 04">VENDAS 04</option>
                            <option value="VENDAS 05">VENDAS 05</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status <span className="text-red-500">*</span></label>
                        <select className="form-select block w-full py-2 rounded-lg text-sm border-gray-300" value={status} onChange={e => setStatus(e.target.value)}>
                            <option value="EM ABERTO">EM ABERTO</option>
                            <option value="EM NEGOCIAÇÃO">EM NEGOCIAÇÃO</option>
                            <option value="PROPOSTA ENVIADA">PROPOSTA ENVIADA</option>
                            <option value="PROPOSTA ACEITA">PROPOSTA ACEITA</option>
                            <option value="PROPOSTA RECUSADA">PROPOSTA RECUSADA</option>
                            <option value="CANCELADO">CANCELADO</option>
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data do Orçamento <span className="text-red-500">*</span></label>
                        <div className="flex items-center">
                            <span className="material-icons-outlined absolute left-3 text-gray-400 pointer-events-none">calendar_month</span>
                            <input type="date" className="form-input block w-full pl-10 rounded-lg text-sm border-gray-300" value={dataOrcamento} onChange={e => setDataOrcamento(e.target.value)} />
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data do Pedido <span className="text-red-500">*</span></label>
                        <div className="flex items-center">
                            <span className="material-icons-outlined absolute left-3 text-gray-400 pointer-events-none">event_available</span>
                            <input type="date" className="form-input block w-full pl-10 rounded-lg text-sm border-gray-300" value={dataPedido} onChange={e => setDataPedido(e.target.value)} />
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Emitente</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['CRISTAL', 'ESPIRITO', 'NATUREZA'].map(op => (
                                <button
                                    key={op}
                                    onClick={() => setIssuer(op)}
                                    className={`py-2 px-2 border-2 rounded-lg font-bold text-[9px] transition-all uppercase ${issuer === op ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'} ${status === 'PROPOSTA ACEITA' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={status === 'PROPOSTA ACEITA'}
                                >
                                    {op === 'ESPIRITO' ? 'ESPÍRITO BRINDES' : op === 'CRISTAL' ? 'CRISTAL BRINDES' : 'NATUREZA BRINDES'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Dados do Cliente */}
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                    <span className="material-icons-outlined text-blue-500">person</span>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dados do Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <CustomSelect
                            label="Nome / Razão Social *"
                            options={clientsList}
                            onSelect={c => setClientData({ id: c.id, name: c.name, doc: c.doc, phone: c.phone, email: c.email, emailFin: c.financial_email })}
                            onAdd={() => navigate('/cadastros')}
                            value={clientData.name}
                            disabled={isClientLocked || status === 'PROPOSTA ACEITA'}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CNPJ / CPF</label>
                        <input className="form-input w-full rounded-lg border-gray-200 text-sm bg-gray-50" value={clientData.doc} readOnly />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone</label>
                        <input className="form-input w-full rounded-lg border-gray-200 text-sm bg-gray-50" value={clientData.phone} readOnly />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail Contato</label>
                        <input className="form-input w-full rounded-lg border-gray-200 text-sm bg-gray-50" value={clientData.email} readOnly />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail Financeiro</label>
                        <input className="form-input w-full rounded-lg border-gray-200 text-sm" value={clientData.emailFin} onChange={e => setClientData({ ...clientData, emailFin: e.target.value })} />
                    </div>
                </div>
            </section>

            {/* Produtos */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                        <span className="material-icons-outlined text-sm">inventory_2</span> Itens do Orçamento
                    </h3>
                </div>

                {items.map((it, idx) => (
                    <div key={it.id} className={`bg-white shadow-sm rounded-xl border border-gray-200 transition-all overflow-hidden ${it.isApproved ? 'ring-2 ring-green-500 ring-opacity-50' : 'hover:shadow-md'}`}>
                        {/* Header do Item */}
                        <div className={`px-6 py-3 border-b flex justify-between items-center ${it.isApproved ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <span className="bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Item {idx + 1}</span>
                                <span className={`text-xs font-bold uppercase ${it.isApproved ? 'text-green-700' : 'text-gray-500'}`}>
                                    {it.productName || 'Novo Produto'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className={`flex items-center gap-2 bg-white px-3 py-1 rounded border border-gray-200 shadow-sm transition-all ${status === 'PROPOSTA ACEITA' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                                    <input type="checkbox" className="w-4 h-4 rounded text-green-600 focus:ring-green-500" checked={it.isApproved} onChange={e => updateItem(it.id, 'isApproved', e.target.checked)} disabled={status === 'PROPOSTA ACEITA'} />
                                    <span className="text-[10px] font-bold uppercase text-gray-600">Aprovar Item</span>
                                </label>
                                <div className="h-4 w-px bg-gray-300 mx-2"></div>
                                <button onClick={() => duplicateItem(it)} disabled={status === 'PROPOSTA ACEITA'} className={`transition-colors tooltip-trigger ${status === 'PROPOSTA ACEITA' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`} title="Duplicar">
                                    <span className="material-icons-outlined text-lg">content_copy</span>
                                </button>
                                <button onClick={() => removeItem(it.id)} disabled={status === 'PROPOSTA ACEITA'} className={`transition-colors ${status === 'PROPOSTA ACEITA' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-600'}`} title="Remover">
                                    <span className="material-icons-outlined text-lg">delete</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-12 gap-6">
                                {/* Coluna Esquerda: Definição do Produto e Custos */}
                                <div className="col-span-12 lg:col-span-7 space-y-4">
                                    {/* Produto e Fornecedor */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <CustomSelect label="Produto" options={productsList} onSelect={p => updateItem(it.id, 'productName', p.name)} onAdd={() => { }} value={it.productName} onSearch={searchProducts} />
                                        </div>
                                        <div className="md:col-span-1">
                                            <CustomSelect label="Fornecedor" options={suppliersList} onSelect={s => updateItem(it.id, 'supplier_id', s.id)} onAdd={() => { }} placeholder="Fornecedor..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd</label>
                                                <input type="number" className="form-input w-full rounded-lg text-center font-bold border-gray-300 focus:border-blue-500 focus:ring-blue-500" value={it.quantity} onChange={e => updateItem(it.id, 'quantity', Number(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Preço Unit.</label>
                                                <input className="form-input w-full rounded-lg text-right font-bold border-gray-300" value={formatCurrency(it.priceUnit)} onChange={e => updateItem(it.id, 'priceUnit', parseCurrencyToNumber(e.target.value))} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custos Adicionais (Grid Compacto) */}
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 flex items-center gap-1">
                                            <span className="material-icons-outlined text-xs">add_circle_outline</span> Custos Adicionais
                                        </p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Personalização</label>
                                                <input className="form-input w-full text-xs rounded border-gray-200 text-right" value={formatCurrency(it.custoPersonalizacao)} onChange={e => updateItem(it.id, 'custoPersonalizacao', parseCurrencyToNumber(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Layout</label>
                                                <input className="form-input w-full text-xs rounded border-gray-200 text-right" value={formatCurrency(it.layoutCost)} onChange={e => updateItem(it.id, 'layoutCost', parseCurrencyToNumber(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Despesa Extra</label>
                                                <input className="form-input w-full text-xs rounded border-gray-200 text-right" value={formatCurrency(it.despesaExtra)} onChange={e => updateItem(it.id, 'despesaExtra', parseCurrencyToNumber(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Frete Forn.</label>
                                                <input className="form-input w-full text-xs rounded border-gray-200 text-right" value={formatCurrency(it.transpFornecedor)} onChange={e => updateItem(it.id, 'transpFornecedor', parseCurrencyToNumber(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Frete Cli.</label>
                                                <input className="form-input w-full text-xs rounded border-gray-200 text-right" value={formatCurrency(it.transpCliente)} onChange={e => updateItem(it.id, 'transpCliente', parseCurrencyToNumber(e.target.value))} />
                                            </div>

                                            {/* Total Custo Display */}
                                            <div className="bg-blue-50 rounded border border-blue-100 flex flex-col justify-center items-end px-2">
                                                <span className="text-[8px] font-bold text-blue-400 uppercase">Custo Total Item</span>
                                                <span className="text-sm font-bold text-blue-600">{formatCurrency(items.length > 0 ? (it.quantity * it.priceUnit) + (it.custoPersonalizacao + it.layoutCost + it.transpFornecedor + it.transpCliente + it.despesaExtra) : 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Coluna Direita: Precificação e Resultado */}
                                <div className="col-span-12 lg:col-span-5 bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fator de Multiplicação</label>
                                            <div className="flex gap-2">
                                                <select className="form-select w-full rounded-lg border-gray-300 text-sm" value={it.fator} onChange={e => updateItem(it.id, 'fator', Number(e.target.value))}>
                                                    {factors.map(f => (
                                                        <option key={f.id} value={1 + (f.tax_percent + f.contingency_percent + f.margin_percent) / 100}>{f.name}</option>
                                                    ))}
                                                </select>
                                                <div className="bg-white border border-gray-300 px-3 flex items-center rounded-lg font-bold text-gray-700 min-w-[4rem] justify-center text-sm">
                                                    {it.fator.toFixed(2)}x
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">BV (%)</label>
                                            <div className="relative">
                                                <input type="number" className="form-input w-full rounded-lg border-gray-300 text-right pr-8 font-bold" value={it.bvPct} onChange={e => updateItem(it.id, 'bvPct', Number(e.target.value))} />
                                                <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-gray-200 space-y-2">
                                        <div className="flex justify-between items-center text-gray-500">
                                            <span className="text-xs font-bold uppercase">Preço Venda (Unit)</span>
                                            <span className="text-sm font-bold">{formatCurrency((calculateItemTotal(it) / (it.quantity || 1)))}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-black uppercase text-gray-800">Total Venda</span>
                                            <span className="text-3xl font-black text-blue-600 leading-none">{formatCurrency(calculateItemTotal(it))}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {status !== 'PROPOSTA ACEITA' && (
                    <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-500 font-bold uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-icons-outlined">add_circle</span> Adicionar Novo Item ao Pedido
                    </button>
                )}
                {status === 'PROPOSTA ACEITA' && (
                    <div className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold uppercase flex items-center justify-center gap-2 bg-gray-50">
                        <span className="material-icons-outlined">lock</span> Orçamento aprovado — edição bloqueada
                    </div>
                )}
            </section>
        </div>
    );
};

export default BudgetForm;
