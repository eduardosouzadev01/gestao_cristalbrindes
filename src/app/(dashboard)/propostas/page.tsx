'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/formatCurrency';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { fixClientName } from '@/utils/textUtils';

export default function ProposalListPage() {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();
    const { appUser } = useAuth();

    useEffect(() => {
        if (appUser) loadProposals();
    }, [appUser]);

    const loadProposals = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('proposals')
                .select('*, client:partners!client_id(name)')
                .order('created_at', { ascending: false });

            // If user is a salesperson, they only see their own proposals
            if (appUser?.salesperson) {
                query = query.eq('salesperson', appUser.salesperson);
            }

            const { data, error } = await query;
            if (error) throw error;
            setProposals(data || []);
        } catch (error: any) {
            toast.error('Erro ao carregar propostas: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteProposal = async (proposal: any) => {
        if (!appUser?.permissions?.fullAccess && !appUser?.permissions?.canDelete) {
            toast.error('Você não tem permissão para excluir propostas.');
            return;
        }

        if (!window.confirm(`Excluir proposta #${proposal.proposal_number} permanentemente?`)) return;

        try {
            setLoading(true);
            const { error } = await supabase.from('proposals').delete().eq('id', proposal.id);
            if (error) throw error;
            toast.success('Proposta excluída com sucesso.');
            loadProposals();
        } catch (e: any) {
            toast.error('Erro ao excluir proposta: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredProposals = proposals.filter(p =>
        p.proposal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 bg-[#F5F5F8] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">description</span>
                        Propostas Comerciais
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Acompanhamento de propostas enviadas aos clientes</p>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-md border border-[#E3E3E4] shadow-none overflow-hidden flex flex-col">
                {/* Search & Filter Bar */}
                <div className="p-6 border-b border-[#E3E3E4] bg-[#FAFBFC] flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full max-w-md">
                        <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="BUSCAR PROPOSTA OU CLIENTE..."
                            className="w-full h-12 !pl-12 pr-6 bg-white border border-[#D1D1D1] rounded-md text-sm font-medium text-[#111827] focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all placeholder:text-slate-400 uppercase tracking-tight"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={loadProposals}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-[#D1D1D1] text-[#111827] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#F5F5F5] transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-sm">refresh</span>
                        Atualizar Lista
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#FAFBFC] border-b border-[#E3E3E4]">
                                <th className="px-8 py-5 text-left text-[10px] font-medium text-slate-400 uppercase tracking-widest">Proposta</th>
                                <th className="px-8 py-5 text-left text-[10px] font-medium text-slate-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-8 py-5 text-center text-[10px] font-medium text-slate-400 uppercase tracking-widest">Data</th>
                                <th className="px-8 py-5 text-center text-[10px] font-medium text-slate-400 uppercase tracking-widest">Vendedor</th>
                                <th className="px-8 py-5 text-right text-[10px] font-medium text-slate-400 uppercase tracking-widest">Valor Total</th>
                                <th className="px-8 py-5 text-right text-[10px] font-medium text-slate-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3E3E4]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Carregando Propostas...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProposals.length > 0 ? (
                                filteredProposals.map((item, idx) => (
                                    <tr 
                                        key={item.id} 
                                        className={`hover:bg-[#F9FAFB] transition-colors cursor-pointer group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}`}
                                        onClick={() => router.push(`/propostas/${item.id}`)}
                                        onAuxClick={(e) => {
                                            if (e.button === 1) window.open(`/propostas/${item.id}`, '_blank');
                                        }}
                                    >
                                        <td className="px-8 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1.5 bg-[#EBF3FC] text-[#0F6CBD] text-xs font-medium rounded-md uppercase">#{item.proposal_number}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <p className="text-sm font-medium text-[#111827] uppercase tracking-tight line-clamp-1">{fixClientName(item.client?.name || 'Vários')}</p>
                                        </td>
                                        <td className="px-8 py-4 text-center whitespace-nowrap">
                                            <span className="text-[11px] font-medium text-slate-500 uppercase">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                                        </td>
                                        <td className="px-8 py-4 text-center whitespace-nowrap">
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-md uppercase tracking-wider">{item.salesperson}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right whitespace-nowrap">
                                            <span className="text-sm font-medium text-[#111827]">{formatCurrency(item.total_amount)}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    href={`/propostas/${item.id}`}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#0F6CBD] hover:bg-[#EBF3FC] rounded-md transition-all"
                                                >
                                                    <span className="material-icons-outlined text-xl">visibility</span>
                                                </Link>
                                                {(appUser?.permissions?.fullAccess || appUser?.permissions?.canDelete) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteProposal(item); }}
                                                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                                    >
                                                        <span className="material-icons-outlined text-xl">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <span className="material-icons-outlined text-slate-200 text-6xl mb-4">description</span>
                                        <p className="text-[12px] font-medium text-slate-400 uppercase tracking-widest">Nenhuma proposta encontrada</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
