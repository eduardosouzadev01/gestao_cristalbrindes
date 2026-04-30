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

import { formatCurrency } from '@/utils/formatCurrency';

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
            
            // Task 1: Set document title for PDF filename immediately
            if (data) {
                const clientName = fixClientName(data.client_snapshot?.name || data.client?.name || '');
                document.title = `Proposta ${data.proposal_number} - ${clientName}`;
            }
        } catch (error: any) {
            toast.error('Erro ao carregar proposta: ' + error.message);
            router.push('/propostas');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        // Ensure title is correct before printing
        if (proposal) {
            const clientName = fixClientName(proposal.client_snapshot?.name || proposal.client?.name || '');
            document.title = `Proposta ${proposal.proposal_number} - ${clientName}`;
        }
        window.print();
    };

    const handleOpenEmailModal = () => {
        if (!proposal) return;
        setEmailForm({
            to: proposal.client_snapshot?.email || proposal.client?.email || '',
            cc: '',
            senderId: 'vendas01@cristalbrindes.com.br'
        });
        setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
        if (!proposal) return;
        setIsSendingEmail(true);
        const info = ISSUER_INFO[proposal.issuer || 'CRISTAL'] || ISSUER_INFO['CRISTAL'];
        const account = SENDER_ACCOUNTS[emailForm.senderId];

        try {
            const logoSrc = 'https://agjrnmpgudrciorchpog.supabase.co/storage/v1/object/public/catalog-assets/logo-images/logo_proposta_1776133418337.png';
            const subject = `Proposta Comercial #${proposal.proposal_number} - ${info.name}`;
            const publicLink = window.location.href;
            
            const groupedItems = proposal.items?.reduce((acc: any[], item: any) => {
                const key = `${item.product_name || ''}-${item.product_description || ''}-${item.product_code || ''}-${item.product_color || ''}`;
                const existing = acc.find((g: any) => g.key === key);
                if (existing) {
                    existing.subItems.push(item);
                } else {
                    acc.push({ key, ...item, subItems: [item] });
                }
                return acc;
            }, []) || [];

            let itemsHtml = '';
            groupedItems.forEach((group: any) => {
                let subItemsHtml = '';
                group.subItems.forEach((sub: any) => {
                    subItemsHtml += `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: bold; text-transform: uppercase;">${sub.product_name} ${sub.product_color ? `(${sub.product_color})` : ''}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">${sub.quantity}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">${formatCurrency(sub.total_item_value / (sub.quantity || 1))}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #2563eb; font-weight: bold; text-align: right;">${formatCurrency(sub.total_item_value)}</td>
                        </tr>
                    `;
                });

                itemsHtml += `
                    <div class="item-card" style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                        <div class="item-header" style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: none;" class="responsive-table">
                                <tr>
                                    <td class="img-container" valign="top" style="padding-right: 24px; width: 300px; text-align: center;">
                                        ${group.product_image_url ? `<img src="${encodeURI(group.product_image_url)}" alt="Produto" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; border: 1px solid #e2e8f0; display: block; margin: 0 auto;" />` : `<div style="width: 100%; max-width: 300px; height: 300px; background: #f1f5f9; border-radius: 8px; text-align: center; line-height: 300px; color: #94a3b8; font-size: 12px; border: 1px solid #e2e8f0; margin: 0 auto;">Sem Imagem</div>`}
                                    </td>
                                    <td class="info-container" valign="top">
                                        <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; text-transform: uppercase;">${group.product_name}</h3>
                                        <div style="font-size: 14px; color: #64748b; margin-bottom: 16px; line-height: 1.6;">${group.product_description || ''}</div>
                                        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">
                                            ${group.product_code ? `REF: <span style="color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 4px;">${group.product_code}</span>` : ''}
                                            ${group.product_color ? `&nbsp;&nbsp;COR: <span style="color: #0f172a;">${group.product_color}</span>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                        <div style="overflow-x: auto;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: none; background-color: #f8fafc; min-width: 400px;">
                                <thead>
                                    <tr>
                                        <th style="padding: 12px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Especificação</th>
                                        <th style="padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Qtd</th>
                                        <th style="padding: 12px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Unitário</th>
                                        <th style="padding: 12px; text-align: right; font-size: 11px; color: #94a3b8; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${subItemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0; }
                        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
                        .responsive-table { width: 100%; border-collapse: collapse; }
                        .content-box { background-color: white; padding: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; margin-bottom: 32px; }
                        
                        @media screen and (max-width: 600px) {
                            .container { padding: 10px; }
                            .content-box { padding: 20px; }
                            .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td { display: block; width: 100%; }
                            .img-container { padding-right: 0 !important; margin-bottom: 20px !important; text-align: center !important; margin: 0 auto !important; }
                            .img-container img { max-width: 100% !important; height: auto !important; }
                            .data-split td { display: block; width: 100% !important; margin-bottom: 20px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div style="text-align: center; margin-bottom: 16px; padding: 24px 20px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                            <img src="${logoSrc}" alt="${info.name}" style="max-height: 160px; max-width: 100%; height: auto; margin-bottom: 12px; display: inline-block;">
                            <br>
                            <div style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 24px; border-radius: 100px; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">
                                Proposta: <span style="color: #2563eb;">#${proposal.proposal_number}</span> &nbsp;|&nbsp; 
                                Data: <span style="color: #2563eb;">${new Date(proposal.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>

                        <div class="content-box">
                            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 800; margin-bottom: 16px;">Olá, ${(proposal.client_snapshot?.contact_name || proposal.client?.contact_name) && (proposal.client_snapshot?.contact_name || proposal.client?.contact_name) !== 'Não informado' ? (proposal.client_snapshot?.contact_name || proposal.client?.contact_name) : (fixClientName(proposal.client_snapshot?.name || proposal.client?.name || 'Cliente'))}!</h2>
                            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                                Sua proposta comercial foi gerada. Abaixo você encontra todos os detalhes técnicos, valores e prazos:
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;" class="responsive-table data-split">
                                <tr>
                                    <td width="48%" valign="top" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                                        <div style="font-size: 11px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Aos Cuidados De</div>
                                        <div style="font-size: 13px; line-height: 1.8; color: #475569;">
                                            <strong>Empresa:</strong> <span style="color: #0f172a;">${fixClientName(proposal.client_snapshot?.name || proposal.client?.name)}</span><br>
                                            <strong>CNPJ:</strong> ${proposal.client_snapshot?.doc || proposal.client?.doc || 'Não informado'}<br>
                                            <strong>Contato:</strong> ${proposal.client_snapshot?.contact_name || proposal.client?.contact_name || 'Não informado'}<br>
                                            <strong>E-mail:</strong> <span style="color: #2563eb; word-break: break-all;">${proposal.client_snapshot?.email || proposal.client?.email || 'N/A'}</span><br>
                                            <strong>Telefone:</strong> ${proposal.client_snapshot?.phone || proposal.client?.phone || 'N/A'}
                                        </div>
                                    </td>
                                    <td width="4%"></td>
                                    <td width="48%" valign="top" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                                        <div style="font-size: 11px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Dados do Atendimento</div>
                                        <div style="font-size: 13px; line-height: 1.8; color: #475569;">
                                            <strong style="color: #0f172a;">Equipe ${info.name}</strong><br>
                                            <strong>CNPJ:</strong> ${info.cnpj}<br>
                                            <strong>Representante:</strong> <span style="color: #2563eb;">${proposal.salesperson}</span><br>
                                            <strong>E-mail:</strong> <span style="color: #2563eb;">${emailForm.senderId}</span><br>
                                            <strong>Telefone:</strong> ${info.phone}
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            ${itemsHtml}

                            <div style="background-color: #2563eb; padding: 20px 24px; border-radius: 8px; color: white; margin-bottom: 32px; border: 1px solid #1d4ed8;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border: none;">
                                    <tr>
                                        <td style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Resumo Financeiro da Proposta</td>
                                        <td style="font-size: 24px; font-weight: 800; text-align: right;">${formatCurrency(proposal.total_amount)}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin-bottom: 20px;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: bold;">Gostaria de ver melhor a proposta?</p>
                                <a href="${publicLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px;">Acessar Versão Online Interativa</a>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            console.log('Calling Edge Function: send-email');
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: emailForm.to + (emailForm.cc ? `, ${emailForm.cc}` : ''),
                    subject: subject,
                    html: html,
                    replyTo: emailForm.senderId,
                    smtpUser: emailForm.senderId,
                    smtpPass: account.pass
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success('E-mail enviado!');
            setShowEmailModal(false);
            loadProposal();
        } catch (err: any) {
            toast.error('Erro ao enviar e-mail: ' + (err.message || 'Erro desconhecido'));
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
