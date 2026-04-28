'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ReceivableItem {
    id: string;
    orderId: string;
    orderNumber: string;
    clientName: string;
    description: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    paidDate?: string;
    issuer?: string;
}

export default function ReceivablesPage() {
    const router = useRouter();
    const [receivables, setReceivables] = useState<ReceivableItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'paid' | 'overdue'>('all');
    const [issuerFilter, setIssuerFilter] = useState('TODOS');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchReceivables();
    }, []);

    const fetchReceivables = async () => {
        try {
            setLoading(true);
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    id, order_number, status, order_date, payment_due_date, total_amount,
                    entry_amount, entry_date, entry_confirmed,
                    remaining_amount, remaining_date, remaining_confirmed,
                    issuer, partners (name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const items: ReceivableItem[] = [];
            orders?.forEach((order: any) => {
                if (order.entry_amount > 0) {
                    items.push({
                        id: `${order.id}-entry`,
                        orderId: order.id,
                        orderNumber: order.order_number,
                        clientName: order.partners?.name || 'Cliente Removido',
                        description: '1ª PARCELA',
                        amount: order.entry_amount,
                        dueDate: order.entry_date || order.order_date,
                        isPaid: order.entry_confirmed,
                        issuer: order.issuer
                    });
                }
                if (order.remaining_amount > 0) {
                    items.push({
                        id: `${order.id}-remaining`,
                        orderId: order.id,
                        orderNumber: order.order_number,
                        clientName: order.partners?.name || 'Cliente Removido',
                        description: '2ª PARCELA',
                        amount: order.remaining_amount,
                        dueDate: order.remaining_date || order.payment_due_date || order.order_date,
                        isPaid: order.remaining_confirmed,
                        issuer: order.issuer
                    });
                }
            });

            setReceivables(items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
        } catch (error: any) {
            toast.error('Erro ao carregar recebíveis.');
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = async (item: ReceivableItem) => {
        if (!confirm(`Confirmar recebimento de ${item.description} do pedido #${item.orderNumber}?`)) return;
        try {
            const field = item.description === '1ª PARCELA' ? 'entry_confirmed' : 'remaining_confirmed';
            const { error } = await supabase.from('orders').update({ [field]: true }).eq('id', item.orderId);
            if (error) throw error;
            toast.success('Recebimento confirmado!');
            fetchReceivables();
        } catch (error: any) {
            toast.error('Erro ao confirmar: ' + error.message);
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const filteredItems = receivables.filter(item => {
        const isOverdue = !item.isPaid && item.dueDate < today;
        const isOpen = !item.isPaid && item.dueDate >= today;

        if (filter === 'paid' && !item.isPaid) return false;
        if (filter === 'open' && !isOpen) return false;
        if (filter === 'overdue' && !isOverdue) return false;
        if (issuerFilter !== 'TODOS' && item.issuer !== issuerFilter) return false;
        if (searchTerm && !(`${item.orderNumber} ${item.clientName}`).toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const getForecast = (days: number) => {
        const target = new Date();
        target.setDate(target.getDate() + days);
        const targetStr = target.toISOString().split('T')[0];
        return receivables
            .filter(r => !r.isPaid && r.dueDate >= today && r.dueDate <= targetStr && (issuerFilter === 'TODOS' || r.issuer === issuerFilter))
            .reduce((acc, r) => acc + r.amount, 0);
    };

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">account_balance_wallet</span>
                        Contas a Receber
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Monitoramento financeiro e fluxo de caixa</p>
                </div>
                <div className="flex gap-2">
                    <button className="h-11 px-6 bg-white border border-[#E3E3E4] text-[#424242] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95">
                        <span className="material-icons-outlined text-[18px]">download</span>
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Previsão 7 Dias', value: getForecast(7), border: 'border-l-[#0F6CBD]' },
                    { label: 'Previsão 15 Dias', value: getForecast(15), border: 'border-l-[#6366F1]' },
                    { label: 'Previsão 30 Dias', value: getForecast(30), border: 'border-l-[#8B5CF6]' },
                    { label: 'Total Filtrado', value: filteredItems.reduce((acc, i) => acc + i.amount, 0), border: 'border-l-[#10B981]' },
                ].map((stat, i) => (
                    <div key={i} className={`bg-white p-5 rounded-md border border-[#E3E3E4] border-l-4 ${stat.border} shadow-none transition-all hover:shadow-none cursor-default`}>
                        <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">{stat.label}</p>
                        <p className="text-xl font-medium text-[#111827] mt-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stat.value)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-md border border-[#E3E3E4]">
                    <div className="relative min-w-[300px] flex-1 group">
                        <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Buscar pedido ou cliente..."
                            className="w-full h-11 !pl-12 pr-4 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-[#F9FAFB] p-1.5 rounded-md border border-[#E3E3E4]">
                        {['TODOS', 'CRISTAL', 'ESPIRITO', 'NATUREZA'].map(emp => (
                            <button
                                key={emp}
                                onClick={() => setIssuerFilter(emp)}
                                className={`px-4 py-1.5 rounded-md text-[9px] font-medium uppercase transition-all ${issuerFilter === emp ? 'bg-white text-[#0F6CBD] shadow-none ring-1 ring-[#0F6CBD]/10' : 'text-[#6B7280] hover:text-[#111827]'}`}
                            >
                                {emp === 'ESPIRITO' ? 'ESPÍRITO' : emp}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2 border-b border-[#E3E3E4] pb-2 px-2">
                    {[
                        { id: 'all', label: 'Todos', color: 'border-gray-200' },
                        { id: 'open', label: 'A Vencer', color: 'border-yellow-500' },
                        { id: 'paid', label: 'Pagos', color: 'border-green-500' },
                        { id: 'overdue', label: 'Vencidos', color: 'border-red-500' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as any)}
                            className={`px-6 py-2 text-[10px] font-medium uppercase tracking-widest transition-all border-b-2 ${filter === tab.id ? `${tab.color} text-[#111827]` : 'border-transparent text-[#6B7280]'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Vencimento</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Pedido / Cliente</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Descrição</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Valor</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-center">Status</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E4]">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B7280] font-medium uppercase text-xs animate-pulse">Carregando dados...</td></tr>
                        ) : filteredItems.map((item, idx) => {
                            const overdue = !item.isPaid && item.dueDate < today;
                            return (
                                <tr key={item.id} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className={`text-[13px] font-medium ${overdue ? 'text-red-600' : 'text-[#111827]'}`}>
                                                {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                            </span>
                                            {overdue && <span className="text-[8px] font-medium text-red-600 uppercase animate-pulse">Vencido</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-medium text-[#0F6CBD]">#{item.orderNumber}</span>
                                                {item.issuer && (
                                                    <span className="text-[8px] font-medium text-[#6B7280] bg-gray-100 px-1.5 py-0.5 rounded-md uppercase">{item.issuer.charAt(0)}</span>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-medium text-[#6B7280] uppercase">{item.clientName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-medium uppercase border ${item.description === '1ª PARCELA' ? 'bg-[#F5F3FF] text-[#7C3AED] border-[#EDE9FE]' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {item.description}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-[12px] font-medium text-[#111827]">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-medium uppercase border ${
                                            item.isPaid ? 'bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]' :
                                            overdue ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]' :
                                            'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7]'
                                        }`}>
                                            {item.isPaid ? 'Pago' : overdue ? 'Vencido' : 'Pendente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {!item.isPaid && (
                                            <button
                                                onClick={() => confirmPayment(item)}
                                                className="h-8 px-4 bg-white border border-[#E3E3E4] text-[#0F6CBD] rounded-md text-[9px] font-medium uppercase tracking-widest hover:border-[#0F6CBD] transition-all"
                                            >
                                                Confirmar
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
}
