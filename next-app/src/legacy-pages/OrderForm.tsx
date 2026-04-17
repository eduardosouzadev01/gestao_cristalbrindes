import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate, getTodayISO } from '../src/utils/dateUtils';
import { toast } from 'sonner';
import { ISSUERS } from '../src/components/filters/IssuerSelect';
import { useAuth } from '../lib/auth';
import { formatCurrency, parseCurrencyToNumber } from '../src/utils/formatCurrency';
import { calculateItemTotal, calculateItemRealTotal } from '../src/utils/formulas';
import { useOrderItems } from '../src/hooks/useOrderItems';
import { maskPhone, maskCpfCnpj, validateEmail, validateCpfCnpj } from '../src/utils/maskUtils';
import { CustomSelect } from '../src/components/order-form/CustomSelect';
import { Modal } from '../src/components/order-form/Modal';
import { ProductModal } from '../src/components/modals/ProductModal';
import RichTextEditor from '../src/components/common/RichTextEditor';

// --- Utils Centralized ---

const formatDoc = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").substring(0, 14);
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").substring(0, 18);
};

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);
  }
  return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
};



const OrderForm: React.FC = () => {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isReadOnlyParam = new URLSearchParams(location.search).get('mode') === 'view';
  const isNewOrder = !id || id === 'novo';

  // States
  const [status, setStatus] = useState('AGUARDANDO PAGAMENTO ENTRADA');

  const isReadOnly = isReadOnlyParam || status === 'CANCELADO';
  const canEditPayment = !isReadOnly || appUser?.email === 'cristalbrindes@cristalbrindes.com.br' || appUser?.email === 'cristalbrindes@cristalbrindes';

  // Constants
  const statusOptions = [
    'AGUARDANDO PAGAMENTO ENTRADA', 'EM PRODUÇÃO', 'EM TRANSPORTE', 'EM CONFERÊNCIA',
    'AGUARDANDO PAGAMENTO 2 PARCELA', 'ENTREGUE', 'AGUARDANDO PAGAMENTO FATURAMENTO', 'FINALIZADO', 'CANCELADO'
  ];

  // States
  const [emitente, setEmitente] = useState('CRISTAL');
  const [activeModal, setActiveModal] = useState<'CLIENTE' | 'FORNECEDOR' | 'PRODUTO' | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [confirmPayModal, setConfirmPayModal] = useState<'entrada' | 'restante' | null>(null);
  const [historia, setHistoria] = useState('');
  const [logs, setLogs] = useState<{ user: string, msg: string, time: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [activeId, setActiveId] = useState<string | undefined>(id === 'novo' ? undefined : id);
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [confirmCostPaymentModal, setConfirmCostPaymentModal] = useState<{ itemId: string | number, field: string, label: string, amount: number } | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<string | number>>(new Set());
  const [transferModal, setTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [transferTargetSalesperson, setTransferTargetSalesperson] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const toggleItemCollapse = (itemId: string | number) => {
    setCollapsedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const submitTransferRequest = async () => {
    if (!transferTargetSalesperson || !transferReason) {
      toast.error('Preencha o vendedor destino e o motivo.');
      return;
    }
    setIsTransferring(true);
    try {
      await supabase.from('seller_transfer_requests').insert({
        order_id: id,
        order_number: orderNumber,
        current_salesperson: vendedor,
        requested_salesperson: transferTargetSalesperson,
        reason: transferReason,
        status: 'PENDENTE',
        requested_by_email: appUser?.email || ''
      });
      // Notifica a gerência
      await supabase.from('notifications').insert({
        user_email: 'cristalbrindes@cristalbrindes.com.br',
        title: `🔄 Solicitação de Troca - #${orderNumber}`,
        message: `${vendedor} → ${transferTargetSalesperson}. Motivo: ${transferReason}`,
        type: 'info',
        read: false,
        link: `/crm`
      });
      toast.success('Solicitação enviada à gerência!');
      setTransferModal(false);
      setTransferReason('');
      setTransferTargetSalesperson('');
    } catch (err: any) {
      toast.error('Erro ao enviar solicitação: ' + err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  // Data Lists
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [factorsList, setFactorsList] = useState<any[]>([]);

  // Form State
  const [orderNumber, setOrderNumber] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [dataOrcamento, setDataOrcamento] = useState(getTodayISO());
  const [dataPedido, setDataPedido] = useState(getTodayISO());
  const [dataLimite, setDataLimite] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [opcaoPagamento, setOpcaoPagamento] = useState('');
  const [layout, setLayout] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [supplierDepartureDate, setSupplierDepartureDate] = useState('');
  const [clientData, setClientData] = useState({ id: '', name: '', doc: '', phone: '', email: '', emailFin: '' });
  const [recebimentoEntrada, setRecebimentoEntrada] = useState('R$ 0,00');
  const [recebimentoRestante, setRecebimentoRestante] = useState('R$ 0,00');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataRestante, setDataRestante] = useState('');
  const [entradaConfirmed, setEntradaConfirmed] = useState(false);
  const [restanteConfirmed, setRestanteConfirmed] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [adjustPriceModal, setAdjustPriceModal] = useState<{ itemId: string | number, type: 'unit' | 'total', currentVal: number } | null>(null);
  const [adjustComment, setAdjustComment] = useState('');
  const [adjustValue, setAdjustValue] = useState('');

  // useOrderItems Hook
  const {
    items,
    setItems,
    addItem,
    updateItem,
    removeItem,
    totalRevenue: totalPedidoCalculado,
    totalCostsReal: totalRealCustosCalculado
  } = useOrderItems([], orderNumber);

  // Derived Values
  const totalRecebido = (entradaConfirmed ? parseCurrencyToNumber(recebimentoEntrada) : 0) + (restanteConfirmed ? parseCurrencyToNumber(recebimentoRestante) : 0);
  const totalPedido = totalPedidoCalculado;
  const totalRealCustos = totalRealCustosCalculado;
  const saldoReal = totalRecebido - totalRealCustos;

  const [newPartnerData, setNewPartnerData] = useState({ name: '', doc: '', phone: '', email: '' });

  const savePartner = async () => {
    if (!newPartnerData.name) {
      toast.error('Por favor, preencha o nome.');
      return;
    }
    if (newPartnerData.email && !validateEmail(newPartnerData.email)) {
      toast.error('E-mail inválido.');
      return;
    }
    if (newPartnerData.doc && !validateCpfCnpj(newPartnerData.doc)) {
      toast.error('CPF/CNPJ inválido.');
      return;
    }

    setIsSaving(true);
    try {
      if (activeModal === 'PRODUTO') {
        // Não deve mais cair aqui para produto, mas manter por segurança
      } else {
        const { error } = await supabase.from('partners').insert([{
          name: newPartnerData.name,
          doc: newPartnerData.doc,
          phone: newPartnerData.phone,
          email: newPartnerData.email,
          type: activeModal
        }]);
        if (error) throw error;
      }

      toast.success('Cadastrado com sucesso!');
      setNewPartnerData({ name: '', doc: '', phone: '', email: '' });
      setActiveModal(null);
      fetchData();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      if (err.code === '42P01' || err.message?.includes('Could not find the table')) {
        toast.error('ERRO DE CONFIGURAÇÃO: Tabela não encontrada.');
      } else {
        toast.error(`Erro ao realizar o cadastro: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (id && id !== 'novo') {
      setActiveId(id);
      loadOrder(id);
    } else if (location.state?.fromBudget) {
      setActiveId(undefined);
      const { fromBudget, items: budgetItems } = location.state;
      setEmitente(fromBudget.issuer || 'CRISTAL');
      setVendedor(fromBudget.vendedor || '');
      if (fromBudget.budgetNumber) setOrderNumber(fromBudget.budgetNumber);
      if (fromBudget.budget_date) setDataOrcamento(fromBudget.budget_date);
      if (fromBudget.clientData) setClientData(fromBudget.clientData);

      if (budgetItems) {
        setItems(budgetItems.map((it: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          productName: it.productName,
          productCode: it.productCode || '',
          productColor: it.productColor || '',
          productDescription: it.productDescription || '',
          supplier_id: it.supplier_id || '',
          quantity: it.quantity || 1,
          priceUnit: it.priceUnit || 0,
          custoPersonalizacao: it.custoPersonalizacao || 0,
          transpFornecedor: it.transpFornecedor || 0,
          transpCliente: it.transpCliente || 0,
          despesaExtra: it.despesaExtra || 0,
          layoutCost: it.layoutCost || 0,
          fator: it.fator || 1.35,
          bvPct: it.bvPct || 0,
          taxPct: 0,
          unforeseenPct: 0,
          marginPct: 0,
          realPriceUnit: 0,
          realCustoPersonalizacao: 0,
          realTranspFornecedor: 0,
          realTranspCliente: 0,
          realDespesaExtra: 0,
          realLayoutCost: 0,
          priceUnitPaid: false,
          custoPersonalizacaoPaid: false,
          transpFornecedorPaid: false,
          transpClientePaid: false,
          despesaExtraPaid: false,
          layoutCostPaid: false,
          supplier_payment_date: it.supplier_payment_date || (location.state.commercialData ? location.state.commercialData.supplier_payment_dates[it.supplier_id] : null) || null,
          customization_payment_date: it.customization_payment_date || (location.state.commercialData && it.customization_supplier_id ? location.state.commercialData.supplier_payment_dates[it.customization_supplier_id] : null) || null,
          transport_payment_date: it.transport_payment_date || (location.state.commercialData && it.transport_supplier_id ? location.state.commercialData.supplier_payment_dates[it.transport_supplier_id] : null) || null,
          layout_payment_date: it.layout_payment_date || (location.state.commercialData && it.layout_supplier_id ? location.state.commercialData.supplier_payment_dates[it.layout_supplier_id] : null) || null,
          extra_payment_date: it.extra_payment_date || (location.state.commercialData && it.extra_supplier_id ? location.state.commercialData.supplier_payment_dates[it.extra_supplier_id] : null) || null,
          supplier_departure_date: it.supplier_departure_date || (location.state.commercialData ? location.state.commercialData.supplier_departure_dates[it.supplier_id] : null) || null,
          customization_supplier_id: it.customization_supplier_id || '',
          transport_supplier_id: it.transport_supplier_id || '',
          client_transport_supplier_id: it.client_transport_supplier_id || '',
          layout_supplier_id: it.layout_supplier_id || '',
          extra_supplier_id: it.extra_supplier_id || ''
        })));
      }

      if (location.state.commercialData) {
        const cd = location.state.commercialData;
        
        // Aplica a Forma de Pagamento ao elemento correspondente no Comercial
        setOpcaoPagamento(cd.payment_method || '');
        // E aplica a Forma de Pagamento também no campo Faturamento
        setModalidade(cd.payment_term || cd.payment_method || '');
        
        setSupplierDepartureDate(cd.supplier_deadline || '');
        setDataLimite(cd.shipping_deadline || '');
        setInvoiceNumber(cd.invoice_number || '');
        setPurchaseOrder(cd.purchase_order || '');
        if (cd.layout_info) setObservacoes(prev => (prev ? prev + '\n\n' : '') + 'Layout Info: ' + cd.layout_info);
        setDataEntrada(cd.entry_forecast_date || '');
        setDataRestante(cd.remaining_forecast_date || '');
      }
    }
  }, [id, location.state]);

  useEffect(() => {
    if (id && items.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.includes('#item-')) {
        const itemId = hash.split('#item-')[1];
        setTimeout(() => {
          const el = document.getElementById(`item-${itemId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-blue-400', 'ring-opacity-50');
            setTimeout(() => el.classList.remove('ring-4', 'ring-blue-400', 'ring-opacity-50'), 3000);
          }
        }, 800);
      }
    }
  }, [id, items.length]);

  const fetchData = async () => {
    try {
      const { data: partners, error: errP } = await supabase.from('partners').select('*');
      if (errP) throw errP;
      if (partners) {
        setClientsList(partners.filter(p => p.type === 'CLIENTE'));
        setSuppliersList(partners.filter(p => p.type === 'FORNECEDOR'));
      }
      const { data: products, error: errProd } = await supabase.from('products').select('*').limit(50);
      if (!errProd && products) setProductsList(products);
      const { data: factors } = await supabase.from('calculation_factors').select('*');
      if (factors) {
        const factorOrder = ["ideal", "médio", "médio", "mínimo", "minimo"];
        const sorted = [...factors].sort((a, b) => {
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
        setFactorsList(sorted);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  };

  const loadOrder = async (orderId: string) => {
    try {
      const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (error) throw error;

      setOrderNumber(order.order_number || '');
      setVendedor(order.salesperson || '');
      setStatus(order.status || 'EM ABERTO');
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

      const { data: orderItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (orderItems) {
        const mappedItems = await Promise.all(orderItems.map(async (item) => {
          const { data: pData } = await supabase.from('products')
            .select('variations, color, stock, code')
            .eq('name', item.product_name)
            .limit(10);

          let aggregatedVars: any[] = [];
          if (pData) {
            pData.forEach(p => {
              const vars = (p.variations as any[]) || [];
              vars.forEach((v: any) => {
                if (!aggregatedVars.some(av => av.color === v.color)) aggregatedVars.push(v);
              });
              if (p.color && !aggregatedVars.some(av => av.color === p.color)) {
                aggregatedVars.push({ color: p.color, stock: p.stock });
              }
            });
          }

          return {
            id: item.id || Date.now(),
            productName: item.product_name || '',
            productCode: item.product_code || (pData && pData[0]?.code) || '',
            productColor: item.product_color || '',
            productDescription: item.product_description || '',
            supplier_id: item.supplier_id || '',
            quantity: item.quantity || 0,
            priceUnit: item.unit_price || 0,
            custoPersonalizacao: item.customization_cost || 0,
            transpFornecedor: item.supplier_transport_cost || 0,
            transpCliente: item.client_transport_cost || 0,
            despesaExtra: item.extra_expense || 0,
            layoutCost: item.layout_cost || 0,
            fator: item.calculation_factor || 1.35,
            factorId: (factorsList as any[] || []).find(f => (1 + (f.tax_percent + f.contingency_percent + f.margin_percent) / 100).toFixed(4) === (item.calculation_factor || 0).toFixed(4))?.id || '',
            bvPct: item.bv_pct || 0,
            extraPct: item.extra_pct || 0,
            taxPct: item.tax_pct || 0,
            unforeseenPct: item.unforeseen_pct || 0,
            marginPct: item.margin_pct || 0,
            realPriceUnit: item.real_unit_price || 0,
            realCustoPersonalizacao: item.real_customization_cost || 0,
            realTranspFornecedor: item.real_supplier_transport_cost || 0,
            realTranspCliente: item.real_client_transport_cost || 0,
            realDespesaExtra: item.real_extra_expense || 0,
            realLayoutCost: item.real_layout_cost || 0,
            priceUnitPaid: item.unit_price_paid || false,
            custoPersonalizacaoPaid: item.customization_paid || false,
            transpFornecedorPaid: item.supplier_transport_paid || false,
            transpClientePaid: item.client_transport_paid || false,
            despesaExtraPaid: item.extra_expense_paid || false,
            layoutCostPaid: item.layout_paid || false,
            supplier_payment_date: item.supplier_payment_date || null,
            customization_payment_date: item.customization_payment_date || null,
            transport_payment_date: item.transport_payment_date || null,
            layout_payment_date: item.layout_payment_date || null,
            extra_payment_date: item.extra_payment_date || null,
            supplier_departure_date: item.supplier_departure_date || null,
            customization_supplier_id: item.customization_supplier_id || '',
            transport_supplier_id: item.transport_supplier_id || '',
            client_transport_supplier_id: item.client_transport_supplier_id || '',
            layout_supplier_id: item.layout_supplier_id || '',
            extra_supplier_id: item.extra_supplier_id || '',
            variations: aggregatedVars
          };
        }));
        setItems(mappedItems);
      }

      const { data: dbLogs } = await supabase.from('order_logs').select('*').eq('order_id', orderId).order('created_at', { ascending: false });
      if (dbLogs) {
        setLogs(dbLogs.map(l => ({
          user: l.user_name,
          msg: l.message,
          time: new Date(l.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar pedido:', err);
      toast.error('Erro ao carregar pedido.');
    }
  };

  // Auto-set salesperson for restricted users
  useEffect(() => {
    if (appUser?.salesperson) {
      setVendedor(appUser.salesperson);
    }
  }, [appUser]);

  const logOrderChange = async (fieldName: string, oldValue: any, newValue: any, description: string) => {
    if (!id || id === 'novo') return;
    try {
      await supabase.from('order_change_logs').insert([{
        order_id: id,
        user_email: appUser?.email || 'Sistema',
        field_name: fieldName,
        old_value: String(oldValue),
        new_value: String(newValue),
        description
      }]);
    } catch (err) {
      console.error('Erro ao logar alteração:', err);
    }
  };

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

  const confirmPaymentAction = async () => {
    if (confirmPayModal === 'entrada') {
      setEntradaConfirmed(true);
      addLog(`Pagamento de Entrada (${recebimentoEntrada}) confirmado.`);
      if (isReadOnly && !isNewOrder) {
        // Atomic update for ReadOnly/View mode
        await atomicUpdatePayment('entrada', true, new Date().toISOString());
      }
    } else if (confirmPayModal === 'restante') {
      setRestanteConfirmed(true);
      addLog(`Pagamento Restante (${recebimentoRestante}) confirmado.`);
      if (isReadOnly && !isNewOrder) {
        // Atomic update for ReadOnly/View mode
        await atomicUpdatePayment('restante', true, new Date().toISOString());
      }
    }
    setConfirmPayModal(null);
  };

  const atomicUpdatePayment = async (type: 'entrada' | 'restante', confirmed: boolean, date: string) => {
    if (!id || id === 'novo') return;
    try {
      // Re-use save_order logic but we can also just update specific fields if needed.
      // However, save_order handles commissions logic which is critical here.
      // So we will call submitOrder (which calls save_order) but we need to ensure state is up to date.
      // Since react state updates are async, we might be calling this with old state if we are not careful?
      // Actually, setEntradaConfirmed(true) queues the update.
      // It is safer to construct the payload with the new values explicitly.

      const payloadEntryConfirmed = type === 'entrada' ? confirmed : entradaConfirmed;
      const payloadRemainingConfirmed = type === 'restante' ? confirmed : restanteConfirmed;

      // Construct minimal necessary payload for save_order or just call submitOrder?
      // Calling submitOrder() might trigger validation alerts which we might want to avoid if just clicking a button?
      // But we need validation. Let's try to invoke submitOrder() but with a flag or just replicate the RPC call.
      // Replicating is safer to avoid side effects of full validation on view mode.

      const orderPayload = {
        id: id,
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
        total_amount: totalPedido,
        entry_amount: parseCurrencyToNumber(recebimentoEntrada),
        entry_date: type === 'entrada' ? date : (dataEntrada || null),
        entry_confirmed: payloadEntryConfirmed,
        remaining_amount: parseCurrencyToNumber(recebimentoRestante),
        remaining_date: type === 'restante' ? date : (dataRestante || null),
        remaining_confirmed: payloadRemainingConfirmed,
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

      const { error } = await supabase.rpc('save_order', {
        p_order: orderPayload,
        p_items: itemsPayload
      });

      if (error) throw error;
      toast.success('Pagamento confirmado e salvo com sucesso!');

    } catch (err: any) {
      console.error('Erro ao salvar pagamento:', err);
      toast.error('Erro ao salvar pagamento: ' + err.message);
    }
  };

  const atomicUpdateStatus = async (newStatus: string) => {
    if (!id || id === 'novo') return;
    const oldStatus = status;
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) {
        console.error('Erro detalhado:', error);
        toast.error(`Erro ao atualizar status: ${error.message || error.details || 'Desconhecido'}`);
      } else {
        toast.success('Status atualizado');
        logOrderChange('status', oldStatus, newStatus, 'Alteração rápida de status na listagem/formulário');
        addLog(`Status alterado para ${newStatus}`);
      }
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status: ' + err.message);
    }
  };

  const atomicUpdateCostPayment = async (itemId: string | number, field: string, value: boolean) => {
    if (!id || id === 'novo') return;
    // We need to save the whole order again to ensure consistency? 
    // Or just update the specific item? 
    // The save_order RPC handles everything. Let's use it to be safe and consistent.
    // We need to update the local state first, then call save.

    // Actually, state is already updated in confirmCostPaymentAction via updateItem
    // But we need to grab that updated state.
    // Since setItems is async, we should probably construct the payload manually with the change.

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        // Construct the key for the paid flag
        // field is like 'custoPersonalizacao'
        const map: any = {
          priceUnit: 'priceUnitPaid',
          custoPersonalizacao: 'custoPersonalizacaoPaid',
          transpFornecedor: 'transpFornecedorPaid',
          transpCliente: 'transpClientePaid',
          despesaExtra: 'despesaExtraPaid',
          layoutCost: 'layoutCostPaid'
        };
        return { ...item, [map[field]]: value };
      }
      return item;
    });

    const itemsPayload = updatedItems.map(item => ({
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
      total_item_value: calculateItemTotal(item),
      bv_pct: item.bvPct,
      extra_pct: item.extraPct,
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

    const orderPayload = {
      id: id,
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
      invoice_number: invoiceNumber || null,
      total_amount: totalPedido,
      entry_amount: parseCurrencyToNumber(recebimentoEntrada),
      entry_date: dataEntrada || null,
      entry_confirmed: entradaConfirmed,
      remaining_amount: parseCurrencyToNumber(recebimentoRestante),
      remaining_date: dataRestante || null,
      remaining_confirmed: restanteConfirmed,
      purchase_order: purchaseOrder || null,
      layout_info: layout || null,
      observations: observacoes || null,
      supplier_departure_date: supplierDepartureDate || null
    };

    try {
      const { error } = await supabase.rpc('save_order', {
        p_order: orderPayload,
        p_items: itemsPayload
      });
      if (error) throw error;
      toast.success('Pagamento de custo confirmado e salvo!');
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao salvar custo: ' + e.message);
    }
  };

  const confirmCostPaymentAction = () => {
    if (!confirmCostPaymentModal) return;
    const { itemId, field, label, amount } = confirmCostPaymentModal;

    // Find the paid field mapping
    const paidFieldMap: any = {
      priceUnit: 'priceUnitPaid',
      custoPersonalizacao: 'custoPersonalizacaoPaid',
      transpFornecedor: 'transpFornecedorPaid',
      transpCliente: 'transpClientePaid',
      despesaExtra: 'despesaExtraPaid',
      layoutCost: 'layoutCostPaid'
    };

    updateItem(itemId, paidFieldMap[field], true);
    addLog(`Pagamento confirmado: ${label} - ${formatCurrency(amount)}`);

    if (isReadOnly && !isNewOrder) {
      atomicUpdateCostPayment(itemId, field, true);
    }

    setConfirmCostPaymentModal(null);
  };

  const openPriceAdjustment = (itemId: string | number, type: 'unit' | 'total', currentVal: number) => {
    if (isReadOnly) return;
    setAdjustPriceModal({ itemId, type, currentVal });
    setAdjustValue(formatCurrency(currentVal).replace('R$', '').trim());
    setAdjustComment('');
  };

  const confirmPriceAdjustment = () => {
    if (!adjustPriceModal) return;
    const { itemId, type } = adjustPriceModal;
    const newVal = parseCurrencyToNumber(adjustValue);

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    let newTotal = newVal;
    if (type === 'unit') {
      newTotal = newVal * item.quantity;
    }

    // Recover costs
    const custoProduto = item.quantity * item.priceUnit;
    const somaCustos = custoProduto + item.custoPersonalizacao + item.transpFornecedor + item.transpCliente + item.despesaExtra + item.layoutCost;

    const bvFactor = 1 - (item.bvPct / 100);

    if (newTotal <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    // Logic: Fator = 2 - (Cost / (Price * (1 - BV)))
    // Price includes BV. BaseSale = Price * (1 - BV) = Cost / (2 - Fator)
    let newFator = 2 - (somaCustos / (newTotal * bvFactor));

    // Safety check? No, let the user override.

    const oldFator = item.fator;
    updateItem(itemId, 'fator', newFator);
    addLog(`Ajuste manual de preço (${type === 'unit' ? 'Unitário' : 'Total'}): ${formatCurrency(newVal)}. Motivo: ${adjustComment || 'Sem motivo'}`);
    logOrderChange('fator', oldFator, newFator, `Ajuste manual de preço. Motivo: ${adjustComment}`);

    setAdjustPriceModal(null);
    setAdjustComment('');
    setAdjustValue('');
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

  const validate = () => {
    const newErrors: string[] = [];
    if (!orderNumber) newErrors.push('orderNumber');
    if (!vendedor) newErrors.push('vendedor');
    if (!dataOrcamento) newErrors.push('dataOrcamento');
    if (!dataPedido) newErrors.push('dataPedido');
    if (!clientData.name) newErrors.push('clientName');
    if (!modalidade) newErrors.push('modalidade');

    if (!dataLimite) newErrors.push('dataLimite');
    
    items.forEach((it, idx) => {
      if (!it.supplier_departure_date) newErrors.push(`supplierDepartureDate-${idx}`);
    });

    items.forEach((it, idx) => {
      if (!it.productName) newErrors.push(`productName-${idx}`);
      if (it.quantity <= 0) newErrors.push(`quantity-${idx}`);
      if (it.priceUnit <= 0) newErrors.push(`priceUnit-${idx}`);
    });

    setErrors(newErrors);

    if (newErrors.length > 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios marcados em vermelho.');
      return;
    }
    const valEntrada = parseCurrencyToNumber(recebimentoEntrada);
    const valRestante = parseCurrencyToNumber(recebimentoRestante);
    if (Math.abs((valEntrada + valRestante) - totalPedido) > 0.01) {
      toast.warning(`Atenção: Soma dos recebimentos (${formatCurrency(valEntrada + valRestante)}) difere do total (${formatCurrency(totalPedido)}).`);
      return;
    }
    submitOrder();
  };

  const submitOrder = async () => {
    if (isSavingRef.current) return;
    setIsSaving(true);
    isSavingRef.current = true;
    try {
      // Construct Order Header Payload
      const orderPayload = {
        id: activeId || null,
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
        total_amount: totalPedido,
        entry_amount: parseCurrencyToNumber(recebimentoEntrada),
        entry_date: dataEntrada || null,
        entry_confirmed: entradaConfirmed,
        remaining_amount: parseCurrencyToNumber(recebimentoRestante),
        remaining_date: dataRestante || null,
        remaining_confirmed: restanteConfirmed,
        purchase_order: purchaseOrder,
        layout_info: layout,
        supplier_departure_date: supplierDepartureDate || null,
        invoice_number: invoiceNumber,
        observations: observacoes
      };

      // Construct Order Items Payload
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
        client_transport_cost: item.transpCliente, // fixed
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

      // Call RPC
      const { data, error } = await supabase.rpc('save_order', {
        p_order: orderPayload,
        p_items: itemsPayload
      });

      if (error) throw error;

      if (id === 'novo' && location.state?.fromBudget?.budgetId) {
        await supabase.from('budgets').update({ status: 'PROPOSTA ACEITA' }).eq('id', location.state.fromBudget.budgetId);
      }

      toast.success('Pedido salvo com sucesso! ID: ' + data);
      setActiveId(data);
      navigate('/pedidos');

    } catch (err: any) {
      console.error('Erro ao salvar pedido:', err);
      if (err.message?.includes('Could not find the function')) {
        toast.error('ERRO CRÍTICO: Função save_order não encontrada.');
      } else {
        toast.error(`Erro ao salvar o pedido: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  return (
    <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20">

      {/* Product Form Modal */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSaveSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Modal de Solicitação de Troca de Vendedor */}
      <Modal isOpen={transferModal} onClose={() => setTransferModal(false)} title="SOLICITAR TROCA DE VENDEDOR">
        <div className="py-2 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
            <p className="font-medium">Pedido: <span className="font-bold">#{orderNumber}</span> | Vendedor atual: <span className="font-bold">{vendedor}</span></p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Transferir para *</label>
            <select
              className="form-select w-full rounded-lg border-gray-300 text-sm"
              value={transferTargetSalesperson}
              onChange={(e) => setTransferTargetSalesperson(e.target.value)}
            >
              <option value="">Selecione o vendedor...</option>
              {['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05']
                .filter(s => s !== vendedor)
                .map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Motivo da solicitação *</label>
            <textarea
              className="form-textarea w-full rounded-lg border-gray-300 text-sm"
              rows={3}
              placeholder="Descreva o motivo da transferência..."
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setTransferModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button
              onClick={submitTransferRequest}
              disabled={isTransferring || !transferTargetSalesperson || !transferReason}
              className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-icons-outlined text-sm">send</span>
              {isTransferring ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Cadastro (Partners) */}
      <Modal isOpen={!!activeModal && activeModal !== 'PRODUTO'} onClose={() => { setActiveModal(null); setNewPartnerData({ name: '', doc: '', phone: '', email: '' }); }} title={`CADASTRAR NOVO ${activeModal}`}>
        <form onSubmit={(e) => { e.preventDefault(); savePartner(); }} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome / Descrição <span className="text-red-500">*</span></label>
            <input
              required
              className="form-input w-full rounded-lg border-gray-300"
              placeholder="Digite o nome..."
              value={newPartnerData.name}
              onChange={e => setNewPartnerData({ ...newPartnerData, name: e.target.value })}
            />
          </div>
          {activeModal !== 'PRODUTO' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CNPJ / CPF <span className="text-red-500">*</span></label>
                <input
                  className="form-input w-full rounded-lg border-gray-300"
                  placeholder="00.000.000/0000-00"
                  value={newPartnerData.doc}
                  onChange={(e) => setNewPartnerData({ ...newPartnerData, doc: formatDoc(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone <span className="text-red-500">*</span></label>
                <input
                  className="form-input w-full rounded-lg border-gray-300"
                  placeholder="(00) 00000-0000"
                  value={newPartnerData.phone}
                  onChange={(e) => setNewPartnerData({ ...newPartnerData, phone: formatPhone(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail <span className="text-red-500">*</span></label>
                <input
                  className="form-input w-full rounded-lg border-gray-300"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={newPartnerData.email}
                  onChange={e => setNewPartnerData({ ...newPartnerData, email: e.target.value })}
                />
              </div>
            </>
          )}
          <button type="submit" className="w-full py-3 bg-blue-500 text-white font-bold rounded-lg mt-2 uppercase">SALVAR CADASTRO</button>
        </form>
      </Modal>

      {/* Modal de Confirmação de Pagamento */}
      <Modal isOpen={!!confirmPayModal} onClose={() => setConfirmPayModal(null)} title="CONFIRMAR RECEBIMENTO">
        <div className="text-center py-4">
          <span className="material-icons-outlined text-6xl text-blue-500 mb-4">account_balance_wallet</span>
          <p className="text-gray-600 mb-6 font-medium">Você confirma que o valor de <span className="font-bold text-gray-900">{confirmPayModal === 'entrada' ? recebimentoEntrada : recebimentoRestante}</span> foi devidamente recebido?</p>
          <div className="flex gap-4">
            <button onClick={() => setConfirmPayModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs">CANCELAR</button>
            <button onClick={confirmPaymentAction} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-blue-100">CONFIRMAR</button>
          </div>
        </div>
      </Modal>

      {/* Modal de Confirmação de Pagamento de Custo */}
      <Modal isOpen={!!confirmCostPaymentModal} onClose={() => setConfirmCostPaymentModal(null)} title="CONFIRMAR PAGAMENTO DE CUSTO">
        <div className="text-center py-4">
          <span className="material-icons-outlined text-6xl text-blue-500 mb-4">monetization_on</span>
          <p className="text-gray-600 mb-6 font-medium">
            Confirma o pagamento de <span className="font-bold text-gray-900">{confirmCostPaymentModal?.label}</span> no valor de <span className="font-bold text-gray-900">{formatCurrency(confirmCostPaymentModal?.amount || 0)}</span>?
          </p>
          <div className="flex gap-4">
            <button onClick={() => setConfirmCostPaymentModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs">CANCELAR</button>
            <button onClick={confirmCostPaymentAction} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-blue-100">CONFIRMAR</button>
          </div>
        </div>
      </Modal>

      {/* Modal de Ajuste de Preço */}
      <Modal isOpen={!!adjustPriceModal} onClose={() => setAdjustPriceModal(null)} title="AJUSTE MANUAL DE PREÇO">
        <div className="py-4">
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
            <p className="text-sm text-yellow-800 font-medium">Atenção: Ao alterar o preço final, o Fator de Cálculo será ajustado automaticamente para atingir o valor desejado.</p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Novo Valor {adjustPriceModal?.type === 'unit' ? 'Unitário' : 'Total'}</label>
            <input
              autoFocus
              className="form-input w-full text-center text-2xl font-bold text-blue-600 rounded-xl border-blue-300 focus:ring-blue-500"
              value={adjustValue}
              onChange={(e) => setAdjustValue(formatCurrency(parseCurrencyToNumber(e.target.value)))}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivo da Alteração <span className="text-red-500">*</span></label>
            <textarea
              className="form-textarea w-full rounded-lg border-gray-300"
              rows={3}
              placeholder="Descreva o motivo deste ajuste..."
              value={adjustComment}
              onChange={(e) => setAdjustComment(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setAdjustPriceModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs">CANCELAR</button>
            <button onClick={confirmPriceAdjustment} disabled={!adjustComment} className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold uppercase text-xs shadow-lg shadow-blue-100 disabled:opacity-50">CONFIRMAR AJUSTE</button>
          </div>
        </div>
      </Modal>

      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
            <span className="material-icons-outlined text-xl">arrow_back</span>
          </button>
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl flex items-center gap-3 uppercase tracking-tighter">
            <span className="material-icons-outlined text-blue-500 text-3xl">post_add</span>
            {activeId ? 'VISUALIZAR PEDIDO' : 'ABERTURA DE PEDIDO'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Botão Solicitar Troca de Vendedor - apenas para usuários vendedor em pedidos existentes */}
          {appUser?.salesperson && !isNewOrder && (
            <button
              onClick={() => setTransferModal(true)}
              className="px-4 py-2 rounded-lg border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span className="material-icons-outlined text-sm">swap_horiz</span>
              Solicitar Troca de Vendedor
            </button>
          )}
          {!isReadOnly && !isNewOrder && (
            <button
              onClick={async () => {
                if (window.confirm('TEM CERTEZA QUE DESEJA CANCELAR ESTE PEDIDO? Esta ação desabilitará edições e removerá os valores do financeiro.')) {
                  setStatus('CANCELADO');
                  await supabase.from('orders').update({ status: 'CANCELADO' }).eq('id', id);
                  toast.success('Pedido Cancelado com Sucesso');
                }
              }}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 text-[12px] font-semibold transition-all"
            >
              Cancelar Pedido
            </button>
          )}
          {!isReadOnly && (
            <button onClick={validate} disabled={isSaving} className="px-6 py-2.5 rounded-lg shadow-sm text-[13px] font-semibold text-white bg-[#0F6CBD] hover:bg-[#0c5aa5] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? 'Salvando...' : (!!location.state?.fromBudget ? 'Criar Pedido' : 'Finalizar Abertura')}
            </button>
          )}
        </div>
      </div>

      {/* Status Stepper - Minimalist style */}
      {!isNewOrder && (
        <div className="mb-6 px-4 py-2 overflow-x-auto">
          <div className="flex items-center justify-center min-w-[700px]">
            {(() => {
              const isCancelled = status === 'CANCELADO';
              if (isCancelled) {
                return (
                  <div className="flex items-center gap-3 bg-red-50 border border-red-100 px-8 py-4 rounded-2xl animate-pulse">
                    <span className="material-icons-outlined text-red-500 text-3xl">cancel</span>
                    <div className="flex flex-col">
                      <span className="text-red-900 font-black text-xl leading-none uppercase tracking-tighter">Pedido Cancelado</span>
                      <span className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-1">Este pedido foi descontinuado e não gera mais movimentações</span>
                    </div>
                  </div>
                );
              }

              const stepperConfig = [
                { label: 'AGUARDANDO PAGAMENTO ENTRADA', icon: 'credit_card', short: '1ª Parcela' },
                { label: 'EM PRODUÇÃO', icon: 'precision_manufacturing', short: 'Produção' },
                { label: 'EM TRANSPORTE', icon: 'local_shipping', short: 'Transporte' },
                { label: 'EM CONFERÊNCIA', icon: 'fact_check', short: 'Conferência' },
                { label: 'AGUARDANDO PAGAMENTO 2 PARCELA', icon: 'account_balance_wallet', short: 'Pag. 2ª Parc' },
                { label: 'ENTREGUE', icon: 'check_circle_outline', short: 'Entregue' },
              ];
              let currentIdx = stepperConfig.findIndex(s => s.label === status);
              if (status === 'FINALIZADO' || status === 'AGUARDANDO PAGAMENTO FATURAMENTO') {
                currentIdx = stepperConfig.length; // mark all as completed
              }


              return stepperConfig.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isFuture = idx > currentIdx;
                return (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 72 }}>
                      <button
                        onClick={() => {
                          if (!isReadOnly || (!isNewOrder && isReadOnly)) {
                            const newStatus = step.label;
                            if (newStatus === 'FINALIZADO') {
                              const isAdmin = appUser?.email?.includes('admin') || appUser?.permissions?.fullAccess;
                              if (!isAdmin) { toast.error('Apenas administradores podem finalizar.'); return; }
                            }
                            setStatus(newStatus);
                            if (isReadOnly && !isNewOrder) atomicUpdateStatus(newStatus);
                          }
                        }}
                        title={step.label}
                        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${isCompleted
                          ? 'bg-[#0F6CBD] border-[#0F6CBD] text-white'
                          : isCurrent
                            ? 'bg-[#0F6CBD] border-[#0F6CBD] text-white shadow-lg shadow-blue-200/60 scale-110'
                            : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}
                      >
                        <span className="material-icons-outlined" style={{ fontSize: 18 }}>
                          {isCompleted ? 'check' : step.icon}
                        </span>
                      </button>
                      <span className={`text-[9px] font-semibold mt-2 text-center uppercase tracking-wider leading-tight ${isCurrent ? 'text-[#0F6CBD]' : isCompleted ? 'text-[#0F6CBD]/70' : 'text-gray-400'
                        }`} style={{ maxWidth: 64, display: 'block' }}>
                        {step.short}
                      </span>
                    </div>
                    {idx < stepperConfig.length - 1 && (
                      <div className={`flex-1 h-[2px] mx-2 rounded-full transition-all duration-300 ${idx < currentIdx ? 'bg-[#0F6CBD]' : 'bg-gray-200'
                        }`} />
                    )}
                  </React.Fragment>
                );
              });
            })()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <span className="material-icons-outlined text-blue-500">info</span>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações Gerais</h3>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-blue-500 uppercase mb-2">Pedido <span className="text-red-500">*</span></label>
                <input
                  disabled={isReadOnly || !!location.state?.fromBudget}
                  className={`form-input block w-full text-center rounded-lg font-bold py-2 ${errors.includes('orderNumber') ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-500'} ${(isReadOnly || !!location.state?.fromBudget) ? 'bg-gray-100' : ''}`}
                  placeholder="DIGITE O Nº"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Vendedor <span className="text-red-500">*</span></label>
                <select
                  disabled={isReadOnly || !!appUser?.salesperson}
                  className={`form-select block w-full py-2 rounded-lg text-sm font-bold ${errors.includes('vendedor') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${(isReadOnly || !!appUser?.salesperson) ? 'bg-gray-100' : ''}`}
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                >
                  <option value="">SELECIONE...</option>
                  <option value="VENDAS 01">VENDAS 01</option>
                  <option value="VENDAS 02">VENDAS 02</option>
                  <option value="VENDAS 03">VENDAS 03</option>
                  <option value="VENDAS 04">VENDAS 04</option>
                  <option value="VENDAS 05">VENDAS 05</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status <span className="text-red-500">*</span></label>
                <div className="relative flex items-center">
                  <span className="material-icons-outlined absolute left-3 text-gray-400 pointer-events-none z-10">info</span>
                  <select
                    disabled={isReadOnly && isNewOrder}
                    className={`form-select block w-full pl-10 rounded-lg text-sm ${errors.includes('status') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${(isReadOnly && isNewOrder) ? 'bg-gray-100' : ''}`}
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'FINALIZADO') {
                        // Simulação de verificação de Admin
                        const isAdmin = appUser?.email?.includes('admin') || appUser?.permissions?.fullAccess;
                        if (!isAdmin) {
                          toast.error('Apenas administradores podem finalizar.');
                          return;
                        }
                      }
                      setStatus(val);
                      if (isReadOnly && !isNewOrder) {
                        atomicUpdateStatus(val);
                      }
                    }}
                  >
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="relative col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data do Orç. <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className="material-icons-outlined absolute left-3 text-gray-400 pointer-events-none">calendar_month</span>
                  {isReadOnly ? (
                    <div className="form-input block w-full pl-10 rounded-lg text-sm border-gray-300 bg-gray-100 font-bold text-gray-700 py-2">
                      {formatDate(dataOrcamento)}
                    </div>
                  ) : (
                    <input type="date" lang="pt-BR" className={`form-input block w-full pl-10 rounded-lg text-sm ${errors.includes('dataOrcamento') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} value={dataOrcamento} onChange={(e) => setDataOrcamento(e.target.value)} />
                  )}
                </div>
              </div>
              <div className="relative col-span-3">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data do Pedido <span className="text-red-500">*</span></label>
                <div className="flex items-center">
                  <span className="material-icons-outlined absolute left-3 text-gray-400 pointer-events-none">event_available</span>
                  {isReadOnly ? (
                    <div className="form-input block w-full pl-10 rounded-lg text-sm border-gray-300 bg-gray-100 font-bold text-gray-700 py-2">
                      {formatDate(dataPedido)}
                    </div>
                  ) : (
                    <input type="date" lang="pt-BR" className={`form-input block w-full pl-10 rounded-lg text-sm ${errors.includes('dataPedido') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'}`} value={dataPedido} onChange={(e) => setDataPedido(e.target.value)} />
                  )}
                </div>
              </div>

              <div className="col-span-12 mt-2 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Emitente</label>
                <div className="grid grid-cols-3 gap-3">
                  {ISSUERS.map(issuer => (
                    <button
                      key={issuer.id}
                      disabled={isReadOnly}
                      onClick={() => setEmitente(issuer.id)}
                      className={`py-2 px-2 border-2 rounded-lg font-bold text-[9px] transition-all uppercase ${emitente === issuer.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {issuer.fullName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <span className="material-icons-outlined text-blue-500">person</span>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dados do Cliente</h3>
            </div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <CustomSelect
                  label="Nome / Razão Social *"
                  options={clientsList}
                  onSelect={(c) => setClientData({
                    id: c.id,
                    name: c.name,
                    doc: c.doc || '',
                    phone: c.phone || '',
                    email: c.email || '',
                    emailFin: c.financial_email || ''
                  })}
                  onAdd={() => setActiveModal('CLIENTE')}
                  error={errors.includes('clientName')}
                  placeholder={clientData.name || "Selecione..."}
                  disabled={isReadOnly}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CNPJ / CPF</label>
                <input className="form-input w-full rounded-lg border-gray-200 text-sm bg-gray-50" value={clientData.doc} readOnly />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Telefone</label>
                <input className="form-input w-full rounded-lg border-gray-200 text-sm bg-gray-50" value={clientData.phone} readOnly />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail Contato</label>
                <input className="form-input w-full rounded-lg border-gray-200 text-sm bg-gray-50" value={clientData.email} readOnly />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">E-mail Financeiro</label>
                <input disabled={isReadOnly} className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`} value={clientData.emailFin} onChange={(e) => setClientData({ ...clientData, emailFin: e.target.value })} />
              </div>
            </div>
          </section>

          {items.map((item, index) => {
            const isCollapsed = collapsedItems.has(item.id);
            return (
              <div key={item.id} id={`item-${item.id}`} className="bg-white rounded-xl border border-gray-100 transition-all duration-300 hover:border-blue-200" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                {/* Product Header - always visible, clickable to collapse */}
                <div
                  className="flex justify-between items-center px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleItemCollapse(item.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-[#0F6CBD] rounded-full"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Produto {index + 1}</span>
                    {isCollapsed && item.productName && (
                      <span className="text-[13px] font-bold text-gray-700 ml-2">{item.productName}</span>
                    )}
                    {isCollapsed && item.productName && (
                      <span className="text-[11px] text-gray-400 font-medium">· {item.quantity} un</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isCollapsed && item.productName && (
                      <span className="text-[13px] font-semibold text-[#0F6CBD]">{formatCurrency(calculateItemTotal(item))}</span>
                    )}
                    {!isReadOnly && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      >
                        <span className="material-icons-outlined text-[18px]">delete</span>
                      </button>
                    )}
                    <span className={`material-icons-outlined text-gray-400 text-[18px] transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Collapsible content */}
                {!isCollapsed && (
                  <div className="px-5 pb-5">

                    <div className="grid grid-cols-12 gap-x-3 gap-y-2 items-end mb-4">
                      <div className="col-span-12 lg:col-span-4">
                        <CustomSelect
                          label="Produto *"
                          options={productsList}
                          onSelect={(v) => {
                            updateItem(item.id, 'productName', v.name);
                            updateItem(item.id, 'productCode', v.code);
                            updateItem(item.id, 'priceUnit', v.unit_price || 0); // Automatic price
                            let desc = v.description ? v.description.replace(/\n/g, '<br>') : '';
                            if (v.code) {
                              desc = `<b>Ref: ${v.code}</b><br><br>${desc}`;
                            }
                            updateItem(item.id, 'productDescription', desc);
                          }}
                          onAdd={() => setIsProductModalOpen(true)}
                          error={errors.includes(`productName-${index}`)}
                          disabled={isReadOnly}
                          onSearch={searchProducts}
                          value={item.productName}
                          placeholder="Selecione..."
                        />
                      </div>
                      <div className="col-span-3 lg:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd *</label>
                        <input
                          type="number"
                          disabled={isReadOnly}
                          className={`form-input w-full rounded-lg text-center font-bold ${errors.includes(`quantity-${index}`) ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${isReadOnly ? 'bg-gray-100' : ''}`}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-6 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ref *</label>
                        <input
                          type="text"
                          disabled={isReadOnly}
                          className={`form-input w-full rounded-lg text-center font-bold border-gray-300 ${isReadOnly ? 'bg-gray-100' : ''}`}
                          value={item.productCode || ''}
                          onChange={(e) => updateItem(item.id, 'productCode', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3 lg:col-span-3">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cor *</label>
                        {(() => {
                           // Try to find variations logic. Here we just offer a text input for simplicity
                           // just like budget does when it doesn't have variations loaded
                           // Since product colors might not be preloaded here, we use input
                           return (
                             <input
                               type="text"
                               disabled={isReadOnly}
                               placeholder="Digite a cor..."
                               className={`form-input w-full rounded-lg border-gray-300 text-[11px] font-bold py-2 ${isReadOnly ? 'bg-gray-100' : ''}`}
                               value={item.productColor || ''}
                               onChange={(e) => updateItem(item.id, 'productColor', e.target.value)}
                             />
                           )
                        })()}
                      </div>
                      <div className="col-span-6 lg:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Preço Unit.*</label>
                        <input
                          disabled={isReadOnly}
                          className={`form-input w-full rounded-lg border-gray-300 text-right font-black py-2 text-[11px] text-blue-700 bg-blue-50/50 ${errors.includes(`priceUnit-${index}`) ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                          placeholder="R$ 0,00"
                          value={formatCurrency(item.priceUnit)}
                          onChange={(e) => updateItem(item.id, 'priceUnit', parseCurrencyToNumber(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase">Descrição do Item (Orçamento/Proposta)</label>
                      </div>
                                            <RichTextEditor
                                              className="w-full text-[10px] rounded-lg border-gray-200 py-1"
                                              value={item.productDescription || ''}
                                              onChange={val => updateItem(item.id, 'productDescription', val)}
                                              placeholder="Descrição opcional..."
                                              disabled={isReadOnly}
                                            />
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-12 gap-4 items-end border border-gray-100">
                        <div className="col-span-12 lg:col-span-6">
                          <CustomSelect
                            label="Fornecedor Produto"
                            options={suppliersList}
                            onSelect={(s) => updateItem(item.id, 'supplier_id', s.id)}
                            onAdd={() => setActiveModal('FORNECEDOR')}
                            disabled={isReadOnly}
                            value={suppliersList.find(s => s.id === item.supplier_id)?.name || ''}
                          />
                        </div>
                        <div className="col-span-6 lg:col-span-3 text-right">
                          <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Saída do Fornec. *</label>
                          <input
                            type="date"
                            lang="pt-BR"
                            disabled={isReadOnly}
                            className={`form-input w-full rounded-lg text-sm border-gray-300 font-bold text-gray-700 ${errors.includes(`supplierDepartureDate-${index}`) ? 'border-red-500 ring-1 ring-red-500' : ''} ${isReadOnly ? 'bg-gray-100' : ''}`}
                            value={item.supplier_departure_date || ''}
                            onChange={(e) => updateItem(item.id, 'supplier_departure_date', e.target.value)}
                          />
                        </div>
                        <div className="col-span-6 lg:col-span-3 text-right">
                          <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Custo Prod.</label>
                          <div className="py-2 font-bold text-blue-600">{formatCurrency(item.quantity * item.priceUnit)}</div>
                        </div>

                        {/* Real Unit Price Management */}
                        {!isNewOrder && (
                          <div className="col-span-12 mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              <div className="col-span-12 md:col-span-5">
                                <div className="flex items-center gap-2">
                                  <span className="material-icons-outlined text-gray-400 text-sm">payments</span>
                                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Valor Real Unitário</label>
                                </div>
                                {item.supplier_payment_date && (
                                  <div className="mt-1 flex items-center gap-1 text-[9px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full w-fit border border-blue-100 uppercase tracking-tighter">
                                    <span className="material-icons-outlined text-[10px]">event</span>
                                    Previsão de pagamento Pgto: {formatDate(item.supplier_payment_date)}
                                  </div>
                                )}
                              </div>

                              <div className="col-span-6 md:col-span-3 flex gap-2 items-center">
                                <input
                                  disabled={item.priceUnitPaid}
                                  className={`form-input w-full text-sm py-1.5 rounded-lg text-right font-bold ${item.priceUnitPaid ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-300'}`}
                                  placeholder="R$ 0,00"
                                  value={formatCurrency(item.realPriceUnit)}
                                  onChange={(e) => updateItem(item.id, 'realPriceUnit', parseCurrencyToNumber(e.target.value))}
                                />
                                <button
                                  onClick={() => {
                                    if (!item.priceUnitPaid) {
                                      setConfirmCostPaymentModal({
                                        itemId: item.id,
                                        field: 'priceUnit',
                                        label: 'Preço Unitário do Produto',
                                        amount: item.realPriceUnit
                                      });
                                    }
                                  }}
                                  disabled={item.priceUnitPaid}
                                  className={`p-2 rounded-lg transition-all ${item.priceUnitPaid ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-200 text-gray-400 hover:bg-blue-500 hover:text-white'}`}
                                  title={item.priceUnitPaid ? "Pago" : "Confirmar Pagamento"}
                                >
                                  <span className="material-icons-outlined text-base">check</span>
                                </button>
                              </div>

                              <div className="col-span-6 md:col-span-4 pl-3 border-l border-gray-100">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Custo Total Real</p>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm font-bold text-gray-700">{formatCurrency((item.realPriceUnit || 0) * item.quantity)}</span>
                                  <span className="text-[9px] text-gray-400">({item.quantity} un × {formatCurrency(item.realPriceUnit || 0)})</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {['custoPersonalizacao', 'layoutCost', 'transpFornecedor', 'transpCliente', 'despesaExtra'].map(f => {
                        const labelMap: any = {
                          custoPersonalizacao: 'Custo De Personalização',
                          transpFornecedor: 'Transp Fornecedor',
                          transpCliente: 'Transp Cliente',
                          despesaExtra: 'Despesa Extra',
                          layoutCost: 'Pagamento De Layout'
                        };
                        const realFieldMap: any = {
                          custoPersonalizacao: 'realCustoPersonalizacao',
                          transpFornecedor: 'realTranspFornecedor',
                          transpCliente: 'realTranspCliente',
                          despesaExtra: 'realDespesaExtra',
                          layoutCost: 'realLayoutCost'
                        };
                        const paidFieldMap: any = {
                          custoPersonalizacao: 'custoPersonalizacaoPaid',
                          transpFornecedor: 'transpFornecedorPaid',
                          transpCliente: 'transpClientePaid',
                          despesaExtra: 'despesaExtraPaid',
                          layoutCost: 'layoutCostPaid'
                        };

                        const supplierFieldMap: any = {
                          custoPersonalizacao: 'customization_supplier_id',
                          transpFornecedor: 'transport_supplier_id',
                          transpCliente: 'client_transport_supplier_id',
                          despesaExtra: 'extra_supplier_id',
                          layoutCost: 'layout_supplier_id'
                        };

                        const isPaid = (item as any)[paidFieldMap[f]];
                        const supplierId = (item as any)[supplierFieldMap[f]];

                        return (
                          <div key={f} className="grid grid-cols-12 bg-gray-50 p-3 rounded-xl border border-gray-100 gap-4 items-center">
                            <div className="col-span-4">
                              <CustomSelect
                                label={labelMap[f].toUpperCase()}
                                options={suppliersList}
                                onSelect={(s) => updateItem(item.id, supplierFieldMap[f], s.id)}
                                value={suppliersList.find(s => s.id === supplierId)?.name || ''}
                                onAdd={() => setActiveModal('FORNECEDOR')}
                                disabled={isReadOnly}
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                disabled={isReadOnly}
                                className={`form-input w-full text-sm border-gray-300 rounded-lg text-right font-bold ${isReadOnly ? 'bg-gray-100' : ''}`}
                                placeholder="R$ 0,00"
                                value={formatCurrency((item as any)[f])}
                                onChange={(e) => updateItem(item.id, f, parseCurrencyToNumber(e.target.value))}
                              />
                            </div>

                            {/* Coluna Gestão */}
                            {!isNewOrder && (
                              <div className="col-span-6 flex items-center gap-4 border-l border-gray-200 pl-4 w-full">
                                <div className="flex-1">
                                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Valor Real</label>
                                  <input
                                    disabled={isPaid}
                                    className={`form-input w-full text-xs py-1 rounded-lg text-right font-bold ${isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-300'}`}
                                    placeholder="R$ 0,00"
                                    value={formatCurrency((item as any)[realFieldMap[f]])}
                                    onChange={(e) => updateItem(item.id, realFieldMap[f], parseCurrencyToNumber(e.target.value))}
                                  />
                                  {(item as any)[`${f.replace('custo', 'customization').replace('transp', 'transport').replace('layoutCost', 'layout').replace('despesaExtra', 'extra')}_payment_date`] && (
                                    <div className="mt-1 flex items-center gap-1 text-[9px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full w-fit border border-blue-100 uppercase tracking-tighter">
                                      <span className="material-icons-outlined text-[10px]">event</span>
                                      Previsão de pagamento Pgto: {formatDate((item as any)[`${f.replace('custo', 'customization').replace('transp', 'transport').replace('layoutCost', 'layout').replace('despesaExtra', 'extra')}_payment_date`])}
                                    </div>
                                  )}
                                </div>
                                <div className="pt-4">
                                  <button
                                    onClick={() => {
                                      if (!isPaid) {
                                        setConfirmCostPaymentModal({
                                          itemId: item.id,
                                          field: f,
                                          label: labelMap[f],
                                          amount: (item as any)[realFieldMap[f]]
                                        });
                                      }
                                    }}
                                    disabled={isPaid}
                                    className={`p-3 rounded-lg transition-all ${isPaid ? 'bg-green-500 text-white shadow-sm' : 'bg-gray-200 text-gray-400 hover:bg-blue-500 hover:text-white'}`}
                                    title={isPaid ? "Pago" : "Confirmar Pagamento"}
                                  >
                                    <span className="material-icons-outlined text-base">check</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Cost Summaries & Projection */}
                    <div className="mt-6 bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left: Totals */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Custo de Cálculo</span>
                            <span className="text-lg font-bold text-gray-700">
                              {formatCurrency((item.quantity * item.priceUnit) + item.custoPersonalizacao + item.transpFornecedor + item.transpCliente + item.despesaExtra + item.layoutCost)}
                            </span>
                          </div>
                          {/* Custo Real removido */}
                        </div>

                        {/* Right: Projection Calculator */}
                        {/* Removed as requested */}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-4 items-center bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex-[2] border-r border-gray-200 pr-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fator de Cálculo</p>
                        <select disabled={isReadOnly} className="form-select bg-white border-gray-300 text-gray-700 font-bold rounded-lg w-full text-sm" value={item.fator} onChange={(e) => updateItem(item.id, 'fator', parseFloat(e.target.value))}>
                          {factorsList.length > 0 ? (
                            factorsList.map(f => {
                              const multiplier = 1 + (f.tax_percent + f.contingency_percent + f.margin_percent) / 100;
                              return <option key={f.id} value={multiplier}>{f.name} ({multiplier.toFixed(2)}x)</option>;
                            })
                          ) : (
                            <option value={1.35}>MARGEM PADRÃO (1.35x)</option>
                          )}
                        </select>
                      </div>

                      <div className="flex-1 border-r border-gray-200 pr-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Saldo Extra (%)</p>
                        <div className="relative">
                          <input
                            type="number"
                            disabled={isReadOnly}
                            className="form-input bg-white border-gray-300 text-gray-700 font-bold rounded-lg w-full text-right pr-8 text-sm"
                            placeholder="0%"
                            value={item.extraPct}
                            onChange={(e) => updateItem(item.id, 'extraPct', parseFloat(e.target.value) || 0)}
                          />
                          <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                        </div>
                        {item.extraPct > 0 && (
                          <div className="mt-1 flex justify-end items-center gap-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Valor Extra:</span>
                            <span className="text-[11px] font-black text-blue-600">
                              {formatCurrency(calculateItemTotal(item) * (item.extraPct / 100))}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 border-r border-gray-200 pr-4">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">BV (%)</p>
                        <div className="relative">
                          <input
                            type="number"
                            disabled={isReadOnly}
                            className="form-input bg-white border-gray-300 text-gray-700 font-bold rounded-lg w-full text-right pr-8 text-sm"
                            placeholder="0%"
                            value={item.bvPct}
                            onChange={(e) => updateItem(item.id, 'bvPct', parseFloat(e.target.value) || 0)}
                          />
                          <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
                        </div>
                        {item.bvPct > 0 && (
                          <div className="mt-1 flex justify-end items-center gap-1">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Valor BV:</span>
                            <span className="text-[11px] font-black text-blue-600">
                              {formatCurrency(calculateItemTotal(item) * (item.bvPct / 100))}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 text-right w-full md:w-auto md:pl-4 mb-2">
                        <div className="flex justify-between items-center gap-4 text-red-500">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Imposto (14%)</span>
                          <span className="text-sm font-bold">{formatCurrency(calculateItemTotal(item) * 0.14)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4 text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider">Margem (Saldo)</span>
                          <span className="text-sm font-black">{formatCurrency((calculateItemTotal(item) * 0.86) - ((item.quantity * (item.priceUnit || 0)) + (item.custoPersonalizacao || 0) + (item.layoutCost || 0) + (item.transpFornecedor || 0) + (item.transpCliente || 0) + (item.despesaExtra || 0)))}</span>
                        </div>
                        <div
                          onClick={() => openPriceAdjustment(item.id, 'unit', calculateItemTotal(item) / (item.quantity || 1))}
                          className={`cursor-pointer hover:bg-white p-2 rounded-lg transition-colors group relative border border-transparent hover:border-blue-100 ${isReadOnly ? 'pointer-events-none' : ''}`}
                        >
                          {!isReadOnly && <span className="material-icons-outlined absolute -top-2 -left-2 text-blue-500 opacity-0 group-hover:opacity-100 bg-white border border-blue-200 rounded-full p-0.5 text-[10px] shadow-sm">edit</span>}
                          <div className="flex justify-between items-center text-gray-500 gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider">Venda Unitária</span>
                            <span className="text-lg font-bold text-gray-800 decoration-dashed underline underline-offset-4 decoration-gray-300 group-hover:decoration-blue-500">{formatCurrency(calculateItemTotal(item) / (item.quantity || 1))}</span>
                          </div>
                        </div>
                        <div
                          onClick={() => openPriceAdjustment(item.id, 'total', calculateItemTotal(item))}
                          className={`cursor-pointer hover:bg-white p-3 rounded-lg transition-colors group relative border border-transparent hover:border-blue-100 ${isReadOnly ? 'pointer-events-none' : ''}`}
                        >
                          {!isReadOnly && <span className="material-icons-outlined absolute -top-2 -left-2 text-blue-500 opacity-0 group-hover:opacity-100 bg-white border border-blue-200 rounded-full p-0.5 text-[10px] shadow-sm">edit</span>}
                          <div className="flex justify-between items-end gap-6">
                            <span className="text-[11px] font-black uppercase text-gray-800">Total Venda do Item</span>
                            <span className="text-3xl font-black text-blue-600 leading-none decoration-dashed underline underline-offset-4 decoration-blue-200 group-hover:decoration-blue-500">{formatCurrency(calculateItemTotal(item))}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {!isReadOnly && (
            <button onClick={addItem} className="w-full py-5 border-2 border-dashed border-blue-200 rounded-2xl text-blue-400 font-bold text-sm uppercase hover:bg-blue-50 flex items-center justify-center gap-2">
              <span className="material-icons-outlined">add_circle</span> ADICIONAR NOVO ITEM AO PEDIDO
            </button>
          )}

          {!isNewOrder && !appUser?.salesperson && (
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 mt-6">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <span className="material-icons-outlined text-green-500">account_balance_wallet</span>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestão Financeira do Pedido</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Saldo Estimado */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Saldo Estimado (1ª Parcela + 2ª Parcela - Custos)</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500">Receita: {formatCurrency(totalRecebido)}</p>
                      <p className="text-xs text-gray-500">Custos Previstos: {formatCurrency(items.reduce((acc, item) => acc + (item.quantity * item.priceUnit) + item.custoPersonalizacao + item.transpFornecedor + item.transpCliente + item.despesaExtra + item.layoutCost, 0))}</p>
                    </div>
                    <p className="text-2xl font-black text-blue-600">{formatCurrency(totalRecebido - items.reduce((acc, item) => acc + (item.quantity * item.priceUnit) + item.custoPersonalizacao + item.transpFornecedor + item.transpCliente + item.despesaExtra + item.layoutCost, 0))}</p>
                  </div>
                </div>

                {/* Card Saldo Real */}
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-[10px] font-bold text-green-500 uppercase mb-2">Saldo Real (Recebido - Custos Reais)</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500">Recebido Confirmado: {formatCurrency(totalRecebido)}</p>
                      <p className="text-xs text-gray-500">Custos Reais: {formatCurrency(totalRealCustos)}</p>
                    </div>
                    <p className={`text-3xl font-black ${saldoReal < 0 ? 'text-red-500' : 'text-green-600'}`}>{formatCurrency(saldoReal)}</p>
                  </div>
                </div>
              </div>

              {/* Comissões */}
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Status das Comissões</p>
                <div className="space-y-3">
                  {entradaConfirmed && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="material-icons-outlined text-blue-500">payments</span>
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase">Comissão 1ª Parcela</p>
                          <p className="text-[10px] text-gray-400">{formatDate(dataEntrada)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600 text-sm">{formatCurrency(parseCurrencyToNumber(recebimentoEntrada) * 0.01)}</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase">Pendente</span>
                      </div>
                    </div>
                  )}
                  {restanteConfirmed && (
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="material-icons-outlined text-blue-500">account_balance</span>
                        <div>
                          <p className="text-xs font-bold text-gray-700 uppercase">Comissão 2ª Parcela</p>
                          <p className="text-[10px] text-gray-400">{formatDate(dataRestante)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-blue-600 text-sm">{formatCurrency(parseCurrencyToNumber(recebimentoRestante) * 0.01)}</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full uppercase">Pendente</span>
                      </div>
                    </div>
                  )}
                  {!entradaConfirmed && !restanteConfirmed && (
                    <p className="text-xs text-gray-400 italic">Nenhuma comissão gerada ainda. Confirme os recebimentos para gerar.</p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-4 relative">
          <div className="space-y-6 sticky top-20">
            {/* Card Financeiro Principal */}
            <div className="relative bg-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl overflow-hidden border border-gray-100">
              {/* Subtle blue accent on the left or top */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F6CBD]"></div>

              <div className="px-8 py-6 text-center relative z-10 border-b border-gray-50 bg-blue-50/5">
                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-[0.2em] mb-2">Total Geral do Pedido</p>
                <h2 className="text-4xl lg:text-4xl font-black tracking-tight text-[#0F6CBD] mb-4">{formatCurrency(totalPedido)}</h2>
                <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-blue-50 shadow-sm">
                  <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                    Pendente: <span className="text-blue-600 font-black">{formatCurrency(totalPedido - parseCurrencyToNumber(recebimentoEntrada) - parseCurrencyToNumber(recebimentoRestante))}</span>
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6 bg-white rounded-b-[1.5rem] relative z-10">
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">
                    <span className="material-icons-outlined text-[14px] text-blue-500">payments</span>
                    1ª Parcela
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        disabled={!canEditPayment}
                        className="form-input w-full bg-white border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 font-black text-lg focus:ring-4 focus:ring-blue-50 focus:border-blue-500 placeholder:text-gray-300 shadow-sm transition-all"
                        placeholder="R$ 0,00"
                        value={recebimentoEntrada}
                        onChange={(e) => setRecebimentoEntrada(formatCurrency(parseCurrencyToNumber(e.target.value)))}
                      />
                    </div>
                    <div className="relative w-40">
                      {!canEditPayment ? (
                        <div className="flex items-center justify-center w-full bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-3 py-2.5 font-bold text-sm shadow-sm h-[46px]">
                          {formatDate(dataEntrada)}
                        </div>
                      ) : (
                        <input
                          type="date"
                          lang="pt-BR"
                          className="form-input w-full bg-white border-gray-200 text-gray-700 rounded-lg px-3 py-2.5 font-bold text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm h-[46px]"
                          value={dataEntrada}
                          onChange={(e) => setDataEntrada(e.target.value)}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (!isReadOnly) setConfirmPayModal('entrada');
                        if (isReadOnly && !isNewOrder && !entradaConfirmed) setConfirmPayModal('entrada');
                      }}
                      disabled={(entradaConfirmed) || (isReadOnly && isNewOrder)}
                      className={`h-[46px] w-[46px] rounded-lg transition-all flex items-center justify-center shrink-0 border shadow-sm ${entradaConfirmed ? 'bg-green-100 border-green-200 text-green-700' : (isReadOnly && !isNewOrder ? 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500')}`}
                    >
                      <span className="material-icons-outlined text-[20px]">{entradaConfirmed ? 'check_circle' : (isReadOnly && !isNewOrder ? 'check' : 'check')}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-500 uppercase tracking-widest mb-3">
                    <span className="material-icons-outlined text-[14px] text-blue-500">wallet</span>
                    2ª Parcela
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        disabled={!canEditPayment}
                        className="form-input w-full bg-white border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 font-black text-lg focus:ring-4 focus:ring-blue-50 focus:border-blue-500 placeholder:text-gray-300 shadow-sm transition-all"
                        placeholder="R$ 0,00"
                        value={recebimentoRestante}
                        onChange={(e) => setRecebimentoRestante(formatCurrency(parseCurrencyToNumber(e.target.value)))}
                      />
                    </div>
                    <div className="relative w-40">
                      {!canEditPayment ? (
                        <div className="flex items-center justify-center w-full bg-gray-50 border border-gray-200 text-gray-600 rounded-lg px-3 py-2.5 font-bold text-sm shadow-sm h-[46px]">
                          {formatDate(dataRestante)}
                        </div>
                      ) : (
                        <input
                          type="date"
                          lang="pt-BR"
                          className="form-input w-full bg-white border-gray-200 text-gray-700 rounded-lg px-3 py-2.5 font-bold text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 shadow-sm h-[46px]"
                          value={dataRestante}
                          onChange={(e) => setDataRestante(e.target.value)}
                        />
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (!isReadOnly) setConfirmPayModal('restante');
                        if (isReadOnly && !isNewOrder && !restanteConfirmed) setConfirmPayModal('restante');
                      }}
                      disabled={(restanteConfirmed) || (isReadOnly && isNewOrder)}
                      className={`h-[46px] w-[46px] rounded-lg transition-all flex items-center justify-center shrink-0 border shadow-sm ${restanteConfirmed ? 'bg-green-100 border-green-200 text-green-700' : (isReadOnly && !isNewOrder ? 'bg-gray-100 border-gray-200 text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-500')}`}
                    >
                      <span className="material-icons-outlined text-[20px]">{restanteConfirmed ? 'check_circle' : (isReadOnly && !isNewOrder ? 'check' : 'check')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4 text-blue-500">
                <span className="material-icons-outlined">sticky_note_2</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Observações</h3>
              </div>
              <textarea
                disabled={isReadOnly}
                className={`form-textarea w-full rounded-lg border-gray-200 text-xs min-h-[100px] ${isReadOnly ? 'bg-gray-50' : ''}`}
                placeholder="Notas internas sobre o pedido..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value && !isReadOnly && id && id !== 'novo') {
                    addLog(`Observações atualizadas: ${e.target.value.substring(0, 50)}...`);
                  }
                }}
              />
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200/80 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-icons-outlined text-[#0F6CBD] text-[18px]">history_toggle_off</span>
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Histórico</h3>
                </div>
              </div>

              {/* Timeline */}
              <div className="max-h-[440px] overflow-y-auto mb-4 pr-1" style={{ scrollbarWidth: 'thin' }}>
                {logs.length === 0 ? (
                  <div className="text-center text-gray-300 py-6">
                    <span className="material-icons-outlined text-3xl mb-2">history</span>
                    <p className="text-[10px] font-medium uppercase tracking-wider">Sem registros</p>
                  </div>
                ) : (
                  <div className="relative">
                    {/* Central line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-100 -translate-x-1/2" />
                    <div className="space-y-3">
                      {logs.map((l, i) => {
                        const isCristal = l.user.toLowerCase().includes('cristal');
                        const isEven = i % 2 === 0;
                        const dotColor = isCristal ? 'bg-emerald-500' : 'bg-[#0F6CBD]';
                        return (
                          <div key={i} className={`flex items-start gap-2 relative ${isEven ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Content card */}
                            <div className={`flex-1 max-w-[45%] ${isEven ? 'text-right' : 'text-left'}`}>
                              <div className={`inline-block bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm text-left w-full`}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className={`text-[9px] font-semibold uppercase tracking-wide truncate ${isCristal ? 'text-emerald-600' : 'text-[#0F6CBD]'
                                    }`}>
                                    {l.user.split('@')[0]}
                                  </span>
                                  <span className="text-[9px] text-gray-400 whitespace-nowrap flex-shrink-0">{l.time}</span>
                                </div>
                                <p className="text-[11px] text-gray-700 leading-snug">{l.msg}</p>
                              </div>
                            </div>
                            {/* Dot */}
                            <div className="flex-shrink-0 flex items-start justify-center" style={{ width: 16, paddingTop: 10 }}>
                              <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${dotColor}`} />
                            </div>
                            {/* Spacer */}
                            <div className="flex-1 max-w-[45%]" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <input
                  className="form-input flex-1 rounded-lg border-gray-200 text-xs"
                  placeholder="Adicionar nota..."
                  value={historia}
                  onChange={(e) => setHistoria(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && historia) { addLog(historia); setHistoria(''); } }}
                />
                <button
                  onClick={() => { addLog(historia); setHistoria(''); }}
                  disabled={!historia}
                  className="p-2 bg-[#0F6CBD] text-white rounded-lg disabled:opacity-40 hover:bg-[#0c5aa5] transition-colors"
                >
                  <span className="material-icons-outlined text-sm">send</span>
                </button>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6 text-blue-500">
                <span className="material-icons-outlined">storefront</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Comercial</h3>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Faturamento *</label>
                  <select
                    disabled={isReadOnly}
                    className={`form-select w-full rounded-lg text-sm ${errors.includes('modalidade') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} ${isReadOnly ? 'bg-gray-100' : ''}`}
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value)}
                  >
                    <option value="">SELECIONE...</option>
                    <option>50% 1ª PARCELA E 50% ENTREGA</option>
                    <option>100% À VISTA</option>
                    <option>7 DIAS FATURAMENTO</option>
                    <option>10 DIAS FATURAMENTO</option>
                    <option>15 DIAS FATURAMENTO</option>
                    <option>30 DIAS FATURAMENTO</option>
                  </select>
                </div>

                <div className="col-span-4">
                  {/* Global supplier departure date removed - now per item */}
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Limite Receb.</label>
                  {isReadOnly ? (
                    <div className="form-input w-full rounded-lg text-sm border-gray-200 bg-gray-100 font-bold text-gray-700 py-2">
                      {formatDate(dataLimite)}
                    </div>
                  ) : (
                    <input
                      type="date"
                      lang="pt-BR"
                      className={`form-input w-full rounded-lg text-sm ${errors.includes('dataLimite') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`}
                      value={dataLimite}
                      onChange={(e) => setDataLimite(e.target.value)}
                    />
                  )}
                </div>
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº NF</label>
                  <input
                    disabled={isReadOnly}
                    className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`}
                    placeholder="000.000.000"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Req. de Compra</label>
                  <input
                    disabled={isReadOnly}
                    className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`}
                    placeholder="Nº da Ordem de Compra"
                    value={purchaseOrder}
                    onChange={(e) => setPurchaseOrder(e.target.value)}
                  />
                </div>
                {/* Novo Elemento LAYOUT */}
                <div className="col-span-4">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">LAYOUT</label>
                  <input
                    disabled={isReadOnly}
                    className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`}
                    placeholder="Informações de Layout"
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6 text-blue-500">
                <span className="material-icons-outlined">receipt_long</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Extrato Consolidado</h3>
              </div>
              <div className="space-y-3 mb-6">
                {items.map((item, i) => (
                  <div key={item.id} className="flex justify-between items-start border-b border-gray-50 pb-2">
                    <div className="flex gap-3">
                      <span className="text-gray-200 font-bold text-sm">{i + 1}</span>
                      <div className="w-32 overflow-hidden">
                        <p className="font-bold text-gray-900 text-[10px] uppercase truncate">{item.productName || 'Item em Definição'}</p>
                        <p className="text-[10px] text-gray-400">{item.quantity} UN @ {formatCurrency(item.priceUnit)}</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 text-xs">{formatCurrency(calculateItemTotal(item))}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t-2 border-blue-50">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Pedido</p>
                <p className="text-4xl font-black text-blue-500">{formatCurrency(totalPedido)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;