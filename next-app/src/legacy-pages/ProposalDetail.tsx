import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../src/utils/formatCurrency';
import { toast } from 'sonner';
import { fixClientName } from '../src/utils/textUtils';
import { useAuth } from '../lib/auth';
import { generateBudgetExcel } from '../src/utils/excelExport';
import { calculateItemTotal } from '../src/utils/formulas';
const SENDER_ACCOUNTS: Record<string, { pass: string; name: string }> = {
    'vendas01@cristalbrindes.com.br': { pass: 'CristalV01*01', name: 'Vendas 01' },
    'vendas02@cristalbrindes.com.br': { pass: 'CristalV02*02', name: 'Vendas 02' },
    'vendas03@cristalbrindes.com.br': { pass: 'CristalV03*03', name: 'Vendas 03' },
    'vendas04@cristalbrindes.com.br': { pass: 'CristalV04*04', name: 'Vendas 04' }
};

import { ISSUER_INFO } from '../src/components/filters/IssuerSelect';

const ProposalDetail: React.FC = () => {
    const { id } = useParams();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailForm, setEmailForm] = useState({
        to: '',
        cc: '',
        senderId: 'vendas01@cristalbrindes.com.br'
    });
    const [updateClientEmail, setUpdateClientEmail] = useState(false);
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        loadProposal();
    }, [id]);

    const loadProposal = async () => {
        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*, client:partners(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setProposal(data);
        } catch (error: any) {
            toast.error('Erro ao carregar proposta: ' + error.message);
            navigate('/orcamentos');
        } finally {
            setLoading(false);
        }
    };

    const info = proposal ? (ISSUER_INFO[proposal.issuer || 'CRISTAL'] || ISSUER_INFO['CRISTAL']) : ISSUER_INFO['CRISTAL'];

    const getSalespersonEmail = () => {
        if (!proposal) return info.email;
        if (proposal.issuer && proposal.issuer !== 'CRISTAL') return info.email;
        if (!proposal.salesperson) return info.email;
        const match = proposal.salesperson.match(/(\d+)/);
        if (match) {
            const num = match[1].padStart(2, '0');
            return `vendas${num}@cristalbrindes.com.br`;
        }
        return info.email;
    };

    const handleDownloadPDF = () => {
        if (!proposal) return;
        const originalTitle = document.title;
        document.title = `Proposta ${proposal.proposal_number}`;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 500);
    };

    const handleExportExcel = async () => {
        if (!proposal) return;
        try {
            // Fetch budget data with items (contains all internal costs)
            const { data: budgetData, error: budgetError } = await supabase
                .from('budgets')
                .select('*, budget_items(*)')
                .eq('id', proposal.budget_id)
                .single();

            if (budgetError || !budgetData) {
                toast.error('Erro ao carregar dados do orçamento para exportação.');
                return;
            }

            // Map budget items to Excel format with all cost details
            const excelItems = budgetData.budget_items
                .filter((bi: any) => bi.is_approved)
                .map((bi: any) => {
                    const fator = bi.calculation_factor || 1.35;
                    const totalPct = Math.round((fator - 1) * 100);

                    // Reconstruct NF, Margin, Payment from factor
                    let mockNF = 14;
                    let mockMargin = 15;
                    let mockPayment = 0;
                    const standardMargins = [10, 15, 20];
                    const paymentOptions = [0, 3, 4, 8];
                    let found = false;
                    for (const nf of [14, 0]) {
                        for (const margin of standardMargins) {
                            for (const pay of paymentOptions) {
                                if (nf + margin + pay === totalPct) {
                                    mockNF = nf;
                                    mockMargin = margin;
                                    mockPayment = pay;
                                    found = true;
                                    break;
                                }
                            }
                            if (found) break;
                        }
                        if (found) break;
                    }
                    if (!found) {
                        if (totalPct < 14) mockNF = 0;
                        mockPayment = 0;
                        mockMargin = totalPct - mockNF;
                    }

                    // Use the stored total OR recalculate
                    const totalVenda = bi.total_item_value || calculateItemTotal({
                        quantity: bi.quantity,
                        priceUnit: bi.unit_price,
                        custoPersonalizacao: bi.customization_cost || 0,
                        transpFornecedor: bi.supplier_transport_cost || 0,
                        transpCliente: bi.client_transport_cost || 0,
                        despesaExtra: bi.extra_expense || 0,
                        layoutCost: bi.layout_cost || 0,
                        fator: fator,
                        bvPct: bi.bv_pct || 0,
                        extraPct: bi.extra_pct || 0,
                    });

                    return {
                        productName: bi.product_name || '',
                        productCode: bi.product_code || '',
                        productColor: bi.product_color || '',
                        quantity: bi.quantity || 0,
                        priceUnit: bi.unit_price || 0,
                        custoPersonalizacao: bi.customization_cost || 0,
                        layoutCost: bi.layout_cost || 0,
                        transpFornecedor: bi.supplier_transport_cost || 0,
                        transpCliente: bi.client_transport_cost || 0,
                        despesaExtra: bi.extra_expense || 0,
                        fator: fator,
                        mockNF,
                        mockMargin,
                        mockPayment,
                        bvPct: bi.bv_pct || 0,
                        extraPct: bi.extra_pct || 0,
                        totalVenda,
                    };
                });

            if (excelItems.length === 0) {
                toast.error('Nenhum item aprovado encontrado para exportação.');
                return;
            }

            generateBudgetExcel({
                proposalNumber: proposal.proposal_number,
                budgetNumber: budgetData.budget_number || '',
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

            toast.success('Planilha de base de cálculo exportada!');
        } catch (err: any) {
            console.error('Excel export error:', err);
            toast.error('Erro ao exportar planilha: ' + err.message);
        }
    };

    const handleDownloadAll = () => {
        handleDownloadPDF();
        handleExportExcel();
    };

    const handleOpenEmailModal = () => {
        if (!proposal) return;
        
        let initialSender = 'vendas01@cristalbrindes.com.br';
        const salesEmail = getSalespersonEmail();
        
        // Se o e-mail do vendedor estiver nas contas permitidas, usa ele.
        // Caso contrário, mantém o padrão vendas01.
        if (Object.keys(SENDER_ACCOUNTS).includes(salesEmail)) {
            initialSender = salesEmail;
        }

        setEmailForm({
            to: proposal.client?.email || '',
            cc: '',
            senderId: initialSender
        });
        setShowEmailModal(true);
    };

    const handleSendEmail = async () => {
        if (!proposal) return;
        if (!emailForm.to) {
            toast.error('Preencha o e-mail do destinatário.');
            return;
        }

        setIsSendingEmail(true);
        const account = SENDER_ACCOUNTS[emailForm.senderId];
        
        try {
            if (updateClientEmail && proposal.client?.id) {
                await supabase.from('partners').update({ email: emailForm.to }).eq('id', proposal.client.id);
            }

            const rawLogo = info.logo.startsWith('http') ? info.logo : (window.location.origin + info.logo);
            let logoSrc = rawLogo.replace(/ /g, '%20');
            
            // Garante que a logo apareça no e-mail com uma URL pública hospedada no Supabase (não é bloqueada por e-mails)
            if (info.logo.includes('logo_proposta.png')) {
                logoSrc = 'https://agjrnmpgudrciorchpog.supabase.co/storage/v1/object/public/catalog-assets/logo-images/logo_proposta_1776133418337.png';
            }

            const subject = `Proposta Comercial #${proposal.proposal_number} - ${info.name}`;
            const publicLink = `${window.location.origin}${window.location.pathname}`;
            
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
            groupedItems.forEach((group: any, index: number) => {
                let subItemsHtml = '';
                group.subItems.forEach((sub: any) => {
                    subItemsHtml += `
                        <tr>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #334155; font-weight: bold; text-transform: uppercase;">${sub.product_name} ${sub.product_color ? `(${sub.product_color})` : ''}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">${sub.quantity}</td>
                            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">${formatCurrency(sub.unit_price)}</td>
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
                            .data-split .spacer { display: none !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <!-- Header -->
                        <div style="text-align: center; margin-bottom: 16px; padding: 24px 20px; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                            <img src="${logoSrc}" alt="${info.name}" style="max-height: 160px; max-width: 100%; height: auto; margin-bottom: 12px; display: inline-block;">
                            <br>
                            <div style="display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 24px; border-radius: 100px; font-size: 13px; font-weight: bold; color: #64748b; text-transform: uppercase;">
                                Proposta: <span style="color: #2563eb;">#${proposal.proposal_number}</span> &nbsp;|&nbsp; 
                                Data: <span style="color: #2563eb;">${new Date(proposal.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>

                        <div class="content-box">
                            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 800; margin-bottom: 16px;">Olá, ${proposal.client?.contact_name && proposal.client?.contact_name !== 'Não informado' ? proposal.client.contact_name : (fixClientName(proposal.client?.name || 'Cliente'))}!</h2>
                            <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                                Sua proposta comercial foi gerada. Abaixo você encontra todos os detalhes técnicos, valores e prazos:
                            </p>

                            <!-- Dados do Cliente e Vendedor -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;" class="responsive-table data-split">
                                <tr>
                                    <td width="48%" valign="top" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                                        <div style="font-size: 11px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Aos Cuidados De</div>
                                        <div style="font-size: 13px; line-height: 1.8; color: #475569;">
                                            <strong>Empresa:</strong> <span style="color: #0f172a;">${fixClientName(proposal.client?.name)}</span><br>
                                            <strong>CNPJ:</strong> ${proposal.client?.doc || 'Não informado'}<br>
                                            <strong>Contato:</strong> ${proposal.client?.contact_name || 'Não informado'}<br>
                                            <strong>E-mail:</strong> <span style="color: #2563eb;">${proposal.client?.email || 'N/A'}</span><br>
                                            <strong>Telefone:</strong> ${proposal.client?.phone || 'N/A'}
                                        </div>
                                    </td>
                                    <td width="4%" class="spacer"></td>
                                    <td width="48%" valign="top" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                                        <div style="font-size: 11px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Dados do Atendimento</div>
                                        <div style="font-size: 13px; line-height: 1.8; color: #475569;">
                                            <strong style="color: #0f172a;">Equipe ${info.name}</strong><br>
                                            <strong>CNPJ:</strong> ${info.cnpj}<br>
                                            <strong>Representante:</strong> <span style="color: #2563eb;">${proposal.salesperson}</span><br>
                                            <strong>E-mail:</strong> <span style="color: #2563eb;">${getSalespersonEmail()}</span><br>
                                            <strong>Telefone:</strong> ${info.phone}
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Itens -->
                            ${itemsHtml}

                            <!-- Resumo Financeiro -->
                            <div style="background-color: #2563eb; padding: 20px 24px; border-radius: 8px; color: white; display: flex; text-align: left; margin-bottom: 32px; border: 1px solid #1d4ed8;">
                                <table width="100%" cellpadding="0" cellspacing="0" style="border: none;">
                                    <tr>
                                        <td style="font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Resumo Financeiro da Proposta</td>
                                        <td style="font-size: 24px; font-weight: 800; text-align: right;">${formatCurrency(proposal.total_amount)}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Condições -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;" class="responsive-table data-split">
                                <tr>
                                    <td width="30%" valign="top" style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; text-align: center;">
                                        <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Validade</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${proposal.validity || '15 dias'}</div>
                                    </td>
                                    <td width="3.33%" class="spacer"></td>
                                    <td width="30%" valign="top" style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; text-align: center;">
                                        <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Frete</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${proposal.shipping || 'Cliente retira'}</div>
                                    </td>
                                    <td width="3.33%" class="spacer"></td>
                                    <td width="33.33%" valign="top" style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; text-align: center;">
                                        <div style="font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Entrega</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #1e293b;">${proposal.delivery_deadline || '15 / 20 dias úteis'}</div>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;" class="responsive-table data-split">
                                <tr>
                                    <td width="48%" valign="top" style="padding: 20px; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 8px; background: #ffffff;">
                                        <div style="font-size: 11px; font-weight: bold; color: #3b82f6; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Pagamento</div>
                                        <div style="font-size: 14px; font-weight: bold; color: #1e293b; line-height: 1.5;">${proposal.payment_method || 'À vista ou parcelado'}</div>
                                    </td>
                                    <td width="4%" class="spacer"></td>
                                    <td width="48%" valign="top" style="padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #ffffff;">
                                        <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Observações</div>
                                        <div style="font-size: 13px; font-weight: 500; color: #64748b; white-space: pre-line; line-height: 1.5;">${proposal.observation || '---'}</div>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin-bottom: 20px;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: bold;">Gostaria de ver melhor a proposta?</p>
                                <a href="${publicLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Acessar Versão Online Interativa</a>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

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

            if (error) throw new Error(error.message);
            if (data?.error) throw new Error(data.error);

            toast.success('E-mail enviado com sucesso!');
            
            // Update sent timestamp and budget status
            const sentAt = new Date().toISOString();
            await supabase.from('proposals').update({ last_sent_at: sentAt }).eq('id', proposal.id);
            if (proposal.budget_id) {
                await supabase.from('budgets').update({ status: 'PROPOSTA_ENVIADA' }).eq('id', proposal.budget_id);
            }
            
            setProposal((prev: any) => ({ ...prev, last_sent_at: sentAt }));
            setShowEmailModal(false);
        } catch (error: any) {
            console.error('Erro ao enviar email:', error);
            toast.error('Falha ao enviar e-mail: ' + (error.message || 'Erro desconhecido.'));
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Carregando proposta comercial...</div>;
    if (!proposal) return <div className="p-8 text-center text-red-500 font-bold">Proposta não encontrada ou link expirado.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 print:bg-white print:py-0 print:px-0">
            {/* Actions Bar */}
            {isAuthenticated && (
                <div className="max-w-[800px] w-full mb-6 flex justify-between items-center print:hidden px-2">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold text-sm transition-colors">
                        <span className="material-icons-outlined text-base">arrow_back</span> Voltar
                    </button>
                    <div className="flex gap-3">
                        <button onClick={handleOpenEmailModal} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow hover:border-blue-200 transition-all font-bold text-gray-700 text-sm">
                            <span className="material-icons-outlined text-blue-500 text-base">email</span> Enviar por E-mail
                        </button>
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-lg shadow-sm hover:shadow hover:border-emerald-400 hover:bg-emerald-50 transition-all font-bold text-emerald-700 text-sm">
                            <span className="material-icons-outlined text-emerald-500 text-base">table_chart</span> Exportar Planilha
                        </button>
                        <button onClick={handleDownloadAll} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all font-bold text-sm">
                            <span className="material-icons-outlined text-base">picture_as_pdf</span> Baixar PDF / Imprimir
                        </button>
                    </div>
                </div>
            )}

            {!isAuthenticated && (
                <div className="max-w-[800px] w-full mb-6 flex justify-end print:hidden px-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all font-bold text-sm">
                        <span className="material-icons-outlined text-base">picture_as_pdf</span> Imprimir / PDF
                    </button>
                </div>
            )}

            {/* Proposal Content */}
            <div id="proposal-canvas" className="bg-white max-w-[800px] w-full shadow-xl p-10 font-sans text-gray-800 print:shadow-none print:max-w-none print:w-full print:p-0 rounded-xl overflow-hidden mb-12">
                {/* Header */}
                <div className="text-center mb-6 border-b pb-8">
                    <div className="flex justify-center mb-4">
                        <img
                            src={info.logo}
                            alt={info.name}
                            className="max-h-48 w-auto max-w-full object-contain"
                        />
                    </div>
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <div className="flex justify-center gap-8 text-sm font-black bg-gray-50 border py-3 rounded-full inline-flex px-10 border-gray-200 uppercase tracking-tight">
                            <span className="text-gray-500">Proposta: <span className="text-blue-600">#{proposal.proposal_number}</span></span>
                            <span className="text-gray-500">Data: <span className="text-blue-600">{new Date(proposal.created_at).toLocaleDateString('pt-BR')}</span></span>
                        </div>
                        {proposal.last_sent_at && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100">
                                <span className="material-icons-outlined text-xs">verified</span>
                                Enviada por e-mail em {new Date(proposal.last_sent_at).toLocaleDateString('pt-BR')} às {new Date(proposal.last_sent_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Client / Provider Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 mb-12">
                    <div className="border rounded-2xl p-6 bg-white shadow-sm hover:border-blue-100 transition-colors">
                        <h2 className="text-[10px] font-black text-blue-500 uppercase mb-4 border-b pb-2 tracking-widest">Aos cuidados de</h2>
                        <div className="space-y-2.5 text-[13px]">
                            <p><span className="font-bold text-gray-400">Empresa:</span> <span className="font-black text-gray-800">{fixClientName(proposal.client?.name)}</span></p>
                            <p><span className="font-bold text-gray-400">CNPJ:</span> <span className="font-semibold text-gray-700">{proposal.client?.doc || 'Não informado'}</span></p>
                            <p><span className="font-bold text-gray-400">Contato:</span> <span className="font-semibold text-gray-700">{proposal.client?.contact_name || 'Não informado'}</span></p>
                            <p><span className="font-bold text-gray-400">Email:</span> <span className="text-blue-600 underline font-semibold">{proposal.client?.email || 'N/A'}</span></p>
                            <p><span className="font-bold text-gray-400">Telefone:</span> <span className="font-semibold text-gray-700">{proposal.client?.phone || 'N/A'}</span></p>
                        </div>
                    </div>
                    <div className="border rounded-2xl p-6 bg-white shadow-sm hover:border-blue-100 transition-colors">
                        <h2 className="text-[10px] font-black text-blue-500 uppercase mb-4 border-b pb-2 tracking-widest">Dados do Atendimento</h2>
                        <div className="space-y-2.5 text-[13px]">
                            <p><span className="font-black text-gray-800">Equipe {info.name}</span></p>
                            <p><span className="font-bold text-gray-400">CNPJ:</span> <span className="font-semibold text-gray-700">{info.cnpj}</span></p>
                             <p><span className="font-bold text-gray-400">Representante:</span> <span className="font-black text-blue-600">{proposal.salesperson}</span></p>
                             <p><span className="font-bold text-gray-400">Email:</span> <span className="text-blue-600 underline font-semibold">{getSalespersonEmail()}</span></p>
                            <p><span className="font-bold text-gray-400">Telefone:</span> <span className="font-semibold text-gray-700">{info.phone}</span></p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-12 print:space-y-6">
                    {(() => {
                        const groupedItems = proposal.items?.reduce((acc: any[], item: any) => {
                            const key = `${item.product_name || ''}-${item.product_description || ''}-${item.product_code || ''}-${item.product_color || ''}`;
                            const existing = acc.find(g => g.key === key);
                            if (existing) {
                                existing.subItems.push(item);
                            } else {
                                acc.push({ key, ...item, subItems: [item] });
                            }
                            return acc;
                        }, []);

                        return groupedItems?.map((group: any, index: number) => (
                            <div key={index} className="space-y-4 print:space-y-2">
                                <div className="bg-blue-600 text-white px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block shadow-lg shadow-blue-200">
                                    Item {index + 1}
                                </div>

                                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                                    <div className="flex flex-col md:flex-row print:flex-row gap-8 print:gap-4 p-8 print:p-4">
                                        <div className="w-full md:w-[45%] print:w-72 aspect-square print:aspect-square bg-gray-50 flex items-center justify-center border rounded-2xl overflow-hidden shrink-0 shadow-inner">
                                            {group.product_image_url ? (
                                                <img
                                                    src={group.product_image_url}
                                                    alt={group.product_name}
                                                    className="w-full h-full object-contain p-4 print:p-2"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <span className="material-icons-outlined text-gray-200 text-7xl">image</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 border-b pb-3">{group.product_name}</h3>
                                            <div 
                                                className="text-[13px] text-gray-500 leading-relaxed rich-text-content font-medium"
                                                dangerouslySetInnerHTML={{ __html: group.product_description || 'Descrição do produto não informada.' }}
                                            />
                                            <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                {group.product_code && <span>Ref: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{group.product_code}</span></span>}
                                                {group.product_color && <span>Cor: <span className="text-gray-900">{group.product_color}</span></span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 border-t">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-[9px] uppercase font-black text-gray-400 border-b bg-gray-50">
                                                    <th className="py-3 px-6 text-left tracking-widest">Especificação</th>
                                                    <th className="py-3 px-4 text-center tracking-widest">Qtd</th>
                                                    <th className="py-3 px-4 text-center tracking-widest">Unitário</th>
                                                    <th className="py-3 px-6 text-right tracking-widest">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {group.subItems.map((sub: any, subIndex: number) => (
                                                    <tr key={subIndex} className="font-extrabold text-[12px] bg-white transition-colors hover:bg-blue-50/20">
                                                        <td className="py-4 px-6 text-left uppercase text-gray-500 font-bold">
                                                            {sub.product_name} {sub.product_color ? `(${sub.product_color})` : ''}
                                                        </td>
                                                        <td className="py-4 px-4 text-center text-gray-800">{sub.quantity}</td>
                                                        <td className="py-4 px-4 text-center text-gray-800">{formatCurrency(sub.unit_price)}</td>
                                                        <td className="py-4 px-6 text-right text-blue-600 font-black">{formatCurrency(sub.total_item_value)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ));
                    })()}
                </div>

                {/* Summary Table */}
                <div className="mt-12 overflow-hidden rounded-2xl border border-blue-600 border-opacity-20 shadow-lg shadow-blue-50">
                    <div className="bg-blue-600 px-6 py-3 flex justify-between items-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Resumo Financeiro da Proposta</span>
                        <span className="text-white font-black text-lg">{formatCurrency(proposal.total_amount)}</span>
                    </div>
                </div>

                {/* Footer Terms */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 mb-8">
                    <div className="border rounded-2xl p-4 bg-gray-50/30 hover:bg-white transition-all shadow-sm">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1.5 tracking-widest">Validade</p>
                        <p className="text-[13px] font-black text-gray-700">{proposal.validity || '15 dias'}</p>
                    </div>
                    <div className="border rounded-2xl p-4 bg-gray-50/30 hover:bg-white transition-all shadow-sm">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1.5 tracking-widest">Frete</p>
                        <p className="text-[13px] font-black text-gray-700">{proposal.shipping || 'Cliente retira'}</p>
                    </div>
                    <div className="border rounded-2xl p-4 bg-gray-50/30 hover:bg-white transition-all shadow-sm">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-1.5 tracking-widest">Entrega</p>
                        <p className="text-[13px] font-black text-gray-700">{proposal.delivery_deadline || '15 / 20 dias úteis'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 mb-12">
                    <div className="border rounded-2xl p-6 bg-white shadow-sm border-l-4 border-l-blue-600">
                        <p className="text-[9px] font-black uppercase text-blue-500 mb-3 border-b pb-2 tracking-widest">Pagamento</p>
                        <p className="text-sm font-bold leading-relaxed text-gray-700">{proposal.payment_method || 'À vista ou parcelado'}</p>
                    </div>
                    <div className="border rounded-2xl p-6 bg-white shadow-sm">
                        <p className="text-[9px] font-black uppercase text-gray-400 mb-3 border-b pb-2 tracking-widest">Observações</p>
                        <p className="text-sm font-medium leading-relaxed text-gray-500 whitespace-pre-line">{proposal.observation || '---'}</p>
                    </div>
                </div>

                <div className="text-center mt-12 mb-10 px-12">
                    <p className="text-[12px] font-bold text-gray-400 leading-relaxed italic uppercase tracking-tighter">
                        Disponibilidade de estoque sujeita a confirmação na separação. Avisaremos em caso de reposição necessária.
                    </p>
                </div>

                {/* Team Info */}
                <div className="border-t pt-10 text-center text-[12px] space-y-2">
                    <p className="font-black text-gray-900 uppercase tracking-[0.2em] text-[10px]">Equipe {info.name}</p>
                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-gray-500 font-black uppercase text-[10px] py-2">
                        <span className="flex items-center gap-1.5"><span className="material-icons-outlined text-blue-500 text-sm">phone</span> {info.phone}</span>
                        <span className="flex items-center gap-1.5"><span className="material-icons-outlined text-blue-500 text-sm">email</span> {info.email}</span>
                    </div>
                    <p className="text-gray-400 font-bold uppercase text-[9px] tracking-widest max-w-md mx-auto leading-relaxed">{info.address}</p>
                </div>
            </div>

            <style>{`
                @page {
                    size: A4;
                    margin: 0mm !important;
                }
                @media print {
                    @page { 
                        margin: 0; 
                    }
                    body { 
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #proposal-canvas {
                        width: 210mm !important;
                        margin: 0 auto !important;
                        padding: 15mm 15mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        box-sizing: border-box !important;
                        background: white !important;
                    }
                    header, footer, nav, .print\\:hidden { display: none !important; }
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }
                }
            `}</style>
            
            {/* Modal Enviar E-mail */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                                    <span className="material-icons-outlined text-blue-600">send</span>
                                    Enviar Proposta
                                </h2>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Envio via SMTP seguro</p>
                            </div>
                            <button onClick={() => !isSendingEmail && setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <span className="material-icons-outlined">close</span>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Conta de Envio (Remetente):</label>
                                <div className="w-full px-4 py-3 border rounded-xl bg-gray-50 font-bold text-sm text-gray-600">
                                    {SENDER_ACCOUNTS[emailForm.senderId]?.name || 'Vendas'} — {emailForm.senderId}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">E-mail do Destinatário (Cliente):</label>
                                <input 
                                    type="email"
                                    value={emailForm.to}
                                    onChange={e => setEmailForm({...emailForm, to: e.target.value})}
                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                    placeholder="cliente@exemplo.com"
                                    disabled={isSendingEmail}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Cópia (CC): <span className="text-gray-300">Opcional</span></label>
                                <input 
                                    type="email"
                                    value={emailForm.cc}
                                    onChange={e => setEmailForm({...emailForm, cc: e.target.value})}
                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-sm"
                                    placeholder="vendedor@cristalbrindes..."
                                    disabled={isSendingEmail}
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
                                <input 
                                    type="checkbox"
                                    id="updateEmailRecord"
                                    checked={updateClientEmail}
                                    onChange={e => setUpdateClientEmail(e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                                    disabled={isSendingEmail}
                                />
                                <label htmlFor="updateEmailRecord" className="text-xs font-black text-blue-700 cursor-pointer uppercase tracking-tight">
                                    Atualizar este e-mail no cadastro do cliente
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowEmailModal(false)}
                                disabled={isSendingEmail}
                                className="px-6 py-2.5 font-black text-[11px] uppercase tracking-widest text-gray-500 bg-white border rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSendEmail}
                                disabled={isSendingEmail || !emailForm.to}
                                className="px-8 py-2.5 font-black text-[11px] uppercase tracking-widest text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 disabled:opacity-70 hover:bg-blue-700 flex items-center gap-2 transition-all transform active:scale-95"
                            >
                                {isSendingEmail ? (
                                    <>
                                        <span className="material-icons-outlined animate-spin text-sm">autorenew</span>
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons-outlined text-sm">send</span>
                                        Enviar Proposta
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProposalDetail;
