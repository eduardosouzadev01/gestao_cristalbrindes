'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { ProposalView } from '@/components/proposals/ProposalView';
import { generateBudgetExcel } from '@/utils/excelExport';
import { calculateItemTotal } from '@/utils/formulas';
import { fixClientName } from '@/utils/textUtils';
import { ISSUER_INFO } from '@/components/filters/IssuerSelect';

const SENDER_ACCOUNTS: Record<string, { pass: string; name: string }> = {
    'vendas01@cristalbrindes.com.br': { pass: 'CristalV01*01', name: 'Vendas 01' },
    'vendas02@cristalbrindes.com.br': { pass: 'CristalV02*02', name: 'Vendas 02' },
    'vendas03@cristalbrindes.com.br': { pass: 'CristalV03*03', name: 'Vendas 03' },
    'vendas04@cristalbrindes.com.br': { pass: 'CristalV04*04', name: 'Vendas 04' }
};

export default function InternalProposalDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { appUser } = useAuth();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailForm, setEmailForm] = useState({ to: '', cc: '', senderId: 'vendas01@cristalbrindes.com.br' });
    const [updateClientEmail, setUpdateClientEmail] = useState(false);

    useEffect(() => {
        if (id) loadProposal();
    }, [id]);

    const loadProposal = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('proposals')
                .select('*, client:partners!client_id(*), budget:budgets!budget_id(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setProposal(data);
        } catch (error: any) {
            toast.error('Erro ao carregar proposta: ' + error.message);
            router.push('/propostas');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        if (!proposal || !proposal.items) {
            toast.error('Não foi possível carregar os itens da proposta.');
            return;
        }
        
        try {
            const excelItems = proposal.items.map((bi: any) => ({
                productName: bi.product_name || bi.productName || '',
                productCode: bi.product_code || bi.productCode || '',
                productColor: bi.product_color || bi.productColor || '',
                quantity: bi.quantity || 0,
                priceUnit: bi.unit_price || bi.priceUnit || 0,
                custoPersonalizacao: bi.customization_cost || bi.custoPersonalizacao || 0,
                layoutCost: bi.layout_cost || bi.layoutCost || 0,
                transpFornecedor: bi.supplier_transport_cost || bi.transpFornecedor || 0,
                transpCliente: bi.client_transport_cost || bi.transpCliente || 0,
                despesaExtra: bi.extra_expense || bi.despesaExtra || 0,
                fator: bi.calculation_factor || bi.fator || 1.35,
                mockNF: bi.tax_pct || bi.mockNF || 0,
                mockMargin: bi.margin_pct || bi.mockMargin || 0,
                mockPayment: bi.payment_tax_pct || bi.mockPayment || 0,
                bvPct: bi.bv_pct || bi.bvPct || 0,
                extraPct: bi.extra_pct || bi.extraPct || 0,
                totalVenda: bi.totalVenda || bi.total_item_value || 0,
            }));

            generateBudgetExcel({
                proposalNumber: proposal.proposal_number,
                budgetNumber: proposal.proposal_number || '', // Uses proposal number as fallback
                date: new Date(proposal.created_at).toLocaleDateString('pt-BR'),
                salesperson: proposal.salesperson || '',
                issuer: proposal.issuer || 'CRISTAL',
                client: {
                    name: fixClientName(proposal.client?.name || ''),
                    doc: proposal.client?.doc || '',
                    email: proposal.client?.email || '',
                    phone: proposal.client?.phone || '',
                    contact_name: proposal.client?.contact_name || '',
                },
                validity: proposal.validity || '15 dias',
                shipping: proposal.shipping || 'Cliente retira',
                deliveryDeadline: proposal.delivery_deadline || '15 / 20 dias úteis',
                paymentMethod: proposal.payment_method || 'À vista ou parcelado',
                observation: proposal.observation || '',
                items: excelItems,
            });

            toast.success('Planilha exportada com sucesso!');
        } catch (err: any) {
            toast.error('Erro ao exportar planilha: ' + err.message);
        }
    };

    const handleOpenEmailModal = () => {
        if (!proposal) return;
        setEmailForm({
            to: proposal.client?.email || '',
            cc: '',
            senderId: 'vendas01@cristalbrindes.com.br'
        });
        setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
        if (!proposal) return;
        setIsSendingEmail(true);
        try {
            // Updated to use the Edge Function
            const { data, error } = await supabase.functions.invoke('send-proposal-email', {
                body: {
                    proposalId: proposal.id,
                    to: emailForm.to,
                    cc: emailForm.cc,
                    senderId: emailForm.senderId,
                    smtpPass: SENDER_ACCOUNTS[emailForm.senderId]?.pass
                }
            });

            if (error) throw error;
            toast.success('E-mail enviado!');
            setShowEmailModal(false);
            loadProposal();
        } catch (err: any) {
            toast.error('Erro ao enviar e-mail: ' + err.message);
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#F5F5F8]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 font-jakarta">Buscando Proposta...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F5F5F8] flex flex-col items-center py-10 px-6 print:bg-white print:p-0">
            {/* Internal Toolbar */}
            <div className="max-w-[850px] w-full mb-10 flex flex-col sm:flex-row justify-between items-center gap-6 print:hidden">
                <button onClick={() => router.back()} className="flex items-center gap-2 group text-slate-400 hover:text-[#0F6CBD] transition-all font-medium text-[11px] uppercase tracking-widest">
                    <span className="material-icons-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span> 
                    Voltar à Lista
                </button>
                
                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={handleOpenEmailModal} className="flex items-center gap-2 px-6 py-3 bg-white border border-[#D1D1D1] rounded-md text-[10px] font-medium uppercase tracking-widest hover:border-[#0F6CBD] hover:text-[#0F6CBD] hover:bg-[#EBF3FC]/50 transition-all active:scale-95 shadow-none">
                        <span className="material-icons-outlined text-sm">email</span> Enviar por E-mail
                    </button>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-6 py-3 bg-white border border-[#D1D1D1] rounded-md text-[10px] font-medium uppercase tracking-widest hover:border-[#10B981] hover:text-[#10B981] hover:bg-[#F0FDF4] transition-all active:scale-95 shadow-none">
                        <span className="material-icons-outlined text-sm">table_chart</span> Excel Base
                    </button>
                    <button onClick={handleDownloadPDF} className="flex items-center gap-3 px-8 py-3 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all active:scale-95 shadow-none shadow-none-[#0F6CBD]/20">
                        <span className="material-icons-outlined text-sm">picture_as_pdf</span> Imprimir / PDF
                    </button>
                </div>
            </div>

            {/* View Component */}
            <ProposalView proposal={proposal} />

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-md shadow-none w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-[#E3E3E4]">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-[#FAFBFC]">
                            <div>
                                <h2 className="text-xl font-medium text-slate-900 flex items-center gap-3 uppercase tracking-tight font-jakarta">
                                    <div className="w-10 h-10 bg-[#EBF3FC] rounded-md flex items-center justify-center">
                                        <span className="material-icons-outlined text-[#0F6CBD]">send</span>
                                    </div>
                                    Enviar Proposta
                                </h2>
                            </div>
                            <button onClick={() => !isSendingEmail && setShowEmailModal(false)} className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Remetente</label>
                                <select
                                    value={emailForm.senderId}
                                    onChange={e => setEmailForm({...emailForm, senderId: e.target.value})}
                                    className="w-full h-12 px-4 border border-[#D1D1D1] rounded-md font-medium text-xs text-slate-600 bg-slate-50 focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] outline-none transition-all uppercase"
                                >
                                    {Object.entries(SENDER_ACCOUNTS).map(([email, info]) => (
                                        <option key={email} value={email}>{info.name} — {email}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">E-mail do Cliente</label>
                                <input 
                                    type="email"
                                    value={emailForm.to}
                                    onChange={e => setEmailForm({...emailForm, to: e.target.value})}
                                    className="w-full h-12 px-4 border border-[#D1D1D1] rounded-md focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] outline-none font-medium text-sm uppercase tracking-tight transition-all"
                                    placeholder="CLIENTE@EMPRESA.COM"
                                    disabled={isSendingEmail}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Cópia (CC) <span className="opacity-50">Opcional</span></label>
                                <input 
                                    type="email"
                                    value={emailForm.cc}
                                    onChange={e => setEmailForm({...emailForm, cc: e.target.value})}
                                    className="w-full h-12 px-4 border border-[#D1D1D1] rounded-md focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] outline-none font-medium text-sm uppercase tracking-tight transition-all"
                                    placeholder="VENDEDOR@CRISTALBRINDES.COM.BR"
                                    disabled={isSendingEmail}
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-[#FAFBFC] border-t border-slate-100 flex justify-end gap-4">
                            <button 
                                onClick={() => setShowEmailModal(false)}
                                disabled={isSendingEmail}
                                className="px-8 py-3 font-medium text-[11px] uppercase tracking-widest text-slate-500 bg-white border border-[#D1D1D1] rounded-md hover:bg-slate-100 transition-all font-jakarta"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSendEmail}
                                disabled={isSendingEmail || !emailForm.to}
                                className="px-10 py-3 font-medium text-[11px] uppercase tracking-widest text-white bg-[#0F6CBD] rounded-md shadow-none shadow-none-[#0F6CBD]/20 hover:bg-[#115EA3] flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 font-jakarta"
                            >
                                {isSendingEmail ? (
                                    <><span className="material-icons-outlined animate-spin text-sm">sync</span> Enviando...</>
                                ) : (
                                    <><span className="material-icons-outlined text-sm">send</span> Enviar Proposta</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
