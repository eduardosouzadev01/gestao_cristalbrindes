
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { appUser } = useAuth();

  // States
  const [searchTerm, setSearchTerm] = useState(location.state?.clientName || '');

  const [vendedorFilter, setVendedorFilter] = useState('Todos os Vendedores');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [limitDateFilter, setLimitDateFilter] = useState('');
  const [supplierDateFilter, setSupplierDateFilter] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [orderBy, setOrderBy] = useState<string>('created_at');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('desc');

  // Initialize Vendedor Filter based on Auth
  useEffect(() => {
    if (appUser?.salesperson) {
      setVendedorFilter(appUser.salesperson);
    }
  }, [appUser]);

  useEffect(() => {
    fetchOrders();
  }, [appUser, page, searchTerm, vendedorFilter, statusFilter, limitDateFilter, supplierDateFilter, orderBy, orderDirection]); // Re-fetch on any filter change

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Fetch orders with client name (join)
      let query = supabase
        .from('orders')
        .select(`
          id, 
          order_number, 
          status, 
          order_date, 
          total_amount, 
          entry_amount,
          remaining_amount,
          salesperson,
          payment_due_date,
          supplier_departure_date,
          partners (name, doc)
        `, { count: 'exact' });

      // If user can only view own orders, force filter by their salesperson
      if (!hasPermission('pedidos.all') && appUser?.salesperson) {
        query = query.eq('salesperson', appUser.salesperson);
      } else if (vendedorFilter !== 'Todos os Vendedores') {
        // Only apply manual vendedor filter if not restricted
        query = query.eq('salesperson', vendedorFilter);
      }

      if (statusFilter !== 'Todos') {
        query = query.eq('status', statusFilter);
      }

      // Date Filters - server-side
      if (limitDateFilter) {
        query = query.eq('payment_due_date', limitDateFilter);
      }
      if (supplierDateFilter) {
        query = query.eq('supplier_departure_date', supplierDateFilter);
      }

      // Pagination and ordering
      query = query
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      setTotalCount(count || 0);

      if (data) {
        const formatted = data.map((o: any) => ({
          id_original: o.id,
          id: o.order_number || o.id.substring(0, 8),
          status: o.status,
          client: o.partners?.name || 'Cliente Removido',
          vendedor: o.salesperson,
          cnpj: o.partners?.doc || '-',
          date: formatDate(o.order_date),
          total: o.total_amount ? o.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00',
          limitDate: o.payment_due_date,
          supplierDate: o.supplier_departure_date,

          // Raw values for search
          total_raw: o.total_amount || 0,
          entry_amount: o.entry_amount || 0,
          remaining_amount: o.remaining_amount || 0,

          statusColor: getStatusColor(o.status),
          dotColor: getStatusDotColor(o.status)
        }));
        setOrders(formatted);
      }
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      if (err.message?.includes('supplier_departure_date')) {
        // Fallback or alert user
        // Since I cannot allow fallback easily without duplicate code, I will warn the user
        alert('AVISO: O banco de dados precisa ser atualizado. Execute o script de migração no Supabase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteOrder = async (order: any) => {
    if (!appUser?.permissions?.fullAccess && !appUser?.permissions?.canDelete) {
      toast.error('Você não tem permissão para excluir pedidos.');
      return;
    }

    if (!window.confirm(`Excluir pedido #${order.id} permanentemente? Esta ação não pode ser desfeita.`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('orders').delete().eq('id', order.id_original);
      if (error) throw error;
      toast.success('Pedido excluído com sucesso.');
      fetchOrders();
    } catch (e: any) {
      toast.error('Erro ao excluir pedido: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    const map: any = {
      'AGUARDANDO PAGAMENTO ENTRADA': 'AGUARDANDO 1ª PARCELA',
      'AGUARDANDO PAGAMENTO 2 PARCELA': 'AGUARDANDO 2ª PARCELA',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: any = {
      'AGUARDANDO PAGAMENTO ENTRADA': 'bg-yellow-100 text-yellow-700',
      'EM PRODUÇÃO': 'bg-blue-100 text-blue-600',
      'EM TRANSPORTE': 'bg-purple-100 text-purple-600',
      'EM CONFERÊNCIA': 'bg-indigo-100 text-indigo-600',
      'AGUARDANDO PAGAMENTO 2 PARCELA': 'bg-orange-100 text-orange-700',
      'ENTREGUE': 'bg-emerald-100 text-emerald-700',
      'AGUARDANDO PAGAMENTO FATURAMENTO': 'bg-cyan-100 text-cyan-700',
      'FINALIZADO': 'bg-green-100 text-green-600'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusDotColor = (status: string) => {
    const map: any = {
      'AGUARDANDO PAGAMENTO ENTRADA': 'bg-yellow-500',
      'EM PRODUÇÃO': 'bg-blue-600',
      'EM TRANSPORTE': 'bg-purple-600',
      'EM CONFERÊNCIA': 'bg-indigo-600',
      'AGUARDANDO PAGAMENTO 2 PARCELA': 'bg-orange-500',
      'ENTREGUE': 'bg-emerald-600',
      'AGUARDANDO PAGAMENTO FATURAMENTO': 'bg-cyan-500',
      'FINALIZADO': 'bg-green-600'
    };
    return map[status] || 'bg-gray-400';
  };

  const filteredOrders = orders.filter(o => {
    let matchSearch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      let numericTerm: number | null = null;
      const cleanTerm = term.replace(/[^\d,.-]/g, '');
      if (cleanTerm) {
        const normalized = cleanTerm.replace(',', '.');
        if (!isNaN(parseFloat(normalized))) {
          numericTerm = parseFloat(normalized);
        }
      }

      const matchText =
        o.id.toString().toLowerCase().includes(term) ||
        o.client.toLowerCase().includes(term) ||
        o.cnpj.includes(term);

      let matchValue = false;
      if (numericTerm !== null) {
        const epsilon = 0.5;
        matchValue =
          Math.abs(o.total_raw - numericTerm) < epsilon ||
          Math.abs(o.entry_amount - numericTerm) < epsilon ||
          Math.abs(o.remaining_amount - numericTerm) < epsilon;
      }

      matchSearch = matchText || matchValue;
    }

    return matchSearch;
  });

  const statusOptions = [
    'Todos',
    'AGUARDANDO PAGAMENTO ENTRADA', 'EM PRODUÇÃO', 'EM TRANSPORTE', 'EM CONFERÊNCIA',
    'AGUARDANDO PAGAMENTO 2 PARCELA', 'ENTREGUE', 'AGUARDANDO PAGAMENTO FATURAMENTO', 'FINALIZADO'
  ];

  return (
    <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black leading-none text-gray-900 uppercase tracking-tighter flex items-center gap-2">
            <span className="material-icons-outlined text-blue-600 text-2xl">list_alt</span>
            GESTÃO DE PEDIDOS
          </h2>
          <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Painel administrativo de pedidos de venda</p>
        </div>
      </div>

      {/* Optimized Filters */}
      <div className="bg-white rounded border border-gray-200 p-2.5 shadow-sm">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">BUSCAR PEDIDO</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons-outlined text-gray-400 text-sm">search</span>
              </span>
              <input
                type="text"
                placeholder="ID, Cliente, CNPJ ou Valor..."
                className="form-input block w-full pl-11 rounded border-gray-300 shadow-sm focus:ring-0 focus:border-blue-500 text-xs h-8 font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-40">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">VENDEDOR</label>
            <select
              disabled={!!appUser?.salesperson}
              className={`form-select block w-full rounded border-gray-300 shadow-sm focus:ring-0 focus:border-blue-500 text-[10px] h-8 font-bold py-0 pr-6 ${appUser?.salesperson ? 'bg-gray-50' : ''}`}
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
            >
              <option>Todos os Vendedores</option>
              <option>VENDAS 01</option>
              <option>VENDAS 02</option>
              <option>VENDAS 03</option>
              <option>VENDAS 04</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">STATUS</label>
            <select
              className="form-select block w-full rounded border-gray-300 shadow-sm focus:ring-0 focus:border-blue-500 text-[10px] h-8 font-bold py-0 pr-6"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{getStatusDisplay(opt).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="w-28">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">DATA LIMITE</label>
            <input
              type="date"
              className="form-input block w-full rounded border-gray-300 shadow-sm focus:ring-0 focus:border-blue-500 text-[10px] h-8 px-2"
              value={limitDateFilter}
              onChange={(e) => setLimitDateFilter(e.target.value)}
            />
          </div>
          <div className="w-28">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">SAÍDA FORN.</label>
            <input
              type="date"
              className="form-input block w-full rounded border-gray-300 shadow-sm focus:ring-0 focus:border-blue-500 text-[10px] h-8 px-2"
              value={supplierDateFilter}
              onChange={(e) => setSupplierDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest">
            <span className="material-icons-outlined animate-spin text-2xl mb-2 block">sync</span>
            Carregando pedidos...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                  {[
                    { label: 'ID', key: 'order_number', width: 'w-20' },
                    { label: 'STATUS', key: 'status' },
                    { label: 'CLIENTE / CNPJ', key: 'partners.name' },
                    { label: 'VENDEDOR', key: 'salesperson' },
                    { label: 'DATA PEDIDO', key: 'order_date' },
                    { label: 'ENTREGA', key: 'payment_due_date' },
                    { label: 'SAÍDA FORN.', key: 'supplier_departure_date' },
                    { label: 'VALOR TOTAL', key: 'total_amount', align: 'text-right' },
                    { label: '', key: null, width: 'w-10' }
                  ].map((head) => (
                    <th
                      key={head.label}
                      className={`px-3 py-2 text-left ${head.width || ''} ${head.align || ''} ${head.key ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''}`}
                      onClick={() => {
                        if (head.key) {
                          if (orderBy === head.key) {
                            setOrderDirection(orderDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setOrderBy(head.key);
                            setOrderDirection('asc');
                          }
                        }
                      }}
                    >
                      <div className={`flex items-center gap-1 ${head.align === 'text-right' ? 'justify-end' : ''}`}>
                        {head.label}
                        {head.key && (
                          <span className={`material-icons-outlined text-[10px] ${orderBy === head.key ? 'text-blue-500' : 'opacity-20'}`}>
                            {orderBy === head.key ? (orderDirection === 'asc' ? 'north' : 'south') : 'unfold_more'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <p className="text-gray-400 text-[10px] font-black uppercase">Nenhum pedido encontrado</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, i) => (
                    <tr
                      key={i}
                      onClick={() => navigate(`/pedido/${order.id_original}?mode=view`)}
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <a href={`/pedido/${order.id_original}?mode=view`} onClick={(e) => e.stopPropagation()} className="text-xs font-black text-blue-600 hover:underline">
                          #{order.id}
                        </a>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ${order.statusColor}`}>
                          <span className={`w-1 h-1 mr-1 rounded-full ${order.dotColor}`}></span>
                          {getStatusDisplay(order.status)}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-800 uppercase leading-none truncate max-w-[200px]">{order.client}</span>
                          <span className="text-[8px] text-gray-400 font-bold mt-0.5">{order.cnpj}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="text-[10px] font-black text-gray-600 uppercase">{order.vendedor}</span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500 font-bold">{order.date}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="text-[10px] text-blue-600 font-black">{order.limitDate ? formatDate(order.limitDate) : '-'}</span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500 font-bold">{order.supplierDate ? formatDate(order.supplierDate) : '-'}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-xs font-black text-gray-900 text-right">{order.total}</td>
                      <td className="px-3 py-1.5 text-center flex items-center justify-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/pedido/${order.id_original}?mode=view`); }} className="text-gray-300 hover:text-blue-500 transition-colors" title="Ver Detalhes">
                          <span className="material-icons-outlined text-base">visibility</span>
                        </button>
                        {(appUser?.permissions?.fullAccess || appUser?.permissions?.canDelete) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteOrder(order); }} 
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Excluir Pedido"
                          >
                            <span className="material-icons-outlined text-base">delete</span>
                          </button>
                        )}
                        <button className="text-gray-300 hover:text-gray-600 transition-colors">
                          <span className="material-icons-outlined text-base">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Improved Pagination */}
        <div className="bg-gray-50/50 border-t border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                EXIBINDO <span className="text-gray-900">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalCount)}</span> DE <span className="text-gray-900">{totalCount}</span> REGISTROS
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="relative inline-flex items-center px-1 py-1 rounded-l border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                >
                  <span className="material-icons-outlined text-sm">chevron_left</span>
                </button>
                {[...Array(Math.ceil(totalCount / pageSize))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`relative inline-flex items-center px-2.5 py-1 border text-[10px] font-black ${page === i ? 'z-10 bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, page - 2), Math.min(Math.ceil(totalCount / pageSize), page + 3))}
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={(page + 1) * pageSize >= totalCount}
                  className="relative inline-flex items-center px-1 py-1 rounded-r border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-30"
                >
                  <span className="material-icons-outlined text-sm">chevron_right</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderList;