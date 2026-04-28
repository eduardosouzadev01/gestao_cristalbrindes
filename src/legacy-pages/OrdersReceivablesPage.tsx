import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { formatCurrency } from '../src/utils/formatCurrency';
import { IssuerSelect } from '../src/components/filters/IssuerSelect';
import { exportSimpleCSV } from '../src/utils/csvExport';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import {
    getSaleValue, getRealCost, getReceivedAmount, getPendingAmount,
    getMargin, getPaymentStatus, getCostPaidSummary, getCashFlowForecast
} from '../src/hooks/useOrderFinancials';

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
    payment_schedule?: { id: string, amount: number, dueDate: string, confirmed: boolean, label: string }[];
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

    const todayStr = new Date().toISOString().split('T')[0];

    // Confirmation Modal
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean; order: Order | null; type: 'entry' | 'remaining' | 'installment';
        action: 'pay' | 'revert'; installmentId?: string;
    }>({ isOpen: false, order: null, type: 'entry', action: 'pay' });

    const [planModal, setPlanModal] = useState<{ isOpen: boolean, order: Order | null }>({ isOpen: false, order: null });
    const [planForm, setPlanForm] = useState({ count: 2, firstDate: todayStr });

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
            const { data, error } = await supabase.from('orders').select(`*, partners(name), order_items(*)`).order('created_at', { ascending: false });
            if (error) throw error;
            setOrders((data || []).map((o: any) => ({
                ...o, client_name: o.partners?.name || 'N/A', items: o.order_items || []
            })));
        } catch { toast.error('Erro ao carregar pedidos.'); }
        setLoading(false);
    };

    // ---- Local helpers that wrap the shared hook (keeps payment_schedule support) ----
    // Cast to `any` allows reuse of the shared hook without duplicating the full type here
    const getSaleValueLocal = (o: Order) => getSaleValue(o as any, o.items as any);
    const getRealCostLocal = (items: OrderItem[]) => getRealCost(items as any);
    const getReceived = (o: Order) => {
        const entryPart = o.entry_confirmed ? o.entry_amount || 0 : 0;
        if (o.payment_schedule && o.payment_schedule.length > 0) {
            return entryPart + o.payment_schedule.filter(p => p.confirmed).reduce((a, p) => a + p.amount, 0);
        }
        return getReceivedAmount(o as any);
    };
    const getPending = (o: Order) => getSaleValueLocal(o) - getReceived(o);
    const getMarginLocal = (o: Order) => getMargin(o as any, o.items as any);
    const getPayStatus = (o: Order) => getPaymentStatus(o as any);
    const getCostPaidCount = (items: OrderItem[]) => getCostPaidSummary(items as any);
    const isOverdue = (date: string | null, confirmed: boolean) => date && !confirmed && date < todayStr;

    // ---- Actions ----
    const executePaymentAction = async () => {
        const { order, type, action, installmentId } = confirmModal;
        if (!order) return;

        const label = type === 'entry' ? '1ª Parcela' : type === 'remaining' ? 'Parcela Única' : 'Parcela do Plano';
        const isConfirming = action === 'pay';

        try {
            let update: any = {};
            if (type === 'entry') update = { entry_confirmed: isConfirming };
            else if (type === 'remaining') update = { remaining_confirmed: isConfirming };
            else if (type === 'installment' && installmentId) {
                const newSchedule = (order.payment_schedule || []).map(p => p.id === installmentId ? { ...p, confirmed: isConfirming } : p);
                update = { payment_schedule: newSchedule };
            }

            const { error } = await supabase.from('orders').update(update).eq('id', order.id);
            if (error) throw error;

            toast.success(`${label} ${isConfirming ? 'confirmada' : 'estornada'}!`);
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...update } : o));
            setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (e: any) { toast.error(e.message); }
    };

    const generatePlan = async () => {
        if (!planModal.order) return;
        const o = planModal.order;
        const count = planForm.count;
        const perAmount = o.remaining_amount / count;
        const schedule = [];
        const baseDate = new Date(planForm.firstDate + 'T12:00:00');

        for (let i = 0; i < count; i++) {
            const date = new Date(baseDate);
            date.setMonth(date.getMonth() + i);
            schedule.push({
                id: crypto.randomUUID(), amount: perAmount, dueDate: date.toISOString().split('T')[0],
                confirmed: false, label: `Parcela ${i + 1}/${count}`
            });
        }
        const { error } = await supabase.from('orders').update({ payment_schedule: schedule }).eq('id', o.id);
        if (error) { toast.error(error.message); return; }
        setOrders(prev => prev.map(order => order.id === o.id ? { ...order, payment_schedule: schedule } : order));
        setPlanModal({ isOpen: false, order: null });
        toast.success('Plano de parcelas gerado!');
    };

    const deletePlan = async (order: Order) => {
        if (!confirm('Deseja remover o plano customizado?')) return;
        const { error } = await supabase.from('orders').update({ payment_schedule: null }).eq('id', order.id);
        if (error) { toast.error(error.message); return; }
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_schedule: null } : o));
        toast.info('Plano removido.');
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

    const summary = useMemo(() => ({
        totalVenda: filteredOrders.reduce((a, o) => a + getSaleValueLocal(o), 0),
        totalRecebido: filteredOrders.reduce((a, o) => a + getReceived(o), 0),
        totalPendente: filteredOrders.reduce((a, o) => a + getPending(o), 0),
        totalCusto: filteredOrders.reduce((a, o) => a + getRealCostLocal(o.items), 0),
    }), [filteredOrders]);

    // Cash flow forecast: receivables due in the next N days
    const receivableEntries = useMemo(() =>
        orders.flatMap(o => {
            const entries = [];
            if ((o.entry_amount || 0) > 0)
                entries.push({ amount: o.entry_amount, dueDate: o.entry_date || o.order_date, isPaid: o.entry_confirmed, issuer: o.issuer });
            if (o.payment_schedule && o.payment_schedule.length > 0)
                o.payment_schedule.forEach(p => entries.push({ amount: p.amount, dueDate: p.dueDate, isPaid: p.confirmed, issuer: o.issuer }));
            else if ((o.remaining_amount || 0) > 0)
                entries.push({ amount: o.remaining_amount, dueDate: o.remaining_date || o.payment_due_date || o.order_date, isPaid: o.remaining_confirmed, issuer: o.issuer });
            return entries;
        }), [orders]);

    const cashFlow7 = useMemo(() => getCashFlowForecast(receivableEntries, 7, filterIssuer !== 'ALL' ? filterIssuer : 'TODOS'), [receivableEntries, filterIssuer]);
    const cashFlow15 = useMemo(() => getCashFlowForecast(receivableEntries, 15, filterIssuer !== 'ALL' ? filterIssuer : 'TODOS'), [receivableEntries, filterIssuer]);
    const cashFlow30 = useMemo(() => getCashFlowForecast(receivableEntries, 30, filterIssuer !== 'ALL' ? filterIssuer : 'TODOS'), [receivableEntries, filterIssuer]);

    const exportAll = () => {
        exportSimpleCSV(filteredOrders.map(o => ({
            pedido: o.order_number, cliente: o.client_name, vendedor: o.salesperson,
            status: o.status, emissor: o.issuer, data: o.order_date,
            venda: getSaleValueLocal(o).toFixed(2), recebido: getReceived(o).toFixed(2),
            pendente: getPending(o).toFixed(2), margem: getMarginLocal(o).toFixed(1) + '%'
        })), 'pedidos_recebiveis');
        toast.success('CSV exportado!');
    };

    if (loading) return <div className="flex items-center justify-center h-64"><span className="material-icons-outlined animate-spin text-4xl text-blue-500">sync</span></div>;

    return (
        <div className="max-w-[1920px] w-full mx-auto p-4 md:p-6 space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-medium text-gray-900 flex items-center gap-2"><span className="material-icons-outlined text-blue-600">receipt_long</span> Pedidos & Recebíveis</h1>
                    <p className="text-sm text-gray-500">{filteredOrders.length} pedidos • Recebimentos centralizados</p>
                </div>
                <button onClick={exportAll} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"><span className="material-icons-outlined text-lg">download</span> Exportar CSV</button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Vendas', value: summary.totalVenda, color: 'blue' },
                    { label: 'Recebido', value: summary.totalRecebido, color: 'green' },
                    { label: 'Pendente', value: summary.totalPendente, color: 'orange' },
                    { label: 'Custos Reais', value: summary.totalCusto, color: 'red' }
                ].map((c, i) => (
                    <div key={i} className="bg-white rounded-md border border-gray-200 p-3">
                        <span className="text-[10px] font-medium text-gray-400 uppercase">{c.label}</span>
                        <p className={`text-lg font-medium text-${c.color}-600`}>{formatCurrency(c.value)}</p>
                    </div>
                ))}
            </div>

            {/* Cash Flow Forecast — migrated from ReceivablesPage */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Previsão 7 Dias', value: cashFlow7, icon: 'schedule', color: 'blue' },
                    { label: 'Previsão 15 Dias', value: cashFlow15, icon: 'event', color: 'indigo' },
                    { label: 'Previsão 30 Dias', value: cashFlow30, icon: 'calendar_month', color: 'violet' },
                ].map((c, i) => (
                    <div key={i} className="bg-white rounded-md border border-gray-200 p-3 border-l-4" style={{ borderLeftColor: c.color === 'blue' ? '#3b82f6' : c.color === 'indigo' ? '#6366f1' : '#7c3aed' }}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="material-icons-outlined text-gray-400 text-sm">{c.icon}</span>
                            <span className="text-[10px] font-medium text-gray-400 uppercase">{c.label}</span>
                        </div>
                        <p className="text-base font-medium text-gray-800">{formatCurrency(c.value)}</p>
                        <p className="text-[9px] text-gray-400 uppercase mt-0.5">A vencer no período</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-md border border-gray-200 p-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="md:col-span-2"><input className="form-input w-full text-sm rounded-md border-gray-300" placeholder="Buscar pedido, cliente, vendedor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <select className="form-select text-sm rounded-md border-gray-300" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="ALL">Todos Status</option>
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <IssuerSelect className="form-select text-sm rounded-md border-gray-300" value={filterIssuer} onChange={setFilterIssuer} includeAll allLabel="Todos Emissores" />
                    <select className="form-select text-sm rounded-md border-gray-300" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                        <option value="ALL">Todos Pgtos</option><option value="PAID">Pago</option><option value="PARTIAL">Parcial</option><option value="PENDING">Pendente</option>
                    </select>
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
                {filteredOrders.map(o => {
                    const margin = getMarginLocal(o);
                    const payStatus = getPayStatus(o);
                    const costInfo = getCostPaidCount(o.items);
                    const expanded = expandedId === o.id;

                    return (
                        <div key={o.id} className="bg-white rounded-md border border-gray-200 overflow-hidden hover:shadow-none transition-shadow-none">
                            <div className="px-2 py-1.5 text-sm flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : o.id)}>
                                <div className="flex-shrink-0"><span className={`text-[10px] font-medium px-2 py-1 rounded-md ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span></div>
                                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5"><p className="text-sm font-medium text-gray-900">#{o.order_number}</p>
                                            <a href={'/pedido/' + o.id} onClick={(e) => e.stopPropagation()} className="text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 py-0.5 px-1.5 rounded-md flex items-center gap-1 transition-colors" title="Abrir Pedido"><span className="material-icons-outlined text-[11px]">open_in_new</span></a>
                                        </div>
                                        <p className="text-xs text-gray-400">{formatDate(o.order_date)}</p>
                                    </div>
                                    <div className="hidden md:block"><p className="text-sm font-medium text-gray-700 truncate">{o.client_name}</p><p className="text-xs text-gray-400">{o.salesperson}</p></div>
                                    <div className="text-right"><p className="text-sm font-medium text-gray-900">{formatCurrency(getSaleValueLocal(o))}</p><p className="text-xs text-gray-400">Venda</p></div>
                                    <div className="text-right hidden md:block"><p className={`text-sm font-medium ${margin >= 25 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</p><p className="text-xs text-gray-400">Margem</p></div>
                                    <div className="text-right hidden md:block">
                                        <div className="flex items-center justify-end gap-1"><span className={`w-2 h-2 rounded-full ${payStatus === 'PAID' ? 'bg-green-500' : payStatus === 'PARTIAL' ? 'bg-yellow-500' : 'bg-red-500'}`} /><span className="text-xs font-medium text-gray-600">{payStatus === 'PAID' ? 'Pago' : payStatus === 'PARTIAL' ? 'Parcial' : 'Pendente'}</span></div>
                                        <p className="text-xs text-gray-400">{formatCurrency(getPending(o))} pend.</p>
                                    </div>
                                    <div className="text-right hidden md:block"><p className="text-xs text-gray-400">{costInfo.paid}/{costInfo.total} custos pagos</p></div>
                                </div>
                                <span className="material-icons-outlined text-gray-400 text-lg transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : '' }}>expand_more</span>
                            </div>

                            {expanded && (
                                <div className="border-t border-gray-100 bg-white p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Entry Box */}
                                        {(o.entry_amount || 0) > 0 && (
                                            <div className={`rounded-md p-3 border ${o.entry_confirmed ? 'bg-green-50 border-green-200 shadow-none' : isOverdue(o.entry_date, o.entry_confirmed) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-none'}`}>
                                                <div className="flex justify-between items-center">
                                                    <div><p className="text-[10px] font-medium uppercase text-gray-400">1ª Parcela (Entrada)</p><p className="text-lg font-medium text-gray-900">{formatCurrency(o.entry_amount)}</p><p className="text-xs text-gray-500">Venc: {formatDate(o.entry_date || o.order_date)}</p></div>
                                                    {o.entry_confirmed ? (
                                                        <div className="flex flex-col items-end gap-1"><span className="flex items-center gap-1 text-green-600 text-xs font-medium"><span className="material-icons-outlined text-lg">check_circle</span>PAGO</span><button onClick={() => setConfirmModal({ isOpen: true, order: o, type: 'entry', action: 'revert' })} className="text-[10px] text-red-400 hover:text-red-600 font-medium underline transition-colors">Estornar</button></div>
                                                    ) : (
                                                        <button onClick={() => setConfirmModal({ isOpen: true, order: o, type: 'entry', action: 'pay' })} className="px-5 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-all shadow-none shadow-none-green-200 active:scale-95">CONFIRMAR</button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Installment Plan Rendering */}
                                        {o.payment_schedule && o.payment_schedule.length > 0 ? (
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-md p-3 space-y-3 shadow-none">
                                                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                                                    <p className="text-[10px] font-medium text-blue-600 uppercase flex items-center gap-1"><span className="material-icons-outlined text-xs">calendar_month</span> Plano de Recebimento</p>
                                                    <button onClick={() => deletePlan(o)} className="text-[10px] font-medium text-red-500 hover:underline">Remover Plano</button>
                                                </div>
                                                <div className="space-y-2">
                                                    {o.payment_schedule.map(p => (
                                                        <div key={p.id} className={`flex items-center justify-between p-2 rounded-md bg-white border ${p.confirmed ? 'border-green-200' : 'border-blue-100 shadow-none'}`}>
                                                            <div><p className="text-xs font-medium text-gray-800">{p.label}</p><p className="text-[10px] text-gray-500">{formatDate(p.dueDate)} • {formatCurrency(p.amount)}</p></div>
                                                            <button onClick={() => setConfirmModal({ isOpen: true, order: o, type: 'installment', action: p.confirmed ? 'revert' : 'pay', installmentId: p.id })} className={`px-3 py-1 text-[10px] font-medium rounded-md transition-all ${p.confirmed ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-none'}`}>{p.confirmed ? 'PAGO' : 'BAIXAR'}</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Single Remaining Box */
                                            (o.remaining_amount || 0) > 0 && (
                                                <div className={`rounded-md p-3 border ${o.remaining_confirmed ? 'bg-green-50 border-green-200' : isOverdue(o.remaining_date, o.remaining_confirmed) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'} shadow-none`}>
                                                    <div className="flex justify-between items-start">
                                                        <div><p className="text-[10px] font-medium uppercase text-gray-400">2ª Parcela (Restante)</p><p className="text-lg font-medium text-gray-900">{formatCurrency(o.remaining_amount)}</p><p className="text-xs text-gray-500">Venc: {formatDate(o.remaining_date || o.payment_due_date)}</p></div>
                                                        <div className="flex flex-col gap-2">
                                                            {o.remaining_confirmed ? (
                                                                <div className="flex flex-col items-end gap-1"><span className="flex items-center gap-1 text-green-600 text-xs font-medium"><span className="material-icons-outlined text-lg">check_circle</span>PAGO</span><button onClick={() => setConfirmModal({ isOpen: true, order: o, type: 'remaining', action: 'revert' })} className="text-[10px] text-red-400 hover:text-red-600 font-medium underline transition-colors">Estornar</button></div>
                                                            ) : (
                                                                <>
                                                                    <button onClick={() => setConfirmModal({ isOpen: true, order: o, type: 'remaining', action: 'pay' })} className="px-5 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-all shadow-none shadow-none-green-200 active:scale-95">CONFIRMAR</button>
                                                                    <button onClick={() => setPlanModal({ isOpen: true, order: o })} className="flex items-center justify-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 transition-colors py-1"><span className="material-icons-outlined text-xs">style</span> Parcelar Customizado</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                    {/* Items Table simplified */}
                                    <div className="bg-white rounded-md border border-gray-200 overflow-hidden text-[11px]">
                                        <table className="w-full text-xs">
                                            <thead><tr className="bg-white border-b border-gray-100 text-[9px] uppercase font-medium text-gray-400"><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-right">Custo Real</th><th className="px-3 py-2 text-right">Venda</th><th className="px-3 py-2 text-right">Saldo</th><th className="px-3 py-2 text-right">Margem</th></tr></thead>
                                            <tbody>{o.items.map(i => {
                                                const realC = i.quantity * (i.real_unit_price || i.unit_price || 0) + (i.real_customization_cost || i.customization_cost || 0) + (i.real_supplier_transport_cost || i.supplier_transport_cost || 0) + (i.real_client_transport_cost || i.client_transport_cost || 0);
                                                const sale = i.total_item_value || 0;
                                                const balance = sale - realC;
                                                const m = sale > 0 ? ((sale - realC) / sale) * 100 : 0;
                                                return (<tr key={i.id} className="border-b border-gray-50 last:border-0"><td className="px-3 py-2 font-medium text-gray-700">{i.product_name}</td><td className="px-3 py-2 text-right font-mono">{formatCurrency(realC)}</td><td className="px-3 py-2 text-right font-mono font-medium">{formatCurrency(sale)}</td><td className="px-3 py-2 text-right font-mono font-medium text-blue-600">{formatCurrency(balance)}</td><td className={`px-3 py-2 text-right font-medium ${m >= 25 ? 'text-green-600' : 'text-yellow-600'}`}>{m.toFixed(1)}%</td></tr>);
                                            })}</tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && confirmModal.order && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-md shadow-none w-full max-w-sm border border-gray-100 overflow-hidden text-center transform scale-100 transition-all">
                        <div className="pt-6 pb-2 text-center">
                            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ring-8 ${confirmModal.action === 'pay' ? 'bg-green-100 ring-green-50' : 'bg-red-100 ring-red-50'}`}>
                                <span className={`material-icons-outlined text-3xl ${confirmModal.action === 'pay' ? 'text-green-600' : 'text-red-600'}`}>{confirmModal.action === 'pay' ? 'account_balance_wallet' : 'settings_backup_restore'}</span>
                            </div>
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 px-6 uppercase tracking-tighter">{confirmModal.action === 'pay' ? 'Confirmar Recebimento' : 'Estornar Recebimento'}</h3>
                        <div className="bg-white border border-gray-200 rounded-md p-4 mx-6 my-4 text-left">
                            <p className="text-xs text-gray-500 flex justify-between"><span>Ref:</span> <strong className="text-gray-900">Pedido #{confirmModal.order.order_number}</strong></p>
                            <p className="text-xs text-gray-500 flex justify-between mt-1"><span>Valor:</span> <strong className="text-gray-900 text-sm">{formatCurrency(confirmModal.type === 'installment' ? confirmModal.order.payment_schedule?.find(p => p.id === confirmModal.installmentId)?.amount || 0 : (confirmModal.type === 'entry' ? confirmModal.order.entry_amount : confirmModal.order.remaining_amount))}</strong></p>
                        </div>
                        <div className="bg-white p-4 flex gap-3 border-t overflow-hidden">
                            <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-md font-medium hover:bg-gray-50 transition-colors">Sair</button>
                            <button onClick={executePaymentAction} className={`flex-1 px-4 py-2.5 rounded-md font-medium text-white shadow-none ${confirmModal.action === 'pay' ? 'bg-green-600 shadow-none-green-200' : 'bg-red-600 shadow-none-red-200'}`}>{confirmModal.action === 'pay' ? 'CONFIRMAR' : 'ESTORNAR'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Generation Modal */}
            {planModal.isOpen && planModal.order && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-md shadow-none w-full max-w-sm border border-gray-100 overflow-hidden transform scale-100 transition-all">
                        <div className="p-4 border-b bg-white flex items-center justify-between"><h3 className="text-lg font-medium text-gray-900 uppercase tracking-tighter">Gerar Parcelamento</h3><button onClick={() => setPlanModal({ isOpen: false, order: null })} className="text-gray-400 hover:text-gray-600"><span className="material-icons-outlined">close</span></button></div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100"><p className="text-xs text-blue-700">Parcelando o valor restante de <strong>{formatCurrency(planModal.order.remaining_amount)}</strong></p></div>
                            <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Número de Parcelas</label><input type="number" min="2" max="10" className="form-input w-full rounded-md border-gray-300 font-medium" value={planForm.count} onChange={e => setPlanForm({ ...planForm, count: parseInt(e.target.value) || 2 })} /></div>
                            <div><label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Data da 1ª Parcela</label><input type="date" className="form-input w-full rounded-md border-gray-300" value={planForm.firstDate} onChange={e => setPlanForm({ ...planForm, firstDate: e.target.value })} /></div>
                        </div>
                        <div className="bg-white p-4 border-t flex gap-3">
                            <button onClick={() => setPlanModal({ isOpen: false, order: null })} className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-md font-medium hover:bg-gray-50">Cancelar</button>
                            <button onClick={generatePlan} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md font-medium shadow-none shadow-none-blue-200 hover:bg-blue-700">GERAR PLANO</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersReceivablesPage;
