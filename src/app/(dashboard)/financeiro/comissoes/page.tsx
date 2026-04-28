'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatMonthYear } from '@/lib/utils';
import { toast } from 'sonner';

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

    useEffect(() => {
        fetchCommissions();
    }, [month, year]);

    const fetchCommissions = async () => {
        setLoading(true);
        try {
            const startDate = new Date(year, month - 1, 1).toISOString();
            const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

            const { data, error } = await supabase
                .from('commissions')
                .select(`
                    *,
                    orders (
                        order_number,
                        partners (name)
                    )
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCommissions(data || []);
        } catch (e: any) {
            toast.error('Erro ao buscar comissões: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const sellers = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04'];
    
    const sellerStats = useMemo(() => {
        return sellers.map(seller => {
            const total = commissions.filter(c => c.salesperson === seller).reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const pending = commissions.filter(c => c.salesperson === seller && c.status === 'PENDING').reduce((acc, curr) => acc + (curr.amount || 0), 0);
            return { name: seller, total, pending };
        });
    }, [commissions]);

    const totalCommissions = useMemo(() => commissions.reduce((acc, curr) => acc + (curr.amount || 0), 0), [commissions]);

    const filteredCommissions = useMemo(() => {
        return selectedSeller ? commissions.filter(c => c.salesperson === selectedSeller) : commissions;
    }, [commissions, selectedSeller]);

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
        try {
            const { error } = await supabase.from('commissions').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
            toast.success('Status atualizado!');
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">payments</span>
                        Gestão de Comissões
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Controle de ganhos e performance do time comercial</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-md border border-[#E3E3E4] shadow-none text-right">
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest leading-none mb-1">Total do Período</p>
                    <p className="text-2xl font-medium text-[#10B981] leading-none">{formatCurrency(totalCommissions)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-md border border-[#E3E3E4] shadow-none">
                <div className="w-48">
                    <label className="block text-[8px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Mês de Referência</label>
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-medium uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#0F6CBD]/10"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{formatMonthYear(i + 1, year).split(' DE ')[0]}</option>
                        ))}
                    </select>
                </div>
                <div className="w-32">
                    <label className="block text-[8px] font-medium text-[#6B7280] uppercase tracking-widest mb-1.5 ml-1">Ano</label>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-[11px] font-medium uppercase tracking-widest outline-none focus:ring-2 focus:ring-[#0F6CBD]/10"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>

            {/* Seller Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sellerStats.map(stat => (
                    <div
                        key={stat.name}
                        onClick={() => setSelectedSeller(selectedSeller === stat.name ? null : stat.name)}
                        className={`cursor-pointer group p-5 rounded-md border transition-all relative overflow-hidden ${selectedSeller === stat.name ? 'bg-blue-50 border-[#0F6CBD] ring-1 ring-[#0F6CBD]' : 'bg-white border-[#E3E3E4] hover:border-[#0F6CBD]'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                             <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">{stat.name}</p>
                             {selectedSeller === stat.name && <span className="material-icons-outlined text-[#0F6CBD] text-lg">filter_alt</span>}
                        </div>
                        <p className="text-xl font-medium text-[#111827]">{formatCurrency(stat.total)}</p>
                        {stat.pending > 0 && (
                            <p className="text-[9px] font-medium text-[#F59E0B] uppercase mt-1 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse"></span>
                                Pendente: {formatCurrency(stat.pending)}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Vendedor</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Referência</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Cliente</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Comissão</th>
                            <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E3E3E4]">
                        {loading ? (
                            <tr><td colSpan={5} className="text-center py-20 text-[11px] font-medium text-[#9CA3AF] uppercase">Carregando dados...</td></tr>
                        ) : filteredCommissions.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-20 text-[11px] font-medium text-[#9CA3AF] uppercase italic">Nenhuma comissão encontrada</td></tr>
                        ) : filteredCommissions.map((c, i) => (
                            <tr key={c.id} className={`hover:bg-[#F5F5F8]/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                <td className="px-6 py-4 text-[12px] font-medium text-[#111827] uppercase">{c.salesperson}</td>
                                <td className="px-6 py-4">
                                    <span className="text-[12px] font-medium text-[#0F6CBD]">#{c.orders?.order_number || '---'}</span>
                                </td>
                                <td className="px-6 py-4 text-[12px] font-medium text-[#111827] uppercase truncate max-w-[300px]">{c.orders?.partners?.name || '---'}</td>
                                <td className="px-6 py-4 text-right text-[12px] font-medium text-[#10B981]">{formatCurrency(c.amount)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => toggleStatus(c.id, c.status)}
                                        className={`h-7 px-4 rounded-md text-[9px] font-medium uppercase tracking-widest transition-all border ${c.status === 'PAID' ? 'bg-[#ECFDF5] text-[#10B981] border-[#D1FAE5]' : 'bg-[#FFFBEB] text-[#F59E0B] border-[#FEF3C7]'}`}
                                    >
                                        {c.status === 'PAID' ? 'Liquidado' : 'Pendente'}
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
