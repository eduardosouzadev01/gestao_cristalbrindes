import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../src/utils/formatCurrency';
import { toast } from 'sonner';

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

    const handlePrint = () => {
        window.print();
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
            cnpj: '00.000.000/0001-01',
            email: 'vendas@cristalbrindes.com.br',
            phone: '(27) 3333-3333',
            address: 'Rua Exemplo, 123 - Serra - ES',
            logo: 'https://placehold.co/200x80?text=CRISTAL+BRINDES'
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
            name: 'Espírito Brindes',
            cnpj: '00.000.000/0001-02',
            email: 'vendas@espiritobrindes.com.br',
            phone: '(27) 4444-4444',
            address: 'Rua Outra, 456 - Vitória - ES',
            logo: 'https://placehold.co/200x80?text=ESPIRITO+BRINDES'
        }
    };

    const info = issuerInfo[proposal.issuer || 'CRISTAL'] || issuerInfo['CRISTAL'];

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
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 font-bold">
                        <span className="material-icons-outlined">picture_as_pdf</span> Salvar PDF / Imprimir
                    </button>
                </div>
            </div>

            {/* Proposal Content */}
            <div className="bg-white max-w-[800px] w-full shadow-xl p-10 font-sans text-gray-800 print:shadow-none print:max-w-none print:w-full print:p-0">
                {/* Header */}
                <div className="text-center mb-8 border-b pb-8">
                    {/* Simplified Logo for now */}
                    <div className="flex justify-center mb-4">
                        <span className="material-icons-outlined text-green-500 text-6xl">eco</span>
                    </div>
                    <h1 className="text-3xl font-black text-green-600 uppercase tracking-tight">{info.name}</h1>
                    <p className="text-gray-500 text-sm mt-1">Sua marca para todo mundo ver</p>
                    <div className="mt-4 flex justify-center gap-6 text-sm font-bold bg-gray-50 py-2 rounded-full inline-flex px-8">
                        <span>Orçamento: <span className="text-blue-600">#{proposal.proposal_number}</span></span>
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
                            <p><span className="font-bold">Contato:</span> {proposal.client?.name}</p>
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
                            <p><span className="font-bold">Email:</span> <span className="text-blue-600 underline font-medium">{info.email}</span></p>
                            <p><span className="font-bold">Telefone:</span> {info.phone}</p>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="space-y-10">
                    {proposal.items?.map((item: any, index: number) => (
                        <div key={index} className="space-y-4">
                            <div className="bg-blue-600 text-white px-4 py-1.5 rounded-sm text-xs font-black uppercase tracking-widest inline-block">
                                Item {index + 1}
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="flex gap-6 p-6">
                                    <div className="w-1/3 aspect-square bg-gray-50 flex items-center justify-center border rounded-lg overflow-hidden shrink-0">
                                        {item.product_image_url ? (
                                            <img
                                                src={item.product_image_url}
                                                alt={item.product_name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        ) : (
                                            <span className="material-icons-outlined text-gray-300 text-6xl">image</span>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 border-b pb-2">{item.product_name}</h3>
                                        <p className="text-sm text-gray-600 leading-relaxed italic">
                                            {item.product_description || 'Descrição do produto não informada.'}
                                        </p>
                                        <div className="flex gap-4 text-xs font-bold text-gray-400">
                                            {item.product_code && <span>Código: <span className="text-gray-700">{item.product_code}</span></span>}
                                            {item.product_color && <span>Cor: <span className="text-gray-700">{item.product_color}</span></span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 border-t">
                                    <table className="w-full text-center">
                                        <thead>
                                            <tr className="text-[10px] uppercase font-black text-gray-400 border-b">
                                                <th className="py-2 px-4 text-left">Produto</th>
                                                <th className="py-2 px-4">Qtd</th>
                                                <th className="py-2 px-4">Preço Unitário</th>
                                                <th className="py-2 px-4 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="font-bold text-sm">
                                                <td className="py-3 px-4 text-left uppercase">{item.product_name}</td>
                                                <td className="py-3 px-4">{item.quantity}</td>
                                                <td className="py-3 px-4">{formatCurrency(item.unit_price * (item.calculation_factor || 1))}</td>
                                                <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(item.total_item_value)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Terms */}
                <div className="mt-12 grid grid-cols-3 gap-4 mb-8">
                    <div className="border rounded-lg p-3 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Validade da proposta</p>
                        <p className="text-sm font-bold">15 dias</p>
                    </div>
                    <div className="border rounded-lg p-3 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Frete</p>
                        <p className="text-sm font-bold">Cliente retira</p>
                    </div>
                    <div className="border rounded-lg p-3 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Prazo de entrega</p>
                        <p className="text-sm font-bold">15 / 20 dias úteis</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="border rounded-lg p-4 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Observações</p>
                        <p className="text-[13px] font-medium leading-relaxed">100% 15 dias após emissão da NF</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-white">
                        <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Forma de Pagamento</p>
                        <p className="text-[13px] font-medium leading-relaxed">À vista ou parcelado</p>
                    </div>
                </div>

                <div className="text-center text-[11px] text-gray-400 font-medium mb-12 italic">
                    Disponibilidade de estoque sujeita a confirmação na separação. Avisaremos em caso de reposição necessária.
                </div>

                {/* Team Info */}
                <div className="border-t pt-8 text-center text-[12px] space-y-1">
                    <p className="font-bold text-gray-600 uppercase tracking-widest">Equipe {info.name}</p>
                    <div className="flex justify-center gap-4 text-gray-500 font-medium py-2">
                        <span className="flex items-center gap-1"><span className="material-icons-outlined text-sm">phone</span> {info.phone}</span>
                        <span className="flex items-center gap-1"><span className="material-icons-outlined text-sm">email</span> {info.email}</span>
                    </div>
                    <p className="text-gray-400">{info.address}</p>
                </div>
            </div>

            <style>{`
                @media print {
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:bg-white { background: white !important; }
                    .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
                    .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:p-0 { padding: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default ProposalDetail;
