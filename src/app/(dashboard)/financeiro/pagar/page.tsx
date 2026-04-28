'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface OrderCostItem {
    id: string; orderId: string; orderNumber: string; productName: string;
    costType: string; label: string; estimatedValue: number; realValue: number;
    isPaid: boolean; quantity: number; issuer: string; dueDate?: string;
    supplierName: string; supplierId: string;
}

interface CompanyExpense {
    id: string; description: string; amount: number; due_date: string;
    paid: boolean; paid_date?: string; category: string; observation?: string;
    issuer?: string;
}

export default function PayablesPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'orders' | 'expenses' | 'suppliers'>('orders');
    const [loading, setLoading] = useState(true);
    const [orderCosts, setOrderCosts] = useState<OrderCostItem[]>([]);
    const [expenses, setExpenses] = useState<CompanyExpense[]>([]);
    
    // Filters
    const [issuerFilter, setIssuerFilter] = useState('TODOS');
    const [searchTerm, setSearchTerm] = useState('');
    const [showPaid, setShowPaid] = useState(false);
    const [showSummary, setShowSummary] = useState(true);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchOrderCosts(), fetchExpenses()]);
        } catch (e) {}
        setLoading(false);
    };

    const fetchOrderCosts = async () => {
        const { data: items, error } = await supabase.from('order_items')
            .select(`
                *, 
                orders(id, order_number, issuer, payment_due_date, status), 
                supplier:supplier_id(name), 
                customization_supplier:customization_supplier_id(name), 
                transport_supplier:transport_supplier_id(name)
            `);
        
        if (error) throw error;

        const costs: OrderCostItem[] = [];
        items?.forEach((item: any) => {
            const order = item.orders;
            if (!order || order.status === 'CANCELADO') return;

            const costTypes = [
                { key: 'unit_price', real: 'real_unit_price', paid: 'unit_price_paid', label: 'PRODUTO', multiplier: item.quantity, supplierField: 'supplier' },
                { key: 'customization_cost', real: 'real_customization_cost', paid: 'customization_paid', label: 'PERSONALIZAÇÃO', multiplier: 1, supplierField: 'customization_supplier' },
                { key: 'supplier_transport_cost', real: 'real_supplier_transport_cost', paid: 'supplier_transport_paid', label: 'FRETE', multiplier: 1, supplierField: 'transport_supplier' },
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
                        dueDate: order.payment_due_date,
                        supplierName: supplierData?.name || 'S/F', supplierId: supplierData?.id || ''
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

    const handlePayment = async (type: 'order' | 'expense', item: any) => {
        const action = item.isPaid || item.paid ? 'revert' : 'pay';
        if (!confirm(`Confirmar ${action === 'pay' ? 'PAGAMENTO' : 'ESTORNO'}?`)) return;

        try {
            if (type === 'order') {
                const paidField = [
                    { key: 'unit_price', paid: 'unit_price_paid' }, 
                    { key: 'customization_cost', paid: 'customization_paid' },
                    { key: 'supplier_transport_cost', paid: 'supplier_transport_paid' }
                ].find(c => c.key === item.costType)?.paid;
                
                if (!paidField) return;
                const { error } = await supabase.from('order_items').update({ [paidField]: action === 'pay' }).eq('id', item.id);
                if (error) throw error;
                setOrderCosts(prev => prev.map(c => c.id === item.id && c.costType === item.costType ? { ...c, isPaid: action === 'pay' } : c));
            } else {
                const { error } = await supabase.from('company_expenses').update({
                    paid: action === 'pay', paid_date: action === 'pay' ? new Date().toISOString() : null
                }).eq('id', item.id);
                if (error) throw error;
                setExpenses(prev => prev.map(e => e.id === item.id ? { ...e, paid: action === 'pay' } : e));
            }
            toast.success('Sucesso!');
        } catch (e: any) {
            toast.error('Erro: ' + e.message);
        }
    };

    const filteredCosts = useMemo(() => {
        return orderCosts.filter(c => {
            if (issuerFilter !== 'TODOS' && c.issuer !== issuerFilter) return false;
            if (!showPaid && c.isPaid) return false;
            if (searchTerm && !(`${c.orderNumber} ${c.productName} ${c.supplierName}`).toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [orderCosts, issuerFilter, showPaid, searchTerm]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            if (issuerFilter !== 'TODOS' && e.issuer !== issuerFilter) return false;
            if (!showPaid && e.paid) return false;
            if (searchTerm && !e.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            return true;
        });
    }, [expenses, issuerFilter, showPaid, searchTerm]);

    const stats = useMemo(() => {
        const totalPendingOrder = filteredCosts.reduce((acc, c) => acc + (c.isPaid ? 0 : (c.realValue || c.estimatedValue)), 0);
        const totalPendingExpenses = filteredExpenses.reduce((acc, e) => acc + (e.paid ? 0 : e.amount), 0);
        const today = new Date().toISOString().split('T')[0];
        const totalOverdue = [
            ...filteredCosts.filter(c => !c.isPaid && c.dueDate && c.dueDate < today).map(c => c.realValue || c.estimatedValue),
            ...filteredExpenses.filter(e => !e.paid && e.due_date < today).map(e => e.amount)
        ].reduce((acc, v) => acc + v, 0);

        return { totalPendingOrder, totalPendingExpenses, totalOverdue };
    }, [filteredCosts, filteredExpenses]);

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">payments</span>
                        Contas a Pagar
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Gestão de custos e despesas operacionais</p>
                </div>
                <div className="flex gap-2">
                    <button className="h-11 px-6 bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 active:scale-95">
                        <span className="material-icons-outlined text-[18px]">download</span>
                        Exportar
                    </button>
                    <button className="h-11 px-6 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] flex items-center gap-2 active:scale-95">
                        <span className="material-icons-outlined text-[18px]">add</span>
                         Despesa
                    </button>
                </div>
            </div>

            {/* Summary Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-md border border-[#E3E3E4] border-l-4 border-l-[#F43F5E] shadow-none">
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Total Vencido</p>
                    <p className="text-xl font-medium text-[#F43F5E] mt-1">{formatCurrency(stats.totalOverdue)}</p>
                </div>
                <div className="bg-white p-5 rounded-md border border-[#E3E3E4] border-l-4 border-l-[#3B82F6] shadow-none">
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Pendente (Pedidos)</p>
                    <p className="text-xl font-medium text-[#111827] mt-1">{formatCurrency(stats.totalPendingOrder)}</p>
                </div>
                <div className="bg-white p-5 rounded-md border border-[#E3E3E4] border-l-4 border-l-[#8B5CF6] shadow-none">
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">Pendente (Geral)</p>
                    <p className="text-xl font-medium text-[#111827] mt-1">{formatCurrency(stats.totalPendingExpenses)}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-md border border-[#E3E3E4]">
                <div className="flex gap-1 bg-[#F9FAFB] p-1 rounded-md border border-[#E3E3E4]">
                    {[
                        { id: 'orders', label: 'CUSTOS', icon: 'inventory_2' },
                        { id: 'expenses', label: 'DESPESAS', icon: 'business' },
                        { id: 'suppliers', label: 'FORNECEDORES', icon: 'store' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`px-4 py-2 rounded-md text-[9px] font-medium uppercase transition-all flex items-center gap-2 ${activeTab === t.id ? 'bg-white text-[#0F6CBD] shadow-none ring-1 ring-[#0F6CBD]/10' : 'text-[#6B7280] hover:text-[#111827]'}`}
                        >
                            <span className="material-icons-outlined text-[14px]">{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 flex-1 justify-end">
                    <div className="relative max-w-xs flex-1 group">
                        <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-[#0F6CBD]">search</span>
                        <input
                            placeholder="Buscar..."
                            className="w-full h-9 pl-9 pr-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[12px] font-medium text-[#111827] outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} className="w-4 h-4 rounded-md border-[#E3E3E4] text-[#0F6CBD] focus:ring-0" />
                        <span className="text-[10px] font-medium text-[#6B7280] uppercase">Exibir Pagos</span>
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                            {activeTab === 'orders' ? (
                                <>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Vencimento</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Origem / Destino</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Categoria</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Valor</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Ações</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Vencimento</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Descrição</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Emissor</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Valor</th>
                                    <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Ações</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E4]">
                        {activeTab === 'orders' && filteredCosts.map((c, i) => (
                            <tr key={`${c.id}-${c.costType}`} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                <td className="px-6 py-4">
                                    <span className="text-[12px] font-medium text-[#111827]">{formatDate(c.dueDate)}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-medium text-[#0F6CBD]">#{c.orderNumber}</span>
                                        <span className="text-[10px] font-medium text-[#6B7280] uppercase truncate max-w-[200px]">{c.supplierName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[8px] font-medium text-[#6B7280] uppercase border border-[#E3E3E4] shadow-none">{c.label}</span>
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-[12px] text-[#111827]">
                                    {formatCurrency(c.realValue || c.estimatedValue)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handlePayment('order', c)}
                                        className={`h-8 px-4 border rounded-md text-[9px] font-medium uppercase tracking-widest transition-all ${c.isPaid ? 'bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]' : 'bg-white border-[#E3E3E4] text-[#0F6CBD] hover:border-[#0F6CBD]'}`}
                                    >
                                        {c.isPaid ? 'Pago' : 'Pagar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {activeTab === 'expenses' && filteredExpenses.map((e, i) => (
                            <tr key={e.id} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                <td className="px-6 py-4 text-[12px] font-medium text-[#111827]">{formatDate(e.due_date)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-[12px] font-medium text-[#111827] uppercase">{e.description}</span>
                                        <span className="text-[10px] font-medium text-[#6B7280] uppercase">{e.category}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-[10px] font-medium text-[#6B7280] uppercase">{e.issuer}</td>
                                <td className="px-6 py-4 text-right font-medium text-[12px] text-[#111827]">{formatCurrency(e.amount)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handlePayment('expense', e)}
                                        className={`h-8 px-4 border rounded-md text-[9px] font-medium uppercase tracking-widest transition-all ${e.paid ? 'bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]' : 'bg-white border-[#E3E3E4] text-[#0F6CBD] hover:border-[#0F6CBD]'}`}
                                    >
                                        {e.paid ? 'Pago' : 'Pagar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
