import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDate, formatMonthYear } from '../src/utils/dateUtils';
import { toast } from 'sonner';

// --- Interfaces ---

interface OrderCostItem {
  id: string; // OrderItem ID
  orderId: string;
  orderNumber: string;
  productName: string;

  // Cost Type
  costType: string;
  label: string;

  // Values
  estimatedValue: number;
  realValue: number;
  isPaid: boolean;
  paidDate?: string;
  observation?: string;
  quantity: number;
  issuer: string;
  dueDate?: string; // payment_due_date from order
}

interface CompanyExpense {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
  category: string;
  recurrence?: string;
  observation?: string;
  amount_paid?: number;
  issuer?: string;
}

// --- Utils ---
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PayablesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'expenses'>('orders');
  const [loading, setLoading] = useState(true);

  // Data
  const [orderCosts, setOrderCosts] = useState<OrderCostItem[]>([]);
  const [expenses, setExpenses] = useState<CompanyExpense[]>([]);

  // Filters
  const [issuerFilter, setIssuerFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [expenseModal, setExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<CompanyExpense>>({
    description: '',
    amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    paid: false,
    category: 'FIXO',
    observation: '',
    issuer: 'CRISTAL'
  });
  const [newExpenseAmount, setNewExpenseAmount] = useState('');

  // Payment Confirmation State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentData, setPaymentData] = useState<{ id: string, type: 'order' | 'expense', amount: number, date: string }>({
    id: '', type: 'order', amount: 0, date: new Date().toISOString().split('T')[0]
  });
  const [targetItem, setTargetItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'orders') {
        await fetchOrderCosts();
      } else {
        await fetchExpenses();
      }
    } catch (err: any) {
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderCosts = async () => {
    const { data: items, error } = await supabase
      .from('order_items')
      .select(`
        *,
        orders (id, order_number, issuer, payment_due_date)
      `)
      .order('id', { ascending: false });

    if (error) throw error;

    const costs: OrderCostItem[] = [];
    items?.forEach((item: any) => {
      const order = item.orders;
      if (!order) return;

      const costTypes = [
        { key: 'unit_price', real: 'real_unit_price', paid: 'unit_price_paid', label: 'Fornecedor Produto', multiplier: item.quantity },
        { key: 'customization_cost', real: 'real_customization_cost', paid: 'customization_paid', label: 'Personalização' },
        { key: 'supplier_transport_cost', real: 'real_supplier_transport_cost', paid: 'supplier_transport_paid', label: 'Frete Fornecedor' },
        { key: 'client_transport_cost', real: 'real_client_transport_cost', paid: 'client_transport_paid', label: 'Frete Cliente' },
        { key: 'extra_expense', real: 'real_extra_expense', paid: 'extra_expense_paid', label: 'Despesa Extra' },
        { key: 'layout_cost', real: 'real_layout_cost', paid: 'layout_paid', label: 'Layout' }
      ];

      costTypes.forEach(ct => {
        // Only include if there is a cost (estimated or real)
        const estimatedUnit = item[ct.key] || 0;
        const realUnit = item[ct.real] || 0;

        // Logic: if unit_price, multiply by qty for total display
        const estimatedTotal = ct.key === 'unit_price' ? estimatedUnit * item.quantity : estimatedUnit;
        const realTotal = ct.key === 'unit_price' ? realUnit * item.quantity : realUnit;

        if (estimatedTotal > 0 || realTotal > 0) {
          costs.push({
            id: item.id,
            orderId: order.id,
            orderNumber: order.order_number,
            productName: item.product_name,
            costType: ct.key,
            label: ct.label,
            estimatedValue: estimatedTotal,
            realValue: realTotal,
            isPaid: item[ct.paid],
            quantity: item.quantity,
            issuer: order.issuer || 'CRISTAL',
            dueDate: order.payment_due_date
          });
        }
      });
    });
    setOrderCosts(costs);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase.from('company_expenses').select('*').order('due_date', { ascending: true });
    if (error) throw error;
    setExpenses(data || []);
  };

  const saveNewExpense = async () => {
    try {
      if (!newExpense.description || !newExpenseAmount) {
        toast.error('Preencha os campos obrigatórios.');
        return;
      }
      const amount = parseFloat(newExpenseAmount.replace(/\D/g, '')) / 100;

      const occurrences = newExpense.recurrence === 'MENSAL' ? 12 : 1;
      const baseDate = new Date(newExpense.due_date + 'T12:00:00');

      const payload = [];
      for (let i = 0; i < occurrences; i++) {
        const d = new Date(baseDate);
        d.setMonth(baseDate.getMonth() + i);
        payload.push({
          ...newExpense,
          amount,
          due_date: d.toISOString().split('T')[0]
        });
      }

      const { error } = await supabase.from('company_expenses').insert(payload);
      if (error) throw error;

      toast.success(occurrences > 1 ? 'Despesas recorrentes (12 meses) salvas.' : 'Despesa salva.');
      setExpenseModal(false);
      setNewExpenseAmount('');
      setNewExpense({ description: '', amount: 0, due_date: new Date().toISOString().split('T')[0], paid: false, category: 'FIXO', observation: '', issuer: 'CRISTAL', recurrence: 'UNICO' });
      fetchExpenses();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleExpensePaid = async (expense: CompanyExpense) => {
    const action = expense.paid ? 'estornar o pagamento' : 'marcar como paga';
    if (!window.confirm(`Deseja realmente ${action} esta despesa?`)) return;

    try {
      const { error } = await supabase.from('company_expenses')
        .update({
          paid: !expense.paid,
          paid_date: !expense.paid ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', expense.id);

      if (error) throw error;
      toast.success('Status da despesa atualizado.');
      fetchExpenses();
    } catch (e: any) {
      toast.error('Erro ao atualizar despesa: ' + e.message);
    }
  };

  // --- Filtering ---
  const filteredOrderCosts = orderCosts.filter(c => {
    if (issuerFilter !== 'TODOS' && c.issuer !== issuerFilter) return false;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      if (!c.orderNumber.toLowerCase().includes(lower) && !c.label.toLowerCase().includes(lower) && !c.productName.toLowerCase().includes(lower)) return false;
    }
    if (startDate && c.dueDate && c.dueDate < startDate) return false;
    if (endDate && c.dueDate && c.dueDate > endDate) return false;
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (issuerFilter !== 'TODOS' && e.issuer !== issuerFilter) return false;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      if (!e.description.toLowerCase().includes(lower) && !e.category.toLowerCase().includes(lower)) return false;
    }
    if (startDate && e.due_date < startDate) return false;
    if (endDate && e.due_date > endDate) return false;
    return true;
  });

  // --- Stats ---
  const calculateTotal = (days: number) => {
    const today = new Date();
    const target = new Date();
    target.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const targetStr = target.toISOString().split('T')[0];

    // Combine costs and expenses
    let total = 0;

    // Expenses
    expenses.forEach(e => {
      if (!e.paid && e.due_date >= todayStr && e.due_date <= targetStr && (issuerFilter === 'TODOS' || e.issuer === issuerFilter)) {
        total += e.amount;
      }
    });

    // Order Costs (using payment_due_date)
    orderCosts.forEach(c => {
      if (!c.isPaid && c.dueDate && c.dueDate >= todayStr && c.dueDate <= targetStr && (issuerFilter === 'TODOS' || c.issuer === issuerFilter)) {
        total += (c.realValue || c.estimatedValue);
      }
    });

    return total;
  };

  const getOverdueTotal = () => {
    const today = new Date().toISOString().split('T')[0];
    let total = 0;
    expenses.forEach(e => {
      if (!e.paid && e.due_date < today && (issuerFilter === 'TODOS' || e.issuer === issuerFilter)) total += e.amount;
    });
    orderCosts.forEach(c => {
      if (!c.isPaid && c.dueDate && c.dueDate < today && (issuerFilter === 'TODOS' || c.issuer === issuerFilter)) total += (c.realValue || c.estimatedValue);
    });
    return total;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <span className="material-icons-outlined text-red-500 text-3xl">payments</span>
            Contas a Pagar
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de custos de pedidos e demais despesas</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase mr-2">Empresa:</span>
          {['TODOS', 'CRISTAL', 'ESPIRITO', 'NATUREZA'].map(emp => (
            <button
              key={emp}
              onClick={() => setIssuerFilter(emp)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${issuerFilter === emp ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {emp === 'ESPIRITO' ? 'ESPÍRITO' : emp}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Buscar</label>
          <div className="relative">
            <span className="material-icons-outlined absolute left-3 top-2.5 text-gray-400">search</span>
            <input
              type="text"
              placeholder={activeTab === 'orders' ? "Pedido, Produto ou Item..." : "Descrição ou Categoria..."}
              className="form-input w-full pl-10 rounded-lg border-gray-300 text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Inicial</label>
          <input
            type="date"
            className="form-input w-full rounded-lg border-gray-300 text-sm"
            value={startDate}
            onChange={e => {
              const newStartDate = e.target.value;
              setStartDate(newStartDate);
              if (endDate && newStartDate && endDate < newStartDate) {
                toast.error('Data final não pode ser anterior à data inicial');
              }
            }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Data Final</label>
          <input
            type="date"
            className="form-input w-full rounded-lg border-gray-300 text-sm"
            value={endDate}
            onChange={e => {
              const newEndDate = e.target.value;
              if (startDate && newEndDate && newEndDate < startDate) {
                toast.error('Data final não pode ser anterior à data inicial');
                return;
              }
              setEndDate(newEndDate);
            }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold uppercase hover:bg-gray-200"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">Vencido / Em Atraso</p>
          <p className="text-xl font-black text-red-600 mt-1">{formatCurrency(getOverdueTotal())}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">A Pagar (Hoje + 7 Dias)</p>
          <p className="text-xl font-black text-gray-800 mt-1">{formatCurrency(calculateTotal(7))}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">A Pagar (30 Dias)</p>
          <p className="text-xl font-black text-gray-800 mt-1">{formatCurrency(calculateTotal(30))}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">Total na Tela</p>
          <p className="text-xl font-black text-orange-600 mt-1">
            {formatCurrency(
              (activeTab === 'orders' ? filteredOrderCosts : filteredExpenses)
                .reduce((acc: number, item: any) => acc + (activeTab === 'orders' ? (item.realValue || item.estimatedValue) : item.amount), 0)
            )}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${activeTab === 'orders' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Custos de Pedidos
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${activeTab === 'expenses' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Demais Despesas
        </button>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-8">
          {Object.entries(
            filteredOrderCosts.reduce((acc: any, cost) => {
              const month = cost.dueDate ? cost.dueDate.substring(0, 7) : 'SEM DATA';
              if (!acc[month]) acc[month] = [];
              acc[month].push(cost);
              return acc;
            }, {})
          ).sort((a, b) => a[0].localeCompare(b[0])).map(([month, monthCosts]: [string, any]) => (
            <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-700 uppercase">
                  {month === 'SEM DATA' ? month : formatMonthYear(month + '-01')}
                </h3>
                <span className="text-xs font-bold text-gray-500">
                  Total: {formatCurrency(monthCosts.reduce((sum: number, c: any) => sum + (c.realValue || c.estimatedValue), 0))}
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Pedido / Produto</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Descrição Custo</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Vencimento</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Valor Real</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthCosts.map((cost: any) => (
                    <tr key={cost.id + cost.costType} className="hover:bg-blue-50 transition-colors odd:bg-white even:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <a
                              href={`#/pedido/${cost.orderId}#item-${cost.id}`}
                              className="text-sm font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              #{cost.orderNumber}
                            </a>
                            <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${cost.issuer === 'CRISTAL' ? 'bg-blue-100 text-blue-700' :
                              cost.issuer === 'ESPIRITO' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                              {cost.issuer}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{cost.productName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-700 uppercase">{cost.label}</td>
                      <td className="px-6 py-4 text-right text-xs text-gray-500 font-bold">{cost.dueDate ? formatDate(cost.dueDate) : '-'}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{formatCurrency(cost.realValue || cost.estimatedValue)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${cost.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {cost.isPaid ? 'PAGO' : 'ABERTO'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-end mb-4">
            <button onClick={() => setExpenseModal(true)} className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold uppercase text-xs hover:bg-red-600 flex items-center gap-2">
              <span className="material-icons-outlined text-sm">add</span> Nova Despesa
            </button>
          </div>
          {Object.entries(
            filteredExpenses.reduce((acc: any, exp) => {
              const month = exp.due_date.substring(0, 7);
              if (!acc[month]) acc[month] = [];
              acc[month].push(exp);
              return acc;
            }, {})
          ).sort((a, b) => a[0].localeCompare(b[0])).map(([month, monthExp]: [string, any]) => (
            <div key={month} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-sm font-black text-gray-700 uppercase">
                  {formatMonthYear(month + '-01')}
                </h3>
                <span className="text-xs font-bold text-gray-500">
                  Total: {formatCurrency(monthExp.reduce((sum: number, e: any) => sum + e.amount, 0))}
                </span>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Vencimento</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Descrição</th>
                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Categoria</th>
                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Valor</th>
                    <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {monthExp.map((expense: any) => (
                    <tr key={expense.id} className="hover:bg-blue-50 transition-colors odd:bg-white even:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatDate(expense.due_date)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-700">{expense.description}</span>
                          {expense.issuer && (
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{expense.issuer}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{expense.category}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{formatCurrency(expense.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => toggleExpensePaid(expense)}
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all hover:opacity-80 ${expense.paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        >
                          {expense.paid ? 'PAGO' : 'PENDENTE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* New Expense Modal */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">Nova Despesa</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor *</label>
                  <input
                    autoFocus
                    className="form-input w-full rounded-lg text-lg font-black text-red-600 border-gray-300"
                    placeholder="R$ 0,00"
                    value={newExpenseAmount}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '');
                      const n = parseFloat(v) / 100;
                      setNewExpenseAmount(n.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vencimento *</label>
                  <input
                    type="date"
                    className="form-input w-full rounded-lg border-gray-300"
                    value={newExpense.due_date}
                    onChange={e => setNewExpense({ ...newExpense, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição *</label>
                <input
                  className="form-input w-full rounded-lg border-gray-300"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categoria</label>
                <select
                  className="form-select w-full rounded-lg border-gray-300"
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  <option value="FIXO">Custo Fixo (Aluguel, Luz, etc)</option>
                  <option value="VARIAVEL">Custo Variável</option>
                  <option value="PESSOAL">Pessoal / Salários</option>
                  <option value="IMPOSTO">Impostos</option>
                  <option value="OUTRO">Outros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Empresa Pagadora</label>
                <div className="grid grid-cols-3 gap-2">
                  {['CRISTAL', 'ESPIRITO', 'NATUREZA'].map(op => (
                    <button
                      key={op}
                      onClick={() => setNewExpense({ ...newExpense, issuer: op })}
                      className={`py-2 border rounded-lg text-[9px] font-bold uppercase transition-all ${newExpense.issuer === op ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-200 text-gray-400'}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                <input
                  type="checkbox"
                  id="recorrente"
                  className="rounded text-red-500 focus:ring-red-500"
                  checked={newExpense.recurrence === 'MENSAL'}
                  onChange={e => setNewExpense({ ...newExpense, recurrence: e.target.checked ? 'MENSAL' : 'UNICO' })}
                />
                <label htmlFor="recorrente" className="text-xs font-bold text-gray-600 cursor-pointer">Replicar esta despesa pelos próximos 12 meses</label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setExpenseModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs hover:bg-gray-200">Cancelar</button>
              <button onClick={saveNewExpense} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase text-xs hover:bg-red-600 shadow-lg shadow-red-100">Salvar Despesa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayablesPage;
