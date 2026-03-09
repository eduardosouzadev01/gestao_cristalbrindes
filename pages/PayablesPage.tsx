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
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    category: 'FIXO',
    issuer: 'CRISTAL',
    recurring_months: 1,
    observation: ''
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, type: 'order' | 'expense', item: any, action: 'pay' | 'revert' }>({ isOpen: false, type: 'order', item: null, action: 'pay' });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try { await Promise.all([fetchOrderCosts(), fetchExpenses()]); } catch { }
    setLoading(false);
  };

  const fetchOrderCosts = async () => {
    const { data: items } = await supabase.from('order_items')
      .select(`*, orders(id, order_number, issuer, payment_due_date, status), supplier:supplier_id(name), customization_supplier:customization_supplier_id(name), transport_supplier:transport_supplier_id(name), layout_supplier:layout_supplier_id(name), extra_supplier:extra_supplier_id(name)`)
      .order('id', { ascending: false });

    const costs: OrderCostItem[] = [];
    items?.forEach((item: any) => {
      const order = item.orders;
      if (!order || order.status === 'CANCELADO') return;

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
  const executePaymentAction = async () => {
    const { type, item, action } = confirmModal;
    if (!item) return;

    if (type === 'order') {
      const paidField = [
        { key: 'unit_price', paid: 'unit_price_paid' }, { key: 'customization_cost', paid: 'customization_paid' },
        { key: 'supplier_transport_cost', paid: 'supplier_transport_paid' }, { key: 'client_transport_cost', paid: 'client_transport_paid' },
        { key: 'extra_expense', paid: 'extra_expense_paid' }, { key: 'layout_cost', paid: 'layout_paid' }
      ].find(c => c.key === item.costType)?.paid;
      if (!paidField) return;

      const { error } = await supabase.from('order_items').update({ [paidField]: action === 'pay' }).eq('id', item.id);
      if (error) { toast.error(error.message); return; }
      setOrderCosts(prev => prev.map(c => c.id === item.id && c.costType === item.costType ? { ...c, isPaid: action === 'pay' } : c));
    } else {
      const { error } = await supabase.from('company_expenses').update({
        paid: action === 'pay', paid_date: action === 'pay' ? new Date().toISOString().split('T')[0] : null
      }).eq('id', item.id);
      if (error) { toast.error(error.message); return; }
      setExpenses(prev => prev.map(e => e.id === item.id ? { ...e, paid: action === 'pay' } : e));
    }

    toast.success(action === 'pay' ? 'Pagamento confirmado!' : 'Pagamento estornado!');
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const saveNewExpense = async () => {
    if (!expenseForm.description || expenseForm.amount <= 0 || !expenseForm.category) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const count = Math.max(1, expenseForm.recurring_months);
    const inserts = [];
    for (let i = 0; i < count; i++) {
      const date = new Date(expenseForm.due_date + 'T12:00:00');
      date.setMonth(date.getMonth() + i);
      inserts.push({
        description: count > 1 ? `${expenseForm.description} (${i + 1}/${count})` : expenseForm.description,
        amount: expenseForm.amount,
        due_date: date.toISOString().split('T')[0],
        category: expenseForm.category,
        issuer: expenseForm.issuer,
        observation: expenseForm.observation,
        paid: false
      });
    }

    const { error } = await supabase.from('company_expenses').insert(inserts);
    if (error) { toast.error(error.message); return; }
    toast.success(count > 1 ? 'Despesas recorrentes salvas.' : 'Despesa salva.');
    setExpenseModal(false);
    setExpenseForm({
      description: '', amount: 0, due_date: new Date().toISOString().split('T')[0],
      category: 'FIXO', issuer: 'CRISTAL', recurring_months: 1, observation: ''
    });
    fetchExpenses();
  };

  const exportData = () => {
    const data = [];
    if (activeTab === 'orders') {
      data.push(['Tipo', 'Pedido', 'Produto', 'Fornecedor', 'Vencimento', 'Valor Estimado', 'Valor Real', 'Status']);
      filteredCosts.forEach(c => {
        data.push([
          c.label,
          `#${c.orderNumber}`,
          c.productName,
          c.supplierName,
          c.dueDate ? formatDate(c.dueDate) : '-',
          formatCurrency(c.estimatedValue),
          formatCurrency(c.realValue || c.estimatedValue),
          c.isPaid ? 'PAGO' : 'PENDENTE'
        ]);
      });
      exportSimpleCSV(data, 'custos_pedidos.csv');
    } else if (activeTab === 'expenses') {
      data.push(['Descrição', 'Categoria', 'Emissor', 'Valor', 'Vencimento', 'Status']);
      filteredExpenses.forEach(e => {
        data.push([
          e.description,
          e.category,
          e.issuer || '-',
          formatCurrency(e.amount),
          formatDate(e.due_date),
          e.paid ? 'PAGO' : 'PENDENTE'
        ]);
      });
      exportSimpleCSV(data, 'despesas_empresa.csv');
    } else if (activeTab === 'suppliers') {
      data.push(['Fornecedor', 'Total', 'Pago', 'Pendente']);
      supplierGroups.forEach(g => {
        data.push([
          g.name,
          formatCurrency(g.total),
          formatCurrency(g.paid),
          formatCurrency(g.total - g.paid)
        ]);
      });
      exportSimpleCSV(data, 'fornecedores_resumo.csv');
    }
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
      sorted.sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));
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

  const stats = useMemo(() => {
    let overdue = 0, dueToday = 0, dueNext7Days = 0, dueLater = 0;
    let totalCustos = 0, pagosCustos = 0;
    let totalDesp = 0, pagosDesp = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    filteredCosts.forEach(c => {
      const value = c.realValue || c.estimatedValue;
      totalCustos += value;
      if (c.isPaid) {
        pagosCustos += value;
      } else {
        if (c.dueDate) {
          const dueDate = new Date(c.dueDate + 'T00:00:00');
          if (dueDate < today) {
            overdue += value;
          } else if (dueDate.toDateString() === today.toDateString()) {
            dueToday += value;
          } else if (dueDate <= sevenDaysFromNow) {
            dueNext7Days += value;
          } else {
            dueLater += value;
          }
        } else { // If no due date, consider it future or pending
          dueLater += value;
        }
      }
    });

    filteredExpenses.forEach(e => {
      totalDesp += e.amount;
      if (e.paid) {
        pagosDesp += e.amount;
      } else {
        const dueDate = new Date(e.due_date + 'T00:00:00');
        if (dueDate < today) {
          overdue += e.amount;
        } else if (dueDate.toDateString() === today.toDateString()) {
          dueToday += e.amount;
        } else if (dueDate <= sevenDaysFromNow) {
          dueNext7Days += e.amount;
        } else {
          dueLater += e.amount;
        }
      }
    });

    return {
      overdue,
      dueToday,
      dueNext7Days,
      dueLater,
      totalCustos,
      pagosCustos,
      totalDesp,
      pagosDesp,
      totalPendente: (totalCustos - pagosCustos) + (totalDesp - pagosDesp)
    };
  }, [filteredCosts, filteredExpenses]);

  return (
    <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
      {/* Optimized Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center shadow-sm">
            <span className="material-icons-outlined text-white text-lg">payments</span>
          </div>
          <div>
            <h1 className="text-xl font-black leading-none text-gray-900 uppercase tracking-tighter">CONTAS A PAGAR</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Fluxo de custos de pedidos e despesas operacionais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportData} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-[10px] font-black uppercase tracking-widest text-gray-700 rounded shadow-sm hover:bg-gray-50 transition-all cursor-pointer">
            <span className="material-icons-outlined text-sm">download</span> CSV
          </button>
          {activeTab === 'expenses' && (
            <button onClick={() => setExpenseModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-blue-700 transition-all cursor-pointer">
              <span className="material-icons-outlined text-sm">add</span> Despesa
            </button>
          )}
        </div>
      </div>

      {/* Summary Section (High-Density) */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden shadow-sm">
        <div
          className="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => setShowSummary(!showSummary)}
        >
          <div className="flex items-center gap-2.5">
            <span className="material-icons-outlined text-gray-400 text-lg">stacked_bar_chart</span>
            <span className="font-black text-[11px] text-gray-700 uppercase tracking-widest">Resumo Financeiro Gerencial</span>
            {stats.overdue > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[8px] font-black uppercase border border-red-100 animate-pulse">
                ALERTA: VENCIMENTOS EM ATRASO
              </span>
            )}
          </div>
          <span className={`material-icons-outlined text-gray-400 text-lg transition-transform duration-200 ${showSummary ? 'rotate-180' : ''}`}>expand_more</span>
        </div>

        {showSummary && (
          <div className="p-3 border-t border-gray-100 bg-gray-50/30 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 anime-in slide-in-from-top-2">
            {[
              { label: 'VENCIDO', value: stats.overdue, color: stats.overdue > 0 ? 'red' : 'emerald', icon: 'priority_high' },
              { label: 'VENCE HOJE', value: stats.dueToday, color: 'orange', icon: 'today' },
              { label: 'PRÓX. 7 DIAS', value: stats.dueNext7Days, color: 'blue', icon: 'date_range' },
              { label: 'FUTURO', value: stats.dueLater, color: 'indigo', icon: 'update' },
              { label: 'A PAGAR (PEDIDOS)', value: stats.totalCustos - stats.pagosCustos, color: 'gray', icon: 'inventory_2' },
              { label: 'A PAGAR (DESPESAS)', value: stats.totalDesp - stats.pagosDesp, color: 'gray', icon: 'business' }
            ].map(div => (
              <div key={div.label} className={`bg-white rounded border p-2.5 shadow-sm relative group overflow-hidden ${div.label === 'VENCIDO' && stats.overdue > 0 ? 'border-red-200 ring-1 ring-red-50' : 'border-gray-200'}`}>
                <div className={`absolute top-0 left-0 w-0.5 h-full bg-${div.color}-500/50`}></div>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[7px] font-black uppercase tracking-widest ${div.label === 'VENCIDO' && stats.overdue > 0 ? 'text-red-500' : 'text-gray-400'}`}>{div.label}</span>
                  <span className={`material-icons-outlined text-[10px] text-${div.color}-500`}>{div.icon}</span>
                </div>
                <p className={`text-base font-black text-gray-900 leading-none group-hover:scale-105 transition-transform`}>{formatCurrency(div.value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs & Filters Control Strip */}
      <div className="grid grid-cols-12 gap-3 items-end">
        <div className="col-span-12 lg:col-span-4 bg-gray-100/50 p-1 rounded border border-gray-200 flex gap-1">
          {[
            { id: 'orders' as const, label: 'CUSTOS PEDIDOS', icon: 'inventory_2' },
            { id: 'suppliers' as const, label: 'POR FORNECEDOR', icon: 'store' },
            { id: 'expenses' as const, label: 'DESPESAS EMPRESA', icon: 'business' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="material-icons-outlined text-[14px]">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-8 bg-white p-1.5 rounded border border-gray-200 shadow-sm flex items-center flex-wrap gap-2">
          <div className="flex-1 min-w-[150px] relative">
            <span className="material-icons-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 text-sm">search</span>
            <input
              className="w-full pl-8 h-8 border border-gray-300 rounded text-[10px] font-black uppercase placeholder:text-gray-300"
              placeholder="BUSCAR REGISTRO..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="h-8 px-2 border border-gray-300 rounded text-[10px] font-black uppercase bg-gray-50/30" value={issuerFilter} onChange={e => setIssuerFilter(e.target.value)}>
            <option value="TODOS">TODAS EMPRESAS</option>
            <option value="CRISTAL">CRISTAL</option>
            <option value="ESPIRITO">ESPÍRITO</option>
            <option value="NATUREZA">NATUREZA</option>
          </select>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded px-1 h-8">
            <input type="date" className="bg-transparent border-0 text-[10px] font-black p-0 w-24 h-full" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            <span className="text-gray-300 text-[10px]">→</span>
            <input type="date" className="bg-transparent border-0 text-[10px] font-black p-0 w-24 h-full" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 px-2 h-8 bg-white border border-gray-200 rounded cursor-pointer select-none">
            <input type="checkbox" checked={sortByDate} onChange={e => setSortByDate(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-tight">CRONOLÓGICO</span>
          </label>
          <label className="flex items-center gap-2 px-2 h-8 bg-white border border-gray-200 rounded cursor-pointer select-none">
            <input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-0" />
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-tight">EXIBIR PAGOS</span>
          </label>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-2 text-left">N° PEDIDO / PRODUTO</th>
                  <th className="px-4 py-2 text-left">CATEGORIA DE CUSTO</th>
                  <th className="px-4 py-2 text-left">FORNECEDOR</th>
                  <th className="px-4 py-2 text-center">VENCIMENTO</th>
                  <th className="px-4 py-2 text-right">ESTIMADO</th>
                  <th className="px-4 py-2 text-right">REAL (BAIXA)</th>
                  <th className="px-4 py-2 text-center">AÇÕES / STATUS</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredCosts.map((c, i) => (
                  <tr
                    key={`${c.id}-${c.costType}-${i}`}
                    className={`hover:bg-blue-50/30 transition-colors group ${c.isPaid ? 'bg-gray-50/50 opacity-60' : !c.isPaid && c.dueDate && c.dueDate < todayStr ? 'bg-red-50/50' : ''}`}
                  >
                    <td className="px-4 py-1.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline underline-offset-2 decoration-blue-200" onClick={() => navigate('/pedido/' + c.orderId)}>
                          #{c.orderNumber}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[200px] mt-0.5">{c.productName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[8px] font-black text-gray-600 uppercase border border-gray-200 shadow-sm">{c.label}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-black text-gray-700 uppercase">{c.supplierName}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-center">
                      <span className={`text-[9px] font-bold ${!c.isPaid && c.dueDate && c.dueDate < todayStr ? 'text-red-500 font-black' : 'text-gray-500'}`}>
                        {c.dueDate ? formatDate(c.dueDate) : '---'}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-right">
                      <span className="text-[10px] font-bold text-gray-400 tabular-nums">{formatCurrency(c.estimatedValue)}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-right">
                      <span className="text-[10px] font-black text-gray-900 tabular-nums">{formatCurrency(c.realValue || c.estimatedValue)}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, type: 'order', item: c, action: c.isPaid ? 'revert' : 'pay' }); }}
                        className={`inline-flex items-center justify-center min-w-[80px] py-1 px-2 rounded text-[8px] font-black uppercase tracking-widest shadow-sm border transition-all ${c.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}
                      >
                        {c.isPaid ? (
                          <div className="flex items-center gap-1"><span className="material-icons-outlined text-[10px]">check_circle</span>PAGO</div>
                        ) : 'BAIXAR CUSTO'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCosts.length === 0 && (
              <div className="py-12 text-center text-[10px] font-black text-gray-300 uppercase italic">Nenhum custo pendente localizado</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-4 py-2 text-left">FORNECEDOR</th>
                  <th className="px-4 py-2 text-right">TOTAL</th>
                  <th className="px-4 py-2 text-right">PAGO</th>
                  <th className="px-4 py-2 text-right">PENDENTE</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {supplierGroups.map((g, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2 text-[10px] font-black text-gray-700 uppercase">{g.name}</td>
                    <td className="px-4 py-2 text-[10px] font-bold text-gray-500 text-right tabular-nums">{formatCurrency(g.total)}</td>
                    <td className="px-4 py-2 text-[10px] font-bold text-emerald-600 text-right tabular-nums">{formatCurrency(g.paid)}</td>
                    <td className="px-4 py-2 text-[10px] font-black text-orange-600 text-right tabular-nums">{formatCurrency(g.total - g.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {supplierGroups.length === 0 && (
              <div className="py-12 text-center text-[10px] font-black text-gray-300 uppercase italic">Nenhum fornecedor localizado</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden text-[10px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-2 text-left">DESCRIÇÃO DA DESPESA</th>
                <th className="px-4 py-2 text-left">CATEGORIA</th>
                <th className="px-4 py-2 text-left">EMISSOR</th>
                <th className="px-4 py-2 text-right">VALOR</th>
                <th className="px-4 py-2 text-center">VENCIMENTO</th>
                <th className="px-4 py-2 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredExpenses.map(e => (
                <tr key={e.id} className={`hover:bg-blue-50/30 group ${e.paid ? 'opacity-60 bg-gray-50' : e.due_date < todayStr ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-2 uppercase font-black text-gray-800">{e.description}</td>
                  <td className="px-4 py-2"><span className="px-1.5 py-0.5 rounded bg-gray-100 border text-[8px] font-black uppercase tracking-tighter">{e.category}</span></td>
                  <td className="px-4 py-2 text-gray-400 font-bold uppercase">{e.issuer}</td>
                  <td className="px-4 py-2 text-right font-black tabular-nums">{formatCurrency(e.amount)}</td>
                  <td className={`px-4 py-2 text-center font-bold ${!e.paid && e.due_date < todayStr ? 'text-red-500 font-black' : 'text-gray-500'}`}>{formatDate(e.due_date)}</td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => setConfirmModal({ isOpen: true, type: 'expense', item: e, action: e.paid ? 'revert' : 'pay' })} className={`inline-flex items-center gap-1 px-3 py-1 rounded text-[8px] font-black uppercase border tracking-widest shadow-sm ${e.paid ? 'bg-emerald-50 text-emerald-600 border-emerald-100 font-black' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                      {e.paid ? <span className="material-icons-outlined text-[10px]">check_circle</span> : ''}
                      {e.paid ? 'PAGO' : 'LIQUIDAR'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && <div className="py-12 text-center text-[10px] font-black text-gray-300 uppercase italic">Nenhuma despesa localizada</div>}
        </div>
      )}

      {/* Modals Container */}
      {(confirmModal.isOpen || expenseModal) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-[2px]">
          {expenseModal ? (
            <div className="bg-white rounded border w-full max-w-sm shadow-2xl animate-in zoom-in-95 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-widest">LANÇAR NOVA DESPESA</h3>
                <button onClick={() => setExpenseModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons-outlined text-sm">close</span></button>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">DESCRIÇÃO DA CONTA</label>
                  <input className="w-full px-2 border border-gray-300 rounded h-8 text-xs font-black uppercase placeholder:text-gray-200" placeholder="EX: ALUGUEL" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">VALOR (R$)</label>
                    <input type="number" step="0.01" className="w-full px-2 border border-gray-300 rounded h-8 text-xs font-black" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">VENCIMENTO</label>
                    <input type="date" className="w-full px-2 border border-gray-300 rounded h-8 text-[10px] font-black" value={expenseForm.due_date} onChange={e => setExpenseForm({ ...expenseForm, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">CATEGORIA</label>
                    <select className="w-full px-2 border border-gray-300 rounded h-8 text-[9px] font-black uppercase" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                      <option value="FIXO">FIXO</option><option value="VARIAVEL">VARIÁVEL</option><option value="IMPOSTO">IMPOSTOS</option><option value="PRO-LABORE">PRO-LABORE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1">EMISSOR</label>
                    <select className="w-full px-2 border border-gray-300 rounded h-8 text-[9px] font-black uppercase" value={expenseForm.issuer} onChange={e => setExpenseForm({ ...expenseForm, issuer: e.target.value })}>
                      <option value="CRISTAL">CRISTAL</option><option value="ESPIRITO">ESPÍRITO</option><option value="NATUREZA">NATUREZA</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase mb-1 font-bold">RECORRÊNCIA (MESES)</label>
                  <input type="number" min="1" max="120" className="w-full px-2 border border-gray-300 rounded h-8 text-xs font-black" value={expenseForm.recurring_months} onChange={e => setExpenseForm({ ...expenseForm, recurring_months: parseInt(e.target.value) || 1 })} />
                  {expenseForm.recurring_months > 1 && <p className="text-[7px] font-black text-blue-600 mt-1 uppercase">Serão geradas {expenseForm.recurring_months} parcelas consecutivas.</p>}
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t">
                <button onClick={saveNewExpense} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-[0.98]">
                  SALVAR LANÇAMENTO
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 overflow-hidden text-center transform scale-100 transition-all">
              <div className="pt-6 pb-2 text-center">
                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ring-8 ${confirmModal.action === 'pay' ? 'bg-green-100 ring-green-50' : 'bg-red-100 ring-red-50'}`}>
                  <span className={`material-icons-outlined text-3xl ${confirmModal.action === 'pay' ? 'text-green-600' : 'text-red-600'}`}>{confirmModal.action === 'pay' ? 'task_alt' : 'settings_backup_restore'}</span>
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 px-6 uppercase tracking-tighter">{confirmModal.action === 'pay' ? 'Confirmar Pagamento' : 'Estornar Pagamento'}</h3>
              <p className="text-sm text-gray-500 px-6 mt-2 mb-4">{confirmModal.action === 'pay' ? 'Confira os dados para confirmar a baixa.' : 'Deseja marcar como pendente novamente?'}</p>
              {confirmModal.item && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mx-6 mb-6 text-left relative overflow-hidden">
                  <div className="absolute left-0 top-0 w-1 h-full bg-blue-500 opacity-50"></div>
                  <p className="text-xs text-gray-500 flex justify-between"><span>Ref:</span> <strong className="text-gray-900">{confirmModal.item.orderNumber ? `Pedido #${confirmModal.item.orderNumber}` : confirmModal.item.description}</strong></p>
                  <p className="text-xs text-gray-500 flex justify-between mt-1"><span>Valor:</span> <strong className="text-gray-900 text-sm">{formatCurrency(confirmModal.item.realValue || confirmModal.item.amount)}</strong></p>
                </div>
              )}
              <div className="bg-gray-50 p-4 flex gap-3 border-t">
                <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100">Sair</button>
                <button onClick={executePaymentAction} className={`flex-1 px-4 py-2.5 rounded-xl font-black text-white shadow-lg ${confirmModal.action === 'pay' ? 'bg-green-600 shadow-green-200 hover:bg-green-700' : 'bg-red-600 shadow-red-200 hover:bg-red-700'}`}>{confirmModal.action === 'pay' ? 'CONFIRMAR' : 'ESTORNAR'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PayablesPage;
