import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { toast } from 'sonner';

interface ReceivableItem {
  id: string; // Composite ID: orderId-type
  orderId: string;
  orderNumber: string;
  clientName: string;
  description: string; // "Entrada" or "Restante"
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  issuer?: string;
}

const ReceivablesPage: React.FC = () => {
  const navigate = useNavigate();
  const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filter, setFilter] = useState<'all' | 'open' | 'paid' | 'overdue'>('all');
  const [issuerFilter, setIssuerFilter] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          status,
          order_date,
          payment_due_date,
          total_amount,
          entry_amount, 
          entry_date, 
          entry_confirmed, 
          remaining_amount, 
          remaining_date, 
          remaining_confirmed,
          issuer,
          partners (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const items: ReceivableItem[] = [];

      orders?.forEach((order: any) => {
        const hasEntry = (order.entry_amount || 0) > 0;
        const hasRemaining = (order.remaining_amount || 0) > 0;

        // 1. Entry Payment
        if (hasEntry) {
          items.push({
            id: `${order.id}-entry`,
            orderId: order.id,
            orderNumber: order.order_number,
            clientName: order.partners?.name || 'Cliente Removido',
            description: 'ENTRADA',
            amount: order.entry_amount,
            dueDate: order.entry_date || order.order_date,
            isPaid: order.entry_confirmed,
            paidDate: order.entry_confirmed ? (order.entry_date || order.order_date) : undefined,
            issuer: order.issuer
          });
        }

        // 2. Remaining Payment
        if (hasRemaining) {
          items.push({
            id: `${order.id}-remaining`,
            orderId: order.id,
            orderNumber: order.order_number,
            clientName: order.partners?.name || 'Cliente Removido',
            description: 'RESTANTE',
            amount: order.remaining_amount,
            dueDate: order.remaining_date || order.payment_due_date || order.order_date,
            isPaid: order.remaining_confirmed,
            paidDate: order.remaining_confirmed ? (order.remaining_date || order.order_date) : undefined,
            issuer: order.issuer
          });
        }

        // 3. Total Fallback (If no split is defined)
        if (!hasEntry && !hasRemaining && (order.total_amount || 0) > 0) {
          items.push({
            id: `${order.id}-total`,
            orderId: order.id,
            orderNumber: order.order_number,
            clientName: order.partners?.name || 'Cliente Removido',
            description: 'TOTAL',
            amount: order.total_amount,
            dueDate: order.payment_due_date || order.order_date,
            isPaid: order.status === 'FINALIZADO', // Assume paid if finalized if no other info
            paidDate: order.status === 'FINALIZADO' ? order.order_date : undefined,
            issuer: order.issuer
          });
        }
      });

      items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setReceivables(items);
    } catch (error: any) {
      toast.error('Erro ao carregar contas a receber.');
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (item: ReceivableItem) => {
    if (!window.confirm(`Confirmar recebimento de ${item.description} do pedido #${item.orderNumber}?`)) return;

    try {
      const type = item.description === 'ENTRADA' ? 'entry' : 'remaining';
      const updateData = type === 'entry' ? { entry_confirmed: true } : { remaining_confirmed: true };

      const { error } = await supabase.from('orders').update(updateData).eq('id', item.orderId);
      if (error) throw error;

      toast.success(`Recebimento confirmado!`);
      // Update local state locally to avoid refetch
      setReceivables(prev => prev.map(p => p.id === item.id ? { ...p, isPaid: true } : p));
    } catch (error: any) {
      toast.error('Erro ao confirmar: ' + error.message);
    }
  };

  const filteredItems = receivables.filter(item => {
    // Status Filter
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = !item.isPaid && item.dueDate < today;
    const isOpen = !item.isPaid && item.dueDate >= today;

    if (filter === 'paid' && !item.isPaid) return false;
    if (filter === 'open' && !isOpen) return false;
    if (filter === 'overdue' && !isOverdue) return false;

    // Issuer Filter
    if (issuerFilter !== 'TODOS' && item.issuer !== issuerFilter) return false;

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const matches = item.orderNumber.toLowerCase().includes(lower) ||
        item.clientName.toLowerCase().includes(lower) ||
        item.amount.toString().includes(lower);
      if (!matches) return false;
    }

    // Date Range
    if (startDate && item.dueDate < startDate) return false;
    if (endDate && item.dueDate > endDate) return false;

    return true;
  });

  const getCashFlow = (days: number) => {
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + days);

    const todayStr = today.toISOString().split('T')[0];
    const targetStr = targetDate.toISOString().split('T')[0];

    return receivables
      .filter(r => !r.isPaid && r.dueDate >= todayStr && r.dueDate <= targetStr && (issuerFilter === 'TODOS' || r.issuer === issuerFilter))
      .reduce((acc, r) => acc + r.amount, 0);
  };

  const isOverdue = (date: string, isPaid: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    return !isPaid && date < today;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
            <span className="material-icons-outlined text-green-500 text-3xl">account_balance_wallet</span>
            Contas a Receber
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestão de entradas e recebimentos de pedidos</p>
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
              placeholder="Pedido, Cliente ou Valor..."
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

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">Previsão 7 Dias</p>
          <p className="text-xl font-black text-gray-800 mt-1">{getCashFlow(7).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">Previsão 15 Dias</p>
          <p className="text-xl font-black text-gray-800 mt-1">{getCashFlow(15).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-purple-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">Previsão 30 Dias</p>
          <p className="text-xl font-black text-gray-800 mt-1">{getCashFlow(30).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
          <p className="text-[10px] font-black text-gray-400 uppercase">Total na Tela</p>
          <p className="text-xl font-black text-green-600 mt-1">{filteredItems.reduce((acc, i) => acc + i.amount, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex justify-start mb-4 space-x-2 border-b border-gray-200 pb-2">
        <button onClick={() => setFilter('all')} className={`pb-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${filter === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Todos</button>
        <button onClick={() => setFilter('open')} className={`pb-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${filter === 'open' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>A Vencer</button>
        <button onClick={() => setFilter('paid')} className={`pb-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${filter === 'paid' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Pagos</button>
        <button onClick={() => setFilter('overdue')} className={`pb-2 px-4 text-xs font-bold uppercase border-b-2 transition-all ${filter === 'overdue' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Vencidos</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Vencimento</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Pedido / Cliente</th>
              <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Descrição</th>
              <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Valor</th>
              <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400 italic text-sm">Nenhum registro encontrado com os filtros atuais.</td></tr>
            ) : filteredItems.map((item) => {
              const overdue = isOverdue(item.dueDate, item.isPaid);
              return (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/pedido/${item.orderId}`)}
                  className={`transition-colors cursor-pointer group ${overdue ? 'bg-red-50 hover:bg-red-100' : 'odd:bg-white even:bg-gray-50 hover:bg-blue-50'}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${overdue ? 'text-red-700' : 'text-gray-900 group-hover:text-blue-700'}`}>{formatDate(item.dueDate)}</span>
                      {overdue && <span className="text-[10px] font-black text-red-600 animate-pulse uppercase mt-1">Vencido</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-blue-600">#{item.orderNumber}</span>
                        {item.issuer && (
                          <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${item.issuer === 'CRISTAL' ? 'bg-blue-100 text-blue-700' :
                            item.issuer === 'ESPIRITO' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                            {item.issuer.substring(0, 1)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.clientName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.description === 'ENTRADA' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                      {item.description}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {item.isPaid ? (
                      <span className="px-2 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-green-100 text-green-800 uppercase">
                        PAGO {item.paidDate ? formatDate(item.paidDate) : ''}
                      </span>
                    ) : overdue ? (
                      <span className="px-2 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-red-100 text-red-800 uppercase">
                        VENCIDO
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800 uppercase">
                        A VENCER
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {!item.isPaid && (
                      <button
                        onClick={() => confirmPayment(item)}
                        className="text-blue-600 hover:text-blue-900 font-bold text-xs uppercase hover:underline"
                      >
                        Confirmar Rec.
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceivablesPage;
