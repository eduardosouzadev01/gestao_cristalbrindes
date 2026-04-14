import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// BUDGET STATUS CONFIG (Independent for budgets)
const BUDGET_STATUS_CONFIG: Record<string, { label: string; colorClass: string }> = {
    'EM ABERTO': { label: 'Em Aberto', colorClass: 'bg-slate-50 text-slate-600 border-slate-200' },
    'ATENDIMENTO': { label: 'Em Andamento', colorClass: 'bg-sky-50 text-sky-700 border-sky-200' },
    'ACOMPANHAMENTO_01': { label: 'Acompanhamento 01', colorClass: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    'ACOMPANHAMENTO_02': { label: 'Acompanhamento 02', colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'PROPOSTA_ENVIADA': { label: 'Proposta Enviada', colorClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    'ENVIO_CATALOGO': { label: 'Envio de Catálogo', colorClass: 'bg-orange-50 text-orange-700 border-orange-200' },
    'PEDIDO_ABERTO': { label: 'Pedido Aberto', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    'PROPOSTA ACEITA': { label: 'Proposta Aceita', colorClass: 'bg-teal-50 text-teal-700 border-teal-200' },
    'NAO_ATENDE_PRAZO': { label: 'Não atende Prazo', colorClass: 'bg-rose-50 text-rose-700 border-rose-200' },
    'NAO_APROVADO': { label: 'Não Aprovado', colorClass: 'bg-slate-50 text-slate-700 border-slate-200' }
};

const getBudgetStatusStyle = (status: string) => {
    return BUDGET_STATUS_CONFIG[status] || { label: status, colorClass: 'bg-gray-50 text-gray-600 border-gray-200' };
};
import { formatCurrency, parseCurrencyToNumber } from '../src/utils/formatCurrency';
import { calculateItemTotal } from '../src/utils/formulas';
import { useOrderItems } from '../src/hooks/useOrderItems';
import { getTodayISO } from '../src/utils/dateUtils';
import { useAuth } from '../lib/auth';
import { maskPhone, maskCpfCnpj } from '../src/utils/maskUtils';
import { GenerateOrderModal } from '../src/components/modals/GenerateOrderModal';
import { QuickSupplierModal, NewSupplierData } from '../src/components/modals/QuickSupplierModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import RichTextEditor from '../src/components/common/RichTextEditor';
import { ProposalsHistoryModal } from '../src/components/modals/ProposalsHistoryModal';
import BudgetItemCard from '../src/components/Budget/BudgetItemCard';


import { CustomSelect } from '../src/components/Budget/CustomSelect';

// --- Budget Form Component ---
const BudgetForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const isSavingRef = useRef(false);
    const { appUser, hasPermission } = useAuth();
    const userSalesperson = appUser?.salesperson || '';
    const isSeller = !!appUser?.salesperson;
    const targetId = id === 'novo' ? null : id;
    const [activeId, setActiveId] = useState<string | null>(targetId);
    
    // CRM Sync State
    const [leadId, setLeadId] = useState<string | null>(location.state?.leadId || null);
    const [initialQuotedItem, setInitialQuotedItem] = useState<string | null>(location.state?.quotedItem || null);

    // States
    const [budgetNumber, setBudgetNumber] = useState('');
    const [vendedor, setVendedor] = useState(userSalesperson);
    const [status, setStatus] = useState('EM ABERTO');
    const [lastSentAt, setLastSentAt] = useState<string | null>(null);
    const [dataOrcamento, setDataOrcamento] = useState(new Date().toISOString().split('T')[0]);
    const [dataPedido, setDataPedido] = useState(getTodayISO()); // Prediction
    const [issuer, setIssuer] = useState('CRISTAL');
    const [clientData, setClientData] = useState({ id: '', name: '', doc: '', phone: '', email: '', emailFin: '' });

    // Commercial data (Proposal terms)
    const [validity, setValidity] = useState('15 dias');
    const [shipping, setShipping] = useState('Frete incluso para Grande Vitória, exceto Guarapari.');
    const [deliveryDeadline, setDeliveryDeadline] = useState('15 / 20 dias úteis');
    const [paymentMethod, setPaymentMethod] = useState('50% na entrada + 50% no pedido pronto.');
    const [observation, setObservation] = useState('');

    // Lists
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [suppliersList, setSuppliersList] = useState<any[]>([]);
    const [factors, setFactors] = useState<any[]>([]);

    const [isClientLocked, setIsClientLocked] = useState(false);

    // Auto-save states
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const isInitialMount = useRef(true);

    // Commercial data state
    const [isCommercialModalOpen, setIsCommercialModalOpen] = useState(false);
    const [commercialData, setCommercialData] = useState({
        payment_term: '',
        supplier_deadline: '', // No longer used globally in UI
        shipping_deadline: '',
        invoice_number: '',
        purchase_order: '',
        layout_info: '',
        entry_forecast_date: '',
        remaining_forecast_date: '',
        supplier_payment_dates: {} as Record<string, string>,
        supplier_departure_dates: {} as Record<string, string>
    });

    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', doc: '', phone: '', email: '', supplier_category: 'PRODUTOS' });
    const [supplierModalContext, setSupplierModalContext] = useState<{ itemId: string | number, field: string } | null>(null);

    // History modal state
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [proposalsHistory, setProposalsHistory] = useState<any[]>([]);

    // Collapsed items state
    const [collapsedItems, setCollapsedItems] = useState<Record<string, boolean>>({});

    const toggleCollapse = (itemId: string | number) => {
        setCollapsedItems(prev => ({
            ...prev,
            [String(itemId)]: !prev[String(itemId)]
        }));
    };

    // --- useOrderItems hook ---
    const {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        duplicateItem
    } = useOrderItems([], budgetNumber);

    // Drag and drop reorder
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const reordered = Array.from(items);
        const [moved] = reordered.splice(result.source.index, 1);
        reordered.splice(result.destination.index, 0, moved);
        setItems(reordered);
    };

    // Cross-field validation: value without supplier OR supplier without value
    const validateItemsForAction = (approvedItems: any[]): boolean => {
        const costFields = [
            { key: 'custoPersonalizacao', suppKey: 'customization_supplier_id', label: 'Personalização' },
            { key: 'layoutCost', suppKey: 'layout_supplier_id', label: 'Layout' },
            { key: 'transpFornecedor', suppKey: 'transport_supplier_id', label: 'Frete Fornecedor' },
            { key: 'transpCliente', suppKey: 'client_transport_supplier_id', label: 'Frete Cliente' }
        ];
        for (const item of approvedItems) {
            const itemName = item.productName || 'Item sem produto';
            for (const field of costFields) {
                const hasValue = (item[field.key] || 0) > 0;
                const hasSupplier = !!item[field.suppKey];
                if (hasValue && !hasSupplier) {
                    toast.error(`"${itemName}": O campo "${field.label}" tem valor, mas o fornecedor não foi selecionado.`);
                    return false;
                }
                if (!hasValue && hasSupplier) {
                    toast.error(`"${itemName}": O fornecedor de "${field.label}" foi selecionado, mas o valor está em branco.`);
                    return false;
                }
            }
        }
        return true;
    };

    useEffect(() => {
        loadBaseData();
        if (id && id !== 'novo') {
            setActiveId(id);
            loadBudget(id);
        } else if (location.state?.clientData) {
            // New Budget from CRM
            const { clientData: cData, vendedor: vend } = location.state;

            // Try to find partner record if missing
            const fetchFullPartner = async (cData: any) => {
                let pid = cData.id;
                if (!pid) pid = await findPartnerId(cData);
                
                if (pid) {
                    const { data: partner } = await supabase.from('partners').select('*').eq('id', pid).single();
                    if (partner) {
                        setClientData({
                            id: partner.id,
                            name: partner.name,
                            doc: partner.doc || '',
                            phone: partner.phone || '',
                            email: partner.email || '',
                            emailFin: partner.financial_email || partner.email || ''
                        });
                    } else {
                        setClientData({ ...cData, emailFin: cData.email || '' });
                    }
                } else {
                    setClientData({ ...cData, emailFin: cData.email || '' });
                }
            };

            fetchFullPartner(cData);

            // For sellers, always use their own vendedor
            if (isSeller && userSalesperson) {
                setVendedor(userSalesperson);
            } else if (vend) {
                setVendedor(vend);
            }
            setIsClientLocked(true);

            // Auto-number placeholder
            setBudgetNumber('AUTO');
            setActiveId(undefined);
        } else if (!id || id === 'novo') {
            // Task: Restriction for sellers - only allow via CRM
            if (isSeller && !hasPermission('adm') && !hasPermission('gestao')) {
                toast.error('Vendedores só podem criar orçamentos através do CRM (Atendimentos).');
                navigate('/crm');
                return;
            }
            setBudgetNumber('AUTO');
            setActiveId(undefined);
        }
    }, [id, location.state]);

    // Set vendedor from auth when appUser loads
    useEffect(() => {
        if (userSalesperson && !vendedor) {
            setVendedor(userSalesperson);
        }
    }, [userSalesperson]);

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

    useEffect(() => {
        const handleFocus = () => loadBaseData();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const loadBaseData = async () => {
        const { data: c } = await supabase.from('partners').select('*').eq('type', 'CLIENTE').order('name');
        const { data: p } = await supabase.from('products').select('*').limit(50);
        // fetch all FORNECEDOR so we don't miss any due to category mismatch
        const { data: s } = await supabase.from('partners').select('*').eq('type', 'FORNECEDOR').order('name');
        const { data: f } = await supabase.from('calculation_factors').select('*');
        setClientsList(c || []);

        // Normalize and unify name properties
        const normalizedSuppliers = (s || []).map(sup => ({
            ...sup,
            name: sup.name || (sup as any).nome || 'Sem Nome'
        }));

        // Enrich product names with color to distinguish variations in dropdown
        const enrichedProducts = (p || []).map(prod => ({
            ...prod,
            name: prod.color ? `${prod.name} - ${prod.color}` : prod.name
        }));
        setProductsList(enrichedProducts);

        let suppliers = normalizedSuppliers;
        const required = ['XBZ', 'ASIA', 'SPOT'];
        const missing = required.filter(name => !suppliers.find((sup: any) => sup.name?.toUpperCase() === name));

        if (missing.length > 0) {
            for (const name of missing) {
                // Upsert one by one to prevent a single failure from failing the entire batch
                // Use a default doc string just in case it's required by the schema or RLS
                const { data: newSupplier, error } = await supabase.from('partners').upsert({
                    type: 'FORNECEDOR',
                    name: name,
                    supplier_category: 'PRODUTOS',
                    doc: `00.000.000/0001-${name === 'XBZ' ? '01' : name === 'ASIA' ? '02' : '03'}` // ensure uniqueness
                }, { onConflict: 'name', ignoreDuplicates: true }).select().maybeSingle();

                if (error) {
                    console.error(`Erro inserindo fornecedor padrão ${name}:`, error);
                    // Add via fake ID if it completely fails to insert
                    suppliers.push({
                        id: crypto.randomUUID(),
                        type: 'FORNECEDOR',
                        name: name,
                        supplier_category: 'PRODUTOS',
                        _isTemp: true
                    });
                } else if (newSupplier) {
                    suppliers.push(newSupplier);
                }
            }
        }

        // Assegurar que os nomes baseados em fontes de integração sejam case insensitive ao mapear list
        setSuppliersList(suppliers);
        // Organizar fatores conforme solicitado: Mínimo no topo, depois Ideal, Médio, Prazos
        let sortedFactors = f || [];
        const factorOrder = ["ideal", "médio", "médio", "mínimo", "minimo"];
        sortedFactors.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            const indexA = factorOrder.findIndex(o => nameA.includes(o));
            const indexB = factorOrder.findIndex(o => nameB.includes(o));

            if (indexA !== indexB) {
                const finalIndexA = indexA === -1 ? 999 : indexA;
                const finalIndexB = indexB === -1 ? 999 : indexB;
                return finalIndexA - finalIndexB;
            }

            // Se pertencerem à mesma categoria, o fator "limpo" (sem prazos) vem primeiro
            const isPlainA = !nameA.includes('-') && !nameA.includes('prazo');
            const isPlainB = !nameB.includes('-') && !nameB.includes('prazo');
            if (isPlainA && !isPlainB) return -1;
            if (!isPlainA && isPlainB) return 1;

            // Priorizar prazo 7/15 sobre 21/30
            const has715A = nameA.includes('7/15');
            const has715B = nameB.includes('7/15');
            if (has715A && !has715B) return -1;
            if (!has715A && has715B) return 1;

            return nameA.localeCompare(nameB);
        });

        setFactors(sortedFactors);

        // Se for orçamento novo e encontramos o fator médio (15% padrão), atualizar o fator dos itens
        if ((!id || id === 'novo') && items.length === 1 && items[0].productName === '') {
            const medioFactor = sortedFactors.find(sf => (sf.name || '').toLowerCase().includes('médio') && !sf.name?.toLowerCase().includes('prazo'));
            if (medioFactor) {
                const multiplier = 1 + (medioFactor.tax_percent + medioFactor.contingency_percent + medioFactor.margin_percent) / 100;
                setItems(prev => prev.map(it => ({ 
                    ...it, 
                    fator: multiplier,
                    mockMargin: medioFactor.margin_percent,
                    mockNF: medioFactor.tax_percent
                })));
            }
        }
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
            .limit(100);

        if (data) {
            // Do NOT group by code to preserve individual images per color
            const enriched = data.map(p => ({
                ...p,
                name: (p.color && !p.name.includes(p.color)) ? `${p.name} - ${p.color}` : p.name,
                displayImage: p.image_url || (p.images && p.images[0]) || p.image
            }));
            setProductsList(enriched);
        }
    };

    const loadBudget = async (idToLoad?: string) => {
        const targetId = idToLoad || activeId;
        if (!targetId) return;
        const { data, error } = await supabase.from('budgets').select('*, budget_items(*)').eq('id', targetId).single();
        if (data) {
            setBudgetNumber(data.budget_number);
            setVendedor(data.salesperson);
            setStatus(data.status);
            setDataOrcamento(data.created_at.split('T')[0]);
            setIssuer(data.issuer);

            // Fetch the last sent proposal for this budget
            const { data: lastProp } = await supabase
                .from('proposals')
                .select('last_sent_at')
                .eq('budget_id', targetId)
                .not('last_sent_at', 'is', null)
                .order('last_sent_at', { ascending: false })
                .limit(1)
                .single();
            
            if (lastProp) {
                setLastSentAt(lastProp.last_sent_at);
            } else {
                setLastSentAt(null);
            }
            // Load client directly from DB to avoid race condition with clientsList
            if (data.client_id) {
                const { data: clientRecord } = await supabase.from('partners').select('*').eq('id', data.client_id).single();
                if (clientRecord) {
                    setClientData({
                        id: clientRecord.id,
                        name: clientRecord.name,
                        doc: clientRecord.doc || '',
                        phone: clientRecord.phone || '',
                        email: clientRecord.email || '',
                        emailFin: clientRecord.financial_email || ''
                    });
                }
            }

            // Load commercial fields
            setValidity(data.validity || '15 dias');
            setShipping(data.shipping || 'Cliente retira');
            setDeliveryDeadline(data.delivery_deadline || '15 / 20 dias úteis');
            setPaymentMethod(data.payment_method || '50% na entrada + 50% no pedido pronto.');
            setObservation(data.observation || '');

            // Map items and fetch variations for each
            const mappedItems = await Promise.all(data.budget_items.map(async (it: any) => {
                // Fetch variations and main image if missing
                const { data: pData } = await supabase.from('products')
                    .select('variations, color, stock, image_url, images, code')
                    .eq('name', it.product_name)
                    .limit(10); // Find a few to aggregate variations if needed

                const allImgs = new Set<string>();
                const addVal = (ux: any) => { if (typeof ux === 'string' && ux.trim()) allImgs.add(ux); };

                if (it.product_image_url) addVal(it.product_image_url);

                let aggregatedVars: any[] = [];
                if (pData) {
                    pData.forEach(p => {
                        addVal(p.image_url);
                        if (p.images && Array.isArray(p.images)) p.images.forEach(addVal);

                        const vars = p.variations || [];
                        vars.forEach((v: any) => {
                            if (v.image) addVal(v.image);
                            if (!aggregatedVars.some(av => av.color === v.color)) aggregatedVars.push(v);
                        });
                        if (p.color && !aggregatedVars.some(av => av.color === p.color)) {
                            aggregatedVars.push({ color: p.color, stock: p.stock, image: p.image_url || (p.images && p.images[0]) });
                        }
                    });
                }
                
                // Final productImage check - if saved is null, try to find one
                let finalProdImg = it.product_image_url;
                if (!finalProdImg || !finalProdImg.trim()) {
                    finalProdImg = Array.from(allImgs)[0] || '';
                }

                const fator = it.calculation_factor || 1.35;
                const totalPct = Math.round((fator - 1) * 100);
                
                let mockNF = 14;
                let mockPayment = 0;
                let mockPaymentDesc = '50% + 50% (0%)';
                let mockMargin = totalPct - mockNF - mockPayment;
                
                // Try to deduce exact match to standard margins
                const standardMargins = [10, 15, 20];
                const paymentOptions = [
                    { val: 0, desc: '50% + 50% (0%)' },
                    { val: 0, desc: 'À vista (0%)' },
                    { val: 3, desc: '1x no Crédito (+3%)' },
                    { val: 4, desc: 'Até 15 dias (+4%)' },
                    { val: 8, desc: 'Até 30 dias (+8%)' }
                ];
                
                let foundMatch = false;
                for (const nf of [14, 0]) {
                    for (const margin of standardMargins) {
                        for (const pay of paymentOptions) {
                            if (nf + margin + pay.val === totalPct) {
                                mockNF = nf;
                                mockMargin = margin;
                                mockPayment = pay.val;
                                mockPaymentDesc = pay.desc;
                                foundMatch = true;
                                break;
                            }
                        }
                        if (foundMatch) break;
                    }
                    if (foundMatch) break;
                }
                
                // If no exact match to standard margins, just assume NF=14(or 0 if total is small) and no payment tax
                if (!foundMatch) {
                    if (totalPct < 14) mockNF = 0;
                    mockPayment = 0;
                    mockPaymentDesc = '50% + 50% (0%)';
                    mockMargin = totalPct - mockNF - mockPayment;
                }
                
                const isManualMargin = !standardMargins.includes(mockMargin);

                return {
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
                    extraPct: it.extra_pct || 0,
                    bvPct: it.bv_pct || 0,
                    fator: fator,
                    mockNF,
                    mockMargin,
                    mockPayment,
                    mockPaymentDesc,
                    isManualMargin,
                    factorId: (factors as any[] || []).find(fct => (1 + (fct.tax_percent + fct.contingency_percent + fct.margin_percent) / 100).toFixed(4) === (it.calculation_factor || 0).toFixed(4))?.id || '',
                    isApproved: it.is_approved,
                    customization_supplier_id: it.customization_supplier_id || '',
                    transport_supplier_id: it.transport_supplier_id || '',
                    client_transport_supplier_id: it.client_transport_supplier_id || '',
                    layout_supplier_id: it.layout_supplier_id || '',
                    extra_supplier_id: it.extra_supplier_id || '',
                    productDescription: it.product_description || '',
                    productColor: it.product_color || '',
                    productCode: it.product_code || (pData?.find(p => p.color === it.product_color)?.code) || (pData && pData[0]?.code) || '',
                    productImage: finalProdImg,
                    coverImage: finalProdImg,
                    availableImages: Array.from(allImgs),
                    variations: aggregatedVars
                };

            }));
            setItems(mappedItems);
        }
    };


    const saveBudget = async (silent = false, skipNavigate = false) => {
        if (isSavingRef.current || (loading && !silent)) return null;

        if (status === 'PROPOSTA ACEITA') {
            if (!silent) toast.error('Este orçamento já foi aprovado e convertido em pedido. Não é possível editá-lo.');
            return;
        }
        if (!budgetNumber || !vendedor || !clientData.name) {
            if (!silent) toast.error('Preencha os campos obrigatórios (Pedido, Vendedor, Cliente).');
            return;
        }
        if (silent && (!clientData.name || clientData.name === '')) return null;

        if (silent) {
            setIsAutoSaving(true);
        } else {
            setLoading(true);
        }
        isSavingRef.current = true;
        try {
            let finalBudgetNumber = budgetNumber;
            let currentId = activeId;
            if (budgetNumber === 'AUTO') {
                // Get next number from DB function
                const { data: numData, error: numError } = await supabase.rpc('get_next_budget_number');
                if (numError) throw numError;
                finalBudgetNumber = numData.toString();
            }

            // Ensure client exists - auto-create if needed
            let resolvedClientId = clientData.id;
            if (!resolvedClientId) {
                resolvedClientId = await findPartnerId(clientData);
            }
            if (!resolvedClientId && clientData.name) {
                // Auto-create client partner
                const { data: newPartner, error: partnerError } = await supabase.from('partners').insert([{
                    type: 'CLIENTE',
                    name: clientData.name,
                    doc: clientData.doc || null,
                    phone: clientData.phone || null,
                    email: clientData.email || null,
                    financial_email: clientData.emailFin || null
                }]).select().single();
                if (!partnerError && newPartner) {
                    resolvedClientId = newPartner.id;
                    setClientData({ ...clientData, id: newPartner.id });
                }
            }

            const payload = {
                budget_number: finalBudgetNumber,
                salesperson: vendedor || userSalesperson || 'Vendedor Padrão',
                status,
                client_id: resolvedClientId || null,
                issuer,
                total_amount: items.reduce((sum, it) => sum + calculateItemTotal(it), 0),
                validity,
                shipping,
                delivery_deadline: deliveryDeadline,
                payment_method: paymentMethod,
                observation
            };

            let budgetId = currentId;
            if (!currentId) {
                const { data, error } = await supabase.from('budgets').insert([payload]).select().single();
                if (error) throw error;
                budgetId = data.id;
                // Only update the state after successful insertion
                setBudgetNumber(finalBudgetNumber);
                setActiveId(budgetId);
            } else {
                const { error } = await supabase.from('budgets').update(payload).eq('id', currentId);
                if (error) throw error;
            }

            // Save items
            await supabase.from('budget_items').delete().eq('budget_id', budgetId);
            const itemsPayload = items.map(it => {
                const suppIndex = suppliersList.find(s => s.id === it.supplier_id);
                return {
                    budget_id: budgetId,
                    product_name: it.productName,
                    supplier_id: (suppIndex && suppIndex._isTemp) ? null : (it.supplier_id || null),
                    quantity: it.quantity,
                    unit_price: it.priceUnit,
                    customization_cost: it.custoPersonalizacao,
                    supplier_transport_cost: it.transpFornecedor,
                    client_transport_cost: it.transpCliente,
                    extra_expense: it.despesaExtra,
                    layout_cost: it.layoutCost,
                    calculation_factor: it.fator,
                    bv_pct: it.bvPct,
                    extra_pct: it.extraPct,
                    total_item_value: calculateItemTotal(it),
                    is_approved: it.isApproved,
                    customization_supplier_id: it.customization_supplier_id || null,
                    transport_supplier_id: it.transport_supplier_id || null,
                    client_transport_supplier_id: it.client_transport_supplier_id || null,
                    layout_supplier_id: it.layout_supplier_id || null,
                    extra_supplier_id: it.extra_supplier_id || null,
                    product_description: it.productDescription || null,
                    product_color: it.productColor || null,
                    product_code: it.productCode || null,
                    product_image_url: it.productImage || null
                };
            });
            if (items.length > 0) {
                const { error: itemsError } = await supabase.from('budget_items').insert(itemsPayload);
                if (itemsError) throw itemsError;
            }

            if (!silent) {
                toast.success('Orçamento salvo com sucesso!');
                if (!skipNavigate && (!id || id === 'novo')) {
                    navigate(`/orcamento/${budgetId}`, { replace: true });
                }
            }
            setLastSaved(new Date());

            // --- CRM SYNC LOGIC ---
            if (leadId) {
                const totalVal = items.reduce((sum, it) => sum + calculateItemTotal(it), 0);
                const leadUpdatePayload: any = {
                    client_name: clientData.name,
                    client_email: clientData.email,
                    client_phone: clientData.phone,
                    client_doc: clientData.doc,
                    estimated_value: totalVal,
                    updated_at: new Date().toISOString()
                };

                // Only move to ORCAMENTO if it's currently ATENDIMENTO
                const { data: currentLead } = await supabase.from('crm_leads').select('status, closing_metadata').eq('id', leadId).single();
                if (currentLead && currentLead.status === 'ATENDIMENTO') {
                    leadUpdatePayload.status = 'ORCAMENTO';
                }

                // Sync quoted_item if we have items
                if (items.length > 0 && items[0].productName) {
                    const newMetadata = { 
                        ...(currentLead?.closing_metadata || {}),
                        quoted_item: items[0].productName 
                    };
                    leadUpdatePayload.closing_metadata = newMetadata;
                }

                await supabase.from('crm_leads').update(leadUpdatePayload).eq('id', leadId);
            }

            return budgetId;
        } catch (e: any) {
            if (!silent) toast.error('Erro ao salvar: ' + e.message);
            else console.error('Auto-save error:', e.message);
            return null;
        } finally {
            if (silent) setIsAutoSaving(false);
            else setLoading(false);
            isSavingRef.current = false;
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (!activeId || budgetNumber === 'AUTO') return;

        const delayDebounceFn = setTimeout(() => {
            saveBudget(true);
        }, 1500);

        return () => clearTimeout(delayDebounceFn);
    }, [items, vendedor, status, dataOrcamento, dataPedido, issuer, clientData.id, clientData.emailFin, validity, shipping, deliveryDeadline, paymentMethod, observation, activeId]);

    const handleGenerateOrderClick = () => {
        if (!activeId || budgetNumber === 'AUTO') {
            toast.error('Salve o orçamento antes de gerar o pedido.');
            return;
        }

        const approvedItems = items.filter(it => it.isApproved);
        if (approvedItems.length === 0) {
            toast.error('Aprove pelo menos um item para gerar o pedido.');
            return;
        }

        if (!validateItemsForAction(approvedItems)) return;

        setCommercialData(prev => ({
            ...prev,
            payment_term: paymentMethod
        }));
        setIsCommercialModalOpen(true);
    };

    const handleGenerateProposal = async () => {
        setLoading(true);
        try {
            // Force save first - skipNavigate=true to keep us on the same page while the proposal generates
            const savedId = await saveBudget(false, true);
            if (!savedId) throw new Error('Falha ao salvar orçamento antes de gerar proposta');

            // Find current ID from state since navigate might happen after this function
            const currentBudgetId = savedId;
            const finalBudgetNumber = budgetNumber; // Should be updated by saveBudget

            const approvedItems = items.filter(it => it.isApproved);
            if (approvedItems.length === 0) {
                toast.error('Selecione ao menos um item aprovado para gerar a proposta.');
                setLoading(false);
                return;
            }

            if (!validateItemsForAction(approvedItems)) {
                setLoading(false);
                return;
            }

            // Snapshot of items with their final selling price + product metadata
            const productNames = approvedItems.map(it => it.productName).filter(Boolean);
            let productMap: Record<string, any> = {};
            if (productNames.length > 0) {
                const { data: productsData } = await supabase
                    .from('products')
                    .select('name, description, image_url, code, color')
                    .in('name', productNames);
                if (productsData) {
                    productsData.forEach((p: any) => { productMap[p.name] = p; });
                }
            }

            const itemsSnapshot = approvedItems.map(it => {
                const productMeta = productMap[it.productName] || {};
                const sellingPrice = Number((calculateItemTotal(it) / (it.quantity || 1)).toFixed(2));
                const itemTotalValue = sellingPrice * (it.quantity || 1);
                const selVar = productMeta.variations?.find?.((v: any) => v.color === it.productColor);
                const finalCode = it.productCode || (selVar ? (selVar.sku || selVar.code || selVar.reference) : null) || productMeta.code || (productMeta.variations && productMeta.variations.length > 0 ? (productMeta.variations[0].sku || productMeta.variations[0].code || productMeta.variations[0].reference) : '') || '';

                let fallbackDesc = productMeta.description ? productMeta.description.replace(/\\n/g, '<br>') : '';
                
                let descToSave = it.productDescription || fallbackDesc;

                return {
                    id: it.id,
                    product_name: finalCode ? `${it.productName} - Ref: ${finalCode}` : it.productName,
                    quantity: it.quantity,
                    unit_price: sellingPrice,
                    calculation_factor: it.fator,
                    total_item_value: itemTotalValue,
                    product_description: descToSave,
                    product_image_url: it.productImage || productMeta.image_url || '',
                    product_code: finalCode,
                    product_color: it.productColor || productMeta.color || ''
                };
            });

            const totalAmount = itemsSnapshot.reduce((sum, it) => sum + it.total_item_value, 0);

            // Calculate proposal number based on count of existing proposals for this budget
            const { count: proposalCount } = await supabase
                .from('proposals')
                .select('id', { count: 'exact', head: true })
                .eq('budget_id', activeId);

            const suffix = (proposalCount || 0) + 1;
            const finalProposalNumber = `${budgetNumber}-${suffix.toString().padStart(2, '0')}`;

            const { data, error } = await supabase
                .from('proposals')
                .insert([{
                    budget_id: activeId,
                    proposal_number: finalProposalNumber,
                    client_id: clientData.id || null,
                    salesperson: vendedor,
                    items: itemsSnapshot,
                    total_amount: totalAmount,
                    issuer: issuer,
                    validity: validity,
                    shipping: shipping,
                    delivery_deadline: deliveryDeadline,
                    payment_method: paymentMethod,
                    observation: observation
                }])
                .select()
                .single();

            if (error) throw error;

            toast.success('Proposta gerada com sucesso!');
            navigate(`/proposta/${data.id}`);
        } catch (error: any) {
            toast.error('Erro ao gerar proposta: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchProposalsHistory = async () => {
        if (!activeId || activeId === 'novo') {
            toast.info('Salve o orçamento para ver o histórico.');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*')
                .eq('budget_id', activeId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setProposalsHistory(data || []);
            setIsHistoryModalOpen(true);
        } catch (err: any) {
            toast.error('Erro ao carregar histórico: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmGenerateOrder = async () => {
        // Enforce validations for mandatory fields
        if (!commercialData.payment_term || !commercialData.shipping_deadline || !commercialData.entry_forecast_date) {
            toast.error('Preencha todos os campos obrigatórios (Faturamento, Limite Recebimento e Previsão Entrada).');
            return;
        }

        const approvedItems = items.filter(it => it.isApproved);
        const supplierIds = Array.from(new Set(approvedItems.map(it => it.supplier_id).filter(Boolean)));
        
        // Ensure all unique product suppliers have a departure date
        for (const suppId of supplierIds) {
            if (!commercialData.supplier_departure_dates?.[suppId]) {
                toast.error('Informe a data de saída para todos os fornecedores dos produtos.');
                return;
            }
        }

        setIsCommercialModalOpen(false);
        navigate('/pedido/novo', {
            state: {
                fromBudget: {
                    budgetId: activeId,
                    budgetNumber: budgetNumber,
                    issuer: issuer,
                    vendedor: vendedor,
                    clientData: clientData,
                    budget_date: dataOrcamento
                },
                items: approvedItems,
                commercialData: commercialData
            }
        });
    };

    const handleSaveSupplier = async () => {
        if (!newSupplier.name || !newSupplier.doc) {
            toast.error('Preencha Nome/Razão Social e CNPJ/CPF.');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.from('partners').insert([{
                type: 'FORNECEDOR',
                name: newSupplier.name,
                doc: newSupplier.doc,
                phone: newSupplier.phone,
                email: newSupplier.email,
                supplier_category: newSupplier.supplier_category
            }]).select().single();

            if (error) {
                if (error.code === '23505') throw new Error('Já existe um fornecedor com este Nome ou CPF/CNPJ.');
                throw error;
            }

            // Refresh lists so it appears in other items
            await loadBaseData();

            // Auto-select in the item that requested it
            if (supplierModalContext) {
                updateItem(supplierModalContext.itemId, supplierModalContext.field, data.id);
            }

            toast.success('Fornecedor cadastrado e selecionado!');
            setIsSupplierModalOpen(false);
            setNewSupplier({ name: '', doc: '', phone: '', email: '', supplier_category: 'PRODUTOS' });
            toast.success('Fornecedor adicionado com sucesso!');
        } catch (e: any) {
            toast.error('Erro ao adicionar fornecedor: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const duplicateBudget = async () => {
        if (!activeId || isSavingRef.current) return;
        if (!window.confirm('Deseja duplicar este orçamento?')) return;

        setLoading(true);
        isSavingRef.current = true;
        try {
            // Load full budget with items
            const { data: sourceBudget, error: loadError } = await supabase
                .from('budgets')
                .select('*, budget_items(*)')
                .eq('id', activeId)
                .single();

            if (loadError) throw loadError;

            // Get new number
            const { data: numData, error: numError } = await supabase.rpc('get_next_budget_number');
            const newNum = numData ? numData.toString() : 'AUTO';
            if (numError) throw numError;

            const payload = {
                budget_number: newNum,
                client_id: clientData.id || null,
                issuer,
                salesperson: vendedor || userSalesperson || 'Vendedor Padrão',
                status: 'EM ABERTO',
                validity,
                shipping,
                delivery_deadline: deliveryDeadline,
                payment_method: paymentMethod,
                observation,
                total_amount: items.reduce((sum, it) => sum + calculateItemTotal(it), 0),
                created_at: new Date().toISOString()
            };

            const { data: newBudget, error: createError } = await supabase.from('budgets').insert([payload]).select().single();
            if (createError) throw createError;

            // Copy items
            const itemsPayload = items.map(it => {
                const suppIndex = suppliersList.find(s => s.id === it.supplier_id);
                return {
                    budget_id: newBudget.id,
                    product_name: it.productName,
                    supplier_id: (suppIndex && suppIndex._isTemp) ? null : (it.supplier_id || null),
                    quantity: it.quantity,
                    unit_price: it.priceUnit,
                    customization_cost: it.custoPersonalizacao,
                    supplier_transport_cost: it.transpFornecedor,
                    client_transport_cost: it.transpCliente,
                    extra_expense: it.despesaExtra,
                    layout_cost: it.layoutCost,
                    calculation_factor: it.fator,
                    bv_pct: it.bvPct,
                    extra_pct: it.extraPct,
                    total_item_value: calculateItemTotal(it),
                    is_approved: false, // Reset approval on duplicate
                    customization_supplier_id: it.customization_supplier_id || null,
                    transport_supplier_id: it.transport_supplier_id || null,
                    client_transport_supplier_id: it.client_transport_supplier_id || null,
                    layout_supplier_id: it.layout_supplier_id || null,
                    extra_supplier_id: it.extra_supplier_id || null,
                    product_description: it.productDescription || null,
                    product_color: it.productColor || null,
                    product_code: it.productCode || null,
                    product_image_url: it.productImage || null
                };
            });

            if (items.length > 0) {
                await supabase.from('budget_items').insert(itemsPayload);
            }

            toast.success('Orçamento duplicado!');
            navigate(`/orcamento/${newBudget.id}`, { replace: true });
        } catch (error: any) {
            toast.error('Erro ao duplicar: ' + error.message);
            setLoading(false);
        }
    };

    const openSupplierModal = (itemId: string | number, field: string) => {
        setSupplierModalContext({ itemId, field });
        setIsSupplierModalOpen(true);
    };

    const statusBadgeColors: Record<string, string> = {
        'EM ABERTO': 'bg-[#F0FFF4] text-[#22543D] border-[#C6F6D5]',
        'EM NEGOCIAÇÃO': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'PROPOSTA ENVIADA': 'bg-blue-100 text-blue-700 border-blue-200',
        'PROPOSTA ACEITA': 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]',
        'PROPOSTA RECUSADA': 'bg-red-100 text-red-700 border-red-200',
        'CANCELADO': 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return (
        <div className="font-sans-budget min-h-screen bg-[var(--bg-page-budget)] pb-24">
            {/* HEADER FIXED/STICKY */}
            <header className="sticky top-[52px] z-40 bg-[var(--bg-surface-budget)] border-b border-[var(--border-subtle-budget)] px-6 py-3 flex justify-between items-center h-[56px]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/orcamentos')} className="text-[var(--text-secondary-budget)] hover:text-[var(--text-primary-budget)] transition-colors">
                        <span className="material-icons-outlined">arrow_back</span>
                    </button>
                    <div className="flex items-baseline gap-2">
                        <h1 className="text-[20px] font-[500] text-[var(--text-primary-budget)]">Editar orçamento</h1>
                        <span className="text-[14px] font-mono-budget bg-[var(--bg-muted-budget)] border border-[var(--border-subtle-budget)] px-2 py-0.5 rounded-[var(--radius-sm-budget)] text-[var(--text-secondary-budget)]">
                            #{budgetNumber || 'NOVO'}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="relative group">
                            <select
                                value={status}
                                onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    setStatus(newStatus);
                                    if (activeId) {
                                        await supabase.from('budgets').update({ status: newStatus }).eq('id', activeId);
                                        toast.success('Status atualizado!');
                                    }
                                }}
                                className={`
                                    appearance-none px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider
                                    border cursor-pointer transition-all pr-8
                                    ${getBudgetStatusStyle(status).colorClass}
                                `}
                            >
                                {Object.entries(BUDGET_STATUS_CONFIG).map(([key, config]) => (
                                    <option key={key} value={key} className="bg-white text-slate-900">
                                        {config.label}
                                    </option>
                                ))}
                            </select>
                            <span className="material-icons-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none opacity-40">expand_more</span>
                        </div>
                        {lastSentAt && (
                            <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1 uppercase tracking-tighter">
                                <span className="material-icons-outlined text-[10px]">mark_email_read</span>
                                Enviado: {new Date(lastSentAt).toLocaleDateString('pt-BR')} {new Date(lastSentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {activeId && (
                        <button onClick={duplicateBudget} disabled={loading} className="px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                            Duplicar
                        </button>
                    )}
                    {activeId && (
                        <button onClick={fetchProposalsHistory} className="px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                            Ver Propostas
                        </button>
                    )}
                    <button 
                        onClick={() => saveBudget(false)} 
                        disabled={loading} 
                        className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 active:scale-95"
                    >
                        {loading && !isAutoSaving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <span className="material-icons-outlined text-[18px]">save</span>}
                        Salvar
                    </button>
                    <button 
                        onClick={handleGenerateProposal} 
                        className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-slate-800 shadow-sm transition-all flex items-center gap-2 active:scale-95"
                    >
                        <span className="material-icons-outlined text-[18px]">picture_as_pdf</span>
                        Gerar Proposta
                    </button>
                    <button onClick={handleGenerateOrderClick} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-[13px] font-bold hover:bg-emerald-700 shadow-sm transition-all active:scale-95">
                        Gerar Pedido
                    </button>
                </div>
            </header>

            <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
                {/* SIDE-BY-SIDE HEADER INFO: COMMERCIAL + CLIENT */}
                {/* MODERNIZED HEADER INFO */}
                {/* MODERNIZED HEADER INFO - CLEAN & PROFESSIONAL */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    {/* COMMERCIAL INFO CARD */}
                    <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden grid grid-cols-2 divide-x divide-slate-100 divide-y md:divide-y-0">
                        <div className="p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons-outlined text-[16px] text-blue-500">receipt_long</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Orçamento</span>
                            </div>
                            <span className="text-[16px] font-black text-slate-900">#{budgetNumber || 'NOVO'}</span>
                        </div>
                        <div className="p-5 flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-icons-outlined text-[16px] text-slate-400">calendar_today</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Data Emissão</span>
                            </div>
                            <span className="text-[14px] font-bold text-slate-700">{new Date(dataOrcamento).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="col-span-2 p-5 bg-slate-50/50 border-t border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="material-icons-outlined text-[16px] text-slate-400">business</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Empresa Responsável</span>
                            </div>
                            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-2xl w-full">
                                {['CRISTAL', 'ESPIRITO', 'NATUREZA'].map((ent) => (
                                    <button
                                        key={ent}
                                        onClick={() => setIssuer(ent)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${
                                            issuer === ent 
                                            ? 'bg-slate-900 text-white shadow-lg scale-[1.02]' 
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {ent === 'CRISTAL' ? 'Cristal Brindes' : ent === 'ESPIRITO' ? 'Espírito Brindes' : 'Natureza Brindes'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CLIENT INFO CARD */}
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row">
                        <div className="flex-[4] p-6 border-b md:border-b-0 md:border-r border-slate-100 bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <span className="material-icons-outlined text-[18px] text-blue-600">person</span>
                                    </div>
                                    <div>
                                        <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-widest leading-none">Cliente Selecionado</h4>
                                        {clientData.email && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <span className="material-icons-outlined text-[10px] text-blue-400">alternate_email</span>
                                                <span className="text-[11px] font-medium text-blue-500 lowercase">{clientData.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="relative group">
                                <CustomSelect
                                    options={clientsList}
                                    onSelect={(c: any) => setClientData({ 
                                        id: c.id, 
                                        name: c.name, 
                                        doc: c.doc || '', 
                                        phone: c.phone || '', 
                                        email: c.email || '', 
                                        emailFin: c.financial_email || c.email || '' 
                                    })}
                                    placeholder="Comece a digitar o nome do cliente..."
                                    value={clientData.name}
                                    onAdd={() => navigate('/cadastros/novo')}
                                    disabled={isClientLocked}
                                />
                                {clientData.id && (
                                    <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <span className="material-icons-outlined text-sm">badge</span>
                                            <span className="text-xs font-bold uppercase">{clientData.doc || 'SEM DOC'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500 border-l border-slate-200 pl-4">
                                            <span className="material-icons-outlined text-sm">call</span>
                                            <span className="text-xs font-bold">{clientData.phone || 'SEM TELEFONE'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex-[3] flex flex-col p-6 bg-slate-50/30 justify-between">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-icons-outlined text-[16px] text-slate-400">person_outline</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vendedor Responsável</span>
                                    </div>
                                    <span className="block text-[14px] font-bold text-slate-800">{vendedor || '—'}</span>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-icons-outlined text-[16px] text-slate-400">account_balance_wallet</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">E-mail Financeiro</span>
                                    </div>
                                    <span className="block text-[13px] font-bold text-slate-700 truncate hover:text-clip" title={clientData.emailFin}>
                                        {clientData.emailFin || '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#D0D3D6] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#D0D3D6]">
                    <div className="grid grid-cols-1 md:grid-cols-4 divide-x divide-[#D0D3D6]">
                        {[
                            { label: 'Validade da Proposta', value: validity, setter: setValidity, icon: 'timer', list: 'validity-options' },
                            { label: 'Logística / Frete', value: shipping, setter: setShipping, icon: 'local_shipping', list: 'shipping-options' },
                            { label: 'Prazo de Entrega', value: deliveryDeadline, setter: setDeliveryDeadline, icon: 'event_available', list: 'delivery-options' },
                            { label: 'Forma de Pagamento', value: paymentMethod, setter: setPaymentMethod, icon: 'payments', list: 'payment-options' }
                        ].map(cond => (
                            <div key={cond.label} className="p-4 hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="material-icons-outlined text-[14px] text-slate-400">{cond.icon}</span>
                                    <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest">{cond.label}</label>
                                </div>
                                <input 
                                    className="w-full bg-transparent border-none p-0 text-[13px] font-bold text-slate-700 focus:ring-0"
                                    value={cond.value}
                                    onChange={e => cond.setter(e.target.value)}
                                    disabled={status === 'PROPOSTA ACEITA'}
                                    list={cond.list}
                                />
                                 {cond.list === 'validity-options' && (
                                    <datalist id="validity-options">
                                        <option value="5 dias" />
                                        <option value="7 dias" />
                                        <option value="10 dias" />
                                        <option value="15 dias" />
                                        <option value="20 dias" />
                                        <option value="30 dias" />
                                    </datalist>
                                )}
                                {cond.list === 'shipping-options' && (
                                    <datalist id="shipping-options">
                                        <option value="Frete incluso para Grande Vitória, exceto Guarapari." />
                                        <option value="Cliente retira" />
                                        <option value="Frete incluso" />
                                        <option value="Frete por parte do cliente." />
                                    </datalist>
                                )}
                                {cond.list === 'delivery-options' && (
                                    <datalist id="delivery-options">
                                        <option value="2/3 Dias Úteis" />
                                        <option value="7 Dias Úteis" />
                                        <option value="10 Dias Úteis" />
                                        <option value="15 Dias Úteis" />
                                        <option value="15/20 Dias Úteis" />
                                        <option value="25 Dias Úteis" />
                                        <option value="30 Dias Úteis." />
                                    </datalist>
                                )}
                                {cond.list === 'payment-options' && (
                                    <datalist id="payment-options">
                                        <option value="50% na entrada + 50% no pedido pronto." />
                                        <option value="À vista" />
                                        <option value="1x no cartão de crédito" />
                                        <option value="7 dias faturados" />
                                        <option value="10 dias Faturados" />
                                        <option value="15 Dias Faturados" />
                                        <option value="20 Dias Faturados" />
                                        <option value="30 Dias Faturados." />
                                    </datalist>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-[#F8F8F8]/50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-icons-outlined text-[14px] text-slate-400">rate_review</span>
                            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-widest">Observações Gerais (Aparecerão na Proposta)</label>
                        </div>
                        <textarea 
                            className="w-full bg-transparent border-none p-0 text-[13px] font-medium text-slate-600 focus:ring-0 min-h-[60px] resize-none"
                            value={observation}
                            onChange={e => setObservation(e.target.value)}
                            placeholder="Adicione observações importantes para esta proposta..."
                            disabled={status === 'PROPOSTA ACEITA'}
                        />
                    </div>
                </div>



                {/* ITEMS SECTION */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[12px] font-[500] text-[var(--text-secondary-budget)] uppercase tracking-[0.06em] flex items-center gap-2">
                            <span className="material-icons-outlined text-sm">inventory_2</span> 
                            Itens do Orçamento
                            <span className="bg-[var(--bg-muted-budget)] text-[var(--text-tertiary-budget)] px-2 py-0.5 rounded text-[10px] font-mono-budget">{items.length} itens</span>
                        </h3>
                    </div>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="items">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                                    {items.map((it, idx) => (
                                        <BudgetItemCard
                                            key={String(it.id)}
                                            it={it}
                                            idx={idx}
                                            status={status}
                                            updateItem={updateItem}
                                            removeItem={removeItem}
                                            duplicateItem={duplicateItem}
                                            productsList={productsList}
                                            suppliersList={suppliersList}
                                            searchProducts={searchProducts}
                                            CustomSelect={CustomSelect}
                                            onAddSupplier={openSupplierModal}
                                        />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[var(--border-subtle-budget)] rounded-[var(--radius-lg-budget)] bg-[var(--bg-muted-budget)]">
                            <span className="material-icons-outlined text-4xl text-[var(--text-tertiary-budget)] mb-4">inventory_2</span>
                            <p className="text-[var(--text-secondary-budget)] font-[500]">Nenhum item adicionado ao orçamento</p>
                            <button onClick={addItem} className="mt-4 text-[var(--color-accent-budget)] font-[500] hover:underline">Clique para adicionar o primeiro item</button>
                        </div>
                    )}

                    <button 
                        onClick={addItem} 
                        disabled={status === 'PROPOSTA ACEITA'}
                        className="w-full py-4 border-2 border-dashed border-[var(--border-medium-budget)] rounded-[var(--radius-lg-budget)] text-[var(--text-tertiary-budget)] hover:bg-[var(--bg-muted-budget)] hover:text-[var(--text-secondary-budget)] transition-all flex items-center justify-center gap-2 group"
                    >
                        <span className="material-icons-outlined group-hover:scale-110 transition-transform">add_circle</span>
                        <span className="text-[13px] font-[400]">Adicionar novo item</span>
                    </button>
                </div>


            </div>



            <GenerateOrderModal
                isOpen={isCommercialModalOpen}
                onClose={() => setIsCommercialModalOpen(false)}
                commercialData={commercialData}
                setCommercialData={setCommercialData}
                onConfirm={confirmGenerateOrder}
                loading={loading}
                approvedItems={items.filter(it => it.isApproved)}
                suppliersList={suppliersList}
            />

            <QuickSupplierModal
                isOpen={isSupplierModalOpen}
                onClose={() => setIsSupplierModalOpen(false)}
                newSupplier={newSupplier}
                setNewSupplier={setNewSupplier}
                onSave={handleSaveSupplier}
                loading={loading}
            />

            <ProposalsHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                proposals={proposalsHistory}
            />
        </div>
    );
};

export default BudgetForm;
