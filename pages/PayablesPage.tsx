import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { exportSimpleCSV } from '../src/utils/csvExport';
import { toast } from 'sonner';

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---- Types ----
interface OrderCostItem {
  id: string; orderId: string; orderNumber: string; productName: string;
  costType: string; label: string; estimatedValue: number; realValue: number;
  isPaid: boolean; quantity: number; issuer: string; dueDate?: string;
  supplierName: string; supplierId: string;
}
interface CompanyExpense {
  id: string; description: string; amount: number; due_date: string;
  paid: boolean; paid_date?: string; category: string; observation?: string;
  issuer?: string; recurrence?: string;
}

const PayablesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'expenses' | 'suppliers'>('orders');
  const [loading, setLoading] = useState(true);
  const [orderCosts, setOrderCosts] = useState<OrderCostItem[]>([]);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);

  // Filters
  const [issuerFilter, setIssuerFilter] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortByDate, setSortByDate] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Modals
  const [expenseModal, setExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<CompanyExpense>>({
    description: '', amount: 0, due_date: new Date().toISOString().split('T')[0],
    paid: false, category: 'FIXO', observation: '', issuer: 'CRISTAL', recurrence: 'UNICO'
  });
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, type: 'order' | 'expense', item: any, action: 'pay' | 'revert' }>({ isOpen: false, type: 'order', item: null, action: 'pay' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try { await Promise.all([fetchOrderCosts(), fetchExpenses()]); } catch { }
    setLoading(false);
  };

  const fetchOrderCosts = async () => {
    const { data: items } = await supabase.from('order_items')
      .select(`*, orders(id, order_number, issuer, payment_due_date), supplier:supplier_id(name), customization_supplier:customization_supplier_id(name), transport_supplier:transport_supplier_id(name), layout_supplier:layout_supplier_id(name), extra_supplier:extra_supplier_id(name)`)
      .order('id', { ascending: false });

    const costs: OrderCostItem[] = [];
    items?.forEach((item: any) => {
      const order = item.orders;
      if (!order) return;

      const costTypes = [
        { key: 'unit_price', real: 'real_unit_price', paid: 'unit_price_paid', label: 'Produto (Fornecedor)', multiplier: item.quantity, supplierField: 'supplier', dateField: 'supplier_payment_date' },
        { key: 'customization_cost', real: 'real_customization_cost', paid: 'customization_paid', label: 'Personalização', multiplier: 1, supplierField: 'customization_supplier', dateField: 'customization_payment_date' },
        { key: 'supplier_transport_cost', real: 'real_supplier_transport_cost', paid: 'supplier_transport_paid', label: 'Frete Fornecedor', multiplier: 1, supplierField: 'transport_supplier', dateField: 'transport_payment_date' },
        { key: 'client_transport_cost', real: 'real_client_transport_cost', paid: 'client_transport_paid', label: 'Frete Cliente', multiplier: 1, supplierField: 'transport_supplier', dateField: 'transport_payment_date' },
        { key: 'extra_expense', real: 'real_extra_expense', paid: 'extra_expense_paid', label: 'Despesa Extra', multiplier: 1, supplierField: 'extra_supplier', dateField: 'extra_payment_date' },
        { key: 'layout_cost', real: 'real_layout_cost', paid: 'layout_paid', label: 'Layout', multiplier: 1, supplierField: 'layout_supplier', dateField: 'layout_payment_date' }
      ];

      costTypes.forEach(ct => {
        const est = (item[ct.key] || 0) * ct.multiplier;
        const real = (item[ct.real] || 0) * ct.multiplier;
        if (est > 0 || real > 0) {
          const supplierData = item[ct.supplierField];
          costs.push({
            id: item.id, orderId: order.id, orderNumber: order.order_number,
            productName: item.product_name, costType: ct.key, label: ct.label,
            estimatedValue: est, realValue: real, isPaid: item[ct.paid],
            quantity: item.quantity, issuer: order.issuer || 'CRISTAL',
            dueDate: item[ct.dateField] || order.payment_due_date,
            supplierName: supplierData?.name || '-', supplierId: supplierData?.id || ''
          });
        }
      });
    });
    setOrderCosts(costs);
  };

  const fetchExpenses = async () => {
    const { data } = await supabase.from('company_expenses').select('*').order('due_date', { ascending: true });
    setExpenses(data || []);
  };

  // ---- Actions ----
  const executeOrderCostPayment = async (cost: OrderCostItem) => {
    const paidField = [
      { key: 'unit_price', paid: 'unit_price_paid' }, { key: 'customization_cost', paid: 'customization_paid' },
      { key: 'supplier_transport_cost', paid: 'supplier_transport_paid' }, { key: 'client_transport_cost', paid: 'client_transport_paid' },
      { key: 'extra_expense', paid: 'extra_expense_paid' }, { key: 'layout_cost', paid: 'layout_paid' }
    ].find(c => c.key === cost.costType)?.paid;
    if (!paidField) return;

    const { error } = await supabase.from('order_items').update({ [paidField]: !cost.isPaid }).eq('id', cost.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Custo atualizado!');
    setOrderCosts(prev => prev.map(c => c.id === cost.id && c.costType === cost.costType ? { ...c, isPaid: !c.isPaid } : c));
  };

  const executeExpensePayment = async (exp: CompanyExpense) => {
    const { error } = await supabase.from('company_expenses').update({
      paid: !exp.paid, paid_date: !exp.paid ? new Date().toISOString().split('T')[0] : null
    }).eq('id', exp.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Despesa atualizada!');
    setExpenses(prev => prev.map(e => e.id === exp.id ? { ...e, paid: !e.paid } : e));
  };

  const saveNewExpense = async () => {
    if (!newExpense.description || !newExpenseAmount) { toast.error('Preencha os campos.'); return; }
    const amount = parseFloat(newExpenseAmount.replace(/\D/g, '')) / 100;
    const occurrences = newExpense.recurrence === 'MENSAL' ? 12 : 1;
    const baseDate = new Date(newExpense.due_date + 'T12:00:00');
    const payload = [];
    for (let i = 0; i < occurrences; i++) {
      const d = new Date(baseDate); d.setMonth(baseDate.getMonth() + i);
      payload.push({ ...newExpense, amount, due_date: d.toISOString().split('T')[0] });
    }
    const { error } = await supabase.from('company_expenses').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(occurrences > 1 ? 'Despesas recorrentes salvas.' : 'Despesa salva.');
    setExpenseModal(false); setNewExpenseAmount('');
    setNewExpense({ description: '', amount: 0, due_date: new Date().toISOString().split('T')[0], paid: false, category: 'FIXO', observation: '', issuer: 'CRISTAL', recurrence: 'UNICO' });
    fetchExpenses();
  };

  // ---- Filtering ----
  const todayStr = new Date().toISOString().split('T')[0];
  const filteredCosts = useMemo(() => {
    const sorted = orderCosts.filter(c => {
      if (issuerFilter !== 'TODOS' && c.issuer !== issuerFilter) return false;
      if (!showPaid && c.isPaid) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!c.orderNumber.toLowerCase().includes(s) && !c.productName.toLowerCase().includes(s) && !c.supplierName.toLowerCase().includes(s)) return false;
      }
      if (filterDateFrom && c.dueDate && c.dueDate < filterDateFrom) return false;
      if (filterDateTo && c.dueDate && c.dueDate > filterDateTo) return false;
      return true;
    });
    if (sortByDate) {
      sorted.sort((a, b) => {
        const da = a.dueDate || '9999-99-99';
        const db = b.dueDate || '9999-99-99';
        return da.localeCompare(db);
      });
    }
    return sorted;
  }, [orderCosts, issuerFilter, showPaid, searchTerm, filterDateFrom, filterDateTo, sortByDate]);

  const filteredExpenses = useMemo(() => {
    const sorted = expenses.filter(e => {
      if (issuerFilter !== 'TODOS' && e.issuer !== issuerFilter) return false;
      if (!showPaid && e.paid) return false;
      if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterDateFrom && e.due_date < filterDateFrom) return false;
      if (filterDateTo && e.due_date > filterDateTo) return false;
      return true;
    });
    if (sortByDate) {
      sorted.sort((a, b) => a.due_date.localeCompare(b.due_date));
    }
    return sorted;
  }, [expenses, issuerFilter, showPaid, searchTerm, filterDateFrom, filterDateTo, sortByDate]);

  // ---- Supplier grouping ----
  const supplierGroups = useMemo(() => {
    const map = new Map<string, { name: string; total: number; paid: number; items: OrderCostItem[] }>();
    filteredCosts.forEach(c => {
      const key = c.supplierName || '-';
      if (!map.has(key)) map.set(key, { name: key, total: 0, paid: 0, items: [] });
      const g = map.get(key)!;
      g.total += (c.realValue || c.estimatedValue);
      if (c.isPaid) g.paid += (c.realValue || c.estimatedValue);
      g.items.push(c);
    });
    return Array.from(map.values()).sort((a, b) => (b.total - b.paid) - (a.total - a.paid));
  }, [filteredCosts]);

  // ---- Stats ----
  const stats = useMemo(() => {
    let totalCustos = 0, pagosCustos = 0;
    let totalDesp = 0, pagosDesp = 0;
    let overdue = 0, dueToday = 0, dueNext7Days = 0, dueLater = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];

    const processItem = (val: number, isPaid: boolean, dueDateStr: string | null) => {
      if (isPaid) return;

      const due = dueDateStr || '9999-99-99';
      if (due < todayStr) overdue += val;
      else if (due === todayStr) dueToday += val;
      else if (due <= next7DaysStr) dueNext7Days += val;
      else dueLater += val;
    };

    filteredCosts.forEach(c => {
      const val = c.realValue || c.estimatedValue;
      totalCustos += val;
      if (c.isPaid) pagosCustos += val;
      else processItem(val, c.isPaid, c.dueDate);
    });

    filteredExpenses.forEach(e => {
      totalDesp += e.amount;
      if (e.paid) pagosDesp += e.amount;
      else processItem(e.amount, e.paid, e.due_date);
    });

    return {
      totalCustos, pagosCustos,
      totalDesp, pagosDesp,
      overdue, dueToday, dueNext7Days, dueLater,
      totalPendente: (totalCustos - pagosCustos) + (totalDesp - pagosDesp)
    };
  }, [filteredCosts, filteredExpenses]);

  const exportData = () => {
    if (activeTab === 'orders') {
      exportSimpleCSV(filteredCosts.map(c => ({ pedido: c.orderNumber, produto: c.productName, tipo: c.label, fornecedor: c.supplierName, estimado: c.estimatedValue.toFixed(2), real: c.realValue.toFixed(2), pago: c.isPaid ? 'Sim' : 'Não' })), 'custos_pedidos');
    } else if (activeTab === 'expenses') {
      exportSimpleCSV(filteredExpenses.map(e => ({ descricao: e.description, categoria: e.category, valor: e.amount.toFixed(2), vencimento: e.due_date, pago: e.paid ? 'Sim' : 'Não' })), 'despesas_empresa');
    }
    toast.success('CSV exportado!');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><span className="material-icons-outlined animate-spin text-4xl text-blue-500">sync</span></div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span className="material-icons-outlined text-red-500">payments</span> Contas a Pagar
          </h1>
          <p className="text-sm text-gray-500">Custos de pedidos e despesas operacionais</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportData} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800"><span className="material-icons-outlined text-lg">download</span>CSV</button>
          {activeTab === 'expenses' && (
            <button onClick={() => setExpenseModal(true)} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700"><span className="material-icons-outlined text-lg">add</span>Despesa</button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setShowSummary(!showSummary)}>
          <div className="flex items-center gap-3">
            <span className="material-icons-outlined text-gray-500">stacked_bar_chart</span>
            <span className="font-bold text-[15px] text-gray-800">Resumo Financeiro a Pagar</span>
            {stats.overdue > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">Vencimentos Atrasados</span>}
          </div>
          <span className="material-icons-outlined text-gray-400 transition-transform duration-300" style={{ transform: showSummary ? 'rotate(180deg)' : '' }}>expand_more</span>
        </div>
        {showSummary && (
          <div className="p-5 border-t border-gray-100 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-in slide-in-from-top-2 duration-200">
            {/* Vencido */}
            <div className={`rounded-xl border p-4 shadow-sm relative overflow-hidden ${stats.overdue > 0 ? 'bg-red-50/80 border-red-200' : 'bg-white border-gray-200'}`}>
              <div className={`absolute top-0 left-0 w-1 h-full ${stats.overdue > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`material-icons-outlined text-sm ${stats.overdue > 0 ? 'text-red-500' : 'text-green-500'}`}>warning_amber</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${stats.overdue > 0 ? 'text-red-600' : 'text-gray-500'}`}>Vencido</span>
              </div>
              <p className={`text-2xl font-black ${stats.overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(stats.overdue)}</p>
            </div>

            {/* Vence Hoje */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-icons-outlined text-sm text-orange-500">today</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vence Hoje</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.dueToday)}</p>
            </div>

            {/* A Vencer nos próximos 7 dias */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-icons-outlined text-sm text-blue-500">date_range</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Próximos 7 Dias</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.dueNext7Days)}</p>
            </div>

            {/* A Vencer Mais pra Frente */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-icons-outlined text-sm text-indigo-500">update</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vencimentos Futuros</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.dueLater)}</p>
            </div>

            {/* Custos Pendentes (separação) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gray-500"></div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-icons-outlined text-sm text-gray-500">inventory_2</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">A Pagar (Pedidos)</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.totalCustos - stats.pagosCustos)}</p>
            </div>

            {/* Despesas Pendentes (separação) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gray-500"></div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="material-icons-outlined text-sm text-gray-500">business</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">A Pagar (Despesas)</span>
              </div>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.totalDesp - stats.pagosDesp)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[{ id: 'orders' as const, label: 'Custos Pedidos', icon: 'inventory_2' }, { id: 'suppliers' as const, label: 'Por Fornecedor', icon: 'store' }, { id: 'expenses' as const, label: 'Despesas Empresa', icon: 'business' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>
              <span className="material-icons-outlined text-sm">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-2">
          <input className="form-input flex-1 text-sm rounded-lg border-gray-300" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          <select className="form-select text-sm rounded-lg border-gray-300" value={issuerFilter} onChange={e => setIssuerFilter(e.target.value)}>
            <option value="TODOS">Todos</option><option value="CRISTAL">Cristal</option><option value="ESPIRITO">Espírito</option><option value="NATUREZA">Natureza</option>
          </select>
          <input type="date" className="form-input text-sm rounded-lg border-gray-300 max-w-[130px]" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} title="Data Inicial" />
          <input type="date" className="form-input text-sm rounded-lg border-gray-300 max-w-[130px]" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} title="Data Final" />
          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 whitespace-nowrap bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
            <input type="checkbox" checked={sortByDate} onChange={e => setSortByDate(e.target.checked)} className="w-4 h-4 rounded" /> Ordem Cronológica
          </label>
          <label className="flex items-center gap-1 text-xs font-bold text-gray-500 whitespace-nowrap bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
            <input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} className="w-4 h-4 rounded shadow-sm text-blue-600" /> Mostrar Pagos
          </label>
        </div>
      </div>

      {/* ===== COSTS TAB ===== */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Pedido</th>
              <th className="px-3 py-2 text-left">Produto</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Fornecedor</th>
              <th className="px-3 py-2 text-center">Prev. Pgto</th>
              <th className="px-3 py-2 text-right">Estimado</th>
              <th className="px-3 py-2 text-right">Real</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr></thead>
            <tbody>
              {filteredCosts.map((c, i) => (
                <tr key={`${c.id}-${c.costType}-${i}`} onClick={() => navigate('/pedido/' + c.orderId)} className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${c.isPaid ? 'opacity-50' : ''} ${!c.isPaid && c.dueDate && c.dueDate < todayStr ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 font-bold text-gray-700">#{c.orderNumber}</td>
                  <td className="px-3 py-2 text-gray-600 truncate max-w-[120px]">{c.productName}</td>
                  <td className="px-3 py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{c.label}</span></td>
                  <td className="px-3 py-2 font-bold text-blue-700">{c.supplierName}</td>
                  <td className="px-3 py-2 text-center text-xs text-gray-500">{c.dueDate ? formatDate(c.dueDate) : '-'}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-500">{formatCurrency(c.estimatedValue)}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(c.realValue || c.estimatedValue)}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'order', item: c, action: c.isPaid ? 'revert' : 'pay' }); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${c.isPaid ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm hover:shadow hover:bg-yellow-100'}`}>
                      {c.isPaid ? <span className="flex items-center gap-1 justify-center"><span className="material-icons-outlined text-xs">done_all</span>Pago</span> : 'Pagar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCosts.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">Nenhum custo encontrado</p>}
        </div>
      )}

      {/* ===== SUPPLIERS TAB ===== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-3">
          {supplierGroups.map(g => {
            const pending = g.total - g.paid;
            return (
              <div key={g.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="material-icons-outlined text-blue-500">store</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-400">{g.items.length} custos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{formatCurrency(g.total)}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-600">{formatCurrency(g.paid)} pago</span>
                      {pending > 0 && <span className="text-orange-600 font-bold">{formatCurrency(pending)} pend.</span>}
                    </div>
                  </div>
                </div>
                {pending > 0 && (
                  <div className="px-4 py-2">
                    {g.items.filter(c => !c.isPaid).map((c, i) => (
                      <div key={`${c.id}-${c.costType}-${i}`} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">#{c.orderNumber}</span>
                          <span className="text-gray-600">{c.productName}</span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold">{c.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold">{formatCurrency(c.realValue || c.estimatedValue)}</span>
                          <button onClick={() => setConfirmModal({ isOpen: true, type: 'order', item: c, action: 'pay' })} className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100 hover:text-yellow-800 transition-colors">Pagar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {supplierGroups.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">Nenhum fornecedor com custos</p>}
        </div>
      )}

      {/* ===== EXPENSES TAB ===== */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">Emissor</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-center">Vencimento</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr></thead>
            <tbody>
              {filteredExpenses.map(e => (
                <tr key={e.id} className={`border-t border-gray-100 hover:bg-gray-50 ${e.paid ? 'opacity-50' : ''} ${!e.paid && e.due_date < todayStr ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 font-bold text-gray-700">{e.description}</td>
                  <td className="px-3 py-2"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold">{e.category}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{e.issuer}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(e.amount)}</td>
                  <td className="px-3 py-2 text-center text-xs">{formatDate(e.due_date)}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={(ev) => { ev.stopPropagation(); setConfirmModal({ isOpen: true, type: 'expense', item: e, action: e.paid ? 'revert' : 'pay' }); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${e.paid ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm hover:shadow hover:bg-yellow-100'}`}>
                      {e.paid ? <span className="flex items-center justify-center gap-1"><span className="material-icons-outlined text-xs">done_all</span>Pago</span> : 'Pagar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">Nenhuma despesa encontrada</p>}
        </div>
      )}

      {/* New Expense Modal */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold">Nova Despesa</h3>
              <button onClick={() => setExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-icons-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição *</label>
                <input className="form-input w-full text-sm rounded-lg border-gray-300" value={newExpense.description || ''} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Valor *</label>
                  <input className="form-input w-full text-sm rounded-lg border-gray-300 text-right" placeholder="R$ 0,00" value={newExpenseAmount} onChange={e => setNewExpenseAmount(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vencimento</label>
                  <input type="date" className="form-input w-full text-sm rounded-lg border-gray-300" value={newExpense.due_date || ''} onChange={e => setNewExpense({ ...newExpense, due_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Categoria</label>
                  <select className="form-select w-full text-sm rounded-lg border-gray-300" value={newExpense.category || 'FIXO'} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}>
                    <option value="FIXO">Custo Fixo</option><option value="VARIAVEL">Custo Variável</option>
                    <option value="PESSOAL">Pessoal</option><option value="IMPOSTO">Impostos</option><option value="OUTRO">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Emissor</label>
                  <select className="form-select w-full text-sm rounded-lg border-gray-300" value={newExpense.issuer || 'CRISTAL'} onChange={e => setNewExpense({ ...newExpense, issuer: e.target.value })}>
                    <option value="CRISTAL">Cristal</option><option value="ESPIRITO">Espírito</option><option value="NATUREZA">Natureza</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Recorrência</label>
                <select className="form-select w-full text-sm rounded-lg border-gray-300" value={newExpense.recurrence || 'UNICO'} onChange={e => setNewExpense({ ...newExpense, recurrence: e.target.value })}>
                  <option value="UNICO">Único</option><option value="MENSAL">Mensal (12 meses)</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button onClick={() => setExpenseModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800">Cancelar</button>
              <button onClick={saveNewExpense} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 overflow-hidden text-center transform scale-100">
            <div className={`pt-6 pb-2`}>
              {confirmModal.action === 'pay' ? (
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 ring-8 ring-green-50">
                  <span className="material-icons-outlined text-3xl text-green-600">task_alt</span>
                </div>
              ) : (
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4 ring-8 ring-red-50">
                  <span className="material-icons-outlined text-3xl text-red-600">settings_backup_restore</span>
                </div>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 px-6">
              {confirmModal.action === 'pay' ? 'Confirmar Pagamento' : 'Estornar Pagamento'}
            </h3>

            <p className="text-sm text-gray-500 px-6 mt-2 mb-4">
              {confirmModal.action === 'pay'
                ? 'Confira os dados abaixo para confirmar a baixa.'
                : 'Tem certeza que deseja marcar esta conta como pendente novamente?'}
            </p>

            {/* Item Details Box */}
            {confirmModal.item && (
              <div className="bg-gray-50 border border-gray-200 shadow-inner rounded-xl p-4 mx-6 mb-6 text-left relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 opacity-50"></div>
                {confirmModal.type === 'order' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 flex justify-between">
                      <span>Fornecedor:</span> <strong className="text-gray-900 border-b border-gray-200/50 pb-0.5">{confirmModal.item.supplierName}</strong>
                    </p>
                    <p className="text-xs text-gray-500 flex justify-between">
                      <span>Referência:</span> <strong className="text-gray-900 border-b border-gray-200/50 pb-0.5 line-clamp-1 max-w-[180px] text-right" title={`Pedido #${confirmModal.item.orderNumber} - ${confirmModal.item.label}`}>Pedido #{confirmModal.item.orderNumber} - {confirmModal.item.label}</strong>
                    </p>
                    <p className="text-xs text-gray-500 flex justify-between">
                      <span>Vencimento:</span> <strong className="text-gray-900 border-b border-gray-200/50 pb-0.5">{confirmModal.item.dueDate ? formatDate(confirmModal.item.dueDate) : '-'}</strong>
                    </p>
                    <p className="text-xs text-gray-500 flex justify-between items-center bg-white p-1 rounded">
                      <span>Valor:</span> <strong className="text-gray-900 text-sm">{formatCurrency(confirmModal.item.realValue || confirmModal.item.estimatedValue)}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 flex justify-between">
                      <span>Descrição:</span> <strong className="text-gray-900 border-b border-gray-200/50 pb-0.5 line-clamp-1 max-w-[180px] text-right" title={confirmModal.item.description}>{confirmModal.item.description}</strong>
                    </p>
                    <p className="text-xs text-gray-500 flex justify-between">
                      <span>Categoria:</span> <strong className="text-gray-900 border-b border-gray-200/50 pb-0.5">{confirmModal.item.category}</strong>
                    </p>
                    <p className="text-xs text-gray-500 flex justify-between">
                      <span>Vencimento:</span> <strong className="text-gray-900 border-b border-gray-200/50 pb-0.5">{confirmModal.item.due_date ? formatDate(confirmModal.item.due_date) : '-'}</strong>
                    </p>
                    <p className="text-xs text-gray-500 flex justify-between items-center bg-white p-1 rounded">
                      <span>Valor:</span> <strong className="text-gray-900 text-sm">{formatCurrency(confirmModal.item.amount)}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-100">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmModal.type === 'order') executeOrderCostPayment(confirmModal.item);
                  else executeExpensePayment(confirmModal.item);
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className={`px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 cursor-pointer ${confirmModal.action === 'pay'
                  ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                  }`}
              >
                {confirmModal.action === 'pay' ? 'Confirmar' : 'Estornar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayablesPage;
