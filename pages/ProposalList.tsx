import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../src/utils/formatCurrency';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';

const ProposalList: React.FC = () => {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const { appUser } = useAuth();

    useEffect(() => {
        loadProposals();
    }, []);

    const loadProposals = async () => {
        try {
            let query = supabase
                .from('proposals')
                .select('*, client:partners(name)')
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

    const filteredProposals = proposals.filter(p =>
        p.proposal_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-blue-600 text-2xl">picture_as_pdf</span>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Propostas Comerciais</h2>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden border-t-2 border-t-blue-600">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <span className="material-icons-outlined absolute left-2.5 top-1.5 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar proposta ou cliente..."
                            className="w-full pl-8 pr-3 py-1 text-xs border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4 border-l border-gray-200 ml-4 hidden md:flex">
                        <span>Total: <span className="text-blue-600">{filteredProposals.length}</span></span>
                        <span className="text-gray-200 mx-1">|</span>
                        <span>Soma: <span className="text-blue-600">{formatCurrency(filteredProposals.reduce((sum, p) => sum + Number(p.total_amount), 0))}</span></span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <tr>
                                <th className="px-3 py-2">Proposta</th>
                                <th className="px-3 py-2">Cliente</th>
                                <th className="px-3 py-2 text-center">Data</th>
                                <th className="px-3 py-2 text-center">Vendedor</th>
                                <th className="px-3 py-2 text-right">Valor Total</th>
                                <th className="px-3 py-2 text-center">Status</th>
                                <th className="px-3 py-2 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {filteredProposals.length > 0 ? (
                                filteredProposals.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => navigate(`/proposta/${item.id}`)}>
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                            <span className="text-xs font-black text-blue-600">#{item.proposal_number}</span>
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">
                                            <span className="text-xs font-black text-gray-800 uppercase leading-none">{item.client?.name || 'Vários'}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center whitespace-nowrap">
                                            <span className="text-gray-500 text-[10px] font-bold uppercase">{new Date(item.created_at).toLocaleDateString('pt-BR')}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center whitespace-nowrap">
                                            <span className="text-gray-400 text-[10px] font-black uppercase leading-none">{item.salesperson}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <span className="text-xs font-black text-gray-900">{formatCurrency(item.total_amount)}</span>
                                        </td>
                                        <td className="px-3 py-1.5 text-center whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-sm ${item.status === 'GERADA' ? 'bg-blue-500 text-white' :
                                                item.status === 'ENVIADA' ? 'bg-orange-500 text-white' :
                                                    'bg-green-500 text-white'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1.5 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2 pr-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/proposta/${item.id}`); }}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded transition-all"
                                                    title="Ver Proposta"
                                                >
                                                    <span className="material-icons-outlined text-base">visibility</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-3 py-10 text-center text-gray-400 italic text-[10px] font-bold uppercase">
                                        {loading ? 'Carregando propostas...' : 'Nenhuma proposta encontrada.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProposalList;
