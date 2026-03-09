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
                        {(() => {
                            const hasCategories = filtered.some(o => o.supplier_category);
                            if (hasCategories && filtered.length > 0) {
                                const categories = Array.from(new Set(filtered.map(o => o.supplier_category).filter(Boolean)));
                                return categories.map(cat => (
                                    <div key={cat as string}>
                                        <div className="px-4 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 uppercase tracking-widest border-y border-blue-100">{cat === 'GRAVACOES' ? 'PERSONALIZAÇÃO' : (cat as string)}</div>
                                        {filtered.filter(o => o.supplier_category === cat).map(opt => (
                                            <div key={opt.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between group" onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}>
                                                <span className="text-gray-700">{opt.name}</span>
                                                {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ));
                            }
                            return filtered.map(opt => (
                                <div key={opt.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between group" onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}>
                                    <span className="text-gray-700">{opt.name}</span>
                                    {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
                                </div>
                            ));
                        })()}
                        {filtered.length === 0 && (
                            <div className="px-4 py-2 text-xs text-gray-400 italic">
                                {label.includes('Fornecedor') ? 'Nenhum fornecedor encontrado.' : 'Nenhum item encontrado.'}
                            </div>
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
    const { appUser } = useAuth();
    const userSalesperson = appUser?.salesperson || '';
    const isSeller = !!appUser?.salesperson;

    // States
    const [budgetNumber, setBudgetNumber] = useState('');
    const [vendedor, setVendedor] = useState(userSalesperson);
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

    // Auto-save states
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const isInitialMount = useRef(true);

    // Commercial data state
    const [isCommercialModalOpen, setIsCommercialModalOpen] = useState(false);
    const [commercialData, setCommercialData] = useState({
        payment_term: '',
        supplier_deadline: '',
        shipping_deadline: '',
        invoice_number: '',
        purchase_order: '',
        layout_info: '',
        entry_forecast_date: '',
        remaining_forecast_date: '',
        supplier_payment_dates: {} as Record<string, string>
    });

    // Supplier modal state
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ name: '', doc: '', phone: '', email: '', supplier_category: 'PRODUTOS' });

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
            loadBudget();
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
        } else if (!id || id === 'novo') {
            setBudgetNumber('AUTO');
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
        setProductsList(p || []);

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
                bvPct: it.bv_pct || 0,
                extraPct: it.extra_pct || 0,
                isApproved: it.is_approved,
                customization_supplier_id: it.customization_supplier_id || '',
                transport_supplier_id: it.transport_supplier_id || '',
                client_transport_supplier_id: it.client_transport_supplier_id || '',
                layout_supplier_id: it.layout_supplier_id || '',
                extra_supplier_id: it.extra_supplier_id || ''
            })));
        }
    };


    const saveBudget = async (silent = false) => {
        if (status === 'PROPOSTA ACEITA') {
            if (!silent) toast.error('Este orçamento já foi aprovado e convertido em pedido. Não é possível editá-lo.');
            return;
        }
        if (!budgetNumber || !vendedor || !clientData.name) {
            if (!silent) toast.error('Preencha os campos obrigatórios (Pedido, Vendedor, Cliente).');
            return;
        }
        if (silent) {
            setIsAutoSaving(true);
        } else {
            setLoading(true);
        }
        try {
            let finalBudgetNumber = budgetNumber;
            let currentId = id;
            if (budgetNumber === 'AUTO') {
                if (silent) return; // Não autossalva orçamentos novos até o salvamento manual
                // Get next number from DB function
                const { data: numData, error: numError } = await supabase.rpc('get_next_budget_number');
                if (numError) throw numError;
                finalBudgetNumber = numData.toString();
                setBudgetNumber(finalBudgetNumber);
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
                total_amount: items.reduce((sum, it) => sum + calculateItemTotal(it), 0)
            };

            let budgetId = currentId;
            if (!currentId || currentId === 'novo') {
                const { data, error } = await supabase.from('budgets').insert([payload]).select().single();
                if (error) throw error;
                budgetId = data.id;
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
                    extra_supplier_id: it.extra_supplier_id || null
                };
            });
            if (items.length > 0) {
                const { error: itemsError } = await supabase.from('budget_items').insert(itemsPayload);
                if (itemsError) throw itemsError;
            }

            if (!silent) {
                toast.success('Orçamento salvo com sucesso!');
                if (!id || id === 'novo') {
                    navigate(`/orcamento/${budgetId}`, { replace: true });
                }
            }
            setLastSaved(new Date());
        } catch (e: any) {
            if (!silent) toast.error('Erro ao salvar: ' + e.message);
            else console.error('Auto-save error:', e.message);
        } finally {
            if (silent) setIsAutoSaving(false);
            else setLoading(false);
        }
    };

    // Auto-save effect
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (!id || id === 'novo' || budgetNumber === 'AUTO') return;

        const delayDebounceFn = setTimeout(() => {
            saveBudget(true);
        }, 1500);

        return () => clearTimeout(delayDebounceFn);
    }, [items, vendedor, status, dataOrcamento, dataPedido, issuer, clientData.id, clientData.emailFin]);

    const handleGenerateOrderClick = () => {
        if (!id || budgetNumber === 'AUTO') {
            toast.error('Salve o orçamento antes de gerar o pedido.');
            return;
        }

        const approvedItems = items.filter(it => it.isApproved);
        if (approvedItems.length === 0) {
            toast.error('Aprove pelo menos um item para gerar o pedido.');
            return;
        }

        if (!validateItemsForAction(approvedItems)) return;

        setIsCommercialModalOpen(true);
    };

    const handleGenerateProposal = async () => {
        if (!id || budgetNumber === 'AUTO') {
            toast.error('Salve o orçamento antes de gerar a proposta.');
            return;
        }

        const approvedItems = items.filter(it => it.isApproved);
        if (approvedItems.length === 0) {
            toast.error('Selecione pelo menos um item (marcando "Aprovar Item") para gerar a proposta.');
            return;
        }

        if (!validateItemsForAction(approvedItems)) return;

        setLoading(true);
        try {
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
                return {
                    id: it.id,
                    product_name: it.productName,
                    quantity: it.quantity,
                    unit_price: it.priceUnit,
                    calculation_factor: it.fator,
                    total_item_value: calculateItemTotal(it),
                    product_description: productMeta.description || '',
                    product_image_url: productMeta.image_url || '',
                    product_code: productMeta.code || '',
                    product_color: productMeta.color || ''
                };
            });

            const totalAmount = itemsSnapshot.reduce((sum, it) => sum + it.total_item_value, 0);

            const { data, error } = await supabase
                .from('proposals')
                .insert([{
                    budget_id: id,
                    proposal_number: budgetNumber,
                    client_id: clientData.id || null,
                    salesperson: vendedor,
                    items: itemsSnapshot,
                    total_amount: totalAmount,
                    issuer: issuer
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

    const confirmGenerateOrder = async () => {
        setIsCommercialModalOpen(false);
        navigate('/pedido/novo', {
            state: {
                fromBudget: {
                    budgetId: id,
                    budgetNumber: budgetNumber,
                    issuer: issuer,
                    vendedor: vendedor,
                    clientData: clientData,
                    budget_date: dataOrcamento
                },
                items: items.filter(it => it.isApproved),
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
                email: newSupplier.email
            }]).select().single();
            if (error) {
                if (error.code === '23505') throw new Error('Já existe um fornecedor com este Nome ou CPF/CNPJ.');
                throw error;
            }
            // Add to list and close
            setSuppliersList(prev => [...prev, data]);
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
                    is_approved: false // Reset approval on duplicate
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
                        {id && id !== 'novo' ? 'EDITAR ORÇAMENTO' : 'NOVO ORÇAMENTO'}
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
                            <button onClick={handleGenerateProposal} className="h-9 px-4 rounded-lg shadow-sm text-[10px] font-black text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all uppercase flex items-center justify-center gap-2 active:scale-95 leading-none">
                                <span className="material-icons-outlined text-base">picture_as_pdf</span>
                                Proposta
                            </button>
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
                                readOnly={budgetNumber === 'AUTO' || (!!id && id !== 'novo') || status === 'PROPOSTA ACEITA'}
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
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                                {items.map((it, idx) => (
                                    <Draggable key={String(it.id)} draggableId={String(it.id)} index={idx} isDragDisabled={status === 'PROPOSTA ACEITA'}>
                                        {(dragProvided, snapshot) => (
                                            <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                className={`bg-white shadow-sm rounded-lg border transition-all overflow-hidden ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-400 rotate-[0.5deg]' :
                                                    it.isApproved ? 'border-green-500 ring-1 ring-green-100' : 'border-gray-200'
                                                    }`}
                                            >
                                                {/* Compact Header for Item */}
                                                <div className={`px-2 py-1 border-b flex justify-between items-center ${it.isApproved ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                                    <div className="flex items-center gap-2">
                                                        {/* Drag Handle */}
                                                        <div
                                                            {...dragProvided.dragHandleProps}
                                                            className={`p-0.5 rounded cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors ${status === 'PROPOSTA ACEITA' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                            title="Arraste para reordenar"
                                                        >
                                                            <span className="material-icons-outlined text-base">drag_indicator</span>
                                                        </div>
                                                        <span className="bg-gray-800 text-white text-[9px] font-black px-1.5 py-0.5 rounded leading-none">ITEM {idx + 1}</span>
                                                        <span className={`text-[11px] font-black uppercase tracking-tight ${it.isApproved ? 'text-green-700' : 'text-gray-600'}`}>
                                                            {it.productName || 'Escolher Produto...'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all select-none ${it.isApproved ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 cursor-pointer'} ${status === 'PROPOSTA ACEITA' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                            <input type="checkbox" className="w-3 h-3 rounded text-green-600 focus:ring-0" checked={it.isApproved} onChange={e => updateItem(it.id, 'isApproved', e.target.checked)} disabled={status === 'PROPOSTA ACEITA'} />
                                                            <span className="text-[8px] font-black uppercase">Aprovar</span>
                                                        </label>
                                                        <div className="h-4 w-[1px] bg-gray-200"></div>
                                                        <button onClick={() => duplicateItem(it)} disabled={status === 'PROPOSTA ACEITA'} className={`p-1 rounded hover:bg-white hover:shadow-sm transition-all ${status === 'PROPOSTA ACEITA' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600'}`}>
                                                            <span className="material-icons-outlined text-base">content_copy</span>
                                                        </button>
                                                        <button onClick={() => removeItem(it.id)} disabled={status === 'PROPOSTA ACEITA'} className={`p-1 rounded hover:bg-white hover:shadow-sm transition-all ${status === 'PROPOSTA ACEITA' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}>
                                                            <span className="material-icons-outlined text-base">delete</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="p-2.5">
                                                    <div className="grid grid-cols-12 gap-3">
                                                        {/* Definição Base */}
                                                        <div className="col-span-12 lg:col-span-8 flex flex-col gap-2">
                                                            <div className="grid grid-cols-12 gap-2 pb-2 border-b border-gray-50">
                                                                <div className="col-span-5">
                                                                    <CustomSelect label="Produto" options={productsList} onSelect={p => {
                                                                        updateItem(it.id, 'productName', p.name);
                                                                        let supplierName = null;
                                                                        const lowerName = p.name.toLowerCase();
                                                                        if (p.source) supplierName = p.source.toUpperCase();
                                                                        else if (lowerName.includes('xbz')) supplierName = 'XBZ';
                                                                        else if (lowerName.includes('asia') || lowerName.includes('ásia')) supplierName = 'ASIA';
                                                                        else if (lowerName.includes('spot')) supplierName = 'SPOT';
                                                                        if (supplierName) {
                                                                            const found = suppliersList.find(s => s.name?.toUpperCase() === supplierName);
                                                                            if (found) updateItem(it.id, 'supplier_id', found.id);
                                                                        }
                                                                    }} onAdd={() => { }} value={it.productName || ''} onSearch={searchProducts} disabled={status === 'PROPOSTA ACEITA'} />
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <CustomSelect label="Fornecedor Principal" options={suppliersList} onSelect={s => updateItem(it.id, 'supplier_id', s.id)} onAdd={() => { setIsSupplierModalOpen(true); }} placeholder="Selec..." disabled={status === 'PROPOSTA ACEITA'} value={suppliersList.find(s => s.id === it.supplier_id)?.name || ''} />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 text-center">Quantidade</label>
                                                                    <input type="number" className="form-input w-full rounded border-gray-300 text-center font-black py-1 text-xs" value={it.quantity || ''} onChange={e => updateItem(it.id, 'quantity', Number(e.target.value))} disabled={status === 'PROPOSTA ACEITA'} />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5 text-right">Custo Unit.</label>
                                                                    <input className="form-input w-full rounded border-gray-300 text-right font-black py-1 text-xs text-blue-700 bg-blue-50/50" value={formatCurrency(it.priceUnit || 0)} onChange={e => updateItem(it.id, 'priceUnit', parseCurrencyToNumber(e.target.value))} disabled={status === 'PROPOSTA ACEITA'} />
                                                                </div>
                                                            </div>

                                                            {/* Grid de Custos Adicionais — Fornecedor | Serviço | Valor Unit. */}
                                                            <div className="bg-gray-50/50 p-2 rounded-md border border-gray-100">
                                                                <div className="grid grid-cols-12 gap-x-3 gap-y-1.5">
                                                                    {/* Header — Fornecedor first */}
                                                                    <div className="col-span-3 text-[8px] font-black text-gray-400 uppercase">Serviço/Frete</div>
                                                                    <div className="col-span-7 text-[8px] font-black text-gray-400 uppercase">Fornecedor</div>
                                                                    <div className="col-span-2 text-[8px] font-black text-gray-400 uppercase text-right">Valor Unit.</div>

                                                                    {[
                                                                        { label: 'Personalização', key: 'custoPersonalizacao', suppKey: 'customization_supplier_id' },
                                                                        { label: 'Layout', key: 'layoutCost', suppKey: 'layout_supplier_id' },
                                                                        { label: 'Frete Fornecedor', key: 'transpFornecedor', suppKey: 'transport_supplier_id' },
                                                                        { label: 'Frete Cliente', key: 'transpCliente', suppKey: 'client_transport_supplier_id' }
                                                                    ].map(row => {
                                                                        const hasValue = (it[row.key as keyof typeof it] as number || 0) > 0;
                                                                        const hasSupplier = !!(it[row.suppKey as keyof typeof it]);
                                                                        const isIncomplete = (hasValue && !hasSupplier) || (!hasValue && hasSupplier);
                                                                        return (
                                                                            <React.Fragment key={row.key}>
                                                                                <div className="col-span-3 text-[10px] font-bold text-gray-600 flex items-center gap-1">
                                                                                    {row.label}
                                                                                    {isIncomplete && <span className="material-icons-outlined text-amber-500 text-xs" title="Preencha ambos: fornecedor e valor">warning</span>}
                                                                                </div>
                                                                                <div className="col-span-7">
                                                                                    <select
                                                                                        className={`form-select w-full text-[10px] rounded py-0.5 ${isIncomplete && !hasSupplier ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                                                                                            }`}
                                                                                        value={it[row.suppKey as keyof typeof it] as string || ''}
                                                                                        onChange={e => updateItem(it.id, row.suppKey, e.target.value)}
                                                                                        disabled={status === 'PROPOSTA ACEITA'}
                                                                                    >
                                                                                        <option value="">Selecionar...</option>
                                                                                        {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                                                    </select>
                                                                                </div>
                                                                                <div className="col-span-2">
                                                                                    <input
                                                                                        className={`form-input w-full text-[11px] rounded text-right py-0.5 font-bold ${isIncomplete && !hasValue ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                                                                                            }`}
                                                                                        value={formatCurrency(it[row.key as keyof typeof it] as number)}
                                                                                        onChange={e => updateItem(it.id, row.key, parseCurrencyToNumber(e.target.value))}
                                                                                        disabled={status === 'PROPOSTA ACEITA'}
                                                                                    />
                                                                                </div>
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Direita: Cálculos e Totais */}
                                                        <div className="col-span-12 lg:col-span-4 flex flex-col gap-2">
                                                            <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex-1 flex flex-col justify-between">
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-[9px] font-black text-blue-600 uppercase mb-0.5">Fator Multiplic.</label>
                                                                        <select className="form-select w-full rounded border-blue-200 text-[10px] py-1 font-black bg-white" value={it.fator} onChange={e => updateItem(it.id, 'fator', Number(e.target.value))} disabled={status === 'PROPOSTA ACEITA'}>
                                                                            {factors.map(f => (
                                                                                <option key={f.id} value={1 + (f.tax_percent + f.contingency_percent + f.margin_percent) / 100}>{f.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-black text-blue-600 uppercase mb-0.5">Saldo Extra (%)</label>
                                                                        <input type="number" className="form-input w-full rounded border-blue-200 text-right py-1 text-[10px] font-black bg-white" value={it.extraPct} onChange={e => updateItem(it.id, 'extraPct', Number(e.target.value))} disabled={status === 'PROPOSTA ACEITA'} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[9px] font-black text-gray-500 uppercase mb-0.5">BV (%)</label>
                                                                        <input type="number" className="form-input w-full rounded border-gray-200 text-right py-1 text-[10px] font-bold bg-white" value={it.bvPct} onChange={e => updateItem(it.id, 'bvPct', Number(e.target.value))} disabled={status === 'PROPOSTA ACEITA'} />
                                                                    </div>
                                                                    <div className="flex flex-col justify-end items-end text-right">
                                                                        <span className="text-[8px] font-bold text-gray-400 uppercase leading-none">Custo Total Item</span>
                                                                        <span className="text-xs font-black text-gray-700">{formatCurrency((it.quantity * it.priceUnit) + (it.custoPersonalizacao + it.layoutCost + it.transpFornecedor + it.transpCliente + it.despesaExtra))}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 pt-2 border-t border-blue-100 space-y-0.5">
                                                                    <div className="flex justify-between items-center px-1">
                                                                        <span className="text-[9px] font-extrabold text-blue-400 uppercase">Preço Unit. Venda</span>
                                                                        <span className="text-[11px] font-black text-gray-800">{formatCurrency((calculateItemTotal(it) / (it.quantity || 1)))}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-baseline bg-blue-600 p-1.5 rounded shadow-sm">
                                                                        <span className="text-[10px] font-black uppercase text-white tracking-widest">TOTAL VENDA</span>
                                                                        <span className="text-xl font-black text-white">{formatCurrency(calculateItemTotal(it))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
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
        </div>
    );
};

export default BudgetForm;
