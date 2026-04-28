'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { getTodayISO } from '@/utils/dateUtils';
import { useOrderItems } from './useOrderItems';
import { calculateItemTotal } from '@/utils/formulas';
import { parseCurrencyToNumber, formatCurrency } from '@/utils/formatCurrency';

export function useOrderLogic(id?: string) {
    const { appUser } = useAuth();
    
    // States
    const [orderNumber, setOrderNumber] = useState('');
    const [vendedor, setVendedor] = useState(appUser?.salesperson || '');
    const [status, setStatus] = useState('AGUARDANDO PAGAMENTO ENTRADA');
    const [dataOrcamento, setDataOrcamento] = useState(getTodayISO());
    const [dataPedido, setDataPedido] = useState(getTodayISO());
    const [dataLimite, setDataLimite] = useState('');
    const [emitente, setEmitente] = useState('CRISTAL');
    const [modalidade, setModalidade] = useState('');
    const [opcaoPagamento, setOpcaoPagamento] = useState('');
    const [supplierDepartureDate, setSupplierDepartureDate] = useState('');
    const [observacoes, setObservacoes] = useState('');
    const [recebimentoEntrada, setRecebimentoEntrada] = useState('R$ 0,00');
    const [recebimentoRestante, setRecebimentoRestante] = useState('R$ 0,00');
    const [dataEntrada, setDataEntrada] = useState('');
    const [dataRestante, setDataRestante] = useState('');
    const [entradaConfirmed, setEntradaConfirmed] = useState(false);
    const [restanteConfirmed, setRestanteConfirmed] = useState(false);
    const [purchaseOrder, setPurchaseOrder] = useState('');
    const [layout, setLayout] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [clientData, setClientData] = useState({ id: '', name: '', doc: '', phone: '', email: '', emailFin: '' });

    // History and Logs
    const [logs, setLogs] = useState<{ user: string, msg: string, time: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Lists
    const [clientsList, setClientsList] = useState<any[]>([]);
    const [suppliersList, setSuppliersList] = useState<any[]>([]);
    const [productsList, setProductsList] = useState<any[]>([]);
    const [factorsList, setFactorsList] = useState<any[]>([]);

    // items hook
    const {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        duplicateItem,
        totalRevenue,
        totalCostsReal,
        totalBV,
        totalTaxes,
        totalProfit
    } = useOrderItems([], orderNumber);

    const isSeller = appUser?.role === 'VENDEDOR';
    const canEditGlobal = !isSeller || status === 'AGUARDANDO PAGAMENTO ENTRADA' || status === 'CANCELADO'; // Simplified logic from legacy

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            const { data: partners } = await supabase.from('partners').select('*');
            if (partners) {
                setClientsList(partners.filter(p => p.type === 'CLIENTE'));
                setSuppliersList(partners.filter(p => p.type === 'FORNECEDOR'));
            }
            const { data: products } = await supabase.from('products').select('*').limit(50);
            if (products) setProductsList(products);
            const { data: factors } = await supabase.from('calculation_factors').select('*');
            if (factors) setFactorsList(factors);
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }, []);

    // Load Order
    const loadOrder = useCallback(async (orderId: string) => {
        try {
            const { data: order, error } = await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single();
            if (error) throw error;

            setOrderNumber(order.order_number || '');
            setVendedor(order.salesperson || '');
            setStatus(order.status || 'AGUARDANDO PAGAMENTO ENTRADA');
            setDataOrcamento(order.budget_date || '');
            setDataPedido(order.order_date || getTodayISO());
            setEmitente(order.issuer || 'CRISTAL');
            setModalidade(order.billing_type || '');
            setOpcaoPagamento(order.payment_method || '');
            setDataLimite(order.payment_due_date || '');
            setSupplierDepartureDate(order.supplier_departure_date || '');
            setObservacoes(order.observations || '');
            setRecebimentoEntrada(formatCurrency(order.entry_amount || 0));
            setDataEntrada(order.entry_date || '');
            setEntradaConfirmed(order.entry_confirmed || false);
            setRecebimentoRestante(formatCurrency(order.remaining_amount || 0));
            setDataRestante(order.remaining_date || '');
            setRestanteConfirmed(order.remaining_confirmed || false);
            setPurchaseOrder(order.purchase_order || '');
            setLayout(order.layout_info || '');
            setInvoiceNumber(order.invoice_number || '');

            if (order.client_id) {
                const { data: client } = await supabase.from('partners').select('*').eq('id', order.client_id).single();
                if (client) setClientData({
                    id: client.id || '',
                    name: client.name || '',
                    doc: client.doc || '',
                    phone: client.phone || '',
                    email: client.email || '',
                    emailFin: client.financial_email || ''
                });
            }

            if (order.order_items) {
                const mappedItems = order.order_items.map((it: any) => ({
                    id: it.id,
                    productName: it.product_name,
                    productCode: it.product_code || '',
                    productColor: it.product_color || '',
                    productDescription: it.product_description || '',
                    supplier_id: it.supplier_id || '',
                    quantity: it.quantity,
                    priceUnit: it.unit_price,
                    custoPersonalizacao: it.customization_cost,
                    transpFornecedor: it.supplier_transport_cost,
                    transpCliente: it.client_transport_cost,
                    despesaExtra: it.extra_expense,
                    layoutCost: it.layout_cost,
                    fator: it.calculation_factor,
                    bvPct: it.bv_pct,
                    extraPct: it.extra_pct,
                    taxPct: it.tax_pct,
                    unforeseenPct: it.unforeseen_pct,
                    marginPct: it.margin_pct,
                    realPriceUnit: it.real_unit_price,
                    realCustoPersonalizacao: it.real_customization_cost,
                    realTranspFornecedor: it.real_supplier_transport_cost,
                    realTranspCliente: it.real_client_transport_cost,
                    realDespesaExtra: it.real_extra_expense,
                    realLayoutCost: it.real_layout_cost,
                    priceUnitPaid: it.unit_price_paid,
                    custoPersonalizacaoPaid: it.customization_paid,
                    transpFornecedorPaid: it.supplier_transport_paid,
                    transpClientePaid: it.client_transport_paid,
                    despesaExtraPaid: it.extra_expense_paid,
                    layoutCostPaid: it.layout_paid,
                    supplier_payment_date: it.supplier_payment_date,
                    customization_payment_date: it.customization_payment_date,
                    transport_payment_date: it.transport_payment_date,
                    layout_payment_date: it.layout_payment_date,
                    extra_payment_date: it.extra_payment_date,
                    supplier_departure_date: it.supplier_departure_date,
                    customization_supplier_id: it.customization_supplier_id || '',
                    transport_supplier_id: it.transport_supplier_id || '',
                    client_transport_supplier_id: it.client_transport_supplier_id || '',
                    layout_supplier_id: it.layout_supplier_id || '',
                    extra_supplier_id: it.extra_supplier_id || ''
                }));
                setItems(mappedItems);
            }

            // Load Logs
            const { data: dbLogs } = await supabase.from('order_logs').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
            if (dbLogs) {
                setLogs(dbLogs.map(l => ({
                    user: l.user_name,
                    msg: l.message,
                    time: new Date(l.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                })));
            }

        } catch (err: any) {
            console.error('Error loading order:', err);
            toast.error('Erro ao carregar pedido.');
        }
    }, [setItems]);

    useEffect(() => {
        fetchData();
        if (id && id !== 'novo') {
            loadOrder(id);
        }
    }, [id, fetchData, loadOrder]);

    const addLog = async (msg: string) => {
        const user = appUser?.email || 'Sistema';
        const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setLogs(prev => [{ user, msg, time }, ...prev]);

        if (id && id !== 'novo') {
            await supabase.from('order_logs').insert({
                order_id: id,
                user_name: user,
                message: msg
            });
        }
    };

    const handleSave = async (silent = false) => {
        setIsSaving(true);
        try {
            const orderPayload: any = {
                id: id === 'novo' ? undefined : id,
                order_number: orderNumber,
                salesperson: vendedor,
                status: status,
                budget_date: dataOrcamento || null,
                order_date: dataPedido || null,
                client_id: clientData.id,
                issuer: emitente,
                billing_type: modalidade,
                payment_method: opcaoPagamento,
                payment_due_date: dataLimite || null,
                supplier_departure_date: supplierDepartureDate || null,
                invoice_number: invoiceNumber || null,
                total_amount: totalRevenue,
                entry_amount: parseCurrencyToNumber(recebimentoEntrada),
                entry_date: dataEntrada || null,
                entry_confirmed: entradaConfirmed,
                remaining_amount: parseCurrencyToNumber(recebimentoRestante),
                remaining_date: dataRestante || null,
                remaining_confirmed: restanteConfirmed,
                purchase_order: purchaseOrder || null,
                layout_info: layout || null,
                observations: observacoes || null
            };

            const itemsPayload = items.map(item => ({
                id: (typeof item.id === 'string' && item.id.length > 20) ? item.id : null,
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
                tax_pct: item.taxPct,
                unforeseen_pct: item.unforeseenPct,
                margin_pct: item.marginPct,
                real_unit_price: item.realPriceUnit,
                real_customization_cost: item.realCustoPersonalizacao,
                real_supplier_transport_cost: item.realTranspFornecedor,
                real_client_transport_cost: item.realTranspCliente,
                real_extra_expense: item.realDespesaExtra,
                real_layout_cost: item.realLayoutCost,
                unit_price_paid: item.priceUnitPaid,
                customization_paid: item.custoPersonalizacaoPaid,
                supplier_transport_paid: item.transpFornecedorPaid,
                client_transport_paid: item.transpClientePaid,
                extra_expense_paid: item.despesaExtraPaid,
                layout_paid: item.layoutCostPaid,
                supplier_payment_date: item.supplier_payment_date || null,
                customization_payment_date: item.customization_payment_date || null,
                transport_payment_date: item.transport_payment_date || null,
                layout_payment_date: item.layout_payment_date || null,
                extra_payment_date: item.extra_payment_date || null,
                supplier_departure_date: item.supplier_departure_date || null,
                customization_supplier_id: item.customization_supplier_id || null,
                transport_supplier_id: item.transport_supplier_id || null,
                client_transport_supplier_id: item.client_transport_supplier_id || null,
                layout_supplier_id: item.layout_supplier_id || null,
                extra_supplier_id: item.extra_supplier_id || null
            }));

            const { data, error } = await supabase.rpc('save_order', {
                p_order: orderPayload,
                p_items: itemsPayload
            });

            if (error) throw error;

            if (!silent) toast.success('Pedido salvo com sucesso!');
            return data;
        } catch (err: any) {
            console.error('Error saving order:', err);
            if (!silent) toast.error('Erro ao salvar pedido: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAtomicStatusUpdate = async (newStatus: string) => {
        if (!id || id === 'novo') return;
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            setStatus(newStatus);
            toast.success('Status atualizado!');
            addLog(`Status alterado para ${newStatus}`);
        } catch (err: any) {
            toast.error('Erro ao atualizar status: ' + err.message);
        }
    };

    return {
        // States
        orderNumber, setOrderNumber,
        vendedor, setVendedor,
        status, setStatus,
        dataOrcamento, setDataOrcamento,
        dataPedido, setDataPedido,
        dataLimite, setDataLimite,
        emitente, setEmitente,
        modalidade, setModalidade,
        opcaoPagamento, setOpcaoPagamento,
        supplierDepartureDate, setSupplierDepartureDate,
        observacoes, setObservacoes,
        recebimentoEntrada, setRecebimentoEntrada,
        recebimentoRestante, setRecebimentoRestante,
        dataEntrada, setDataEntrada,
        dataRestante, setDataRestante,
        entradaConfirmed, setEntradaConfirmed,
        restanteConfirmed, setRestanteConfirmed,
        purchaseOrder, setPurchaseOrder,
        layout, setLayout,
        invoiceNumber, setInvoiceNumber,
        clientData, setClientData,
        
        // Items
        items,
        addItem,
        updateItem,
        removeItem,
        duplicateItem,
        totalRevenue,
        totalCostsReal,
        totalBV,
        totalTaxes,
        totalProfit,

        // Lists
        clientsList,
        suppliersList,
        productsList,
        factorsList,

        // Status/Logs
        logs,
        isSaving,
        canEditGlobal,
        isSeller,
        
        // Actions
        handleSave,
        handleAtomicStatusUpdate,
        addLog
    };
}
