import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../src/utils/formatCurrency';
import { exportSimpleCSV } from '../src/utils/csvExport';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { toast } from 'sonner';
import { ISSUERS } from '../src/components/filters/IssuerSelect';

const printStyles = `
@media print {
  header, nav, .bg-gray-200, button, select, .no-print {
    display: none !important;
  }
  body {
    background: white !important;
    padding: 0 !important;
  }
  .max-w-7xl, .max-w-\[1920px\], .mx-auto {
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .bg-white, .bg-gray-50 {
    background: transparent !important;
    border: none !important;
    box-shadow-none: none !important;
  }
  .shadow-none, .shadow-none, .shadow-none-inner {
    box-shadow-none: none !important;
  }
  .rounded-md, .rounded-md {
    border-radius: 0 !important;
  }
  .border {
    border: 1px solid #eee !important;
  }
  .text-blue-600, .text-green-600, .text-orange-600, .text-red-600 {
    color: black !important;
    text-decoration: underline !important;
  }
  h1, h2, h3 {
    page-break-after: avoid;
  }
  .grid {
    display: block !important;
  }
  .overflow-x-auto {
    overflow: visible !important;
  }
}
`;
import { useNavigate } from 'react-router-dom';

// ---- Types ----
interface OrderFinancial {
    id: string; order_number: string; salesperson: string; status: string;
    client_name: string; issuer: string; order_date: string; payment_due_date: string;
    total_amount: number; entry_amount: number; entry_confirmed: boolean; entry_date: string;
    remaining_amount: number; remaining_confirmed: boolean; remaining_date: string;
    entry_forecast_date: string; remaining_forecast_date: string;
}
interface OrderItemCost {
    order_id: string; order_number: string; product_name: string; quantity: number;
    unit_price: number; customization_cost: number; supplier_transport_cost: number;
    client_transport_cost: number; extra_expense: number; layout_cost: number;
    total_item_value: number; real_unit_price: number; real_customization_cost: number;
    real_supplier_transport_cost: number; real_client_transport_cost: number;
    real_extra_expense: number; real_layout_cost: number; bv_pct: number;
    unit_price_paid: boolean; customization_paid: boolean; supplier_transport_paid: boolean;
    client_transport_paid: boolean; extra_expense_paid: boolean; layout_paid: boolean;
    supplier_payment_date: string; customization_payment_date: string;
    transport_payment_date: string; layout_payment_date: string; extra_payment_date: string;
    supplier_id: string; issuer: string;
}
interface CompanyExpense {
    id: string; description: string; amount: number; due_date: string;
    paid: boolean; category: string; issuer: string;
}

const FinancialDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderFinancial[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItemCost[]>([]);
    const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'dre'>('overview');
    const [filterIssuer, setFilterIssuer] = useState('TODOS');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    useEffect(() => { fetchAllData(); }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [ordersRes, itemsRes, expensesRes] = await Promise.all([
                supabase.from('orders').select('id, order_number, salesperson, status, order_date, payment_due_date, total_amount, entry_amount, entry_confirmed, entry_date, remaining_amount, remaining_confirmed, remaining_date, issuer, entry_forecast_date, remaining_forecast_date, partners(name)').order('order_date', { ascending: false }),
                supabase.from('order_items').select('*, orders(id, order_number, issuer, payment_due_date, status)'),
                supabase.from('company_expenses').select('*')
            ]);
            if (ordersRes.data) setOrders(ordersRes.data.map((o: any) => ({ ...o, client_name: o.partners?.name || 'N/A' })));
            if (itemsRes.data) setOrderItems(itemsRes.data.filter((i: any) => i.orders?.status !== 'CANCELADO').map((i: any) => ({ ...i, order_number: i.orders?.order_number, issuer: i.orders?.issuer || 'CRISTAL' })));
            if (expensesRes.data) setExpenses(expensesRes.data);
        } catch { toast.error('Erro ao carregar dados.'); }
        setLoading(false);
    };

    // ========== HELPERS ==========
    const todayStr = new Date().toISOString().split('T')[0];
    const getItemRealCost = (i: OrderItemCost) => {
        const prod = i.quantity * (i.real_unit_price || i.unit_price || 0);
        return prod + (i.real_customization_cost || i.customization_cost || 0) +
            (i.real_supplier_transport_cost || i.supplier_transport_cost || 0) +
            (i.real_client_transport_cost || i.client_transport_cost || 0) +
            (i.real_extra_expense || i.extra_expense || 0) +
            (i.real_layout_cost || i.layout_cost || 0);
    };
    const getItemEstimatedCost = (i: OrderItemCost) => {
        const prod = i.quantity * (i.unit_price || 0);
        return prod + (i.customization_cost || 0) + (i.supplier_transport_cost || 0) +
            (i.client_transport_cost || 0) + (i.extra_expense || 0) + (i.layout_cost || 0);
    };
    const filtered = (issuer: string) => filterIssuer === 'TODOS' || issuer === filterIssuer;

    // ========== KPIs ==========
    const kpis = useMemo(() => {
        const fo = orders.filter(o => filtered(o.issuer) && o.status !== 'CANCELADO');
        const monthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
        const monthOrders = fo.filter(o => (o.order_date || '').startsWith(monthStr));

        const faturamentoMes = monthOrders.reduce((a, o) => a + (o.total_amount || 0), 0);
        const monthItemIds = new Set(monthOrders.map(o => o.id));
        const monthItems = orderItems.filter(i => monthItemIds.has(i.order_id));
        const custoMes = monthItems.reduce((a, i) => a + getItemRealCost(i), 0);
        const margemMedia = faturamentoMes > 0 ? ((faturamentoMes - custoMes) / faturamentoMes) * 100 : 0;

        // Overdue receivable
        let overdueReceber = 0;
        fo.forEach(o => {
            if (!o.entry_confirmed && o.entry_amount > 0 && (o.entry_date || o.order_date) < todayStr) overdueReceber += o.entry_amount;
            if (!o.remaining_confirmed && o.remaining_amount > 0 && (o.remaining_date || o.payment_due_date || o.order_date) < todayStr) overdueReceber += o.remaining_amount;
        });

        // Total open receivable
        let totalReceber = 0;
        fo.forEach(o => {
            if (!o.entry_confirmed && o.entry_amount > 0) totalReceber += o.entry_amount;
            if (!o.remaining_confirmed && o.remaining_amount > 0) totalReceber += o.remaining_amount;
        });
        const inadimplencia = totalReceber > 0 ? (overdueReceber / totalReceber) * 100 : 0;

        // Total a pagar (custos não pagos + despesas não pagas)
        let totalPagar = 0;
        orderItems.filter(i => filtered(i.issuer)).forEach(i => {
            if (!i.unit_price_paid && i.unit_price > 0) totalPagar += i.quantity * (i.real_unit_price || i.unit_price);
            if (!i.customization_paid && i.customization_cost > 0) totalPagar += (i.real_customization_cost || i.customization_cost);
            if (!i.supplier_transport_paid && i.supplier_transport_cost > 0) totalPagar += (i.real_supplier_transport_cost || i.supplier_transport_cost);
            if (!i.client_transport_paid && i.client_transport_cost > 0) totalPagar += (i.real_client_transport_cost || i.client_transport_cost);
            if (!i.extra_expense_paid && i.extra_expense > 0) totalPagar += (i.real_extra_expense || i.extra_expense);
            if (!i.layout_paid && i.layout_cost > 0) totalPagar += (i.real_layout_cost || i.layout_cost);
        });
        expenses.filter(e => filtered(e.issuer || 'CRISTAL')).forEach(e => {
            if (!e.paid) totalPagar += e.amount;
        });

        return { faturamentoMes, margemMedia, overdueReceber, inadimplencia, totalReceber, totalPagar, pedidosMes: monthOrders.length };
    }, [orders, orderItems, expenses, filterIssuer, filterMonth, filterYear]);

    // ========== CASH FLOW ==========
    const cashFlowData = useMemo(() => {
        const baseDate = new Date(filterYear, filterMonth - 1, 1);
        const baseDateStr = baseDate.toISOString().split('T')[0];
        const periods = [7, 15, 30, 60, 90];

        return periods.map(days => {
            const target = new Date(baseDate); target.setDate(baseDate.getDate() + days);
            const targetStr = target.toISOString().split('T')[0];

            // INFLOWS: receivables
            let inflow = 0;
            orders.filter(o => filtered(o.issuer)).forEach(o => {
                if (!o.entry_confirmed && o.entry_amount > 0) {
                    const d = o.entry_forecast_date || o.entry_date || o.order_date;
                    if (d >= baseDateStr && d <= targetStr) inflow += o.entry_amount;
                }
                if (!o.remaining_confirmed && o.remaining_amount > 0) {
                    const d = o.remaining_forecast_date || o.remaining_date || o.payment_due_date || o.order_date;
                    if (d >= baseDateStr && d <= targetStr) inflow += o.remaining_amount;
                }
            });

            // OUTFLOWS: supplier costs (using payment dates) + company expenses
            let outflow = 0;
            orderItems.filter(i => filtered(i.issuer)).forEach(i => {
                const addCost = (paid: boolean, est: number, real: number, dateField: string | null, qty = 1) => {
                    if (paid || (est <= 0 && real <= 0)) return;
                    const val = (real || est) * qty;
                    const d = dateField || baseDateStr;
                    if (d >= baseDateStr && d <= targetStr) outflow += val;
                };
                addCost(i.unit_price_paid, i.unit_price, i.real_unit_price, i.supplier_payment_date, i.quantity);
                addCost(i.customization_paid, i.customization_cost, i.real_customization_cost, i.customization_payment_date || i.supplier_payment_date);
                addCost(i.supplier_transport_paid, i.supplier_transport_cost, i.real_supplier_transport_cost, i.transport_payment_date || i.supplier_payment_date);
                addCost(i.client_transport_paid, i.client_transport_cost, i.real_client_transport_cost, i.transport_payment_date || i.supplier_payment_date);
                addCost(i.extra_expense_paid, i.extra_expense, i.real_extra_expense, i.extra_payment_date || i.supplier_payment_date);
                addCost(i.layout_paid, i.layout_cost, i.real_layout_cost, i.layout_payment_date || i.supplier_payment_date);
            });
            expenses.filter(e => filtered(e.issuer || 'CRISTAL')).forEach(e => {
                if (!e.paid && e.due_date >= baseDateStr && e.due_date <= targetStr) outflow += e.amount;
            });

            return { period: `${days}d`, days, inflow, outflow, net: inflow - outflow };
        });
    }, [orders, orderItems, expenses, filterIssuer]);

    // Overdue
    const overdueFlow = useMemo(() => {
        let overdueIn = 0, overdueOut = 0;
        orders.filter(o => filtered(o.issuer)).forEach(o => {
            if (!o.entry_confirmed && o.entry_amount > 0 && (o.entry_date || o.order_date) < todayStr) overdueIn += o.entry_amount;
            if (!o.remaining_confirmed && o.remaining_amount > 0 && (o.remaining_date || o.payment_due_date || o.order_date) < todayStr) overdueIn += o.remaining_amount;
        });
        expenses.filter(e => filtered(e.issuer || 'CRISTAL')).forEach(e => { if (!e.paid && e.due_date < todayStr) overdueOut += e.amount; });
        return { overdueIn, overdueOut };
    }, [orders, expenses, filterIssuer]);

    // ========== DRE ==========
    const dreData = useMemo(() => {
        const monthStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}`;
        const mo = orders.filter(o => filtered(o.issuer) && (o.order_date || '').startsWith(monthStr));
        const receitaBruta = mo.reduce((a, o) => a + (o.total_amount || 0), 0);

        const moIds = new Set(mo.map(o => o.id));
        const mi = orderItems.filter(i => moIds.has(i.order_id));

        const custosProd = mi.reduce((a, i) => a + i.quantity * (i.real_unit_price || i.unit_price || 0), 0);
        const custosPersonal = mi.reduce((a, i) => a + (i.real_customization_cost || i.customization_cost || 0), 0);
        const custosFretes = mi.reduce((a, i) => a + (i.real_supplier_transport_cost || i.supplier_transport_cost || 0) + (i.real_client_transport_cost || i.client_transport_cost || 0), 0);
        const custosLayout = mi.reduce((a, i) => a + (i.real_layout_cost || i.layout_cost || 0), 0);
        const custosExtras = mi.reduce((a, i) => a + (i.real_extra_expense || i.extra_expense || 0), 0);
        const bvCosts = mi.reduce((a, i) => a + (i.total_item_value || 0) * ((i.bv_pct || 0) / 100), 0);
        const custoDireto = custosProd + custosPersonal + custosFretes + custosLayout + custosExtras + bvCosts;
        const lucroBruto = receitaBruta - custoDireto;

        const me = expenses.filter(e => filtered(e.issuer || 'CRISTAL') && e.due_date.startsWith(monthStr));
        const despFixas = me.filter(e => e.category === 'FIXO').reduce((a, e) => a + e.amount, 0);
        const despPessoal = me.filter(e => e.category === 'PESSOAL').reduce((a, e) => a + e.amount, 0);
        const despImpostos = me.filter(e => e.category === 'IMPOSTO').reduce((a, e) => a + e.amount, 0);
        const despVariaveis = me.filter(e => e.category === 'VARIAVEL').reduce((a, e) => a + e.amount, 0);
        const despOutras = me.filter(e => e.category === 'OUTRO').reduce((a, e) => a + e.amount, 0);
        const totalDesp = despFixas + despPessoal + despImpostos + despVariaveis + despOutras;
        const lucroLiquido = lucroBruto - totalDesp;
        const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;
        const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

        return {
            receitaBruta, custosProd, custosPersonal, custosFretes, custosLayout, custosExtras, bvCosts, custoDireto,
            lucroBruto, despFixas, despPessoal, despImpostos, despVariaveis, despOutras, totalDesp,
            lucroLiquido, margemBruta, margemLiquida, totalPedidos: mo.length
        };
    }, [orders, orderItems, expenses, filterMonth, filterYear, filterIssuer]);

    // ========== EXPORTS ==========
    const exportCashFlow = () => {
        if (cashFlowData.length === 0) { toast.error('Sem dados para exportar.'); return; }
        exportSimpleCSV(
            cashFlowData.map(r => ({
                periodo: r.period,
                entradas: r.inflow.toFixed(2).replace('.', ','),
                saidas: r.outflow.toFixed(2).replace('.', ','),
                saldo: r.net.toFixed(2).replace('.', ',')
            })),
            `fluxo_caixa_${filterMonth}_${filterYear}`
        );
        toast.success('Fluxo de Caixa exportado!');
    };
    const exportDRE = () => {
        const d = dreData;
        exportSimpleCSV([
            { item: 'Receita Bruta', valor: d.receitaBruta.toFixed(2).replace('.', ',') },
            { item: 'Produtos (Custo Fornecedor)', valor: (-d.custosProd).toFixed(2).replace('.', ',') },
            { item: 'Personalização', valor: (-d.custosPersonal).toFixed(2).replace('.', ',') },
            { item: 'Fretes', valor: (-d.custosFretes).toFixed(2).replace('.', ',') },
            { item: 'Layout', valor: (-d.custosLayout).toFixed(2).replace('.', ',') },
            { item: 'Extras', valor: (-d.custosExtras).toFixed(2).replace('.', ',') },
            { item: 'BV (Bonificação)', valor: (-d.bvCosts).toFixed(2).replace('.', ',') },
            { item: 'Custo Direto Total', valor: (-d.custoDireto).toFixed(2).replace('.', ',') },
            { item: 'Lucro Bruto', valor: d.lucroBruto.toFixed(2).replace('.', ',') },
            { item: 'Despesas Fixas', valor: (-d.despFixas).toFixed(2).replace('.', ',') },
            { item: 'Pessoal / Salários', valor: (-d.despPessoal).toFixed(2).replace('.', ',') },
            { item: 'Impostos', valor: (-d.despImpostos).toFixed(2).replace('.', ',') },
            { item: 'Variáveis', valor: (-d.despVariaveis).toFixed(2).replace('.', ',') },
            { item: 'Outras Despesas', valor: (-d.despOutras).toFixed(2).replace('.', ',') },
            { item: 'Despesas Operacionais Total', valor: (-d.totalDesp).toFixed(2).replace('.', ',') },
            { item: 'Lucro Líquido', valor: d.lucroLiquido.toFixed(2).replace('.', ',') },
            { item: 'Margem Bruta %', valor: d.margemBruta.toFixed(1).replace('.', ',') + '%' },
            { item: 'Margem Líquida %', valor: d.margemLiquida.toFixed(1).replace('.', ',') + '%' }
        ], `dre_${filterMonth}_${filterYear}`);
        toast.success('DRE exportado!');
    };

    if (loading) return <div className="flex items-center justify-center h-64"><span className="material-icons-outlined animate-spin text-4xl text-blue-500">sync</span></div>;

    const tabs = [
        { id: 'overview' as const, label: 'Visão Geral', icon: 'dashboard' },
        { id: 'cashflow' as const, label: 'Fluxo de Caixa', icon: 'account_balance' },
        { id: 'dre' as const, label: 'DRE', icon: 'assessment' }
    ];

    const DreRow = ({ label, value, bold, indent, color }: { label: string; value: number; bold?: boolean; indent?: boolean; color?: string }) => (
        <div className={`flex justify-between items-center py-2 ${bold ? 'border-t border-gray-200 pt-3' : ''} ${indent ? 'pl-6' : ''}`}>
            <span className={`text-sm ${bold ? 'font-medium text-gray-900' : 'text-gray-600'}`}>{label}</span>
            <span className={`text-sm font-mono ${bold ? 'font-medium' : ''} ${color || (value >= 0 ? 'text-gray-900' : 'text-red-600')}`}>{formatCurrency(value)}</span>
        </div>
    );

    const MarginBadge = ({ label, value }: { label: string; value: number }) => (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${value >= 30 ? 'bg-green-100 text-green-700' : value >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
            {label}: {value.toFixed(1)}%
        </span>
    );

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20">
            <style>{printStyles}</style>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-medium text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-600">analytics</span> Painel Financeiro
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Visão consolidada de receitas, custos e resultados</p>
                </div>
                <div className="flex items-center gap-2">
                    <select className="form-select text-sm rounded-md border-gray-300" value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => <option key={m} value={m}>{['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m - 1]}</option>)}
                    </select>
                    <select className="form-select text-sm rounded-md border-gray-300" value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}>
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <select className="form-select text-sm rounded-md border-gray-300" value={filterIssuer} onChange={e => setFilterIssuer(e.target.value)}>
                        <option value="TODOS">Todas Empresas</option>
                        {ISSUERS.map(issuer => (
                            <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-md">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-none' : 'text-gray-500 hover:text-gray-700'}`}>
                        <span className="material-icons-outlined text-lg">{t.icon}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                    </button>
                ))}
            </div>

            {/* ============ OVERVIEW ============ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Faturamento do Mês', value: formatCurrency(kpis.faturamentoMes), sub: `${kpis.pedidosMes} pedidos`, icon: 'trending_up', color: 'blue' },
                            { label: 'Margem Média', value: `${kpis.margemMedia.toFixed(1)}%`, sub: formatCurrency(kpis.faturamentoMes * kpis.margemMedia / 100), icon: 'pie_chart', color: kpis.margemMedia >= 25 ? 'green' : 'yellow' },
                            { label: 'A Receber', value: formatCurrency(kpis.totalReceber), sub: kpis.overdueReceber > 0 ? `${formatCurrency(kpis.overdueReceber)} vencido` : 'Em dia', icon: 'account_balance_wallet', color: kpis.overdueReceber > 0 ? 'red' : 'green', path: '/pedidos-recebiveis' },
                            { label: 'A Pagar', value: formatCurrency(kpis.totalPagar), sub: 'Custos + Despesas', icon: 'payments', color: 'orange', path: '/payables' }
                        ].map((kpi, i) => (
                            <div key={i} onClick={() => kpi.path && navigate(kpi.path)} className={`bg-white rounded-md border border-gray-200 p-4 transition-all ${kpi.path ? 'cursor-pointer hover:shadow-none hover:border-gray-300 hover:-translate-y-0.5' : 'hover:shadow-none'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`material-icons-outlined text-${kpi.color}-500 text-xl`}>{kpi.icon}</span>
                                    <span className="text-[10px] font-medium text-gray-400 uppercase">{kpi.label}</span>
                                </div>
                                <p className="text-xl font-medium text-gray-900">{kpi.value}</p>
                                <p className={`text-xs mt-1 ${kpi.sub.includes('vencido') ? 'text-red-500 font-medium' : 'text-gray-400'}`}>{kpi.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Mini Cash Flow + Inadimplência */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-md border border-gray-200 p-5">
                            <h3 className="text-sm font-medium text-gray-700 uppercase mb-4 flex items-center gap-2">
                                <span className="material-icons-outlined text-blue-500 text-lg">timeline</span> Fluxo Próximos 30 Dias
                            </h3>
                            {cashFlowData.filter(c => c.days <= 30).map(c => (
                                <div key={c.days} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <span className="text-xs font-medium text-gray-500 w-10">{c.period}</span>
                                    <div className="flex-1 mx-3">
                                        <div className="flex gap-2 text-xs">
                                            <span className="text-green-600">▲ {formatCurrency(c.inflow)}</span>
                                            <span className="text-red-500">▼ {formatCurrency(c.outflow)}</span>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-medium ${c.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(c.net)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-md border border-gray-200 p-5">
                            <h3 className="text-sm font-medium text-gray-700 uppercase mb-4 flex items-center gap-2">
                                <span className="material-icons-outlined text-orange-500 text-lg">warning</span> Indicadores
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Inadimplência</span><span className={kpis.inadimplencia > 20 ? 'text-red-600 font-medium' : ''}>{kpis.inadimplencia.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${kpis.inadimplencia > 30 ? 'bg-red-500' : kpis.inadimplencia > 15 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(kpis.inadimplencia, 100)}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Margem Bruta Mês</span><span>{kpis.margemMedia.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${kpis.margemMedia >= 30 ? 'bg-green-500' : kpis.margemMedia >= 15 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min(kpis.margemMedia, 100)}%` }} />
                                    </div>
                                </div>
                                {overdueFlow.overdueIn > 0 && (
                                    <div className="bg-red-50 rounded-md p-3 mt-2">
                                        <p className="text-xs font-medium text-red-700">⚠ Vencidos a Receber: {formatCurrency(overdueFlow.overdueIn)}</p>
                                    </div>
                                )}
                                {overdueFlow.overdueOut > 0 && (
                                    <div className="bg-orange-50 rounded-md p-3">
                                        <p className="text-xs font-medium text-orange-700">⚠ Despesas Vencidas: {formatCurrency(overdueFlow.overdueOut)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ CASH FLOW ============ */}
            {activeTab === 'cashflow' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Projeção de Fluxo de Caixa</h3>
                        <button onClick={exportCashFlow} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                            <span className="material-icons-outlined text-sm">download</span> CSV
                        </button>
                    </div>

                    {/* Overdue Alert */}
                    {(overdueFlow.overdueIn > 0 || overdueFlow.overdueOut > 0) && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 grid grid-cols-2 gap-4">
                            <div><span className="text-[10px] font-medium text-red-500 uppercase">Vencido a Receber</span><p className="text-lg font-medium text-red-700">{formatCurrency(overdueFlow.overdueIn)}</p></div>
                            <div><span className="text-[10px] font-medium text-orange-500 uppercase">Vencido a Pagar</span><p className="text-lg font-medium text-orange-700">{formatCurrency(overdueFlow.overdueOut)}</p></div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead><tr className="bg-white text-gray-500 text-[10px] font-medium uppercase border-b border-gray-100">
                                <th className="px-2 py-2 text-left">Período</th>
                                <th className="px-4 py-3 text-right">Entradas</th>
                                <th className="px-4 py-3 text-right">Saídas</th>
                                <th className="px-4 py-3 text-right">Saldo</th>
                            </tr></thead>
                            <tbody>
                                {cashFlowData.map(c => (
                                    <tr key={c.days} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-700">{c.period}</td>
                                        <td className="px-4 py-3 text-right text-green-600 font-mono">{formatCurrency(c.inflow)}</td>
                                        <td className="px-4 py-3 text-right text-red-500 font-mono">{formatCurrency(c.outflow)}</td>
                                        <td className={`px-4 py-3 text-right font-medium font-mono ${c.net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(c.net)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============ DRE ============ */}
            {activeTab === 'dre' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-gray-900">DRE</h3>
                            <div className="flex gap-2">
                                <MarginBadge label="MB" value={dreData.margemBruta} />
                                <MarginBadge label="ML" value={dreData.margemLiquida} />
                            </div>
                        </div>
                        <button onClick={exportDRE} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800">
                            <span className="material-icons-outlined text-sm">download</span> CSV
                        </button>
                    </div>

                    <div className="bg-white rounded-md border border-gray-200 p-5">
                        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Demonstrativo — {dreData.totalPedidos} pedidos no mês</p>
                        <DreRow label="(=) RECEITA BRUTA" value={dreData.receitaBruta} bold color="text-blue-700" />
                        <DreRow label="Produtos (Custo Fornecedor)" value={-dreData.custosProd} indent />
                        <DreRow label="Personalização" value={-dreData.custosPersonal} indent />
                        <DreRow label="Fretes" value={-dreData.custosFretes} indent />
                        <DreRow label="Layout" value={-dreData.custosLayout} indent />
                        <DreRow label="Extras" value={-dreData.custosExtras} indent />
                        <DreRow label="BV (Bonificação)" value={-dreData.bvCosts} indent />
                        <DreRow label="(=) LUCRO BRUTO" value={dreData.lucroBruto} bold color={dreData.lucroBruto >= 0 ? 'text-green-700' : 'text-red-700'} />
                        <div className="mt-2" />
                        <DreRow label="Fixas (Aluguel, etc)" value={-dreData.despFixas} indent />
                        <DreRow label="Pessoal / Salários" value={-dreData.despPessoal} indent />
                        <DreRow label="Impostos" value={-dreData.despImpostos} indent />
                        <DreRow label="Variáveis" value={-dreData.despVariaveis} indent />
                        <DreRow label="Outras" value={-dreData.despOutras} indent />
                        <DreRow label="(=) DESPESAS OPERACIONAIS" value={-dreData.totalDesp} bold />
                        <div className="mt-3 pt-3 border-t-2 border-gray-300">
                            <DreRow label="(=) LUCRO LÍQUIDO" value={dreData.lucroLiquido} bold color={dreData.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancialDashboardPage;
