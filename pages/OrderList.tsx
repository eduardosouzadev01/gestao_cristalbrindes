
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { useAuth } from '../lib/auth';

const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { appUser } = useAuth();

  // States
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (location.state?.clientName) {
      setSearchTerm(location.state.clientName);
    }
  }, [location.state]);
  const [vendedorFilter, setVendedorFilter] = useState('Todos os Vendedores');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [limitDateFilter, setLimitDateFilter] = useState('');
  const [supplierDateFilter, setSupplierDateFilter] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Initialize Vendedor Filter based on Auth
  useEffect(() => {
    if (appUser?.salesperson) {
      setVendedorFilter(appUser.salesperson);
    }
  }, [appUser]);

  // Fetch Orders
  useEffect(() => {
    fetchOrders();
  }, [appUser]); // Re-fetch if auth loads

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

      // Search
      if (searchTerm) {
        query = query.or(`order_number.ilike.%${searchTerm}%,partners.name.ilike.%${searchTerm}%`);
      }

      // Filters
      if (vendedorFilter !== 'Todos os Vendedores') {
        query = query.eq('salesperson', vendedorFilter);
      }
      if (statusFilter !== 'Todos') {
        query = query.eq('status', statusFilter);
      }

      // Range for Pagination
      query = query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // If user can only view own orders, filter by salesperson
      if (appUser?.permissions?.viewOwnOrdersOnly && appUser?.salesperson) {
        query = query.eq('salesperson', appUser.salesperson);
      }

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

  const getStatusColor = (status: string) => {
    const map: any = {
      'EM ABERTO': 'bg-gray-100 text-gray-600',
      'EM PRODUÇÃO': 'bg-blue-100 text-blue-600',
      'FINALIZADO': 'bg-green-100 text-green-600'
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const getStatusDotColor = (status: string) => {
    const map: any = {
      'EM ABERTO': 'bg-gray-400',
      'EM PRODUÇÃO': 'bg-blue-600',
      'FINALIZADO': 'bg-green-600'
    };
    return map[status] || 'bg-gray-400';
  };

  const filteredOrders = orders.filter(o => {
    const matchVendedor = vendedorFilter === 'Todos os Vendedores' || o.vendedor === vendedorFilter;
    const matchStatus = statusFilter === 'Todos' || o.status === statusFilter;
    const matchLimitDate = !limitDateFilter || o.limitDate === limitDateFilter;
    const matchSupplierDate = !supplierDateFilter || o.supplierDate === supplierDateFilter;

    let matchSearch = true;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();

      // Check if term is a specific numeric value for price search
      // Remove R$, dots, replace comma with dot
      // Examples: "150,00" -> 150.00, "1.500" -> 1500
      let numericTerm: number | null = null;

      // Simple heuristic: remove everything strictly non-numeric except , and .
      const cleanTerm = term.replace(/[^\d,.-]/g, '');
      if (cleanTerm) {
        // Replace comma with dot for parsing
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
        // Allow margin of error
        const epsilon = 0.5;
        matchValue =
          Math.abs(o.total_raw - numericTerm) < epsilon ||
          Math.abs(o.entry_amount - numericTerm) < epsilon ||
          Math.abs(o.remaining_amount - numericTerm) < epsilon;
      }

      matchSearch = matchText || matchValue;
    }

    return matchVendedor && matchStatus && matchSearch && matchLimitDate && matchSupplierDate;
  });

  const statusOptions = [
    'Todos',
    'EM ABERTO', 'EM PRODUÇÃO', 'AGUARDANDO APROVAÇÃO',
    'AGUARDANDO NF', 'AGUARDANDO PAGAMENTO',
    'AGUARDANDO PERSONALIZAÇÃO', 'FINALIZADO'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center gap-2">
            <span className="material-icons-outlined text-blue-500 text-3xl">list_alt</span>
            Gestão de Pedidos
          </h2>
          <p className="mt-1 text-sm text-gray-500">Gerencie e filtre todos os pedidos de venda em um único lugar.</p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {/* Novo Pedido button removed as requested */}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8 p-5">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow w-full md:w-auto">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Buscar Pedido</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons-outlined text-gray-400">search</span>
              </span>
              <input
                type="text"
                placeholder="ID, Cliente, CNPJ ou Valor (Total/Parcela)"
                className="form-input block w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Vendedor</label>
            <select
              disabled={!!appUser?.salesperson}
              className={`form-select block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 ${appUser?.salesperson ? 'bg-gray-100' : ''}`}
              value={vendedorFilter}
              onChange={(e) => setVendedorFilter(e.target.value)}
            >
              <option>Todos os Vendedores</option>
              <option>VENDAS 01</option>
              <option>VENDAS 02</option>
              <option>VENDAS 03</option>
              <option>VENDAS 04</option>
              <option>VENDAS 05</option>
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Status</label>
            <select
              className="form-select block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <button className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors h-10">
            <span className="material-icons-outlined mr-2 text-blue-500">filter_list</span>
            Filtros
          </button>
        </div>


        {/* Date Filters Row */}
        <div className="flex flex-col md:flex-row gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="w-full md:w-auto">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data Limite Recebimento</label>
            <input
              type="date"
              className="form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
              value={limitDateFilter}
              onChange={(e) => setLimitDateFilter(e.target.value)}
            />
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data Saída Fornecedor</label>
            <input
              type="date"
              className="form-input block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10"
              value={supplierDateFilter}
              onChange={(e) => setSupplierDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Carregando pedidos...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'STATUS', 'CLIENTE', 'VENDEDOR', 'DATA', 'VALOR TOTAL', 'AÇÕES'].map((head) => (
                  <th key={head} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      {head}
                      {head !== 'STATUS' && head !== 'AÇÕES' && <span className="material-icons-outlined text-sm opacity-50">unfold_more</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                    Nenhum pedido encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, i) => (
                  <tr
                    key={i}
                    onClick={() => navigate(`/pedido/${order.id_original}?mode=view`)}
                    className="hover:bg-blue-50 transition-colors cursor-pointer odd:bg-white even:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-500">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.statusColor}`}>
                        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${order.dotColor}`}></span>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{order.client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{order.vendedor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right">{order.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button className="text-gray-400 hover:text-blue-500" onClick={(e) => { e.stopPropagation(); /* Optional: keep menu working independently */ }}>
                        <span className="material-icons-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-b-xl shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Próximo</button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{page * pageSize + 1}</span> até <span className="font-medium">{Math.min((page + 1) * pageSize, totalCount)}</span> de <span className="font-medium">{totalCount}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <span className="material-icons-outlined">chevron_left</span>
                </button>
                {[...Array(Math.ceil(totalCount / pageSize))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === i ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                )).slice(Math.max(0, page - 2), Math.min(Math.ceil(totalCount / pageSize), page + 3))}
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= totalCount} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <span className="material-icons-outlined">chevron_right</span>
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