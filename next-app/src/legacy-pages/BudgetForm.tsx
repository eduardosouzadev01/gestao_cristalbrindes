import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
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
    const [loading, setLoading] = useState(false);
    const isSavingRef = useRef(false);
    const { appUser } = useAuth();
    const userSalesperson = appUser?.salesperson || '';
    const isSeller = !!appUser?.salesperson;
    const [activeId, setActiveId] = useState<string | undefined>(id === 'novo' ? undefined : id);

    // States
    const [budgetNumber, setBudgetNumber] = useState('');
    const [vendedor, setVendedor] = useState(userSalesperson);
    const [status, setStatus] = useState('EM ABERTO');
    const [dataOrcamento, setDataOrcamento] = useState(getTodayISO());
    const [dataPedido, setDataPedido] = useState(getTodayISO()); // Prediction
    const [issuer, setIssuer] = useState('CRISTAL');
    const [clientData, setClientData] = useState({ id: '', name: '', doc: '', phone: '', email: '', emailFin: '' });

    // Commercial data (Proposal terms)
    const [validity, setValidity] = useState('15 dias');
    const [shipping, setShipping] = useState('Cliente retira');
    const [deliveryDeadline, setDeliveryDeadline] = useState('15 / 20 dias úteis');
    const [paymentMethod, setPaymentMethod] = useState('À vista ou parcelado');
    const [observation, setObservation] = useState('');

    // Lists
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [suppliersList, setSuppliersList] = useState<any[]>([]);
    const [factors, setFactors] = useState<any[]>([]);

    const location = useLocation();
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

    // --- useOrderItems hook ---
    const {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        duplicateItem
    } = useOrderItems([]);

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

            // Try to find partner ID if missing
            if (!cData.id) {
                findPartnerId(cData).then(foundId => {
                    setClientData({ ...cData, id: foundId || '' });
                });
            } else {
                setClientData(cData);
            }

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

    const loadBaseData = async () => {
        const { data: c } = await supabase.from('partners').select('*').eq('type', 'CLIENTE');
        const { data: p } = await supabase.from('products').select('*').limit(50);
        // fetch all FORNECEDOR so we don't miss any due to category mismatch
        const { data: s } = await supabase.from('partners').select('*').eq('type', 'FORNECEDOR');
        const { data: f } = await supabase.from('calculation_factors').select('*');
        setClientsList(c || []);

        // Enrich product names with color to distinguish variations in dropdown
        const enrichedProducts = (p || []).map(prod => ({
            ...prod,
            name: prod.color ? `${prod.name} - ${prod.color}` : prod.name
        }));
        setProductsList(enrichedProducts);

        let suppliers = s || [];
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
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const indexA = factorOrder.findIndex(o => nameA.includes(o));
            const indexB = factorOrder.findIndex(o => nameB.includes(o));

            if (indexA !== indexB) {
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
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

        // Se for orçamento novo e encontramos o fator ideal, atualizar o fator dos itens
        if ((!id || id === 'novo') && items.length === 1 && items[0].productName === '') {
            const idealFactor = sortedFactors.find(sf => sf.name.toLowerCase().includes('ideal'));
            if (idealFactor) {
                const multiplier = 1 + (idealFactor.tax_percent + idealFactor.contingency_percent + idealFactor.margin_percent) / 100;
                setItems(prev => prev.map(it => ({ ...it, fator: multiplier })));
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
                name: p.color ? `${p.name} - ${p.color}` : p.name
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
            setPaymentMethod(data.payment_method || 'À vista ou parcelado');
            setObservation(data.observation || '');

            // Map items and fetch variations for each
            const mappedItems = await Promise.all(data.budget_items.map(async (it: any) => {
                // Fetch variations and main image if missing
                const { data: pData } = await supabase.from('products')
                    .select('variations, color, stock, image_url, code')
                    .eq('name', it.product_name)
                    .limit(10); // Find a few to aggregate variations if needed

                let aggregatedVars: any[] = [];
                if (pData) {
                    pData.forEach(p => {
                        const vars = p.variations || [];
                        vars.forEach((v: any) => {
                            if (!aggregatedVars.some(av => av.color === v.color)) aggregatedVars.push(v);
                        });
                        if (p.color && !aggregatedVars.some(av => av.color === p.color)) {
                            aggregatedVars.push({ color: p.color, stock: p.stock });
                        }
                    });
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
                    productImage: it.product_image_url || (pData?.find(p => p.color === it.product_color)?.image_url) || (pData && pData[0]?.image_url) || '',
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
                salesperson: vendedor,
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
                return {
                    id: it.id,
                    product_name: it.productName,
                    quantity: it.quantity,
                    unit_price: sellingPrice,
                    calculation_factor: it.fator,
                    total_item_value: itemTotalValue,
                    product_description: it.productDescription || productMeta.description || '',
                    product_image_url: it.productImage || productMeta.image_url || '',
                    product_code: it.productCode || productMeta.code || '',
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
                    supplier_id: (suppIndex && suppIndex._isTemp) ? null : it.supplier_id,
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
                    is_approved: false, // Reset approval on duplicate
                    product_description: it.productDescription,
                    product_color: it.productColor
                };
            });

            if (items.length > 0) {
                await supabase.from('budget_items').insert(itemsPayload);
            }

            toast.success('Orçamento duplicado!');
            navigate(`/ orcamento / ${newBudget.id} `);
            window.location.reload(); // Force reload to clear state if needed
        } catch (error: any) {
            toast.error('Erro ao duplicar: ' + error.message);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <button onClick={() => navigate('/orcamentos')} className="mr-3 p-1.5 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                        <span className="material-icons-outlined text-lg">arrow_back</span>
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                        <span className="material-icons-outlined text-blue-500 text-2xl">description</span>
                        {activeId ? 'EDITAR ORÇAMENTO' : 'NOVO ORÇAMENTO'}
                    </h2>
                </div>
                <div className="flex gap-2 items-center">
                    {status === 'PROPOSTA ACEITA' ? (
                        <div className="flex gap-2">
                            <button onClick={duplicateBudget} disabled={loading} className="px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all uppercase flex items-center gap-1">
                                <span className="material-icons-outlined text-sm">content_copy</span> Duplicar
                            </button>
                            <button disabled className="px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 cursor-not-allowed uppercase flex items-center gap-1">
                                <span className="material-icons-outlined text-sm">lock</span> Pedido Gerado
                            </button>
                        </div>
                    ) : (
                        <>
                            <button onClick={duplicateBudget} disabled={loading} className="h-9 px-4 rounded-lg shadow-sm text-[10px] font-black text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all uppercase flex items-center justify-center gap-2 active:scale-95 leading-none">
                                <span className="material-icons-outlined text-base">content_copy</span>
                                Duplicar
                            </button>
                            <button onClick={() => saveBudget(false)} disabled={loading} className="h-9 px-6 rounded-lg shadow-sm text-[10px] font-black text-white bg-green-600 hover:bg-green-700 transition-all uppercase flex items-center justify-center gap-2 active:scale-95 leading-none">
                                <span className="material-icons-outlined text-base">save</span>
                                {loading && !isAutoSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                            <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all group">
                                <button 
                                    onClick={fetchProposalsHistory} 
                                    className="h-9 px-3 bg-gray-50/30 hover:bg-blue-50 transition-all text-gray-400 hover:text-blue-500 flex items-center justify-center border-r border-gray-200 group/hist" 
                                    title="Ver Histórico de Propostas"
                                >
                                    <span className="material-icons-outlined text-[18px] group-hover/hist:rotate-[-15deg] transition-transform">history</span>
                                </button>
                                <button 
                                    onClick={handleGenerateProposal} 
                                    className="h-9 px-4 text-[10px] font-black text-gray-700 hover:bg-gray-50/50 transition-all uppercase flex items-center justify-center gap-2 active:scale-95 leading-none bg-white group/pdf"
                                >
                                    <span className="material-icons-outlined text-[18px] text-blue-500 group-hover/pdf:scale-110 transition-transform">picture_as_pdf</span>
                                    Proposta
                                </button>
                            </div>
                            <button onClick={handleGenerateOrderClick} className="h-9 px-4 rounded-lg shadow-sm text-[10px] font-black text-white bg-blue-500 hover:bg-blue-600 transition-all uppercase flex items-center justify-center gap-2 active:scale-95 leading-none">
                                <span className="material-icons-outlined text-base">shopping_cart</span>
                                Gerar Pedido
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
                {/* Informações Gerais */}
                <section className="col-span-12 xl:col-span-5 bg-white shadow-sm rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-1">
                        <span className="material-icons-outlined text-blue-500 text-sm">info</span>
                        <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Geral</h3>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-blue-600 uppercase mb-0.5">Nº Orçamento</label>
                            <input
                                className={`form-input block w-full text-center rounded border-gray-300 font-bold py-1 text-xs ${budgetNumber === 'AUTO' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
                                placeholder="AUTO"
                                value={budgetNumber || ''}
                                readOnly={budgetNumber === 'AUTO' || !!activeId || status === 'PROPOSTA ACEITA'}
                                onChange={e => setBudgetNumber(e.target.value)}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Vendedor</label>
                            <select
                                className={`form-select block w-full py-1 rounded text-xs font-bold border-gray-300 ${isSeller ? 'bg-gray-50 text-gray-500' : ''}`}
                                value={vendedor}
                                onChange={e => setVendedor(e.target.value)}
                                disabled={status === 'PROPOSTA ACEITA' || isSeller}
                            >
                                <option value="">...</option>
                                <option value="VENDAS 01">V01</option>
                                <option value="VENDAS 02">V02</option>
                                <option value="VENDAS 03">V03</option>
                                <option value="VENDAS 04">V04</option>
                                <option value="VENDAS 05">V05</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Status</label>
                            <select className="form-select block w-full py-1 rounded text-xs border-gray-300 font-medium" value={status || ''} onChange={e => setStatus(e.target.value)} disabled={status === 'PROPOSTA ACEITA'}>
                                <option value="EM ABERTO">ABERTO</option>
                                <option value="EM NEGOCIAÇÃO">NEGOC.</option>
                                <option value="PROPOSTA ENVIADA">ENVIADA</option>
                                <option value="PROPOSTA ACEITA">ACEITA</option>
                                <option value="PROPOSTA RECUSADA">RECUS.</option>
                                <option value="CANCELADO">CANCEL.</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Data</label>
                            <input type="date" className="form-input block w-full py-1 rounded text-xs border-gray-300" value={dataOrcamento || ''} onChange={e => setDataOrcamento(e.target.value)} disabled={status === 'PROPOSTA ACEITA'} />
                        </div>
                        <div className="col-span-12 mt-1">
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded border border-gray-100">
                                <span className="text-[9px] font-bold text-gray-400 uppercase mr-2">Emitente:</span>
                                <div className="flex gap-1.5 flex-1">
                                    {['CRISTAL', 'ESPIRITO', 'NATUREZA'].map(op => (
                                        <button
                                            key={op}
                                            onClick={() => setIssuer(op)}
                                            className={`flex-1 py-1 px-2 border rounded font-black text-[9px] transition-all uppercase ${issuer === op ? 'border-blue-500 bg-blue-500 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'} ${status === 'PROPOSTA ACEITA' ? 'opacity-50' : ''}`}
                                            disabled={status === 'PROPOSTA ACEITA'}
                                        >
                                            {op === 'ESPIRITO' ? 'ESPÍRITO' : op === 'CRISTAL' ? 'CRISTAL' : 'NATUREZA'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Dados do Cliente */}
                <section className="col-span-12 xl:col-span-7 bg-white shadow-sm rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-1">
                        <span className="material-icons-outlined text-blue-500 text-sm">person</span>
                        <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Cliente</h3>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                            <CustomSelect
                                label="Nome / Razão Social"
                                options={clientsList}
                                onSelect={c => setClientData({ id: c.id, name: c.name, doc: c.doc, phone: c.phone, email: c.email, emailFin: c.financial_email })}
                                onAdd={() => navigate('/cadastros')}
                                value={clientData.name}
                                disabled={isClientLocked || status === 'PROPOSTA ACEITA'}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">CNPJ / CPF</label>
                            <input className="form-input w-full rounded border-gray-200 text-xs bg-gray-50 py-1 font-mono" value={clientData.doc || ''} readOnly />
                        </div>
                        <div className="col-span-4">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Celular / WhatsApp</label>
                            <input className="form-input w-full rounded border-gray-200 text-xs bg-gray-50 py-1" value={clientData.phone || ''} readOnly />
                        </div>
                        <div className="col-span-6">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">E-mail Comercial</label>
                            <input className="form-input w-full rounded border-gray-200 text-xs bg-gray-50 py-1" value={clientData.email || ''} readOnly />
                        </div>
                        <div className="col-span-6">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">E-mail Financeiro</label>
                            <input className="form-input w-full rounded border-gray-200 text-xs py-1" value={clientData.emailFin || ''} onChange={e => setClientData({ ...clientData, emailFin: e.target.value })} disabled={status === 'PROPOSTA ACEITA'} />
                        </div>
                    </div>
                </section>
            </div>

            {/* Itens */}
            <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-icons-outlined text-sm">inventory_2</span> Itens do Orçamento
                    </h3>
                    <div className="text-[10px] font-bold text-gray-400">
                        Total Geral: <span className="text-blue-600 text-sm font-black">{formatCurrency(items.reduce((sum, it) => sum + calculateItemTotal(it), 0))}</span>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="budget-items">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-6 pt-2 pb-6">
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
                                        onAddSupplier={(itemId, field) => {
                                            setSupplierModalContext({ itemId, field });
                                            setIsSupplierModalOpen(true);
                                        }}
                                    />
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {status !== 'PROPOSTA ACEITA' ? (
                    <button onClick={addItem} className="w-full py-2.5 border-2 border-dashed border-blue-200 rounded-lg text-blue-500 font-black text-xs uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-icons-outlined text-base">add_circle</span> Adicionar Novo Item
                    </button>
                ) : (
                    <div className="w-full py-2.5 border-2 border-dashed border-gray-100 rounded-lg text-gray-400 font-bold text-[10px] uppercase flex items-center justify-center gap-2 bg-gray-50 italic">
                        <span className="material-icons-outlined text-sm">lock</span> Edição bloqueada por aprovação
                    </div>
                )}
            </section>

            {/* Commercial terms at the end of the page */}
            <section className="bg-white shadow-sm rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2">
                    <span className="material-icons-outlined text-blue-500 text-sm">assignment</span>
                    <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Condições da Proposta</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-3 bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Validade da proposta</label>
                        <input
                            className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0"
                            value={validity}
                            onChange={(e) => setValidity(e.target.value)}
                            disabled={status === 'PROPOSTA ACEITA'}
                        />
                    </div>
                    <div className="border rounded-lg p-3 bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Frete</label>
                        <input
                            className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0"
                            value={shipping}
                            onChange={(e) => setShipping(e.target.value)}
                            disabled={status === 'PROPOSTA ACEITA'}
                        />
                    </div>
                    <div className="border rounded-lg p-3 bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Prazo de entrega</label>
                        <input
                            className="w-full bg-transparent border-none p-0 text-sm font-bold focus:ring-0"
                            value={deliveryDeadline}
                            onChange={(e) => setDeliveryDeadline(e.target.value)}
                            disabled={status === 'PROPOSTA ACEITA'}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3 bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Forma de Pagamento</label>
                        <select
                            className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            disabled={status === 'PROPOSTA ACEITA'}
                        >
                            <option value="À vista ou parcelado">À vista ou parcelado</option>
                            <option value="50% + 50%">50% + 50%</option>
                            <option value="À Vista">À Vista</option>
                            <option value="Credito à vista">Credito à vista</option>
                            <option value="Faturado 7 dias">Faturado 7 dias</option>
                            <option value="Faturado 14 dias">Faturado 14 dias</option>
                            <option value="Faturado 15 dias">Faturado 15 dias</option>
                            <option value="Faturado 21 dias">Faturado 21 dias</option>
                            <option value="Faturado 30 dias">Faturado 30 dias</option>
                            <option value="Faturado 45 dias">Faturado 45 dias</option>
                        </select>
                    </div>
                    <div className="border rounded-lg p-3 bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                        <label className="block text-[9px] font-black uppercase text-gray-400 mb-1">Observações</label>
                        <input
                            className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0"
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            disabled={status === 'PROPOSTA ACEITA'}
                        />
                    </div>
                </div>
            </section>

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
