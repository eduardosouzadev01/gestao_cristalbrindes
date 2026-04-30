'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { fixClientName } from '@/utils/textUtils';

interface BudgetTableProps {
    budgets: any[];
    loading: boolean;
}

export default function BudgetTable({ budgets, loading }: BudgetTableProps) {
    const router = useRouter();

    if (loading) {
        return (
            <div className="bg-white rounded-md border border-[#E3E3E4] p-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Carregando Orçamentos...</p>
            </div>
        );
    }

    if (budgets.length === 0) {
        return (
            <div className="bg-white rounded-md border border-[#E3E3E4] p-20 flex flex-col items-center justify-center text-center gap-4">
                <div className="w-16 h-16 rounded-md bg-slate-50 flex items-center justify-center text-slate-300">
                    <span className="material-icons-outlined text-4xl">inventory</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-900">Nenhum orçamento encontrado</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">Tente ajustar seus filtros ou crie um novo orçamento.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-[#E3E3E4]">
                        <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Orçamento</th>
                        <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Cliente</th>
                        <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight">Vendedor</th>
                        <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight text-center">Status</th>
                        <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight text-right">Total</th>
                        <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] bg-white uppercase tracking-tight text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {budgets.map((b, index) => (
                        <tr 
                            key={b.id} 
                            className={`transition-colors cursor-pointer group ${
                                index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'
                            } hover:bg-[#F0F7FF]`}
                            onClick={() => router.push(`/orcamentos/${b.id}`)}
                            onAuxClick={(e) => {
                                if (e.button === 1) {
                                    window.open(`/orcamentos/${b.id}`, '_blank');
                                }
                            }}
                        >
                            <td className="px-6 py-4">
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-900 group-hover:text-[#0F6CBD] transition-colors">#{b.budget_number}</span>
                                    <span className="text-[10px] font-medium text-slate-400 mt-0.5">{new Date(b.created_at).toLocaleDateString()}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="text-xs font-medium text-slate-700">{fixClientName(b.partners?.name || '---')}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">{b.salesperson}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`text-[9px] font-medium px-2.5 py-1 rounded-md uppercase tracking-widest ${
                                    b.status === 'EM ABERTO' ? 'bg-blue-100 text-blue-700' :
                                    b.status === 'PROPOSTA ENVIADA' ? 'bg-amber-100 text-amber-700' :
                                    b.status === 'PROPOSTA ACEITA' ? 'bg-emerald-100 text-emerald-700' :
                                    b.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' :
                                    b.status === 'PERDIDO' ? 'bg-rose-100 text-rose-700' :
                                    'bg-slate-100 text-slate-700'
                                }`}>
                                    {b.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className="text-xs font-medium text-slate-900 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
                                    {b.total_amount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex justify-center gap-2">
                                    <button className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-400 rounded-md group-hover:bg-[#0F6CBD] group-hover:text-white transition-all">
                                        <span className="material-icons-outlined text-sm">visibility</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
