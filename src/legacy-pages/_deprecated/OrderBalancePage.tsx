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
            <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="text-center">
                    <span className="material-icons-outlined text-6xl text-blue-400 animate-spin mb-4">sync</span>
                    <p className="text-gray-500 font-medium">Carregando dados...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1.5 rounded-md bg-white shadow-none border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <span className="material-icons-outlined text-base">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-xl font-medium text-gray-900 flex items-center gap-2 uppercase tracking-tighter leading-none">
                            <span className="material-icons-outlined text-blue-600 text-2xl">analytics</span>
                            SALDO DE PEDIDOS
                        </h1>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{filteredOrders.length} pedidos encontrados</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={exportAllData} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-medium text-[10px] rounded-md shadow-none hover:bg-emerald-700 transition-colors uppercase tracking-widest leading-none">
                        <span className="material-icons-outlined text-xs">download</span>
                        EXPORTAR
                    </button>
                    <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-medium text-[10px] rounded-md shadow-none hover:bg-blue-700 transition-colors uppercase tracking-widest leading-none">
                        <span className="material-icons-outlined text-xs">refresh</span>
                        ATUALIZAR
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-none border-t-2 border-t-gray-400">
                    <p className="text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">Vendas Totais</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(summaryStats.totalSale)}</p>
                </div>
                <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-none border-t-2 border-t-blue-400">
                    <p className="text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">Custo Real Total</p>
                    <p className="text-sm font-medium text-slate-700">{formatCurrency(summaryStats.totalRealCost)}</p>
                </div>
                <div className={`rounded-md border p-2.5 shadow-none border-t-2 ${summaryStats.totalBalance >= 0 ? 'bg-emerald-50/30 border-emerald-200 border-t-emerald-500' : 'bg-red-50/30 border-red-200 border-t-red-500'}`}>
                    <p className={`text-[8px] font-medium uppercase tracking-widest mb-0.5 ${summaryStats.totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Saldo Geral</p>
                    <p className={`text-sm font-medium ${summaryStats.totalBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(summaryStats.totalBalance)}</p>
                </div>
                <div className="bg-white rounded-md border border-green-200 p-2.5 shadow-none border-t-2 border-t-green-500">
                    <p className="text-[8px] font-medium text-green-500 uppercase tracking-widest mb-0.5">Recebido</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(summaryStats.totalReceived)}</p>
                </div>
                <div className="bg-white rounded-md border border-orange-200 p-2.5 shadow-none border-t-2 border-t-orange-500">
                    <p className="text-[8px] font-medium text-orange-500 uppercase tracking-widest mb-0.5">A Receber</p>
                    <p className="text-sm font-medium text-orange-600">{formatCurrency(summaryStats.totalPending)}</p>
                </div>
                <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-none">
                    <p className="text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-1.5 line-clamp-1">Status Pagamento</p>
                    <div className="flex gap-1">
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded-md text-[9px] font-medium">{summaryStats.paidOrders}P</span>
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded-md text-[9px] font-medium">{summaryStats.partialOrders}A</span>
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-medium">{summaryStats.pendingOrders}X</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-none">
                <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">BUSCAR</label>
                        <div className="relative">
                            <span className="material-icons-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                className="form-input w-full rounded-md border-gray-300 text-xs !pl-10 h-8 font-medium focus:ring-0 focus:border-blue-500"
                                placeholder="Pedido, cliente, vendedor..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-32">
                        <label className="block text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">STATUS</label>
                        <select className="form-select w-full rounded-md border-gray-300 text-[10px] h-8 font-medium py-0 pr-6" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="ALL">TODOS</option>
                            {statuses.slice(0, 8).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="w-28">
                        <label className="block text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">VENDEDOR</label>
                        <select className="form-select w-full rounded-md border-gray-300 text-[10px] h-8 font-medium py-0 pr-6" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
                            <option value="ALL">TODOS</option>
                            {sellers.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="w-24">
                        <label className="block text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">DE</label>
                        <input type="date" className="form-input w-full rounded-md border-gray-300 text-[10px] h-8 px-2" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                    </div>
                    <div className="w-24">
                        <label className="block text-[8px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">ATÉ</label>
                        <input type="date" className="form-input w-full rounded-md border-gray-300 text-[10px] h-8 px-2" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                    </div>
                    {hasFilters && (
                        <button onClick={clearFilters} className="h-8 px-2 text-[10px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1 uppercase tracking-widest">
                            <span className="material-icons-outlined text-xs">filter_alt_off</span>
                            LIMPAR
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-gray-200 shadow-none overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr className="text-[8px] font-medium text-gray-400 uppercase tracking-widest">
                                <th className="px-3 py-2 text-left cursor-pointer hover:text-gray-600" onClick={() => toggleSort('order_number')}>
                                    <div className="flex items-center">Pedido <SortIcon field="order_number" /></div>
                                </th>
                                <th className="px-3 py-2 text-left">Cliente / Emitente</th>
                                <th className="px-3 py-2 text-left cursor-pointer hover:text-gray-600" onClick={() => toggleSort('order_date')}>
                                    <div className="flex items-center">Data <SortIcon field="order_date" /></div>
                                </th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort('total_amount')}>
                                    <div className="flex items-center justify-end">Venda <SortIcon field="total_amount" /></div>
                                </th>
                                <th className="px-3 py-2 text-right">Custo Real</th>
                                <th className="px-3 py-2 text-right">Recebido</th>
                                <th className="px-3 py-2 text-right">A Receber</th>
                                <th className="px-3 py-2 text-right cursor-pointer hover:text-gray-600" onClick={() => toggleSort('balance')}>
                                    <div className="flex items-center justify-end">Saldo <SortIcon field="balance" /></div>
                                </th>
                                <th className="px-3 py-2 text-center w-16">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-10 text-center">
                                        <span className="material-icons-outlined text-4xl text-gray-200 mb-2">search_off</span>
                                        <p className="text-gray-400 text-[10px] font-medium uppercase">Nenhum pedido encontrado</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => {
                                    const saleValue = getOrderSaleValue(order);
                                    const realCost = getOrderRealCost(order.items);
                                    const received = getOrderReceivedAmount(order);
                                    const pending = getOrderPendingAmount(order);
                                    const balance = getOrderBalance(order);
                                    const isExpanded = expandedOrder === order.id;
                                    const costProgress = getCostPaidCount(order.items);

                                    return (
                                        <React.Fragment key={order.id}>
                                            <tr
                                                className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${isExpanded ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                            >
                                                <td className="px-3 py-1.5 whitespace-nowrap">
                                                    <a href={`/pedido/${order.id}?mode=view`} onClick={(e) => e.stopPropagation()} className="text-xs font-medium text-blue-600 hover:underline">
                                                        #{order.order_number}
                                                    </a>
                                                    <p className="text-[8px] text-gray-400 font-medium uppercase mt-0.5">{order.salesperson}</p>
                                                </td>
                                                <td className="px-3 py-1.5 whitespace-nowrap">
                                                    <p className="text-xs font-medium text-gray-800 uppercase leading-none truncate max-w-[150px]">{order.client_name}</p>
                                                    <p className="text-[8px] text-gray-400 font-medium uppercase mt-0.5">{order.issuer}</p>
                                                </td>
                                                <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-600 font-medium">{formatDate(order.order_date)}</td>
                                                <td className="px-3 py-1.5 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-medium uppercase shadow-none ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {order.status?.replace('AGUARDANDO PAGAMENTO ', 'AGU. ').replace('FATURAMENTO', 'FAT.').replace('2 PARCELA', '2ª PARC.')}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right whitespace-nowrap text-xs font-medium text-gray-900">{formatCurrency(saleValue)}</td>
                                                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                                    <span className="text-xs font-medium text-slate-700">{formatCurrency(realCost)}</span>
                                                    {(() => {
                                                        const margin = saleValue > 0 ? ((saleValue - realCost) / saleValue) * 100 : 0;
                                                        return (
                                                            <span className={`block text-[8px] font-medium uppercase mt-0.5 ${margin >= 30 ? 'text-green-500' : margin >= 15 ? 'text-orange-500' : 'text-red-500'}`}>
                                                                {margin.toFixed(0)}% MARGEM
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                                    <span className="text-xs font-medium text-green-600">{formatCurrency(received)}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                                    <span className={`text-xs font-medium ${pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>{formatCurrency(pending)}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right whitespace-nowrap border-l border-gray-50 bg-gray-50/20">
                                                    <span className={`text-xs font-medium ${balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(balance)}</span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center flex justify-center gap-0.5 whitespace-nowrap">
                                                    <a
                                                        href={`/pedido/${order.id}?mode=view`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-white hover:shadow-none"
                                                        title="Ver Pedido"
                                                    >
                                                        <span className="material-icons-outlined text-base">visibility</span>
                                                    </a>
                                                    <button className="p-1 rounded-md text-gray-400 group-hover:text-blue-500 transition-all">
                                                        <span className="material-icons-outlined text-base">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Detail */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-4 bg-slate-50 border-y border-blue-100 shadow-none-inner">
                                                        <div className="grid grid-cols-12 gap-6">
                                                            {/* Items Section */}
                                                            <div className="col-span-8">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="material-icons-outlined text-sm text-blue-500">inventory_2</span>
                                                                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">DETALHAMENTO DE ITENS ({order.items.length})</h4>
                                                                </div>
                                                                <div className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-none">
                                                                    <table className="min-w-full divide-y divide-gray-100">
                                                                        <thead className="bg-gray-50">
                                                                            <tr className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">
                                                                                <th className="px-2 py-1.5 text-left">PRODUTO</th>
                                                                                <th className="px-2 py-1.5 text-center">QTD</th>
                                                                                <th className="px-2 py-1.5 text-right">CUSTO EST.</th>
                                                                                <th className="px-2 py-1.5 text-right">CUSTO REAL</th>
                                                                                <th className="px-2 py-1.5 text-right">VENDA</th>
                                                                                <th className="px-2 py-1.5 text-center">PAGO?</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-50">
                                                                            {order.items.map((item, idx) => {
                                                                                const itemCosts = [
                                                                                    { est: item.unit_price * item.quantity, real: (item.real_unit_price || 0) * item.quantity, paid: item.unit_price_paid },
                                                                                    { est: item.customization_cost, real: item.real_customization_cost || 0, paid: item.customization_paid },
                                                                                    { est: item.supplier_transport_cost, real: item.real_supplier_transport_cost || 0, paid: item.supplier_transport_paid },
                                                                                    { est: item.client_transport_cost, real: item.real_client_transport_cost || 0, paid: item.client_transport_paid },
                                                                                    { est: item.extra_expense, real: item.real_extra_expense || 0, paid: item.extra_expense_paid },
                                                                                    { est: item.layout_cost, real: item.real_layout_cost || 0, paid: item.layout_paid },
                                                                                ].filter(c => c.est > 0 || c.real > 0);

                                                                                const totalEstItem = itemCosts.reduce((a, c) => a + c.est, 0);
                                                                                const totalRealItem = itemCosts.reduce((a, c) => a + c.real, 0);

                                                                                return (
                                                                                    <tr key={item.id || idx} className="text-[10px]">
                                                                                        <td className="px-2 py-1.5 font-medium text-gray-800">{item.product_name}</td>
                                                                                        <td className="px-2 py-1.5 text-center font-medium text-gray-500">{item.quantity}</td>
                                                                                        <td className="px-2 py-1.5 text-right text-gray-400">{formatCurrency(totalEstItem)}</td>
                                                                                        <td className="px-2 py-1.5 text-right font-medium text-slate-700">{formatCurrency(totalRealItem)}</td>
                                                                                        <td className="px-2 py-1.5 text-right font-medium text-blue-600">{formatCurrency(item.total_item_value || 0)}</td>
                                                                                        <td className="px-2 py-1.5 text-center">
                                                                                            <span className={`px-1 py-0.5 rounded-md text-[8px] font-medium ${itemCosts.every(c => c.paid) ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                                                {itemCosts.filter(c => c.paid).length}/{itemCosts.length}
                                                                                            </span>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            {/* Financial Resumo */}
                                                            <div className="col-span-4 space-y-3">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className="material-icons-outlined text-sm text-green-500">account_balance_wallet</span>
                                                                    <h4 className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">RESUMO FINANCEIRO</h4>
                                                                </div>

                                                                <div className="bg-white rounded-md border border-gray-200 p-2.5 shadow-none space-y-2">
                                                                    <div className="flex justify-between items-center text-[10px] border-b border-gray-50 pb-1.5">
                                                                        <span className="font-medium text-gray-400 uppercase">Resumo Pagamentos</span>
                                                                        <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 font-medium text-[8px]">{costProgress.paid}/{costProgress.total} Custos Pagos</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        <div className={`p-2 rounded-md border ${order.entry_confirmed ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                                                            <p className="text-[8px] font-medium text-gray-400 uppercase">Entrada</p>
                                                                            <p className="text-xs font-medium text-gray-800">{formatCurrency(order.entry_amount)}</p>
                                                                            <p className={`text-[8px] font-medium uppercase mt-1 ${order.entry_confirmed ? 'text-green-600' : 'text-orange-500'}`}>
                                                                                {order.entry_confirmed ? '✓ Pago' : '⚠ Pendente'}
                                                                            </p>
                                                                        </div>
                                                                        <div className={`p-2 rounded-md border ${order.remaining_confirmed ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                                                                            <p className="text-[8px] font-medium text-gray-400 uppercase">Restante</p>
                                                                            <p className="text-xs font-medium text-gray-800">{formatCurrency(order.remaining_amount)}</p>
                                                                            <p className={`text-[8px] font-medium uppercase mt-1 ${order.remaining_confirmed ? 'text-green-600' : 'text-orange-500'}`}>
                                                                                {order.remaining_confirmed ? '✓ Pago' : '⚠ Pendente'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className={`rounded-md border-2 p-3 ${balance >= 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                                                    <p className={`text-[8px] font-medium uppercase mb-1 ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>Margem de Contribuição Líquida</p>
                                                                    <p className={`text-2xl font-medium ${balance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(balance)}</p>
                                                                    <p className="text-[8px] text-gray-400 font-medium uppercase mt-1">
                                                                        Recebido ({formatCurrency(received)}) - Custos ({formatCurrency(realCost)})
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrderBalancePage;
