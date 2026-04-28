'use client';

import React from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { fixClientName } from '@/utils/textUtils';
import { ISSUER_INFO } from '@/components/filters/IssuerSelect';

interface ProposalViewProps {
    proposal: any;
}

export const ProposalView: React.FC<ProposalViewProps> = ({ proposal }) => {
    if (!proposal) return null;

    const info = ISSUER_INFO[proposal.issuer || 'CRISTAL'] || ISSUER_INFO['CRISTAL'];

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

    const groupedItems = proposal.items?.reduce((acc: any[], item: any) => {
        const pName = item.product_name || item.productName || '';
        const pDesc = item.product_description || item.productDescription || '';
        const pCode = item.product_code || item.productCode || '';
        const pColor = item.product_color || item.productColor || '';
        const pImg = item.product_image_url || item.productImage || '';

        const key = `${pName}-${pDesc}-${pCode}-${pColor}`;
        const existing = acc.find((g: any) => g.key === key);
        if (existing) {
            existing.subItems.push(item);
        } else {
            acc.push({ key, pName, pDesc, pCode, pColor, pImg, subItems: [item] });
        }
        return acc;
    }, []) || [];

    return (
        <div id="proposal-canvas" className="bg-white max-w-[850px] w-full p-12 font-sans text-slate-800 print:shadow-none print:max-w-none print:w-full print:p-0 rounded-none mb-12 border border-slate-200">
            {/* Header */}
            <div className="text-center mb-10 border-b border-slate-100 pb-10">
                <div className="flex justify-center mb-6">
                    <img
                        src={info.logo}
                        alt={info.name}
                        className="max-h-56 w-auto max-w-full object-contain"
                    />
                </div>
                <div className="mt-4 flex flex-col items-center">
                    <div className="flex justify-center gap-8 text-[11px] font-medium bg-[#F9FAFB] border py-2 px-8 rounded-md border-slate-300 uppercase tracking-widest text-slate-600">
                        <span>Proposta: <span className="text-[#0F6CBD]">#{proposal.proposal_number}</span></span>
                        <span className="text-slate-300">|</span>
                        <span>Data: <span className="text-slate-800">{new Date(proposal.created_at).toLocaleDateString('pt-BR')}</span></span>
                    </div>
                </div>
            </div>

            {/* Client / Provider Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 mb-12">
                <div className="border border-slate-300 rounded-md p-5 bg-white">
                    <h2 className="text-[10px] font-medium text-slate-700 uppercase mb-3 border-b border-slate-100 pb-2.5 tracking-widest flex items-center gap-2">
                        <span className="material-icons-outlined text-sm text-[#0F6CBD]">person</span>
                        Aos cuidados de
                    </h2>
                    <div className="space-y-2 text-[12px]">
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-24 shrink-0">Empresa</span> <span className="text-slate-800 uppercase truncate">{fixClientName(proposal.client?.name)}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-24 shrink-0">CNPJ/CPF</span> <span className="text-slate-700">{proposal.client?.doc || 'NÃO INFORMADO'}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-24 shrink-0">Contato</span> <span className="text-slate-700">{proposal.client?.contact_name || 'NÃO INFORMADO'}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-24 shrink-0">Email</span> <span className="text-[#0F6CBD] truncate">{proposal.client?.email || 'NÃO INFORMADO'}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-24 shrink-0">Telefone</span> <span className="text-slate-700">{proposal.client?.phone || 'NÃO INFORMADO'}</span></p>
                    </div>
                </div>

                <div className="border border-slate-300 rounded-md p-5 bg-white">
                    <h2 className="text-[10px] font-medium text-slate-700 uppercase mb-3 border-b border-slate-100 pb-2.5 tracking-widest flex items-center gap-2">
                        <span className="material-icons-outlined text-sm text-[#0F6CBD]">business_center</span>
                        Dados do Atendimento
                    </h2>
                    <div className="space-y-2 text-[12px]">
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-28 shrink-0">Fornecedor</span> <span className="text-slate-800 uppercase truncate">EQUIPE {info.name}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-28 shrink-0">CNPJ</span> <span className="text-slate-700">{info.cnpj}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-28 shrink-0">Representante</span> <span className="text-[#0F6CBD] uppercase truncate">{proposal.salesperson}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-28 shrink-0">Email</span> <span className="text-[#0F6CBD] truncate">{getSalespersonEmail()}</span></p>
                        <p className="flex items-center"><span className="font-medium text-slate-400 uppercase text-[9px] tracking-widest w-28 shrink-0">Telefone</span> <span className="text-slate-700">{info.phone}</span></p>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="space-y-16 print:space-y-10">
                {groupedItems.map((group, index) => (
                    <div key={index} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex items-center gap-4">
                            <div className="bg-slate-800 text-white h-7 flex items-center px-4 rounded-md text-[10px] font-medium uppercase tracking-[0.2em]">
                                ITEM {String(index + 1).padStart(2, '0')}
                            </div>
                            <div className="flex-1 h-px bg-slate-100"></div>
                        </div>

                        <div className="bg-white rounded-md overflow-hidden border border-slate-300">
                            <div className="flex flex-col md:flex-row print:flex-row gap-8 p-8 print:p-6">
                                <div className="w-full md:w-[45%] print:w-64 aspect-square bg-white flex items-center justify-center border border-slate-200 rounded-md overflow-hidden shrink-0">
                                    {group.pImg ? (
                                        <img
                                            src={group.pImg}
                                            alt={group.pName}
                                            className="w-full h-full object-contain p-8 print:p-4"
                                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                                        />
                                    ) : (
                                        <span className="material-icons-outlined text-slate-200 text-8xl">image</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-6 min-w-0">
                                    <h3 className="text-2xl font-medium uppercase tracking-tight text-slate-800 border-b border-slate-100 pb-5 leading-tight">{group.pName}</h3>
                                    <div 
                                        className="text-[14px] text-slate-500 leading-relaxed font-medium prose prose-slate max-w-none"
                                        dangerouslySetInnerHTML={{ __html: group.pDesc || 'Descrição detalhada sob consulta.' }}
                                    />
                                    <div className="flex flex-wrap gap-4 mt-6">
                                        {group.pCode && (
                                            <div className="px-4 py-2 bg-white rounded-md border border-slate-200">
                                                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">Referência</p>
                                                <p className="text-xs font-medium text-slate-800">{group.pCode}</p>
                                            </div>
                                        )}
                                        {group.pColor && (
                                            <div className="px-4 py-2 bg-white rounded-md border border-slate-200">
                                                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-0.5">Cor Sugerida</p>
                                                <p className="text-xs font-medium text-slate-800 uppercase">{group.pColor}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border-t border-slate-200">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[10px] uppercase font-medium text-slate-600 bg-slate-50 border-b border-slate-200">
                                                <th className="py-3 px-8 text-left tracking-widest">Título</th>
                                                <th className="py-5 px-6 text-center tracking-widest">Qtd</th>
                                                <th className="py-5 px-6 text-center tracking-widest">Unitário</th>
                                                <th className="py-5 px-10 text-right tracking-widest">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100/50">
                                            {group.subItems.map((sub: any, subIndex: number) => (
                                                <tr key={subIndex} className="bg-white/50 hover:bg-white transition-colors">
                                                    <td className="py-5 px-10 text-left text-sm font-medium text-slate-600 uppercase tracking-tight">
                                                        {sub.product_name} {sub.product_color ? `(${sub.product_color})` : ''}
                                                    </td>
                                                    <td className="py-5 px-6 text-center text-sm font-medium text-slate-700 tabular-nums">{sub.quantity}</td>
                                                    <td className="py-5 px-6 text-center text-sm font-medium text-slate-700 tabular-nums">{formatCurrency(sub.total_item_value / sub.quantity)}</td>
                                                    <td className="py-5 px-10 text-right text-sm font-medium text-[#0F6CBD] tabular-nums">{formatCurrency(sub.total_item_value)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Banner */}
            <div className="mt-16 flex flex-col border-t-2 border-b-2 border-slate-100 py-8 px-4 bg-[#FAFBFC] print:bg-white print:border-slate-300 rounded-md">
                <div className="flex flex-col md:flex-row print:flex-row justify-between w-full items-center gap-6">
                    <div className="text-center md:text-left print:text-left space-y-1.5">
                        <h4 className="text-[13px] font-medium text-slate-500 uppercase tracking-[0.15em] flex items-center justify-center md:justify-start print:justify-start gap-3">
                            <span className="w-8 h-[2px] bg-[#0F6CBD] inline-block"></span>
                            Valor Total da Proposta Comercial
                        </h4>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.1em] md:pl-11 print:pl-11">
                            Válido para as condições descritas abaixo
                        </p>
                    </div>
                    <div className="text-4xl font-medium text-slate-800 tabular-nums tracking-tighter">
                        {formatCurrency(proposal.total_amount)}
                    </div>
                </div>
            </div>

            {/* Terms / conditions */}
            <div className="mt-16 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4">
                    <div className="border border-slate-200 rounded-md p-5 bg-white">
                        <p className="text-[10px] font-medium uppercase text-slate-500 mb-2 tracking-[0.1em]">
                            Validade
                        </p>
                        <p className="text-sm font-medium text-slate-800 uppercase tracking-tight">{proposal.validity || proposal.budget?.validity || '15 DIAS'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-md p-5 bg-white">
                        <p className="text-[10px] font-medium uppercase text-slate-500 mb-2 tracking-[0.1em]">
                            Frete
                        </p>
                        <p className="text-sm font-medium text-slate-800 uppercase tracking-tight">{proposal.shipping || proposal.budget?.shipping || 'CLIENTE RETIRA'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-md p-5 bg-white">
                        <p className="text-[10px] font-medium uppercase text-slate-500 mb-2 tracking-[0.1em]">
                            Entrega
                        </p>
                        <p className="text-sm font-medium text-slate-700 uppercase tracking-tight">{proposal.delivery_deadline || proposal.budget?.delivery_deadline || '15 / 20 DIAS ÚTEIS'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-md p-6 bg-white border-l-4 border-l-slate-800">
                        <p className="text-[10px] font-medium uppercase text-slate-800 mb-4 border-b border-slate-100 pb-2 tracking-[0.1em]">
                            Formas de Pagamento
                        </p>
                        <p className="text-sm font-medium leading-relaxed text-slate-800 uppercase tracking-tight">{proposal.payment_method || proposal.budget?.payment_method || 'À VISTA OU PARCELADO'}</p>
                    </div>
                    <div className="border border-slate-200 rounded-md p-6 bg-white">
                        <p className="text-[10px] font-medium uppercase text-slate-500 mb-4 border-b border-slate-200 pb-2 tracking-[0.1em]">
                            Observações Gerais
                        </p>
                        <p className="text-sm font-medium leading-relaxed text-slate-500 whitespace-pre-line uppercase tracking-tight">{proposal.observation || proposal.budget?.observation || '---'}</p>
                    </div>
                </div>
            </div>

            <div className="text-center mt-20 mb-16 px-16">
                <div className="h-px bg-slate-100 mb-8 w-24 mx-auto"></div>
                <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic uppercase tracking-[0.2em]">
                    Disponibilidade de estoque sujeita a confirmação na separação. <br/>
                    Garantimos a qualidade e o prazo de entrega especificado.
                </p>
            </div>

            {/* Footer Contact */}
            <div className="border-t border-slate-100 pt-12 text-center space-y-6">
                <p className="font-medium text-slate-900 uppercase tracking-[0.5em] text-[12px] opacity-80">EQUIPE {info.name}</p>
                <div className="flex flex-wrap justify-center gap-12 text-slate-500 font-medium uppercase text-[10px] tracking-widest py-3">
                    <span className="flex items-center gap-2 hover:text-[#0F6CBD] transition-colors transition-all active:scale-95 cursor-pointer">
                        <span className="material-icons-outlined text-[#0F6CBD] text-lg">phone</span> {info.phone}
                    </span>
                    <span className="flex items-center gap-2 hover:text-[#0F6CBD] transition-colors transition-all active:scale-95 cursor-pointer">
                        <span className="material-icons-outlined text-[#0F6CBD] text-lg">public</span> {info.email}
                    </span>
                </div>
                <div className="inline-block mt-4">
                    <p className="text-slate-400 font-medium uppercase text-[8px] tracking-[0.1em] max-w-lg mx-auto leading-relaxed">
                        {info.address}
                    </p>
                </div>
            </div>
            
            <style jsx global>{`
                @page {
                    size: A4;
                    margin: 0mm !important;
                }
                @media print {
                    #proposal-canvas {
                        width: 210mm !important;
                        margin: 0 auto !important;
                        padding: 15mm 15mm !important;
                        box-shadow-none: none !important;
                        border: none !important;
                        background: white !important;
                        border-radius: 0 !important;
                    }
                    body {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
};
