'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Partner } from '@/types/partner';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

interface PartnerListProps {
    type: 'CLIENTE' | 'FORNECEDOR';
    title: string;
    icon: string;
}

export default function PartnerList({ type, title, icon }: PartnerListProps) {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { hasPermission } = useAuth();

    useEffect(() => {
        fetchPartners();
    }, [type]);

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .eq('type', type)
                .order('name');

            if (error) throw error;
            setPartners(data || []);
        } catch (error: any) {
            toast.error('Erro ao buscar parceiros: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!hasPermission('canDeleteBudgets')) { // Assuming similar permission check for deletion
            toast.error('Você não tem permissão para excluir.');
            return;
        }

        if (!confirm('Deseja realmente excluir este cadastro?')) return;

        try {
            const { error } = await supabase.from('partners').delete().eq('id', id);
            if (error) throw error;
            toast.success('Excluído com sucesso!');
            fetchPartners();
        } catch (error: any) {
            toast.error('Erro ao excluir: ' + error.message);
        }
    };

    const filteredPartners = partners.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.doc?.includes(searchTerm)
    );

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">{icon}</span>
                        {title}
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Gestão centralizada de {title.toLowerCase()}</p>
                </div>
                <Link
                    href={`/cadastros/novo?type=${type}`}
                    className="h-11 px-6 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all flex items-center gap-2 active:scale-95 shadow-none shadow-none-[#0F6CBD]/20"
                >
                    <span className="material-icons-outlined text-[18px]">add</span>
                    Novo {type === 'CLIENTE' ? 'Cliente' : 'Fornecedor'}
                </Link>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-md border border-[#E3E3E4]">
                <div className="relative flex-1 max-w-md group">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                    <input
                        type="text"
                        placeholder={`Buscar ${title.toLowerCase()}...`}
                        className="w-full h-11 !pl-12 pr-4 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] outline-none hover:border-gray-300 focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/10 transition-all font-jakarta placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchPartners}
                    className="h-11 w-11 flex items-center justify-center bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md hover:bg-gray-50 transition-all"
                    title="Atualizar"
                >
                    <span className="material-icons-outlined">refresh</span>
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Identificação</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">CPF/CNPJ</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Contato</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Email</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Vendedor</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3E3E4]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#6B7280] font-medium uppercase text-xs animate-pulse tracking-widest">
                                        Carregando lista...
                                    </td>
                                </tr>
                            ) : filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-[#6B7280] font-medium uppercase text-xs tracking-widest">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : filteredPartners.map((p, idx) => (
                                <tr key={p.id} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-medium text-[#111827] uppercase group-hover:text-[#0F6CBD] transition-colors line-clamp-1">{p.name || p.company_name}</span>
                                            {p.name && p.company_name && (
                                                <span className="text-[10px] font-medium text-[#6B7280] uppercase truncate">{p.company_name}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-medium text-[#6B7280] whitespace-nowrap">{p.doc || '---'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-medium text-[#4B5563] uppercase">{p.contact_name || '---'}</span>
                                            <span className="text-[10px] font-medium text-[#6B7280]">{p.phone || '---'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-medium text-[#6B7280]">{p.email || '---'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-blue-50 text-[#0F6CBD] text-[9px] font-medium rounded-md uppercase tracking-wider">
                                            {p.salesperson || 'Não Atribuído'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/cadastros/editar/${p.id}`}
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md hover:border-[#0F6CBD] hover:text-[#0F6CBD] transition-all shadow-none active:scale-90"
                                                title="Editar"
                                            >
                                                <span className="material-icons-outlined text-lg">edit</span>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md hover:border-red-500 hover:text-red-500 transition-all shadow-none active:scale-90"
                                                title="Excluir"
                                            >
                                                <span className="material-icons-outlined text-lg">delete_outline</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
