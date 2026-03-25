import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../src/utils/formatCurrency';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

const ProposalDetail: React.FC = () => {
    const { id } = useParams();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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

    const handleDownloadPDF = () => {
        const originalTitle = document.title;
        document.title = `Proposta ${proposal.proposal_number}`;
        window.print();
        // Restore title after a short delay to ensure print dialog picks it up
        setTimeout(() => {
            document.title = originalTitle;
        }, 500);
    };

    const handleSendEmail = () => {
        if (!proposal) return;
        const subject = encodeURIComponent(`Proposta Comercial - ${proposal.proposal_number}`);
        const body = encodeURIComponent(`Olá,\n\nSegue link para visualização da proposta comercial: ${window.location.href}\n\nAtenciosamente,\nEquipe Cristal Brindes`);
        window.location.href = `mailto:${proposal.client?.email || ''}?subject=${subject}&body=${body}`;
    };

    if (loading) return <div className="p-8 text-center">Carregando proposta...</div>;
    if (!proposal) return <div className="p-8 text-center">Proposta não encontrada.</div>;

    const issuerInfo: any = {
        'CRISTAL': {
            name: 'Cristal Brindes',
            cnpj: '08.769.700/0001-57',
            email: 'cristalbrindes@cristalbrindes.com.br',
            phone: '(27) 99992-0408',
            address: 'RUA PORTO ALEGRE, 590 - ALTEROSAS - CEP: 29167-036 - SERRA - ES',
            logo: '/img/Cristal Brindes 3.png'
        },
        'NATUREZA': {
            name: 'Natureza Brindes',
            cnpj: '57.225.892/0001-46',
            email: 'vendas04@naturezabrindes.com.br',
            phone: '(27) 9995-47137',
            address: 'R. Porto Alegre, 590 - casa 02 - Alterosas, Serra - ES, 29167-036',
            logo: 'https://placehold.co/200x80?text=NATUREZA+BRINDES'
        },
        'ESPIRITO': {
            name: 'ESPIRITO BRINDES LTDA',
            cnpj: '57.225.892/0001-46',
            email: 'vendas@espiritobrindes.com.br',
            phone: '(27) 99992-0408',
            address: 'RUA PORTO ALEGRE, 590 - ALTEROSAS - CEP: 29167-036 - SERRA - ES',
            logo: '/img/Cristal Brindes 3.png'
        }
    };

    const info = issuerInfo[proposal.issuer || 'CRISTAL'] || issuerInfo['CRISTAL'];

    const getSalespersonEmail = () => {
        if (proposal.issuer && proposal.issuer !== 'CRISTAL') return info.email;
        if (!proposal.salesperson) return info.email;
        const match = proposal.salesperson.match(/(\d+)/);
        if (match) {
            const num = match[1].padStart(2, '0');
            return `vendas${num}@cristalbrindes.com.br`;
        }
        return info.email;
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4 print:bg-white print:py-0 print:px-0">
            {/* Actions Bar */}
            <div className="max-w-[800px] w-full mb-6 flex justify-between items-center print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-semibold">
                    <span className="material-icons-outlined">arrow_back</span> Voltar
                </button>
                <div className="flex gap-3">
                    <button onClick={handleSendEmail} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 font-bold text-gray-700">
                        <span className="material-icons-outlined">email</span> Enviar por E-mail
                    </button>
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 font-bold">
                        <span className="material-icons-outlined">picture_as_pdf</span> Baixar PDF / Imprimir
                    </button>
                </div>
            </div>

            {/* Proposal Content */}
            <div id="proposal-canvas" className="bg-white max-w-[800px] w-full shadow-xl p-10 font-sans text-gray-800 print:shadow-none print:max-w-none print:w-full print:p-0">
                {/* Header */}
                <div className="text-center mb-8 border-b pb-8">
                    <div className="flex justify-center mb-4">
                        <img
                            src={info.logo}
                            alt={info.name}
                            className="max-h-32 w-auto object-contain"
                        />
                    </div>
                    <div className="mt-4 flex justify-center gap-6 text-sm font-bold bg-white border print:bg-white py-2 rounded-full inline-flex px-8">
                        <span>Proposta: <span className="text-blue-600">#{proposal.proposal_number}</span></span>
                        <span>Data: <span className="text-blue-600">{new Date(proposal.created_at).toLocaleDateString('pt-BR')}</span></span>
                    </div>
                </div>

                {/* Client / Provider Info */}
                <div className="grid grid-cols-2 gap-6 mb-10">
                    <div className="border rounded-xl p-5 bg-white shadow-sm">
                        <h2 className="text-xs font-black text-gray-400 uppercase mb-4 border-b pb-2">Aos cuidados de</h2>
                        <div className="space-y-2 text-[13px]">
                            <p><span className="font-bold">Empresa:</span> {proposal.client?.name}</p>
                            <p><span className="font-bold">CNPJ:</span> {proposal.client?.doc || 'Não informado'}</p>
                            <p><span className="font-bold">Contato:</span> {proposal.client?.contact_name || 'Não informado'}</p>
                            <p><span className="font-bold">Email:</span> <span className="text-blue-600 underline font-medium">{proposal.client?.email || 'N/A'}</span></p>
                            <p><span className="font-bold">Telefone:</span> {proposal.client?.phone || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="border rounded-xl p-5 bg-white shadow-sm">
                        <h2 className="text-xs font-black text-gray-400 uppercase mb-4 border-b pb-2">Dados do Atendimento</h2>
                        <div className="space-y-2 text-[13px]">
                            <p><span className="font-bold">Equipe {info.name}:</span></p>
                            <p><span className="font-bold">CNPJ:</span> {info.cnpj}</p>
                             <p><span className="font-bold">Representante:</span> {proposal.salesperson}</p>
                             <p><span className="font-bold">Email:</span> <span className="text-blue-600 underline font-medium">{getSalespersonEmail()}</span></p>
                            <p><span className="font-bold">Telefone:</span> {info.phone}</p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-8">
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
                            <div key={index} className="space-y-4 break-inside-auto" style={{ breakInside: 'auto' }}>
                                <div className="bg-blue-600 text-white px-4 py-1.5 rounded-sm text-xs font-black uppercase tracking-widest inline-block break-after-avoid" style={{ breakAfter: 'avoid' }}>
                                    Item {index + 1}
                                </div>

                                <div className="border rounded-xl overflow-hidden shadow-sm break-inside-auto" style={{ breakInside: 'auto' }}>
                                    <div className="flex gap-6 p-6 break-inside-avoid" style={{ breakInside: 'avoid' }}>
                                        <div className="w-1/3 aspect-square bg-gray-50 flex items-center justify-center border rounded-lg overflow-hidden shrink-0">
                                            {group.product_image_url ? (
                                                <img
                                                    src={group.product_image_url}
                                                    alt={group.product_name}
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <span className="material-icons-outlined text-gray-300 text-6xl">image</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 border-b pb-2">{group.product_name}</h3>
                                            <div 
                                                className="text-sm text-gray-600 leading-relaxed rich-text-content"
                                                dangerouslySetInnerHTML={{ __html: group.product_description || 'Descrição do produto não informada.' }}
                                            />
                                            <div className="flex gap-4 text-xs font-bold text-gray-400">
                                                {group.product_code && <span>Ref: <span className="text-gray-700">{group.product_code}</span></span>}
                                                {group.product_color && <span>Cor: <span className="text-gray-700">{group.product_color}</span></span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 border-t break-inside-auto" style={{ breakInside: 'auto' }}>
                                        <table className="w-full text-center">
                                            <thead>
                                                <tr className="text-[10px] uppercase font-black text-gray-400 border-b">
                                                    <th className="py-2 px-4 text-left">Especificação</th>
                                                    <th className="py-2 px-4">Qtd</th>
                                                    <th className="py-2 px-4">Preço Unitário</th>
                                                    <th className="py-2 px-4 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {group.subItems.map((sub: any, subIndex: number) => (
                                                    <tr key={subIndex} className="font-bold text-sm bg-white break-inside-avoid">
                                                        <td className="py-3 px-4 text-left uppercase text-[11px] text-gray-500">
                                                            {sub.product_name} {sub.product_color ? `(${sub.product_color})` : ''}
                                                        </td>
                                                        <td className="py-3 px-4">{sub.quantity}</td>
                                                        <td className="py-3 px-4">{formatCurrency(sub.unit_price)}</td>
                                                        <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(sub.total_item_value)}</td>
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

                {/* Footer Terms */}
                <div className="mt-12 grid grid-cols-3 gap-4 mb-8 break-inside-avoid" style={{ breakInside: 'avoid' }}>
                    <div className="border rounded-lg p-3 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Validade da proposta</p>
                        <p className="text-sm font-bold">{proposal.validity || '15 dias'}</p>
                    </div>
                    <div className="border rounded-lg p-3 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Frete</p>
                        <p className="text-sm font-bold">{proposal.shipping || 'Cliente retira'}</p>
                    </div>
                    <div className="border rounded-lg p-3 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Prazo de entrega</p>
                        <p className="text-sm font-bold">{proposal.delivery_deadline || '15 / 20 dias úteis'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-12 break-inside-avoid" style={{ breakInside: 'avoid' }}>
                    <div className="border rounded-xl p-6 bg-white shadow-sm">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 border-b pb-1">Forma de Pagamento</p>
                        <p className="text-[14px] font-semibold leading-relaxed text-gray-700">{proposal.payment_method || 'À vista ou parcelado'}</p>
                    </div>
                    <div className="border rounded-xl p-6 bg-white shadow-sm">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-3 border-b pb-1">Observações</p>
                        <p className="text-[14px] font-semibold leading-relaxed text-gray-700 whitespace-pre-line">{proposal.observation || '---'}</p>
                    </div>
                </div>

                <div className="text-center mt-12 mb-8 px-12 break-inside-avoid" style={{ breakInside: 'avoid' }}>
                    <p className="text-[13px] font-medium text-gray-500 leading-relaxed italic">
                        Disponibilidade de estoque sujeita a confirmação na separação. Avisaremos em caso de reposição necessária.
                    </p>
                </div>

                {/* Team Info */}
                <div className="border-t pt-8 text-center text-[12px] space-y-1">
                    <p className="font-bold text-gray-600 uppercase tracking-widest">Equipe {info.name}</p>
                    <div className="flex justify-center gap-4 text-gray-500 font-medium py-2">
                        <span className="flex items-center gap-1"><span className="material-icons-outlined text-sm">phone</span> {info.phone}</span>
                        <span className="flex items-center gap-1"><span className="material-icons-outlined text-sm">email</span> cristalbrindes@cristalbrindes.com.br</span>
                    </div>
                    <p className="text-gray-400">{info.address}</p>
                </div>
            </div>

            <style>{`
                @page {
                    size: A4;
                    margin: 0mm !important; /* Hides browser headers/footers */
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
                    
                    /* Ensure rich text bolds are very visible in PDF */
                    .rich-text-content b, 
                    .rich-text-content strong {
                        font-weight: 900 !important;
                        color: #000000 !important;
                    }
                    
                    /* Main container for the proposal content */
                    #proposal-canvas {
                        width: 210mm !important; /* A4 Width */
                        margin: 0 auto !important;
                        padding: 15mm 15mm !important; /* Standard margins */
                        box-shadow: none !important;
                        border: none !important;
                        box-sizing: border-box !important;
                        background: white !important;
                    }

                    /* Utility classes for printing */
                    header, footer, nav, .print\\:hidden { display: none !important; }
                    
                    /* Force visibility of colors and images */
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                    }

                    /* Reset body styles for print */
                    #root { padding: 0 !important; margin: 0 !important; }
                    .min-h-screen { min-height: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default ProposalDetail;
