import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate, getTodayISO } from '../src/utils/dateUtils';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import { formatCurrency, parseCurrencyToNumber } from '../src/utils/formatCurrency';
import { calculateItemTotal, calculateItemRealTotal } from '../src/utils/formulas';
import { useOrderItems } from '../src/hooks/useOrderItems';
import { maskPhone, maskCpfCnpj, validateEmail, validateCpfCnpj } from '../src/utils/maskUtils';

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

// --- Componente Dropdown Clássico ---
const CustomSelect: React.FC<{
  label: string;
  options: any[];
  onSelect: (opt: any) => void;
  onAdd: () => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  onSearch?: (term: string) => void;
}> = ({ label, options = [], onSelect, onAdd, placeholder, error, disabled, onSearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onSearch && isOpen) {
      const timer = setTimeout(() => {
        onSearch(search);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [search, isOpen]);

  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.code && o.code.toLowerCase().includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`form-input w-full rounded-lg flex justify-between items-center cursor-pointer bg-white py-2 ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      >
        <span className={search ? "text-gray-900" : "text-gray-400"}>{search || placeholder || "Selecione..."}</span>
        <span className="material-icons-outlined text-gray-400">expand_more</span>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              className="w-full text-sm border-0 focus:ring-0 p-1"
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(opt => (
              <div
                key={opt.id}
                className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer text-gray-700 flex justify-between group"
                onClick={() => { onSelect(opt); setSearch(opt.name); setIsOpen(false); }}
              >
                <span>{opt.name}</span>
                {opt.code && <span className="text-gray-400 text-xs font-mono group-hover:text-blue-500">{opt.code}</span>}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-2 text-xs text-gray-400 italic">Nenhum produto encontrado.</div>
            )}
            <div
              className="px-4 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center gap-2"
              onClick={() => { onAdd(); setIsOpen(false); }}
            >
              <span className="material-icons-outlined text-sm">add</span> Adicionar Novo
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><span className="material-icons-outlined">close</span></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const OrderForm: React.FC = () => {
  const { appUser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isReadOnly = new URLSearchParams(location.search).get('mode') === 'view';
  const isNewOrder = !id || id === 'novo';

  // Constants
  const statusOptions = [
    'EM ABERTO', 'EM PRODUÇÃO', 'AGUARDANDO APROVAÇÃO',
    'AGUARDANDO NF', 'AGUARDANDO PAGAMENTO',
    'AGUARDANDO PERSONALIZAÇÃO', 'FINALIZADO', 'ENTRE FINALIZADO'
  ];

  // States
  const [emitente, setEmitente] = useState('CRISTAL');
  const [activeModal, setActiveModal] = useState<'CLIENTE' | 'FORNECEDOR' | 'PRODUTO' | null>(null);
  const [confirmPayModal, setConfirmPayModal] = useState<'entrada' | 'restante' | null>(null);
  const [historia, setHistoria] = useState('');
  const [logs, setLogs] = useState<{ user: string, msg: string, time: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState('');
  const [confirmCostPaymentModal, setConfirmCostPaymentModal] = useState<{ itemId: string | number, field: string, label: string, amount: number } | null>(null);

  // Data Lists
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [factorsList, setFactorsList] = useState<any[]>([]);

  // Form State
  const [orderNumber, setOrderNumber] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [status, setStatus] = useState('EM ABERTO');
  const [dataOrcamento, setDataOrcamento] = useState('');
  const [dataPedido, setDataPedido] = useState(getTodayISO());
  const [dataLimite, setDataLimite] = useState('');
  const [modalidade, setModalidade] = useState('');
  const [opcaoPagamento, setOpcaoPagamento] = useState('');
  const [layout, setLayout] = useState('');
  const [supplierDepartureDate, setSupplierDepartureDate] = useState('');
  const [clientData, setClientData] = useState({ id: '', name: '', doc: '', phone: '', email: '', emailFin: '' });
  const [recebimentoEntrada, setRecebimentoEntrada] = useState('R$ 0,00');
  const [recebimentoRestante, setRecebimentoRestante] = useState('R$ 0,00');
  const [dataEntrada, setDataEntrada] = useState('');
  const [dataRestante, setDataRestante] = useState('');
  const [entradaConfirmed, setEntradaConfirmed] = useState(false);
  const [restanteConfirmed, setRestanteConfirmed] = useState(false);

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
  } = useOrderItems();

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
        const { error } = await supabase.from('products').insert([{
          name: newPartnerData.name,
        }]);
        if (error) throw error;
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
      loadOrder(id);
    } else if (location.state?.fromBudget) {
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
          layoutCostPaid: false
        })));
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
      if (factors) setFactorsList(factors);
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
      setRecebimentoEntrada(formatCurrency(order.entry_amount || 0));
      setDataEntrada(order.entry_date || '');
      setEntradaConfirmed(order.entry_confirmed || false);
      setRecebimentoRestante(formatCurrency(order.remaining_amount || 0));
      setDataRestante(order.remaining_date || '');
      setRestanteConfirmed(order.remaining_confirmed || false);
      setPurchaseOrder(order.purchase_order || '');

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
        setItems(orderItems.map(item => ({
          id: item.id || Date.now(),
          productName: item.product_name || '',
          supplier_id: item.supplier_id || '',
          quantity: item.quantity || 0,
          priceUnit: item.unit_price || 0,
          custoPersonalizacao: item.customization_cost || 0,
          transpFornecedor: item.supplier_transport_cost || 0,
          transpCliente: item.client_transport_cost || 0,
          despesaExtra: item.extra_expense || 0,
          layoutCost: item.layout_cost || 0,
          fator: item.calculation_factor || 1.35,
          bvPct: item.bv_pct || 0,
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
          layoutCostPaid: item.layout_paid || false
        })));
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
        budget_date: dataOrcamento,
        order_date: dataPedido,
        client_id: clientData.id,
        issuer: emitente,
        billing_type: modalidade,
        payment_method: opcaoPagamento,
        payment_due_date: dataLimite,
        supplier_departure_date: supplierDepartureDate,
        invoice_number: null,
        total_amount: totalPedido,
        entry_amount: parseCurrencyToNumber(recebimentoEntrada),
        entry_date: type === 'entrada' ? date : (dataEntrada || null),
        entry_confirmed: payloadEntryConfirmed,
        remaining_amount: parseCurrencyToNumber(recebimentoRestante),
        remaining_date: type === 'restante' ? date : (dataRestante || null),
        remaining_confirmed: payloadRemainingConfirmed
      };

      const itemsPayload = items.map(item => ({
        product_name: item.productName,
        supplier_id: item.supplier_id || null,
        quantity: item.quantity,
        unit_price: item.priceUnit,
        customization_cost: item.custoPersonalizacao,
        supplier_transport_cost: item.transpFornecedor,
        client_transport_cost: item.client_transport_cost,
        extra_expense: item.despesaExtra,
        layout_cost: item.layoutCost,
        calculation_factor: item.fator,

        bv_pct: item.bvPct,
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
        layout_paid: item.layoutCostPaid
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
        toast.error('Erro ao atualizar status');
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
      product_name: item.productName,
      supplier_id: item.supplier_id || null,
      quantity: item.quantity,
      unit_price: item.priceUnit,
      customization_cost: item.custoPersonalizacao,
      supplier_transport_cost: item.transpFornecedor,
      client_transport_cost: item.client_transport_cost,
      extra_expense: item.despesaExtra,
      layout_cost: item.layoutCost,
      calculation_factor: item.fator,
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
      unit_price_paid: item.priceUnitPaid, // Note: using item here might be old state? No, we use updatedItems map
      customization_paid: item.custoPersonalizacaoPaid,
      supplier_transport_paid: item.transpFornecedorPaid,
      client_transport_paid: item.transpClientePaid,
      extra_expense_paid: item.despesaExtraPaid,
      layout_paid: item.layoutCostPaid,

      // Override the specific field for the target item
      ...(item.id === itemId ? {
        unit_price_paid: field === 'priceUnit' ? value : item.priceUnitPaid,
        customization_paid: field === 'custoPersonalizacao' ? value : item.custoPersonalizacaoPaid,
        supplier_transport_paid: field === 'transpFornecedor' ? value : item.transpFornecedorPaid,
        client_transport_paid: field === 'transpCliente' ? value : item.transpClientePaid,
        extra_expense_paid: field === 'despesaExtra' ? value : item.despesaExtraPaid,
        layout_paid: field === 'layoutCost' ? value : item.layoutCostPaid
      } : {})
    }));

    const orderPayload = {
      id: id,
      order_number: orderNumber,
      salesperson: vendedor,
      status: status,
      budget_date: dataOrcamento,
      order_date: dataPedido,
      client_id: clientData.id,
      issuer: emitente,
      billing_type: modalidade,
      payment_method: opcaoPagamento,
      payment_due_date: dataLimite,
      invoice_number: null,
      total_amount: totalPedido,
      entry_amount: parseCurrencyToNumber(recebimentoEntrada),
      entry_date: dataEntrada || null,
      entry_confirmed: entradaConfirmed,
      remaining_amount: parseCurrencyToNumber(recebimentoRestante),
      remaining_date: dataRestante || null,
      remaining_confirmed: restanteConfirmed
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
    if (!supplierDepartureDate) newErrors.push('supplierDepartureDate');

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
    setIsSaving(true);
    try {
      // Construct Order Header Payload
      const orderPayload = {
        id: id && id !== 'novo' ? id : null,
        order_number: orderNumber,
        salesperson: vendedor,
        status: status,
        budget_date: dataOrcamento,
        order_date: dataPedido,
        client_id: clientData.id,
        issuer: emitente,
        billing_type: modalidade,
        payment_method: opcaoPagamento,
        payment_due_date: dataLimite,
        supplier_departure_date: supplierDepartureDate,
        invoice_number: null,
        total_amount: totalPedido,
        entry_amount: parseCurrencyToNumber(recebimentoEntrada),
        entry_date: dataEntrada || null,
        entry_confirmed: entradaConfirmed,
        remaining_amount: parseCurrencyToNumber(recebimentoRestante),
        remaining_date: dataRestante || null,
        remaining_confirmed: restanteConfirmed,
        purchase_order: purchaseOrder
      };

      // Construct Order Items Payload
      const itemsPayload = items.map(item => ({
        product_name: item.productName,
        supplier_id: item.supplier_id || null,
        quantity: item.quantity,
        unit_price: item.priceUnit,
        customization_cost: item.custoPersonalizacao,
        supplier_transport_cost: item.transpFornecedor,
        client_transport_cost: item.client_transport_cost,
        extra_expense: item.despesaExtra,
        layout_cost: item.layoutCost,
        calculation_factor: item.fator,

        bv_pct: item.bvPct,
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
        layout_paid: item.layoutCostPaid
      }));

      // Call RPC
      const { data, error } = await supabase.rpc('save_order', {
        p_order: orderPayload,
        p_items: itemsPayload
      });

      if (error) throw error;

      toast.success('Pedido salvo com sucesso! ID: ' + data);
      navigate('/');

    } catch (err: any) {
      console.error('Erro ao salvar pedido:', err);
      if (err.message?.includes('Could not find the function')) {
        toast.error('ERRO CRÍTICO: Função save_order não encontrada.');
      } else {
        toast.error(`Erro ao salvar o pedido: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {/* Modal de Cadastro */}
      <Modal isOpen={!!activeModal} onClose={() => { setActiveModal(null); setNewPartnerData({ name: '', doc: '', phone: '', email: '' }); }} title={`CADASTRAR NOVO ${activeModal}`}>
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
            {isReadOnly ? 'VISUALIZAR PEDIDO' : 'ABERTURA DE PEDIDO'}
          </h2>
        </div>
        {!isReadOnly && (
          <button onClick={validate} disabled={isSaving} className="ml-3 px-6 py-3 rounded-lg shadow-sm text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-all active:scale-95 uppercase disabled:opacity-50 disabled:cursor-not-allowed">
            {isSaving ? 'SALVANDO...' : 'FINALIZAR ABERTURA'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
              <span className="material-icons-outlined text-blue-500">info</span>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informações Gerais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-blue-500 uppercase mb-2">Pedido <span className="text-red-500">*</span></label>
                <input
                  disabled={isReadOnly || !!location.state?.fromBudget}
                  className={`form-input block w-full text-center rounded-lg font-bold py-2 ${errors.includes('orderNumber') ? 'border-red-500 ring-1 ring-red-500' : 'border-blue-500'} ${(isReadOnly || !!location.state?.fromBudget) ? 'bg-gray-100' : ''}`}
                  placeholder="DIGITE O Nº"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </div>
              <div>
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
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Status <span className="text-red-500">*</span></label>
                <div className="relative flex items-center">
                  <span className="material-icons-outlined absolute left-3 text-gray-400 pointer-events-none z-10">info</span>
                  <select
                    disabled={isReadOnly && isNewOrder}
                    className={`form-select block w-full pl-10 rounded-lg text-sm ${errors.includes('status') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${(isReadOnly && isNewOrder) ? 'bg-gray-100' : ''}`}
                    value={status}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'ENTRE FINALIZADO') {
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

              <div className="relative">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data do Orçamento <span className="text-red-500">*</span></label>
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
              <div className="relative">
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

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Emitente</label>
                <div className="grid grid-cols-3 gap-3">
                  {['CRISTAL', 'ESPIRITO', 'NATUREZA'].map(op => (
                    <button
                      key={op}
                      disabled={isReadOnly}
                      onClick={() => setEmitente(op)}
                      className={`py-2 px-2 border-2 rounded-lg font-bold text-[9px] transition-all uppercase ${emitente === op ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'} ${isReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {op === 'ESPIRITO' ? 'ESPÍRITO BRINDES' : op === 'CRISTAL' ? 'CRISTAL BRINDES' : 'NATUREZA BRINDES'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
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
                <input disabled={isReadOnly} className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`} value={clientData.emailFin} onChange={(e) => setClientData({ ...clientData, emailFin: e.target.value })} />
              </div>
            </div>
          </section>

          {items.map((item, index) => (
            <div key={item.id} id={`item-${item.id}`} className="bg-white shadow-sm rounded-xl border border-gray-200 border-l-8 border-l-blue-500 p-6 transition-all duration-500">
              <div className="flex justify-between items-center mb-6">
                <span className="px-3 py-1 rounded-md text-[10px] font-bold bg-gray-900 text-white uppercase">Produto {index + 1}</span>
                {!isReadOnly && <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500"><span className="material-icons-outlined">delete</span></button>}
              </div>

              <div className="mb-6">
                <CustomSelect
                  label="Produto *"
                  options={productsList}
                  onSelect={(v) => updateItem(item.id, 'productName', v.name)}
                  onAdd={() => setActiveModal('PRODUTO')}
                  error={errors.includes(`productName-${index}`)}
                  disabled={isReadOnly}
                  onSearch={searchProducts}
                />
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-xl grid grid-cols-12 gap-3 items-end border border-gray-100">
                  <div className="col-span-12 md:col-span-6">
                    <CustomSelect
                      label="Fornecedor Produto"
                      options={suppliersList}
                      onSelect={(s) => updateItem(item.id, 'supplier_id', s.id)}
                      onAdd={() => setActiveModal('FORNECEDOR')}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd *</label>
                    <input
                      type="number"
                      disabled={isReadOnly}
                      className={`form-input w-full rounded-lg text-center font-bold ${errors.includes(`quantity-${index}`) ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${isReadOnly ? 'bg-gray-100' : ''}`}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Preço Unit *</label>
                    <input
                      disabled={isReadOnly}
                      className={`form-input w-full rounded-lg text-right ${errors.includes(`priceUnit-${index}`) ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'} ${isReadOnly ? 'bg-gray-100' : ''}`}
                      placeholder="R$ 0,00"
                      value={formatCurrency(item.priceUnit)}
                      onChange={(e) => updateItem(item.id, 'priceUnit', parseCurrencyToNumber(e.target.value))}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2 text-right">
                    <label className="block text-[10px] font-bold text-blue-400 uppercase mb-1">Custo Prod.</label>
                    <div className="py-2 font-bold text-blue-600">{formatCurrency(item.quantity * item.priceUnit)}</div>
                  </div>

                  {/* Real Unit Price Management */}
                  {!isNewOrder && (
                    <div className="col-span-12 mt-4 bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="material-icons-outlined text-slate-600 text-sm">payments</span>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Gestão de Custos Reais</label>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-600 uppercase mb-2">Valor Real Unitário</label>
                            <div className="flex gap-2 items-center">
                              <input
                                disabled={item.priceUnitPaid}
                                className={`form-input w-full text-sm py-2.5 rounded-lg text-right font-bold ${item.priceUnitPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
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
                                className={`p-3 rounded-lg transition-all flex items-center justify-center ${item.priceUnitPaid ? 'bg-emerald-500 text-white shadow-md' : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'}`}
                                title={item.priceUnitPaid ? "Pagamento Confirmado" : "Confirmar Pagamento"}
                              >
                                <span className="material-icons-outlined text-lg">{item.priceUnitPaid ? 'check_circle' : 'check'}</span>
                              </button>
                            </div>
                            {item.priceUnitPaid && (
                              <p className="text-[10px] text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                                <span className="material-icons-outlined text-xs">verified</span>
                                Pagamento confirmado
                              </p>
                            )}
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <p className="text-[10px] font-semibold text-gray-600 uppercase mb-2">Custo Total Real</p>
                            <p className="text-2xl font-bold text-slate-700">{formatCurrency((item.realPriceUnit || 0) * item.quantity)}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{item.quantity} unidades × {formatCurrency(item.realPriceUnit || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {['custoPersonalizacao', 'layoutCost', 'transpFornecedor', 'transpCliente', 'despesaExtra'].map(f => {
                  const labelMap: any = {
                    custoPersonalizacao: 'Custo Personalização',
                    transpFornecedor: 'Transp Fornecedor',
                    transpCliente: 'Transp Cliente',
                    despesaExtra: 'Despesa Extra',
                    layoutCost: 'Custo Layout'
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

                  const isPaid = (item as any)[paidFieldMap[f]];

                  return (
                    <div key={f} className="grid grid-cols-1 md:grid-cols-12 bg-gray-50 p-3 rounded-xl border border-gray-100 gap-3 items-center">
                      <div className="col-span-12 md:col-span-5">
                        <CustomSelect
                          label={labelMap[f].toUpperCase()}
                          options={suppliersList}
                          onSelect={() => { }}
                          onAdd={() => setActiveModal('FORNECEDOR')}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-6 md:col-span-3">
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
                        <div className="col-span-6 md:col-span-4 flex items-center gap-2 border-l border-gray-200 pl-3">
                          <div className="flex-1">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Valor Real</label>
                            <input
                              disabled={isPaid}
                              className={`form-input w-full text-xs py-1 rounded-lg text-right font-bold ${isPaid ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-300'}`}
                              placeholder="R$ 0,00"
                              value={formatCurrency((item as any)[realFieldMap[f]])}
                              onChange={(e) => updateItem(item.id, realFieldMap[f], parseCurrencyToNumber(e.target.value))}
                            />
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

              <div className="mt-6 flex flex-col md:flex-row gap-6 items-center bg-gray-900 rounded-xl p-6 text-white overflow-hidden relative">
                <div className="flex-1 w-full border-r border-gray-700 pr-6 mr-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fator de Cálculo</p>
                  <select disabled={isReadOnly} className="form-select bg-gray-800 border-gray-700 text-blue-400 font-bold rounded-lg w-full" value={item.fator} onChange={(e) => updateItem(item.id, 'fator', parseFloat(e.target.value))}>
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

                <div className="flex-1 w-full border-r border-gray-700 pr-6 mr-6">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">BV (%)</p>
                  <input
                    type="number"
                    disabled={isReadOnly}
                    className="form-input bg-gray-800 border-gray-700 text-green-400 font-bold rounded-lg w-full text-center"
                    placeholder="0%"
                    value={item.bvPct}
                    onChange={(e) => updateItem(item.id, 'bvPct', parseFloat(e.target.value) || 0)}
                  />
                  {item.bvPct > 0 && (
                    <p className="text-[10px] text-green-500 font-bold mt-2 text-center">
                      + {formatCurrency(calculateItemTotal(item) * (item.bvPct / 100))}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 text-left w-full md:w-auto">
                  <div
                    onClick={() => openPriceAdjustment(item.id, 'unit', calculateItemTotal(item) / (item.quantity || 1))}
                    className={`cursor-pointer hover:bg-gray-800 p-2 rounded-lg transition-colors group relative ${isReadOnly ? 'pointer-events-none' : ''}`}
                  >
                    {!isReadOnly && <span className="material-icons-outlined absolute -top-2 -right-2 text-gray-500 opacity-0 group-hover:opacity-100 bg-gray-900 rounded-full p-1 text-xs shadow-sm">edit</span>}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Venda UNT.</p>
                    <p className="text-2xl font-extrabold text-white decoration-dashed underline underline-offset-4 decoration-gray-600 group-hover:decoration-blue-500">
                      {formatCurrency(calculateItemTotal(item) / (item.quantity || 1))}
                    </p>
                  </div>
                  <div
                    onClick={() => openPriceAdjustment(item.id, 'total', calculateItemTotal(item))}
                    className={`text-right cursor-pointer hover:bg-gray-800 p-2 rounded-lg transition-colors group relative ${isReadOnly ? 'pointer-events-none' : ''}`}
                  >
                    {!isReadOnly && <span className="material-icons-outlined absolute -top-2 -right-2 text-gray-500 opacity-0 group-hover:opacity-100 bg-gray-900 rounded-full p-1 text-xs shadow-sm">edit</span>}
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Venda Total do Item</p>
                    <p className="text-3xl font-extrabold text-blue-500 decoration-dashed underline underline-offset-4 decoration-blue-900 group-hover:decoration-blue-500">
                      {formatCurrency(calculateItemTotal(item))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {!isReadOnly && (
            <button onClick={addItem} className="w-full py-5 border-2 border-dashed border-blue-200 rounded-2xl text-blue-400 font-bold text-sm uppercase hover:bg-blue-50 flex items-center justify-center gap-2">
              <span className="material-icons-outlined">add_circle</span> ADICIONAR NOVO ITEM AO PEDIDO
            </button>
          )}

          {!isNewOrder && (
            <section className="bg-white shadow-sm rounded-xl border border-gray-200 p-6 mt-6">
              <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                <span className="material-icons-outlined text-green-500">account_balance_wallet</span>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gestão Financeira do Pedido</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card Saldo Estimado */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Saldo Estimado (Entrada + Restante - Custos)</p>
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
                          <p className="text-xs font-bold text-gray-700 uppercase">Comissão Entrada</p>
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
                          <p className="text-xs font-bold text-gray-700 uppercase">Comissão Restante</p>
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
            <div className="bg-blue-500 shadow-2xl rounded-[1.5rem] overflow-hidden text-white border-none">
              <div className="p-8 text-center bg-transparent">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] mb-2 opacity-80">Valor Total de Venda</p>
                <h2 className="text-6xl font-black tracking-tight">{formatCurrency(totalPedido)}</h2>
              </div>

              <div className="p-6 pt-0 space-y-6 bg-blue-600/90">
                {/* Recebimento Entrada */}
                <div className="pt-6">
                  <label className="block text-[11px] font-black text-blue-50 uppercase tracking-widest mb-3">Recebimento (Entrada)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        disabled={isReadOnly}
                        className="form-input w-full bg-white/10 border-white/20 text-white rounded-lg px-3 py-3 font-bold text-base focus:ring-0 focus:border-white/40 placeholder:text-white/40"
                        placeholder="R$ 0,00"
                        value={recebimentoEntrada}
                        onChange={(e) => setRecebimentoEntrada(formatCurrency(e.target.value))}
                      />
                    </div>
                    <div className="relative w-40">
                      {isReadOnly ? (
                        <div className="form-input w-full bg-white/10 border-white/20 text-white rounded-lg px-3 py-3 font-bold text-sm">
                          {formatDate(dataEntrada)}
                        </div>
                      ) : (
                        <input
                          type="date"
                          lang="pt-BR"
                          className="form-input w-full bg-white/10 border-white/20 text-white rounded-lg px-3 py-3 font-bold text-sm focus:ring-0 focus:border-white/40"
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
                      className={`p-3 rounded-lg transition-all flex items-center justify-center shrink-0 border border-white/20 ${entradaConfirmed ? 'bg-green-500 border-green-400' : (isReadOnly && !isNewOrder ? 'bg-gray-200 text-gray-400 hover:bg-blue-500 hover:text-white' : 'bg-white/10 hover:bg-white/20')}`}
                    >
                      <span className="material-icons-outlined text-base">{entradaConfirmed ? 'check_circle' : (isReadOnly && !isNewOrder ? 'check' : 'payments')}</span>
                    </button>
                  </div>
                </div>

                {/* Recebimento Restante */}
                <div>
                  <label className="block text-[11px] font-black text-blue-50 uppercase tracking-widest mb-3">Recebimento (Restante)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        disabled={isReadOnly}
                        className="form-input w-full bg-white/10 border-white/20 text-white rounded-lg px-3 py-3 font-bold text-base focus:ring-0 focus:border-white/40 placeholder:text-white/40"
                        placeholder="R$ 0,00"
                        value={recebimentoRestante}
                        onChange={(e) => setRecebimentoRestante(formatCurrency(e.target.value))}
                      />
                    </div>
                    <div className="relative w-40">
                      {isReadOnly ? (
                        <div className="form-input w-full bg-white/10 border-white/20 text-white rounded-lg px-3 py-3 font-bold text-sm">
                          {formatDate(dataRestante)}
                        </div>
                      ) : (
                        <input
                          type="date"
                          lang="pt-BR"
                          className="form-input w-full bg-white/10 border-white/20 text-white rounded-lg px-3 py-3 font-bold text-sm focus:ring-0 focus:border-white/40"
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
                      className={`p-3 rounded-lg transition-all flex items-center justify-center shrink-0 border border-white/20 ${restanteConfirmed ? 'bg-green-500 border-green-400' : (isReadOnly && !isNewOrder ? 'bg-gray-200 text-gray-400 hover:bg-blue-500 hover:text-white' : 'bg-white/10 hover:bg-white/20')}`}
                    >
                      <span className="material-icons-outlined text-base">{restanteConfirmed ? 'check_circle' : (isReadOnly && !isNewOrder ? 'check' : 'wallet')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6 text-blue-500">
                <span className="material-icons-outlined">history</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Histórico</h3>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto mb-4 pr-2">
                {logs.length === 0 ? (
                  <div className="text-center text-gray-300 py-4"><p className="text-[10px] font-bold uppercase">Sem registros</p></div>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} className="bg-gray-50 p-2 rounded-lg border border-gray-100 animate-in slide-in-from-right duration-300">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-blue-500 uppercase">{l.user}</span>
                        <span className="text-[9px] text-gray-400">{l.time}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 font-medium leading-tight">{l.msg}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <input className="form-input flex-1 rounded-lg border-gray-200 text-xs" placeholder="Adicionar nota..." value={historia} onChange={(e) => setHistoria(e.target.value)} />
                <button onClick={() => { addLog(historia); setHistoria(''); }} disabled={!historia} className="p-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"><span className="material-icons-outlined text-sm">send</span></button>
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6 text-blue-500">
                <span className="material-icons-outlined">storefront</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Comercial</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Faturamento *</label>
                  <select
                    disabled={isReadOnly}
                    className={`form-select w-full rounded-lg text-sm ${errors.includes('modalidade') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} ${isReadOnly ? 'bg-gray-100' : ''}`}
                    value={modalidade}
                    onChange={(e) => setModalidade(e.target.value)}
                  >
                    <option value="">SELECIONE...</option>
                    <option>50% ENTRADA E 50% ENTREGA</option>
                    <option>100% À VISTA</option>
                    <option>7 DIAS FATURAMENTO</option>
                    <option>10 DIAS FATURAMENTO</option>
                    <option>15 DIAS FATURAMENTO</option>
                    <option>30 DIAS FATURAMENTO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Opção de Pagamento</label>
                  <select disabled={isReadOnly} className={`form-select w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`} value={opcaoPagamento} onChange={(e) => setOpcaoPagamento(e.target.value)}>
                    <option value="">SELECIONE...</option>
                    <option>BOLETO</option>
                    <option>PIX</option>
                    <option>DEPÓSITO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Saída do Fornecedor *</label>
                  {isReadOnly ? (
                    <div className="form-input w-full rounded-lg text-sm border-gray-200 bg-gray-100 font-bold text-gray-700 py-2">
                      {formatDate(supplierDepartureDate)}
                    </div>
                  ) : (
                    <input
                      type="date"
                      lang="pt-BR"
                      className={`form-input w-full rounded-lg text-sm ${errors.includes('supplierDepartureDate') ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`}
                      value={supplierDepartureDate}
                      onChange={(e) => setSupplierDepartureDate(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Limite Recebimento *</label>
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
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nº NF</label>
                  <input disabled={isReadOnly} className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`} placeholder="000.000.000" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ordem de Compra</label>
                  <input
                    disabled={isReadOnly}
                    className={`form-input w-full rounded-lg border-gray-200 text-sm ${isReadOnly ? 'bg-gray-100' : ''}`}
                    placeholder="Nº da Ordem de Compra"
                    value={purchaseOrder}
                    onChange={(e) => setPurchaseOrder(e.target.value)}
                  />
                </div>
                {/* Novo Elemento LAYOUT */}
                <div>
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