import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { formatCurrency } from '../src/utils/formatCurrency';
import { exportSimpleCSV } from '../src/utils/csvExport';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

// ---- Types ----
interface OrderItem {
    id: string; product_name: string; quantity: number; unit_price: number;
    customization_cost: number; supplier_transport_cost: number; client_transport_cost: number;
    extra_expense: number; layout_cost: number; total_item_value: number;
    real_unit_price: number; real_customization_cost: number; real_supplier_transport_cost: number;
    real_client_transport_cost: number; real_extra_expense: number; real_layout_cost: number;
    unit_price_paid: boolean; customization_paid: boolean; supplier_transport_paid: boolean;
    client_transport_paid: boolean; extra_expense_paid: boolean; layout_paid: boolean;
    bv_pct: number; supplier_id: string;
}
interface Order {
    id: string; order_number: string; salesperson: string; status: string;
    client_name: string; client_id: string; issuer: string;
    order_date: string; payment_due_date: string; billing_type: string;
    total_amount: number; entry_amount: number; entry_confirmed: boolean; entry_date: string;
    remaining_amount: number; remaining_confirmed: boolean; remaining_date: string;
    entry_forecast_date: string; remaining_forecast_date: string;
    items: OrderItem[];
}

const statusColors: Record<string, string> = {
    'AGUARDANDO PAGAMENTO ENTRADA': 'bg-yellow-100 text-yellow-700',
    'EM PRODUÇÃO': 'bg-blue-100 text-blue-700',
    'EM TRANSPORTE': 'bg-purple-100 text-purple-700',
    'EM CONFERÊNCIA': 'bg-cyan-100 text-cyan-700',
    'AGUARDANDO PAGAMENTO 2 PARCELA': 'bg-orange-100 text-orange-700',
    'ENTREGUE': 'bg-teal-100 text-teal-700',
    'AGUARDANDO PAGAMENTO FATURAMENTO': 'bg-amber-100 text-amber-700',
    'FINALIZADO': 'bg-green-100 text-green-700',
};

const OrdersReceivablesPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterIssuer, setFilterIssuer] = useState('ALL');
    const [filterPayment, setFilterPayment] = useState('ALL');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('orders')
                .select(`*, partners(name), order_items(*)`)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setOrders((data || []).map((o: any) => ({
                ...o, client_name: o.partners?.name || 'N/A',
                items: o.order_items || []
            })));
        } catch { toast.error('Erro ao carregar pedidos.'); }
        setLoading(false);
    };

    // ---- Helpers ----
    const getEstimatedCost = (items: OrderItem[]) => items.reduce((a, i) => a + i.quantity * (i.unit_price || 0) + (i.customization_cost || 0) + (i.supplier_transport_cost || 0) + (i.client_transport_cost || 0) + (i.extra_expense || 0) + (i.layout_cost || 0), 0);
    const getRealCost = (items: OrderItem[]) => items.reduce((a, i) => a + i.quantity * (i.real_unit_price || i.unit_price || 0) + (i.real_customization_cost || i.customization_cost || 0) + (i.real_supplier_transport_cost || i.supplier_transport_cost || 0) + (i.real_client_transport_cost || i.client_transport_cost || 0) + (i.real_extra_expense || i.extra_expense || 0) + (i.real_layout_cost || i.layout_cost || 0), 0);
    const getSaleValue = (o: Order) => o.total_amount || o.items.reduce((a, i) => a + (i.total_item_value || 0), 0);
    const getReceived = (o: Order) => (o.entry_confirmed ? o.entry_amount || 0 : 0) + (o.remaining_confirmed ? o.remaining_amount || 0 : 0);
    const getPending = (o: Order) => getSaleValue(o) - getReceived(o);
    const getMargin = (o: Order) => { const s = getSaleValue(o), c = getRealCost(o.items); return s > 0 ? ((s - c) / s) * 100 : 0; };
    const getPayStatus = (o: Order): 'PAID' | 'PARTIAL' | 'PENDING' => {
        if (o.entry_confirmed && o.remaining_confirmed) return 'PAID';
        if (o.entry_confirmed || o.remaining_confirmed) return 'PARTIAL';
        return 'PENDING';
    };
    const getCostPaidCount = (items: OrderItem[]) => {
        let total = 0, paid = 0;
        items.forEach(i => {
            [{ v: i.unit_price, p: i.unit_price_paid }, { v: i.customization_cost, p: i.customization_paid }, { v: i.supplier_transport_cost, p: i.supplier_transport_paid }, { v: i.client_transport_cost, p: i.client_transport_paid }, { v: i.extra_expense, p: i.extra_expense_paid }, { v: i.layout_cost, p: i.layout_paid }].forEach(c => { if (c.v > 0) { total++; if (c.p) paid++; } });
        });
        return { total, paid };
    };
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = (date: string | null, confirmed: boolean) => date && !confirmed && date < todayStr;

    // ---- Confirm Payment ----
    const confirmPayment = async (orderId: string, type: 'entry' | 'remaining') => {
        const label = type === 'entry' ? 'Entrada' : 'Restante';
        if (!window.confirm(`Confirmar recebimento de ${label}?`)) return;
        try {
            const update = type === 'entry' ? { entry_confirmed: true } : { remaining_confirmed: true };
            const { error } = await supabase.from('orders').update(update).eq('id', orderId);
            if (error) throw error;
            toast.success(`${label} confirmado!`);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...update } : o));
        } catch (e: any) { toast.error(e.message); }
    };

    // ---- Filtering ----
    const statuses = useMemo(() => [...new Set(orders.map(o => o.status).filter(Boolean))], [orders]);

    const filteredOrders = useMemo(() => {
        let result = orders;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            result = result.filter(o => o.order_number.toLowerCase().includes(s) || o.client_name.toLowerCase().includes(s) || o.salesperson.toLowerCase().includes(s));
        }
        if (filterStatus !== 'ALL') result = result.filter(o => o.status === filterStatus);
        if (filterIssuer !== 'ALL') result = result.filter(o => o.issuer === filterIssuer);
        if (filterPayment !== 'ALL') result = result.filter(o => getPayStatus(o) === filterPayment);
        if (filterDateFrom) result = result.filter(o => o.order_date >= filterDateFrom);
        if (filterDateTo) result = result.filter(o => o.order_date <= filterDateTo);
        return result;
    }, [orders, searchTerm, filterStatus, filterIssuer, filterPayment, filterDateFrom, filterDateTo]);

    // ---- Summary ----
    const summary = useMemo(() => ({
        totalVenda: filteredOrders.reduce((a, o) => a + getSaleValue(o), 0),
        totalRecebido: filteredOrders.reduce((a, o) => a + getReceived(o), 0),
        totalPendente: filteredOrders.reduce((a, o) => a + getPending(o), 0),
        totalCusto: filteredOrders.reduce((a, o) => a + getRealCost(o.items), 0),
    }), [filteredOrders]);

    const exportAll = () => {
        exportSimpleCSV(filteredOrders.map(o => ({
            pedido: o.order_number, cliente: o.client_name, vendedor: o.salesperson,
            status: o.status, emissor: o.issuer, data: o.order_date,
            venda: getSaleValue(o).toFixed(2), custo: getRealCost(o.items).toFixed(2),
            recebido: getReceived(o).toFixed(2), pendente: getPending(o).toFixed(2),
            margem: getMargin(o).toFixed(1) + '%'
        })), 'pedidos_recebiveis');
        toast.success('CSV exportado!');
    };

    const hasFilters = searchTerm || filterStatus !== 'ALL' || filterIssuer !== 'ALL' || filterPayment !== 'ALL' || filterDateFrom || filterDateTo;
    const clearFilters = () => { setSearchTerm(''); setFilterStatus('ALL'); setFilterIssuer('ALL'); setFilterPayment('ALL'); setFilterDateFrom(''); setFilterDateTo(''); };

    if (loading) return <div className="flex items-center justify-center h-64"><span className="material-icons-outlined animate-spin text-4xl text-blue-500">sync</span></div>;

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-600">receipt_long</span> Pedidos & Recebíveis
                    </h1>
                    <p className="text-sm text-gray-500">{filteredOrders.length} pedidos • Recebimentos centralizados</p>
                </div>
                <button onClick={exportAll} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    <span className="material-icons-outlined text-lg">download</span> Exportar CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Vendas', value: summary.totalVenda, color: 'blue' },
                    { label: 'Recebido', value: summary.totalRecebido, color: 'green' },
                    { label: 'Pendente', value: summary.totalPendente, color: 'orange' },
                    { label: 'Custos', value: summary.totalCusto, color: 'red' }
                ].map((c, i) => (
                    <div key={i} className="bg-white rounded-lg border border-gray-200 p-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{c.label}</span>
                        <p className={`text-lg font-black text-${c.color}-600`}>{formatCurrency(c.value)}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2">
                        <input className="form-input w-full text-sm rounded-lg border-gray-300" placeholder="Buscar pedido, cliente, vendedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <select className="form-select text-sm rounded-lg border-gray-300" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="ALL">Todos Status</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="form-select text-sm rounded-lg border-gray-300" value={filterIssuer} onChange={e => setFilterIssuer(e.target.value)}>
                        <option value="ALL">Todos Emissores</option>
                        <option value="CRISTAL">Cristal</option><option value="ESPIRITO">Espírito</option><option value="NATUREZA">Natureza</option>
                    </select>
                    <select className="form-select text-sm rounded-lg border-gray-300" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                        <option value="ALL">Todos Pgtos</option>
                        <option value="PAID">Pago</option><option value="PARTIAL">Parcial</option><option value="PENDING">Pendente</option>
                    </select>
                    {hasFilters && <button onClick={clearFilters} className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"><span className="material-icons-outlined text-sm">clear</span>Limpar</button>}
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
                {filteredOrders.map(o => {
                    const margin = getMargin(o);
                    const payStatus = getPayStatus(o);
                    const costInfo = getCostPaidCount(o.items);
                    const expanded = expandedId === o.id;

                    return (
                        <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                            {/* Row */}
                            <div className="px-4 py-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : o.id)}>
                                <div className="flex-shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                                </div>
                                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <p className="text-sm font-black text-gray-900">#{o.order_number}</p>
                                            <button onClick={(e) => { e.stopPropagation(); navigate('/pedido/' + o.id); }} className="text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 py-0.5 px-1.5 rounded flex items-center gap-1 transition-colors" title="Abrir Pedido">
                                                <span className="material-icons-outlined text-[11px]">open_in_new</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-400">{formatDate(o.order_date)}</p>
                                    </div>
                                    <div className="hidden md:block">
                                        <p className="text-sm font-bold text-gray-700 truncate">{o.client_name}</p>
                                        <p className="text-xs text-gray-400">{o.salesperson}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">{formatCurrency(getSaleValue(o))}</p>
                                        <p className="text-xs text-gray-400">Venda</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className={`text-sm font-bold ${margin >= 25 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</p>
                                        <p className="text-xs text-gray-400">Margem</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        {/* Payment status */}
                                        <div className="flex items-center justify-end gap-1">
                                            <span className={`w-2 h-2 rounded-full ${payStatus === 'PAID' ? 'bg-green-500' : payStatus === 'PARTIAL' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                            <span className="text-xs font-bold text-gray-600">{payStatus === 'PAID' ? 'Pago' : payStatus === 'PARTIAL' ? 'Parcial' : 'Pendente'}</span>
                                        </div>
                                        <p className="text-xs text-gray-400">{formatCurrency(getPending(o))} pend.</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <p className="text-xs text-gray-400">{costInfo.paid}/{costInfo.total} custos pagos</p>
                                    </div>
                                </div>
                                <span className="material-icons-outlined text-gray-400 text-lg transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : '' }}>expand_more</span>
                            </div>

                            {/* Expanded Detail */}
                            {expanded && (
                                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                                    {/* Payment Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Entry */}
                                        {(o.entry_amount || 0) > 0 && (
                                            <div className={`rounded-lg p-3 border ${o.entry_confirmed ? 'bg-green-50 border-green-200' : isOverdue(o.entry_date, o.entry_confirmed) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase text-gray-400">Entrada</p>
                                                        <p className="text-lg font-black">{formatCurrency(o.entry_amount)}</p>
                                                        <p className="text-xs text-gray-500">Venc: {formatDate(o.entry_date || o.order_date)}</p>
                                                    </div>
                                                    {o.entry_confirmed ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><span className="material-icons-outlined text-lg">check_circle</span>Recebido</span>
                                                    ) : (
                                                        <button onClick={(e) => { e.stopPropagation(); confirmPayment(o.id, 'entry'); }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors">Confirmar</button>
                                                    )}
                                                </div>
                                                {isOverdue(o.entry_date || o.order_date, o.entry_confirmed) && <p className="text-xs text-red-600 font-bold mt-1">⚠ Vencido</p>}
                                            </div>
                                        )}
                                        {/* Remaining */}
                                        {(o.remaining_amount || 0) > 0 && (
                                            <div className={`rounded-lg p-3 border ${o.remaining_confirmed ? 'bg-green-50 border-green-200' : isOverdue(o.remaining_date, o.remaining_confirmed) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[10px] font-bold uppercase text-gray-400">Restante</p>
                                                        <p className="text-lg font-black">{formatCurrency(o.remaining_amount)}</p>
                                                        <p className="text-xs text-gray-500">Venc: {formatDate(o.remaining_date || o.payment_due_date)}</p>
                                                    </div>
                                                    {o.remaining_confirmed ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><span className="material-icons-outlined text-lg">check_circle</span>Recebido</span>
                                                    ) : (
                                                        <button onClick={(e) => { e.stopPropagation(); confirmPayment(o.id, 'remaining'); }} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors">Confirmar</button>
                                                    )}
                                                </div>
                                                {isOverdue(o.remaining_date || o.payment_due_date, o.remaining_confirmed) && <p className="text-xs text-red-600 font-bold mt-1">⚠ Vencido</p>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Items Table */}
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Itens do Pedido</p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead><tr className="text-gray-400 text-[10px] uppercase">
                                                    <th className="text-left py-1 pr-2">Produto</th>
                                                    <th className="text-center py-1 px-2">Qtd</th>
                                                    <th className="text-right py-1 px-2">Custo Est.</th>
                                                    <th className="text-right py-1 px-2">Custo Real</th>
                                                    <th className="text-right py-1 px-2">Venda</th>
                                                    <th className="text-right py-1 px-2">Margem</th>
                                                </tr></thead>
                                                <tbody>
                                                    {o.items.map(i => {
                                                        const estCost = i.quantity * (i.unit_price || 0) + (i.customization_cost || 0) + (i.supplier_transport_cost || 0) + (i.client_transport_cost || 0) + (i.extra_expense || 0) + (i.layout_cost || 0);
                                                        const realCost = i.quantity * (i.real_unit_price || i.unit_price || 0) + (i.real_customization_cost || i.customization_cost || 0) + (i.real_supplier_transport_cost || i.supplier_transport_cost || 0) + (i.real_client_transport_cost || i.client_transport_cost || 0) + (i.real_extra_expense || i.extra_expense || 0) + (i.real_layout_cost || i.layout_cost || 0);
                                                        const sale = i.total_item_value || 0;
                                                        const m = sale > 0 ? ((sale - realCost) / sale) * 100 : 0;
                                                        return (
                                                            <tr key={i.id} className="border-t border-gray-100">
                                                                <td className="py-2 pr-2 font-bold text-gray-700">{i.product_name}</td>
                                                                <td className="py-2 px-2 text-center">{i.quantity}</td>
                                                                <td className="py-2 px-2 text-right font-mono text-gray-500">{formatCurrency(estCost)}</td>
                                                                <td className="py-2 px-2 text-right font-mono">{formatCurrency(realCost)}</td>
                                                                <td className="py-2 px-2 text-right font-mono font-bold">{formatCurrency(sale)}</td>
                                                                <td className={`py-2 px-2 text-right font-bold ${m >= 25 ? 'text-green-600' : m >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>{m.toFixed(1)}%</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Footer info */}
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                                        <span>Emissor: <strong>{o.issuer}</strong></span>
                                        <span>Faturamento: <strong>{o.billing_type || '-'}</strong></span>
                                        <span>Venc: <strong>{formatDate(o.payment_due_date)}</strong></span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredOrders.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <span className="material-icons-outlined text-5xl mb-2">inbox</span>
                    <p className="font-bold">Nenhum pedido encontrado</p>
                </div>
            )}
        </div>
    );
};

export default OrdersReceivablesPage;
