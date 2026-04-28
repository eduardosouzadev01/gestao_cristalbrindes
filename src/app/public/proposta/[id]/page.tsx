'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ProposalView } from '@/components/proposals/ProposalView';
import { ISSUER_INFO } from '@/components/filters/IssuerSelect';

export default function PublicProposalDetailPage() {
    const { id } = useParams();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadProposal();
    }, [id]);

    const loadProposal = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('proposals')
                .select('*, client:partners(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setProposal(data);
        } catch (error: any) {
            console.error('Erro ao carregar proposta:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#F5F5F8]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 font-jakarta">Carregando Proposta Comercial...</p>
            </div>
        </div>
    );

    if (!proposal) return (
        <div className="min-h-screen bg-[#F5F5F8] flex flex-col items-center justify-center p-8 text-center">
            <span className="material-icons-outlined text-slate-200 text-8xl mb-6">error_outline</span>
            <h1 className="text-2xl font-medium text-slate-900 uppercase tracking-tight mb-2">Proposta não encontrada</h1>
            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest">O link pode ter expirado ou a proposta foi removida.</p>
        </div>
    );

    const info = ISSUER_INFO[proposal.issuer || 'CRISTAL'] || ISSUER_INFO['CRISTAL'];

    return (
        <div className="min-h-screen bg-[#F5F5F8] flex flex-col items-center py-10 px-6 print:bg-white print:p-0">
            {/* Public Header */}
            <div className="max-w-[850px] w-full mb-10 flex flex-col sm:flex-row justify-between items-center gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <img src={info.logo} alt="Logo" className="h-10 w-auto object-contain" />
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div>
                        <p className="text-[11px] font-medium text-slate-900 uppercase tracking-tight">Proposta Comercial</p>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Digital Verificada</p>
                    </div>
                </div>
                
                <button 
                    onClick={handlePrint} 
                    className="px-10 py-3.5 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all active:scale-95 shadow-none shadow-none-[#0F6CBD]/20 flex items-center gap-3"
                >
                    <span className="material-icons-outlined text-sm">picture_as_pdf</span>
                    Salvar em PDF / Imprimir
                </button>
            </div>

            {/* View Component */}
            <ProposalView proposal={proposal} />

            {/* Public Footer Disclaimer */}
            <div className="max-w-[850px] w-full text-center pb-20 print:hidden px-10">
                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                    Esta é uma proposta comercial digital oficial da equipe {info.name}. <br/>
                    A veracidade deste documento pode ser confirmada em nossos canais de atendimento oficiais.
                </p>
            </div>
        </div>
    );
}
