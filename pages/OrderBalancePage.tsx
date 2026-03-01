import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate, formatMonthYear } from '../src/utils/dateUtils';
import { formatCurrency } from '../src/utils/formatCurrency';
import { exportToCSV, formatDateForExport } from '../src/utils/csvExport';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

// ---- Types ----
interface OrderWithItems {
    id: string;
    order_number: string;
    salesperson: string;
    status: string;
    client_name: string;
    client_id: string;
    issuer: string;
    order_date: string;
    budget_date: string;
    payment_due_date: string;
    billing_type: string;
    total_amount: number;
    entry_amount: number;
    entry_confirmed: boolean;
    entry_date: string;
    remaining_amount: number;
    remaining_confirmed: boolean;
    remaining_date: string;
    items: OrderItem[];
    observations: string;
}

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    customization_cost: number;
    supplier_transport_cost: number;
    client_transport_cost: number;
    extra_expense: number;
    layout_cost: number;
    calculation_factor: number;
    total_item_value: number;
    bv_pct: number;
    // Real Costs
    real_unit_price: number;
    real_customization_cost: number;
    real_supplier_transport_cost: number;
    real_client_transport_cost: number;
    real_extra_expense: number;
    real_layout_cost: number;
    // Paid
    unit_price_paid: boolean;
    customization_paid: boolean;
    supplier_transport_paid: boolean;
    client_transport_paid: boolean;
    extra_expense_paid: boolean;
    layout_paid: boolean;
}

const statusColors: Record<string, string> = {
    'AGUARDANDO PAGAMENTO ENTRADA': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'EM PRODUÇÃO': 'bg-blue-100 text-blue-700 border-blue-200',
    'EM TRANSPORTE': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'EM CONFERÊNCIA': 'bg-purple-100 text-purple-700 border-purple-200',
    'AGUARDANDO PAGAMENTO 2 PARCELA': 'bg-orange-100 text-orange-700 border-orange-200',
    'ENTREGUE': 'bg-teal-100 text-teal-700 border-teal-200',
    'AGUARDANDO PAGAMENTO FATURAMENTO': 'bg-amber-100 text-amber-700 border-amber-200',
    'FINALIZADO': 'bg-green-100 text-green-700 border-green-200',
};

const statusIcons: Record<string, string> = {
    'AGUARDANDO PAGAMENTO ENTRADA': 'payments',
    'EM PRODUÇÃO': 'precision_manufacturing',
    'EM TRANSPORTE': 'local_shipping',
    'EM CONFERÊNCIA': 'fact_check',
    'AGUARDANDO PAGAMENTO 2 PARCELA': 'account_balance_wallet',
    'ENTREGUE': 'inventory_2',
    'AGUARDANDO PAGAMENTO FATURAMENTO': 'receipt_long',
    'FINALIZADO': 'check_circle',
};

