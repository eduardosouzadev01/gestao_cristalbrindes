'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { getTodayISO } from '@/utils/dateUtils';
import { useOrderItems } from './useOrderItems';
import { useBudget, useUpdateBudget, useCreateBudget } from './useBudgets';
import { useSuppliers, useCreatePartner } from './api.hooks';
import { calculateItemTotal } from '@/utils/formulas';
import { generateBudgetExcel } from '@/utils/excelExport';
import { fixClientName } from '@/utils/textUtils';

export function useBudgetLogic(id?: string) {
    const { appUser, hasPermission } = useAuth();
    const searchParams = useSearchParams();
    const leadId = searchParams.get('leadId');
    const router = useRouter();
    const queryClient = useQueryClient();
    
    // States from original project
    const [budgetNumber, setBudgetNumber] = useState('AUTO');
    const [salesperson, setSalesperson] = useState(appUser?.salesperson || '');
    const [status, setStatus] = useState('EM ABERTO');
    const [budgetDate, setBudgetDate] = useState(getTodayISO());
    const [issuer, setIssuer] = useState('CRISTAL');
    const [clientData, setClientData] = useState({ 
        id: '', 
        name: '', 
        contactName: '', 
        doc: '', 
        phone: '', 
        email: '', 
        emailFin: '' 
    });

    // Commercial data
    const [validity, setValidity] = useState('7 dias');
    const [shipping, setShipping] = useState('Frete incluso para Grande Vitória, exceto Guarapari.');
    const [deliveryDeadline, setDeliveryDeadline] = useState('15/20 dias úteis');
    const [paymentMethod, setPaymentMethod] = useState('50% no pedido e 50% no pedido pronto.');
    const [observation, setObservation] = useState('');
    const [lastProposalId, setLastProposalId] = useState<string | null>(null);
    const [proposals, setProposals] = useState<any[]>([]);

    // Lists
    const { data: suppliersList = [] } = useSuppliers();
    const [productsList, setProductsList] = useState<any[]>([]);
    const [factors, setFactors] = useState<any[]>([]);
    const [invalidItemIds, setInvalidItemIds] = useState<(string | number)[]>([]);

    // Quick Supplier Modal state
    const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        doc: '',
        phone: '',
        email: '',
        supplier_category: 'PRODUTOS'
    });
    const createPartnerMutation = useCreatePartner();
    
    // items hook
    const { 
        items, 
        setItems, 
        addItem, 
        updateItem, 
        removeItem, 
        duplicateItem,
        totalRevenue,
        totalBV,
        totalTaxes,
        totalProfit
    } = useOrderItems([]);

    // Query Result
    const { data: budget, isLoading: isLoadingBudget } = useBudget(id as string);
    const updateMutation = useUpdateBudget();
    const createMutation = useCreateBudget();

    const isLeadLoaded = useRef(false);

    // Load Lead Data if converting
    useEffect(() => {
        if (leadId && id === 'novo' && !isLeadLoaded.current) {
            const loadLead = async () => {
                const { data: lead } = await supabase
                    .from('crm_leads')
                    .select('*')
                    .eq('id', leadId)
                    .single();
                
                if (lead) {
                    isLeadLoaded.current = true;
                    setClientData({
                        id: lead.client_id || '',
                        name: lead.client_name,
                        contactName: lead.client_contact_name || '',
                        doc: lead.client_doc || '',
                        phone: lead.client_phone || '',
                        email: lead.client_email || '',
                        emailFin: ''
                    });
                    
                    if (lead.closing_metadata?.quoted_item) {
                        setItems(prev => {
                            // If first item is empty, use it. Otherwise add a new one.
                            const firstEmpty = prev.findIndex(it => !it.productName);
                            if (firstEmpty !== -1) {
                                const newItems = [...prev];
                                newItems[firstEmpty] = { ...newItems[firstEmpty], productName: lead.closing_metadata.quoted_item };
                                return newItems;
                            }
                            return [...prev, {
                                id: Date.now(),
                                productName: lead.closing_metadata.quoted_item,
                                quantity: 1,
                                priceUnit: 0,
                                fator: 1.25,
                                mockNF: 14,
                                mockMargin: 15
                            }];
                        });
                    }
                }
            };
            loadLead();
        }
    }, [leadId, id, setItems]);

    // Load Base Data (Products, Factors)
    useEffect(() => {
        const loadBase = async () => {
            const [productsRes, factorsRes] = await Promise.all([
                supabase.from('products').select('*').limit(50),
                supabase.from('calculation_factors').select('*')
            ]);
            
            setProductsList(productsRes.data || []);
            setFactors(factorsRes.data || []);
        };
        loadBase();
    }, []);

    const currentSearchRef = useRef<string>('');

    const handleSearchProducts = async (term: string) => {
        const cleanTerm = term ? term.trim() : '';
        if (cleanTerm.length < 2) return;
        
        currentSearchRef.current = cleanTerm;

        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${cleanTerm}%,code.ilike.%${cleanTerm}%`)
                .limit(30);

            if (currentSearchRef.current !== cleanTerm) return;

            if (!error && data) {
                console.log("Returned searched items:", data);
                setProductsList(data);
            }
        } catch (err) {
            console.error('Error searching products:', err);
        }
    };

    const [isInternalOperation, setIsInternalOperation] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState(0);
    const [saving, setSaving] = useState(false);
    const [isGeneratingOrder, setIsGeneratingOrder] = useState(false);
    const isSavingRef = useRef(false);
    const lastSavedDataRef = useRef<string>('');

    // Sync state with budget data when loaded
    useEffect(() => {
        const syncData = async () => {
            const isRecentlySaved = Date.now() - lastSaveTime < 3000;
            if (budget && !updateMutation.isPending && !createMutation.isPending && !isInternalOperation && !isRecentlySaved) {
                const isSalesperson = appUser?.role === 'VENDEDOR';
                if (isSalesperson && budget.salesperson !== appUser?.salesperson && !appUser?.permissions.fullAccess) {
                    toast.error('Acesso negado: Este orçamento pertence a outro vendedor.');
                    router.push('/orcamentos');
                    return;
                }

                setBudgetNumber(budget.budget_number);
                setSalesperson(budget.salesperson);
                setStatus(budget.status);
                setBudgetDate(budget.created_at.split('T')[0]);
                setIssuer(budget.issuer);
                setValidity(budget.validity);
                setShipping(budget.shipping);
                setDeliveryDeadline(budget.delivery_deadline);
                setPaymentMethod(budget.payment_method);
                setObservation(budget.observation);

                
                // Fetch and set Client Data if exists
                if (budget.client_id) {
                    const { data: client } = await supabase
                        .from('partners')
                        .select('*')
                        .eq('id', budget.client_id)
                        .single();
                    
                    if (client) {
                        setClientData({
                            id: client.id,
                            name: client.name,
                            contactName: client.contact_name || '',
                            doc: client.doc || '',
                            phone: client.phone || '',
                            email: client.email || '',
                            emailFin: client.financial_email || ''
                        });
                    }
                }

                if (budget.budget_items) {
                    const mapped = budget.budget_items.map(it => ({
                        id: it.id,
                        productName: it.product_name,
                        supplier_id: it.supplier_id,
                        quantity: it.quantity,
                        priceUnit: it.unit_price,
                        custoPersonalizacao: it.customization_cost,
                        customization_supplier_id: it.customization_supplier_id,
                        transpFornecedor: it.supplier_transport_cost,
                        transport_supplier_id: it.transport_supplier_id,
                        transpCliente: it.client_transport_cost,
                        client_transport_supplier_id: it.client_transport_supplier_id,
                        despesaExtra: it.extra_expense,
                        layoutCost: it.layout_cost,
                        layout_supplier_id: it.layout_supplier_id,
                        fator: it.calculation_factor,
                        mockNF: it.tax_pct,
                        mockMargin: it.margin_pct,
                        mockPayment: it.payment_tax_pct,
                        bvPct: it.bv_pct,
                        extraPct: it.extra_pct,
                        isApproved: it.is_approved,
                        productDescription: it.product_description,
                        productColor: it.product_color,
                        productCode: it.product_code,
                        productImage: it.product_image_url,
                        paymentMethodLabel: it.payment_method_label
                    }));
                    setItems(mapped);
                }

                // Fetch all proposals
                if (budget && budget.id) {
                    const { data: propData } = await supabase
                        .from('proposals')
                        .select('*')
                        .eq('budget_id', budget.id)
                        .order('created_at', { ascending: false });
                    
                    if (propData) {
                        setProposals(propData);
                        if (propData.length > 0) setLastProposalId(propData[0].id);
                    }
                }
            }
        };

        syncData();
    }, [budget, setItems, isInternalOperation]);

    // Auto-save logic
    useEffect(() => {
        // Don't auto-save if it's a new unsaved budget (to avoid creating empty budgets)
        // or if it's currently loading or in an internal operation
        if (id === 'novo' || isLoadingBudget || isInternalOperation) return;

        const timer = setTimeout(() => {
            const hasData = clientData.name || items.some(it => it.productName);
            if (!hasData) return;

            // Deep check to avoid redundant saves
            const currentData = JSON.stringify({
                clientData, items, budgetNumber, salesperson, status, 
                issuer, validity, shipping, deliveryDeadline, 
                paymentMethod, observation
            });

            if (currentData === lastSavedDataRef.current) {
                console.log('No changes detected, skipping auto-save.');
                return;
            }

            console.log('Auto-saving budget...');
            handleSave(true).then(() => {
                lastSavedDataRef.current = currentData;
            });
        }, 10000); // 10 seconds debounce to reduce server load

        return () => clearTimeout(timer);
    }, [
        clientData, items, budgetNumber, salesperson, status, 
        issuer, validity, shipping, deliveryDeadline, 
        paymentMethod, observation
    ]);

    const handleSave = async (silent = false) => {
        if (isSavingRef.current) {
            console.log('Save already in progress, skipping...');
            return null;
        }
        
        let activeId = id;

        const performSave = async () => {
            isSavingRef.current = true;
            setIsInternalOperation(true);
            setSaving(true);
            
            try {
                let finalBudgetNumber = budgetNumber;
                if (!finalBudgetNumber || finalBudgetNumber.trim().toUpperCase() === 'AUTO' || finalBudgetNumber.startsWith('AUTO-')) {
                    const { data: nextNum, error: rpcErr } = await supabase.rpc('get_next_budget_number');
                    if (!rpcErr && nextNum) {
                        finalBudgetNumber = nextNum;
                    } else {
                        finalBudgetNumber = 'AUTO-' + Math.floor(Math.random() * 1000000);
                    }
                    setBudgetNumber(finalBudgetNumber);
                }

                const payload: any = {
                    budget_number: finalBudgetNumber,
                    salesperson,
                    status,
                    issuer,
                    total_amount: totalRevenue,
                    validity,
                    shipping,
                    delivery_deadline: deliveryDeadline,
                    payment_method: paymentMethod,
                    observation,
                    client_id: clientData.id || null
                };

                if (activeId && activeId !== 'novo') {
                    await updateMutation.mutateAsync({ id: activeId, updates: payload });
                } else {
                    const newBudget = await createMutation.mutateAsync(payload);
                    activeId = newBudget.id;
                    // Update URL to the new ID without refreshing
                    if (id === 'novo') {
                        router.replace(`/orcamentos/${activeId}`);
                    }
                }

                // Save Items
                if (activeId) {
                    // Brute force: delete and re-insert items
                    const { error: deleteError } = await supabase.from('budget_items').delete().eq('budget_id', activeId);
                    if (deleteError) throw new Error('Erro ao limpar itens antigos: ' + deleteError.message);
                    
                    if (items.length > 0) {
                        const itemsToSave = items.map((it, idx) => ({
                            budget_id: activeId,
                            product_name: it.productName,
                            supplier_id: it.supplier_id || null,
                            quantity: it.quantity,
                            unit_price: it.priceUnit,
                            customization_cost: it.custoPersonalizacao,
                            customization_supplier_id: it.customization_supplier_id || null,
                            supplier_transport_cost: it.transpFornecedor,
                            transport_supplier_id: it.transport_supplier_id || null,
                            client_transport_cost: it.transpCliente,
                            client_transport_supplier_id: it.client_transport_supplier_id || null,
                            extra_expense: it.despesaExtra,
                            layout_cost: it.layoutCost,
                            layout_supplier_id: it.layout_supplier_id || null,
                            calculation_factor: it.fator,
                            tax_pct: it.mockNF,
                            margin_pct: it.mockMargin,
                            payment_tax_pct: it.mockPayment,
                            bv_pct: it.bvPct,
                            extra_pct: it.extraPct,
                            is_approved: it.isApproved,
                            product_description: it.productDescription || '',
                            product_color: it.productColor || '',
                            product_code: it.productCode || '',
                            product_image_url: it.productImage || '',
                            payment_method_label: it.paymentMethodLabel || '',
                            total_item_value: calculateItemTotal(it)
                        }));

                        const { error: itemsError } = await supabase.from('budget_items').insert(itemsToSave);
                        if (itemsError) throw new Error('Erro ao salvar novos itens: ' + itemsError.message);
                        
                        // Force cache invalidation to prevent data loss on navigation back
                        queryClient.invalidateQueries({ queryKey: ['budget', activeId] });
                    }
                }
                return { activeId, finalBudgetNumber };
            } catch (err: any) {
                console.error('Save error details:', err);
                throw err;
            } finally {
                setLastSaveTime(Date.now());
                setSaving(false);
                setTimeout(() => {
                    isSavingRef.current = false;
                    setIsInternalOperation(false);
                }, 1000);
            }
        };

        if (!silent) {
            toast.promise(performSave(), {
                loading: 'Salvando orçamento...',
                success: 'Orçamento salvo com sucesso!',
                error: (err) => 'Erro ao salvar: ' + err.message
            });
        } else {
            return await performSave();
        }
        
        return { activeId: id, finalBudgetNumber: budgetNumber };
    };

    return {
        // Data
        budget,
        items,
        isLoading: isLoadingBudget,
        isSaving: saving,
        isGeneratingOrder,
        invalidItemIds,
        lastProposalId,
        proposals,
        
        // Form States
        budgetNumber, setBudgetNumber,
        salesperson, setSalesperson,
        status, setStatus,
        budgetDate, setBudgetDate,
        issuer, setIssuer,
        clientData, setClientData,
        validity, setValidity,
        shipping, setShipping,
        deliveryDeadline, setDeliveryDeadline,
        paymentMethod, setPaymentMethod,
        observation, setObservation,
        
        // Lists
        suppliersList,
        productsList,
        factors,
        
        // Item Actions
        addItem,
        setItems,
        updateItem: (id: string | number, field: string, value: any) => {
            updateItem(id, field, value);
            // Clear invalid status if user is fixing the item
            setInvalidItemIds(prev => prev.filter(invalidId => invalidId !== id));
        },
        removeItem,
        duplicateItem,
        totalRevenue,
        totalBV,
        totalTaxes,
        totalProfit,
        
        // Global Actions
        handleSearchProducts,
        handleSave,
        handleDuplicate: async () => {
            try {
                const { data: nextNum, error: rpcErr } = await supabase.rpc('get_next_budget_number');
                const finalNum = (!rpcErr && nextNum) ? nextNum : ('AUTO-' + Math.floor(Math.random() * 1000000));
                const payload = {
                    budget_number: finalNum,
                    salesperson,
                    status: 'EM ABERTO',
                    issuer: issuer,
                    total_amount: totalRevenue,
                    validity,
                    shipping,
                    delivery_deadline: deliveryDeadline,
                    payment_method: paymentMethod,
                    observation: `Cópia de ${budgetNumber}. ${observation}`,
                    client_id: clientData.id || null
                };
                const newBudget = await createMutation.mutateAsync(payload);
                if (newBudget.id) {
                    const itemsToSave = items.map(it => ({
                        budget_id: newBudget.id,
                        product_name: it.productName,
                        supplier_id: it.supplier_id || null,
                        quantity: it.quantity,
                        unit_price: it.priceUnit,
                        customization_cost: it.custoPersonalizacao,
                        customization_supplier_id: it.customization_supplier_id || null,
                        supplier_transport_cost: it.transpFornecedor,
                        transport_supplier_id: it.transport_supplier_id || null,
                        client_transport_cost: it.transpCliente,
                        client_transport_supplier_id: it.client_transport_supplier_id || null,
                        extra_expense: it.despesaExtra,
                        layout_cost: it.layoutCost,
                        layout_supplier_id: it.layout_supplier_id || null,
                        calculation_factor: it.fator,
                        tax_pct: it.mockNF,
                        margin_pct: it.mockMargin,
                        payment_tax_pct: it.mockPayment,
                        bv_pct: it.bvPct,
                        extra_pct: it.extraPct,
                        is_approved: it.isApproved,
                        product_description: it.productDescription || '',
                        product_color: it.productColor || '',
                        product_code: it.productCode || '',
                        product_image_url: it.productImage || '',
                        payment_method_label: it.paymentMethodLabel || '',
                        total_item_value: calculateItemTotal(it)
                    }));
                    await supabase.from('budget_items').insert(itemsToSave);
                    toast.success('Orçamento duplicado com sucesso!');
                    router.push(`/orcamentos/${newBudget.id}`);
                }
            } catch (err: any) {
                toast.error('Erro ao duplicar: ' + err.message);
            }
        },
        handleGenerateProposal: async () => {
            try {
                setInvalidItemIds([]);
                
                // Task 1: Check if at least one item is approved
                const approvedItems = items.filter(it => it.isApproved);
                if (approvedItems.length === 0) {
                    toast.error('Não é possível gerar proposta sem pelo menos 1 item marcado como aprovado.');
                    return;
                }

                // Save Budget first (ensure data is consistent)
                const saveResult = await handleSave(true);
                if (!saveResult || !saveResult.activeId) throw new Error('Falha ao salvar orçamento antes de gerar proposta.');

                const activeId = saveResult.activeId;
                const currentBudgetNumber = saveResult.finalBudgetNumber;

                // Task 2: sequential numbering <budget_number>-01, -02...
                const { count } = await supabase
                    .from('proposals')
                    .select('*', { count: 'exact', head: true })
                    .eq('budget_id', activeId);

                const sequence = (count || 0) + 1;
                const finalProposalNumber = `${currentBudgetNumber}-${String(sequence).padStart(2, '0')}`;

                // Update status immediately directly
                await supabase.from('budgets').update({ status: 'PROPOSTA GERADA' }).eq('id', activeId);
                setStatus('PROPOSTA GERADA');
                
                queryClient.invalidateQueries({ queryKey: ['budget', activeId] });

                // Create Proposal record (Snapshot)
                const itemsToSnap = items.filter(it => it.isApproved).map(it => ({
                    budget_id: activeId,
                    product_id: it.product_id || null,
                    product_name: it.productName,
                    product_code: it.productCode || '',
                    product_color: it.productColor || '',
                    product_description: it.productDescription || '',
                    product_image_url: it.productImage || '',
                    total_item_value: calculateItemTotal(it),
                    unit_price: it.priceUnit,
                    quantity: it.quantity,
                    supplier_id: it.supplier_id || null,
                    customization_cost: it.custoPersonalizacao,
                    supplier_transport_cost: it.transpFornecedor,
                    client_transport_cost: it.transpCliente,
                    extra_expense: it.despesaExtra,
                    layout_cost: it.layoutCost,
                    calculation_factor: it.fator,
                    bv_pct: it.bvPct,
                    extra_pct: it.extraPct,
                    tax_pct: it.taxPct,
                    unforeseen_pct: it.unforeseenPct,
                    margin_pct: it.marginPct,
                    customization_supplier_id: it.customization_supplier_id || null,
                    transport_supplier_id: it.transport_supplier_id || null,
                    client_transport_supplier_id: it.client_transport_supplier_id || null,
                    layout_supplier_id: it.layout_supplier_id || null,
                    // Store names in snapshot for Excel export
                    supplier_name: suppliersList.find(s => s.id === it.supplier_id)?.name || '',
                    customization_supplier_name: suppliersList.find(s => s.id === it.customization_supplier_id)?.name || '',
                    transport_supplier_name: suppliersList.find(s => s.id === it.transport_supplier_id)?.name || '',
                    client_transport_supplier_name: suppliersList.find(s => s.id === it.client_transport_supplier_id)?.name || '',
                    layout_supplier_name: suppliersList.find(s => s.id === it.layout_supplier_id)?.name || ''
                }));

                const proposalPayload = {
                    budget_id: activeId,
                    proposal_number: finalProposalNumber,
                    client_id: clientData.id || null,
                    salesperson,
                    items: itemsToSnap,
                    status: 'GERADA',
                    total_amount: totalRevenue,
                    validity,
                    shipping,
                    delivery_deadline: deliveryDeadline,
                    payment_method: paymentMethod,
                    observation,
                    issuer,
                    client_snapshot: {
                        name: clientData.name,
                        email: clientData.email,
                        doc: clientData.doc,
                        phone: clientData.phone,
                        contact_name: clientData.contactName
                    }
                };

                const { data: newProposal, error: proposalError } = await supabase
                    .from('proposals')
                    .insert(proposalPayload)
                    .select()
                    .single();

                if (proposalError) throw new Error('Erro ao criar registro da proposta: ' + proposalError.message);

                toast.success('Proposta gerada com sucesso!', {
                    description: `Proposta ${finalProposalNumber} criada.`
                });
                
                // 4. Redirect to the new proposal view
                router.push(`/propostas/${newProposal.id}`);
                
            } catch (err: any) {
                console.error('Generate proposal error:', err);
                const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                toast.error('Erro ao processar proposta: ' + msg);
            }
        },
        handleDeleteProposal: async (pid: string) => {
            const confirmed = window.confirm('Tem certeza que deseja excluir esta proposta permanentemente?');
            if (confirmed) {
                try {
                    const { error } = await supabase.from('proposals').delete().eq('id', pid);
                    if (error) throw error;
                    toast.success('Proposta excluída!');
                    queryClient.invalidateQueries({ queryKey: ['budget', id] });
                    
                    // Re-check status
                    const { count } = await supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('budget_id', id);
                    if (count === 0) {
                        await supabase.from('budgets').update({ status: 'EM ABERTO' }).eq('id', id);
                        setStatus('EM ABERTO');
                    }
                } catch (err: any) {
                    toast.error('Erro ao excluir: ' + err.message);
                }
            }
        },
        handleViewProposal: async () => {
            try {
                const activeId = id === 'novo' ? budget?.id : id;
                if (!activeId) return toast.error('Orçamento ainda não foi salvo.');
                const { data, error } = await supabase
                    .from('proposals')
                    .select('id')
                    .eq('budget_id', activeId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (error || !data) throw new Error('Nenhuma proposta encontrada para este orçamento.');
                router.push(`/propostas/${data.id}`);
            } catch (err: any) {
                toast.error(err.message);
            }
        },
        handleGenerateOrder: async (commercialData: any) => {
            setIsGeneratingOrder(true);
            try {
                const approvedItems = items.filter(it => it.isApproved);
                
                // Validation: Prevent generating order if supplier is filled but price is zero
                const invalidItems = approvedItems.filter(it => it.supplier_id && (Number(it.priceUnit) === 0 || !it.priceUnit));
                if (invalidItems.length > 0) {
                    toast.error('Preenchimento obrigatório: Itens aprovados com fornecedor selecionado devem ter o Valor Unitário informado.');
                    setIsGeneratingOrder(false);
                    return;
                }

                if (approvedItems.length === 0) {
                    toast.error('Nenhum item aprovado para gerar o pedido.');
                    setIsGeneratingOrder(false);
                    return;
                }

                // Ensure budget is saved and up to date
                const saveResult = await handleSave(true);
                if (!saveResult || !saveResult.activeId) throw new Error('Falha ao salvar orçamento antes de gerar pedido.');
                const activeId = saveResult.activeId;

                // Build order payload
                const orderPayload: any = {
                    budget_id: activeId,
                    order_number: 'AUTO',
                    salesperson,
                    status: 'AGUARDANDO PAGAMENTO ENTRADA',
                    budget_date: budgetDate,
                    order_date: getTodayISO(),
                    client_id: clientData.id || null,
                    issuer,
                    billing_type: commercialData.payment_term,
                    payment_method: paymentMethod,
                    payment_due_date: commercialData.shipping_deadline,
                    supplier_departure_date: Object.values(commercialData.supplier_departure_dates)[0] || null,
                    invoice_number: commercialData.invoice_number,
                    total_amount: approvedItems.reduce((acc, it) => acc + calculateItemTotal(it), 0),
                    entry_amount: 0,
                    entry_date: commercialData.entry_forecast_date,
                    entry_confirmed: false,
                    remaining_amount: 0,
                    remaining_date: commercialData.remaining_forecast_date,
                    remaining_confirmed: false,
                    purchase_order: commercialData.purchase_order,
                    layout_info: commercialData.layout_info,
                    observations: observation
                };

                const itemsPayload = approvedItems.map(item => ({
                    id: null,
                    product_name: item.productName,
                    product_code: item.productCode || null,
                    product_color: item.productColor || null,
                    product_description: item.productDescription || null,
                    supplier_id: item.supplier_id || null,
                    quantity: item.quantity,
                    unit_price: item.priceUnit,
                    customization_cost: item.custoPersonalizacao,
                    supplier_transport_cost: item.transpFornecedor,
                    client_transport_cost: item.transpCliente,
                    extra_expense: item.despesaExtra,
                    layout_cost: item.layoutCost,
                    calculation_factor: item.fator,
                    bv_pct: item.bvPct,
                    extra_pct: item.extraPct,
                    total_item_value: calculateItemTotal(item),
                    tax_pct: item.mockNF || 0,
                    margin_pct: item.mockMargin || 0,
                    supplier_payment_date: commercialData.supplier_payment_dates[item.supplier_id || ''] || null,
                    supplier_departure_date: commercialData.supplier_departure_dates[item.supplier_id || ''] || null,
                }));

                const { data, error } = await supabase.rpc('save_order', {
                    p_order: orderPayload,
                    p_items: itemsPayload
                });

                if (error) throw error;
                
                // Update Budget and all associated Proposals statuses
                await supabase.from('budgets').update({ status: 'ORÇAMENTO APROVADO' }).eq('id', activeId);
                await supabase.from('proposals').update({ status: 'APROVADA' }).eq('budget_id', activeId);
                setStatus('ORÇAMENTO APROVADO');
                
                queryClient.invalidateQueries({ queryKey: ['budget', activeId] });
                toast.success('Pedido gerado com sucesso!');
                
                // Redirecionando para a pagina do pedido gerado
                router.push(`/pedidos/${data}`);

            } catch (err: any) {
                console.error('Generate order error:', err);
                const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
                toast.error('Erro ao gerar pedido: ' + msg);
            } finally {
                setIsGeneratingOrder(false);
            }
        },

        // Supplier Quick Add
        openQuickSupplierModal: () => setIsQuickSupplierModalOpen(true),
        closeQuickSupplierModal: () => {
            setIsQuickSupplierModalOpen(false);
            setNewSupplier({ name: '', doc: '', phone: '', email: '', supplier_category: 'PRODUTOS' });
        },
        handleSaveQuickSupplier: async () => {
            if (!newSupplier.name || !newSupplier.doc) {
                return toast.error('Nome e Documento são obrigatórios.');
            }
            try {
                await createPartnerMutation.mutateAsync({
                    ...newSupplier,
                    type: 'FORNECEDOR'
                });
                toast.success('Fornecedor cadastrado com sucesso!');
                setIsQuickSupplierModalOpen(false);
                setNewSupplier({ name: '', doc: '', phone: '', email: '', supplier_category: 'PRODUTOS' });
            } catch (err: any) {
                toast.error('Erro ao cadastrar fornecedor: ' + err.message);
            }
        },
        isQuickSupplierModalOpen,
        newSupplier,
        setNewSupplier,
        isSavingSupplier: createPartnerMutation.isPending,
        handleExportExcel: async () => {
            try {
                if (items.length === 0) {
                    return toast.error('Não há itens para exportar.');
                }

                generateBudgetExcel({
                    proposalNumber: budgetNumber,
                    budgetNumber: budgetNumber,
                    date: new Date(budgetDate).toLocaleDateString('pt-BR'),
                    salesperson: salesperson || '',
                    issuer: issuer || 'CRISTAL',
                    client: {
                        name: fixClientName(clientData.name || ''),
                        doc: clientData.doc || '',
                        email: clientData.email || '',
                        phone: clientData.phone || '',
                        contact_name: clientData.contactName || '',
                    },
                    validity: validity || '15 dias',
                    shipping: shipping || 'Cliente retira',
                    deliveryDeadline: deliveryDeadline || '15 / 20 dias úteis',
                    paymentMethod: paymentMethod || 'À vista ou parcelado',
                    observation: observation || '',
                    items: items.map(it => ({
                        productName: it.productName || '',
                        productCode: it.productCode || '',
                        productColor: it.productColor || '',
                        quantity: it.quantity || 0,
                        priceUnit: it.priceUnit || 0,
                        custoPersonalizacao: it.custoPersonalizacao || 0,
                        layoutCost: it.layoutCost || 0,
                        transpFornecedor: it.transpFornecedor || 0,
                        transpCliente: it.transpCliente || 0,
                        despesaExtra: it.despesaExtra || 0,
                        fator: it.fator || 1.35,
                        mockNF: it.mockNF || 0,
                        mockMargin: it.mockMargin || 0,
                        mockPayment: it.mockPayment || 0,
                        bvPct: it.bvPct || 0,
                        extraPct: it.extraPct || 0,
                        totalVenda: calculateItemTotal(it),
                        supplierName: suppliersList.find(s => s.id === it.supplier_id)?.name || '',
                        customizationSupplierName: suppliersList.find(s => s.id === it.customization_supplier_id)?.name || '',
                        transportSupplierName: suppliersList.find(s => s.id === it.transport_supplier_id)?.name || '',
                        clientTransportSupplierName: suppliersList.find(s => s.id === it.client_transport_supplier_id)?.name || '',
                        layoutSupplierName: suppliersList.find(s => s.id === it.layout_supplier_id)?.name || '',
                    })),
                });

                toast.success('Memória de cálculo exportada!');
            } catch (err: any) {
                toast.error('Erro ao exportar: ' + err.message);
            }
        },
        hasPermission: hasPermission
    };
}