const OrderBalancePage: React.FC = () => {
    const navigate = useNavigate();
    const { appUser } = useAuth();
    const [orders, setOrders] = useState<OrderWithItems[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterSeller, setFilterSeller] = useState('ALL');
    const [filterIssuer, setFilterIssuer] = useState('ALL');
    const [filterPayment, setFilterPayment] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'PENDING'>('ALL');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [sortField, setSortField] = useState<'order_number' | 'order_date' | 'total_amount' | 'balance'>('order_date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Fetch orders with client info
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*, partners!orders_client_id_fkey(name)')
                .order('order_date', { ascending: false });

            if (ordersError) throw ordersError;

            // Fetch all items
            const { data: itemsData, error: itemsError } = await supabase
                .from('order_items')
                .select('*');

            if (itemsError) throw itemsError;

            // Group items by order
            const itemsByOrder: Record<string, OrderItem[]> = {};
            (itemsData || []).forEach((item: any) => {
                if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
                itemsByOrder[item.order_id].push(item);
            });

            const combinedOrders: OrderWithItems[] = (ordersData || []).map((o: any) => ({
                id: o.id,
                order_number: o.order_number || '',
                salesperson: o.salesperson || '',
                status: o.status || '',
                client_name: o.partners?.name || 'Sem Cliente',
                client_id: o.client_id || '',
                issuer: o.issuer || '',
                order_date: o.order_date || '',
                budget_date: o.budget_date || '',
                payment_due_date: o.payment_due_date || '',
                billing_type: o.billing_type || '',
                total_amount: o.total_amount || 0,
                entry_amount: o.entry_amount || 0,
                entry_confirmed: o.entry_confirmed || false,
                entry_date: o.entry_date || '',
                remaining_amount: o.remaining_amount || 0,
                remaining_confirmed: o.remaining_confirmed || false,
                remaining_date: o.remaining_date || '',
                items: itemsByOrder[o.id] || [],
                observations: o.observations || ''
            }));

            setOrders(combinedOrders);
        } catch (err: any) {
            console.error('Erro ao carregar dados:', err);
            toast.error('Erro ao carregar dados: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ---- Calculation Helpers ----
    const getOrderEstimatedCost = (items: OrderItem[]) => {
        return items.reduce((acc, item) => {
            const productCost = item.quantity * item.unit_price;
            return acc + productCost + (item.customization_cost || 0) + (item.supplier_transport_cost || 0) +
                (item.client_transport_cost || 0) + (item.extra_expense || 0) + (item.layout_cost || 0);
        }, 0);
    };

    const getOrderRealCost = (items: OrderItem[]) => {
        return items.reduce((acc, item) => {
            const productCost = item.quantity * (item.real_unit_price || item.unit_price || 0);
            return acc + productCost + (item.real_customization_cost || item.customization_cost || 0) +
                (item.real_supplier_transport_cost || item.supplier_transport_cost || 0) +
                (item.real_client_transport_cost || item.client_transport_cost || 0) +
                (item.real_extra_expense || item.extra_expense || 0) + (item.real_layout_cost || item.layout_cost || 0);
        }, 0);
    };

    const getOrderSaleValue = (order: OrderWithItems) => {
        return order.total_amount || order.items.reduce((acc, item) => acc + (item.total_item_value || 0), 0);
    };

    const getOrderReceivedAmount = (order: OrderWithItems) => {
        let received = 0;
        if (order.entry_confirmed) received += order.entry_amount;
        if (order.remaining_confirmed) received += order.remaining_amount;
        return received;
    };

    const getOrderPendingAmount = (order: OrderWithItems) => {
        const sale = getOrderSaleValue(order);
        return sale - getOrderReceivedAmount(order);
    };

    const getOrderBalance = (order: OrderWithItems) => {
        return getOrderReceivedAmount(order) - getOrderRealCost(order.items);
    };

    const getPaymentStatus = (order: OrderWithItems): 'PAID' | 'PARTIAL' | 'PENDING' => {
        if (order.entry_confirmed && order.remaining_confirmed) return 'PAID';
        if (order.entry_confirmed || order.remaining_confirmed) return 'PARTIAL';
        return 'PENDING';
    };

    const getCostPaidCount = (items: OrderItem[]) => {
        let total = 0;
        let paid = 0;
        items.forEach(item => {
            const costs = [
                { val: item.unit_price, isPaid: item.unit_price_paid },
                { val: item.customization_cost, isPaid: item.customization_paid },
                { val: item.supplier_transport_cost, isPaid: item.supplier_transport_paid },
                { val: item.client_transport_cost, isPaid: item.client_transport_paid },
                { val: item.extra_expense, isPaid: item.extra_expense_paid },
                { val: item.layout_cost, isPaid: item.layout_paid }
            ];
            costs.forEach(c => {
                if (c.val > 0) {
                    total++;
                    if (c.isPaid) paid++;
                }
            });
        });
        return { total, paid };
    };

    // ---- Filtering & Sorting ----
    const sellers = useMemo(() => [...new Set(orders.map(o => o.salesperson).filter(Boolean))], [orders]);
    const issuers = useMemo(() => [...new Set(orders.map(o => o.issuer).filter(Boolean))], [orders]);
    const statuses = useMemo(() => [...new Set(orders.map(o => o.status).filter(Boolean))], [orders]);

    const filteredOrders = useMemo(() => {
        let result = orders;

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(o =>
                o.order_number.toLowerCase().includes(term) ||
                o.client_name.toLowerCase().includes(term) ||
                o.salesperson.toLowerCase().includes(term) ||
                o.items.some(i => (i.product_name || '').toLowerCase().includes(term))
            );
        }

        // Status
        if (filterStatus !== 'ALL') {
            result = result.filter(o => o.status === filterStatus);
        }

        // Seller
        if (filterSeller !== 'ALL') {
            result = result.filter(o => o.salesperson === filterSeller);
        }

        // Issuer
        if (filterIssuer !== 'ALL') {
            result = result.filter(o => o.issuer === filterIssuer);
        }

        // Payment
        if (filterPayment !== 'ALL') {
            result = result.filter(o => getPaymentStatus(o) === filterPayment);
        }

        // Date range
        if (filterDateFrom) {
            result = result.filter(o => o.order_date >= filterDateFrom);
        }
        if (filterDateTo) {
            result = result.filter(o => o.order_date <= filterDateTo);
        }

        // Sorting
        result = [...result].sort((a, b) => {
            let valA: any, valB: any;
            if (sortField === 'order_number') {
                valA = a.order_number; valB = b.order_number;
            } else if (sortField === 'order_date') {
                valA = a.order_date; valB = b.order_date;
            } else if (sortField === 'total_amount') {
                valA = getOrderSaleValue(a); valB = getOrderSaleValue(b);
            } else if (sortField === 'balance') {
                valA = getOrderBalance(a); valB = getOrderBalance(b);
            }
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [orders, searchTerm, filterStatus, filterSeller, filterIssuer, filterPayment, filterDateFrom, filterDateTo, sortField, sortDir]);

    // ---- Summary Stats ----
    const summaryStats = useMemo(() => {
        const totalSale = filteredOrders.reduce((acc, o) => acc + getOrderSaleValue(o), 0);
        const totalEstimatedCost = filteredOrders.reduce((acc, o) => acc + getOrderEstimatedCost(o.items), 0);
        const totalRealCost = filteredOrders.reduce((acc, o) => acc + getOrderRealCost(o.items), 0);
        const totalReceived = filteredOrders.reduce((acc, o) => acc + getOrderReceivedAmount(o), 0);
        const totalPending = filteredOrders.reduce((acc, o) => acc + getOrderPendingAmount(o), 0);
        const totalBalance = filteredOrders.reduce((acc, o) => acc + getOrderBalance(o), 0);
        const paidOrders = filteredOrders.filter(o => getPaymentStatus(o) === 'PAID').length;
        const partialOrders = filteredOrders.filter(o => getPaymentStatus(o) === 'PARTIAL').length;
        const pendingOrders = filteredOrders.filter(o => getPaymentStatus(o) === 'PENDING').length;

        return { totalSale, totalEstimatedCost, totalRealCost, totalReceived, totalPending, totalBalance, paidOrders, partialOrders, pendingOrders };
    }, [filteredOrders]);

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: typeof sortField }) => (
        <span className="material-icons-outlined text-xs ml-1 inline-block align-middle">
            {sortField === field ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
    );

    const clearFilters = () => {
        setSearchTerm('');
        setFilterStatus('ALL');
        setFilterSeller('ALL');
        setFilterIssuer('ALL');
        setFilterPayment('ALL');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const hasFilters = searchTerm || filterStatus !== 'ALL' || filterSeller !== 'ALL' || filterIssuer !== 'ALL' || filterPayment !== 'ALL' || filterDateFrom || filterDateTo;

    const getOrderMargin = (order: OrderWithItems) => {
        const sale = getOrderSaleValue(order);
        const cost = getOrderRealCost(order.items);
        return sale > 0 ? ((sale - cost) / sale) * 100 : 0;
    };

    const exportAllData = () => {
        exportToCSV(filteredOrders.map(o => ({
            pedido: o.order_number,
            cliente: o.client_name,
            vendedor: o.salesperson,
            emitente: o.issuer,
            data: formatDateForExport(o.order_date),
            status: o.status,
            venda: getOrderSaleValue(o),
            custo_estimado: getOrderEstimatedCost(o.items),
            custo_real: getOrderRealCost(o.items),
            recebido: getOrderReceivedAmount(o),
            a_receber: getOrderPendingAmount(o),
            saldo: getOrderBalance(o),
            margem_pct: getOrderMargin(o),
            pagamento: getPaymentStatus(o) === 'PAID' ? 'Pago' : getPaymentStatus(o) === 'PARTIAL' ? 'Parcial' : 'Pendente'
        })), [
            { header: 'Pedido', accessor: 'pedido' },
            { header: 'Cliente', accessor: 'cliente' },
            { header: 'Vendedor', accessor: 'vendedor' },
            { header: 'Emitente', accessor: 'emitente' },
            { header: 'Data', accessor: 'data' },
            { header: 'Status', accessor: 'status' },
            { header: 'Valor Venda', accessor: 'venda' },
            { header: 'Custo Estimado', accessor: 'custo_estimado' },
            { header: 'Custo Real', accessor: 'custo_real' },
            { header: 'Recebido', accessor: 'recebido' },
            { header: 'A Receber', accessor: 'a_receber' },
            { header: 'Saldo', accessor: 'saldo' },
            { header: 'Margem %', accessor: 'margem_pct' },
            { header: 'Pagamento', accessor: 'pagamento' }
        ], 'saldo_pedidos');
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <span className="material-icons-outlined text-6xl text-blue-400 animate-spin mb-4">sync</span>
                    <p className="text-gray-500 font-medium">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white shadow-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <span className="material-icons-outlined text-xl">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                            <span className="material-icons-outlined text-blue-500 text-3xl">analytics</span>
                            Saldo de Pedidos
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">{filteredOrders.length} pedidos encontrados</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={exportAllData} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 font-bold text-xs rounded-lg hover:bg-green-100 transition-colors uppercase">
                        <span className="material-icons-outlined text-sm">download</span>
                        Exportar CSV
                    </button>
                    <button onClick={fetchOrders} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-lg hover:bg-blue-100 transition-colors uppercase">
                        <span className="material-icons-outlined text-sm">refresh</span>
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Valor Total Vendas</p>
                    <p className="text-xl font-black text-gray-900">{formatCurrency(summaryStats.totalSale)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Custo Estimado</p>
                    <p className="text-xl font-black text-gray-700">{formatCurrency(summaryStats.totalEstimatedCost)}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Custo Real</p>
                    <p className="text-xl font-black text-slate-600">{formatCurrency(summaryStats.totalRealCost)}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-green-500 uppercase mb-1">Total Recebido</p>
                    <p className="text-xl font-black text-green-600">{formatCurrency(summaryStats.totalReceived)}</p>
                </div>
                <div className="bg-white rounded-xl border border-orange-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-orange-500 uppercase mb-1">A Receber</p>
                    <p className="text-xl font-black text-orange-600">{formatCurrency(summaryStats.totalPending)}</p>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${summaryStats.totalBalance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className={`text-[10px] font-bold uppercase mb-1 ${summaryStats.totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Saldo Geral</p>
                    <p className={`text-xl font-black ${summaryStats.totalBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(summaryStats.totalBalance)}</p>
                </div>
            </div>

            {/* Payment Status Mini Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div
                    onClick={() => setFilterPayment(filterPayment === 'PAID' ? 'ALL' : 'PAID')}
                    className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-all ${filterPayment === 'PAID' ? 'bg-green-50 border-green-400 ring-2 ring-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <span className="material-icons-outlined text-green-500 text-2xl">check_circle</span>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Pagos</p>
                        <p className="text-lg font-black text-green-600">{summaryStats.paidOrders}</p>
                    </div>
                </div>
                <div
                    onClick={() => setFilterPayment(filterPayment === 'PARTIAL' ? 'ALL' : 'PARTIAL')}
                    className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-all ${filterPayment === 'PARTIAL' ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <span className="material-icons-outlined text-yellow-500 text-2xl">pending</span>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Parciais</p>
                        <p className="text-lg font-black text-yellow-600">{summaryStats.partialOrders}</p>
                    </div>
                </div>
                <div
                    onClick={() => setFilterPayment(filterPayment === 'PENDING' ? 'ALL' : 'PENDING')}
                    className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition-all ${filterPayment === 'PENDING' ? 'bg-red-50 border-red-400 ring-2 ring-red-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                    <span className="material-icons-outlined text-red-400 text-2xl">cancel</span>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Pendentes</p>
                        <p className="text-lg font-black text-red-500">{summaryStats.pendingOrders}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar</label>
                        <div className="relative">
                            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                className="form-input w-full rounded-lg border-gray-200 text-sm pl-9"
                                placeholder="Nº pedido, cliente, vendedor, produto..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-44">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
                        <select className="form-select w-full rounded-lg border-gray-200 text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="ALL">Todos</option>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="w-36">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Vendedor</label>
                        <select className="form-select w-full rounded-lg border-gray-200 text-xs" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
                            <option value="ALL">Todos</option>
                            {sellers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="w-36">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Emitente</label>
                        <select className="form-select w-full rounded-lg border-gray-200 text-xs" value={filterIssuer} onChange={e => setFilterIssuer(e.target.value)}>
                            <option value="ALL">Todos</option>
                            {issuers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data De</label>
                        <input type="date" className="form-input w-full rounded-lg border-gray-200 text-xs" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                    </div>
                    <div className="w-32">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Data Até</label>
                        <input type="date" className="form-input w-full rounded-lg border-gray-200 text-xs" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                    </div>
                    {hasFilters && (
                        <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1 pb-2">
                            <span className="material-icons-outlined text-sm">filter_alt_off</span>
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider items-center">
                    <div className="col-span-1 cursor-pointer hover:text-gray-600" onClick={() => toggleSort('order_number')}>
                        Pedido <SortIcon field="order_number" />
                    </div>
                    <div className="col-span-2">Cliente</div>
                    <div className="col-span-1 cursor-pointer hover:text-gray-600" onClick={() => toggleSort('order_date')}>
                        Data <SortIcon field="order_date" />
                    </div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort('total_amount')}>
                        Venda <SortIcon field="total_amount" />
                    </div>
                    <div className="col-span-1 text-right">Custo Est.</div>
                    <div className="col-span-1 text-right">Custo Real</div>
                    <div className="col-span-1 text-right">Recebido</div>
                    <div className="col-span-1 text-right">A Receber</div>
                    <div className="col-span-1 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort('balance')}>
                        Saldo <SortIcon field="balance" />
                    </div>
                    <div className="col-span-1 text-center">Ações</div>
                </div>

                {/* Table Body */}
                {filteredOrders.length === 0 ? (
                    <div className="p-12 text-center">
                        <span className="material-icons-outlined text-6xl text-gray-200 mb-4">search_off</span>
                        <p className="text-gray-400 font-medium">Nenhum pedido encontrado com os filtros aplicados.</p>
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const saleValue = getOrderSaleValue(order);
                        const estimatedCost = getOrderEstimatedCost(order.items);
                        const realCost = getOrderRealCost(order.items);
                        const received = getOrderReceivedAmount(order);
                        const pending = getOrderPendingAmount(order);
                        const balance = getOrderBalance(order);
                        const paymentStatus = getPaymentStatus(order);
                        const isExpanded = expandedOrder === order.id;
                        const costProgress = getCostPaidCount(order.items);

                        return (
                            <React.Fragment key={order.id}>
                                {/* Row */}
                                <div
                                    className={`grid grid-cols-12 px-4 py-3 items-center border-b border-gray-100 text-sm hover:bg-gray-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`}
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className="col-span-1">
                                        <span className="font-bold text-blue-600 text-xs">{order.order_number}</span>
                                        <p className="text-[10px] text-gray-400">{order.salesperson}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="font-semibold text-gray-800 text-xs truncate">{order.client_name}</p>
                                        <p className="text-[10px] text-gray-400">{order.issuer}</p>
                                    </div>
                                    <div className="col-span-1 text-xs text-gray-600">{formatDate(order.order_date)}</div>
                                    <div className="col-span-1">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            <span className="material-icons-outlined text-[10px]">{statusIcons[order.status] || 'help'}</span>
                                            {order.status?.replace('AGUARDANDO PAGAMENTO ', 'AGU. ').replace('FATURAMENTO', 'FAT.').replace('2 PARCELA', '2ª PARC.')}
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-right font-bold text-gray-900 text-xs">{formatCurrency(saleValue)}</div>
                                    <div className="col-span-1 text-right text-xs text-gray-500">{formatCurrency(estimatedCost)}</div>
                                    <div className="col-span-1 text-right text-xs text-slate-600 font-medium">
                                        {formatCurrency(realCost)}
                                        {(() => {
                                            const margin = saleValue > 0 ? ((saleValue - realCost) / saleValue) * 100 : 0;
                                            return (
                                                <span className={`block text-[9px] font-bold ${margin >= 30 ? 'text-green-500' : margin >= 15 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {margin.toFixed(0)}% margem
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <span className="text-xs font-bold text-green-600">{formatCurrency(received)}</span>
                                        {paymentStatus === 'PAID' && <span className="material-icons-outlined text-green-500 text-xs ml-1">check_circle</span>}
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <span className={`text-xs font-bold ${pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(pending)}</span>
                                    </div>
                                    <div className="col-span-1 text-right">
                                        <span className={`text-xs font-black ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(balance)}</span>
                                    </div>
                                    <div className="col-span-1 text-center flex justify-center gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/pedido/${order.id}?mode=view`); }}
                                            className="p-1.5 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
                                            title="Visualizar Pedido"
                                        >
                                            <span className="material-icons-outlined text-sm">visibility</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setExpandedOrder(isExpanded ? null : order.id); }}
                                            className={`p-1.5 rounded-lg transition-colors ${isExpanded ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                            title="Expandir Detalhes"
                                        >
                                            <span className="material-icons-outlined text-sm">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div className="bg-slate-50 border-b-2 border-blue-200 px-6 py-5 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Items Table */}
                                            <div className="lg:col-span-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                    <span className="material-icons-outlined text-sm text-blue-500">inventory</span>
                                                    Itens do Pedido ({order.items.length})
                                                </h4>
                                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                    <div className="grid grid-cols-12 bg-gray-100 px-3 py-2 text-[9px] font-bold text-gray-400 uppercase">
                                                        <div className="col-span-3">Produto</div>
                                                        <div className="col-span-1 text-center">Qtd</div>
                                                        <div className="col-span-2 text-right">Custo Unit.</div>
                                                        <div className="col-span-2 text-right">Real Unit.</div>
                                                        <div className="col-span-2 text-right">Venda</div>
                                                        <div className="col-span-2 text-center">Pago?</div>
                                                    </div>
                                                    {order.items.map((item, idx) => {
                                                        const itemCosts = [
                                                            { label: 'Produto', est: item.unit_price * item.quantity, real: (item.real_unit_price || 0) * item.quantity, paid: item.unit_price_paid },
                                                            { label: 'Personalização', est: item.customization_cost, real: item.real_customization_cost || 0, paid: item.customization_paid },
                                                            { label: 'Transp. Forn.', est: item.supplier_transport_cost, real: item.real_supplier_transport_cost || 0, paid: item.supplier_transport_paid },
                                                            { label: 'Transp. Cliente', est: item.client_transport_cost, real: item.real_client_transport_cost || 0, paid: item.client_transport_paid },
                                                            { label: 'Despesa Extra', est: item.extra_expense, real: item.real_extra_expense || 0, paid: item.extra_expense_paid },
                                                            { label: 'Layout', est: item.layout_cost, real: item.real_layout_cost || 0, paid: item.layout_paid },
                                                        ].filter(c => c.est > 0 || c.real > 0);

                                                        const totalEstItem = itemCosts.reduce((a, c) => a + c.est, 0);
                                                        const totalRealItem = itemCosts.reduce((a, c) => a + c.real, 0);

                                                        return (
                                                            <React.Fragment key={item.id || idx}>
                                                                <div className="grid grid-cols-12 px-3 py-2 items-center border-b border-gray-50 text-xs">
                                                                    <div className="col-span-3 font-medium text-gray-800 truncate">{item.product_name || 'Item ' + (idx + 1)}</div>
                                                                    <div className="col-span-1 text-center text-gray-600">{item.quantity}</div>
                                                                    <div className="col-span-2 text-right text-gray-500">{formatCurrency(totalEstItem)}</div>
                                                                    <div className="col-span-2 text-right font-medium text-slate-700">{formatCurrency(totalRealItem)}</div>
                                                                    <div className="col-span-2 text-right font-bold text-blue-600">{formatCurrency(item.total_item_value || 0)}</div>
                                                                    <div className="col-span-2 text-center">
                                                                        {itemCosts.every(c => c.paid) ? (
                                                                            <span className="text-green-500 font-bold text-[10px] flex items-center justify-center gap-1">
                                                                                <span className="material-icons-outlined text-xs">check_circle</span>Sim
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-orange-500 font-bold text-[10px]">
                                                                                {itemCosts.filter(c => c.paid).length}/{itemCosts.length}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Sub-costs */}
                                                                {itemCosts.map((c, ci) => (
                                                                    <div key={ci} className="grid grid-cols-12 px-3 py-1 items-center border-b border-gray-50 bg-gray-50/50">
                                                                        <div className="col-span-3 text-[10px] text-gray-400 pl-4">↳ {c.label}</div>
                                                                        <div className="col-span-1" />
                                                                        <div className="col-span-2 text-right text-[10px] text-gray-400">{formatCurrency(c.est)}</div>
                                                                        <div className="col-span-2 text-right text-[10px] text-gray-500">{formatCurrency(c.real)}</div>
                                                                        <div className="col-span-2" />
                                                                        <div className="col-span-2 text-center">
                                                                            {c.paid ? (
                                                                                <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                                                                                    <span className="material-icons-outlined text-[10px]">check</span>Pago
                                                                                </span>
                                                                            ) : c.real > 0 ? (
                                                                                <span className="inline-flex items-center gap-0.5 bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                                                                                    Pendente
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-gray-300 text-[9px]">—</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Payment Summary */}
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                    <span className="material-icons-outlined text-sm text-green-500">account_balance_wallet</span>
                                                    Resumo Financeiro
                                                </h4>

                                                {/* Entry */}
                                                <div className={`rounded-lg border p-3 ${order.entry_confirmed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-gray-400">Entrada</p>
                                                            <p className="text-lg font-black text-gray-800">{formatCurrency(order.entry_amount)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {order.entry_confirmed ? (
                                                                <div className="flex items-center gap-1 text-green-600">
                                                                    <span className="material-icons-outlined text-lg">check_circle</span>
                                                                    <div>
                                                                        <p className="text-[10px] font-bold uppercase">Pago</p>
                                                                        <p className="text-[10px] text-gray-400">{formatDate(order.entry_date)}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-yellow-500 font-bold text-xs">PENDENTE</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Remaining */}
                                                <div className={`rounded-lg border p-3 ${order.remaining_confirmed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase text-gray-400">Restante</p>
                                                            <p className="text-lg font-black text-gray-800">{formatCurrency(order.remaining_amount)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {order.remaining_confirmed ? (
                                                                <div className="flex items-center gap-1 text-green-600">
                                                                    <span className="material-icons-outlined text-lg">check_circle</span>
                                                                    <div>
                                                                        <p className="text-[10px] font-bold uppercase">Pago</p>
                                                                        <p className="text-[10px] text-gray-400">{formatDate(order.remaining_date)}</p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-yellow-500 font-bold text-xs">PENDENTE</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Cost Progress */}
                                                <div className="bg-white rounded-lg border border-gray-200 p-3">
                                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Progresso de Pagamento de Custos</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                                style={{ width: `${costProgress.total > 0 ? (costProgress.paid / costProgress.total) * 100 : 0}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-600">{costProgress.paid}/{costProgress.total}</span>
                                                    </div>
                                                </div>

                                                {/* Balance Card */}
                                                <div className={`rounded-lg border-2 p-4 ${balance >= 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
                                                    <p className={`text-[10px] font-bold uppercase mb-1 ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Saldo do Pedido</p>
                                                    <p className={`text-3xl font-black ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Recebido ({formatCurrency(received)}) - Custos Reais ({formatCurrency(realCost)})</p>
                                                </div>

                                                {/* Billing Info */}
                                                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Info Comercial</p>
                                                    <div className="space-y-1 text-xs text-gray-600">
                                                        <p><span className="font-bold text-gray-700">Faturamento:</span> {order.billing_type || '—'}</p>
                                                        <p><span className="font-bold text-gray-700">Vencimento:</span> {formatDate(order.payment_due_date)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default OrderBalancePage;
