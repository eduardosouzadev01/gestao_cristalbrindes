import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { useNavigate } from 'react-router-dom';

interface ProposalsHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    proposals: any[];
}

export const ProposalsHistoryModal: React.FC<ProposalsHistoryModalProps> = ({ isOpen, onClose, proposals }) => {
    const navigate = useNavigate();
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh] scale-in-center animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tighter">
                        <span className="material-icons-outlined text-blue-500">history</span> Propostas Geradas
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                    {proposals.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons-outlined text-gray-200 text-4xl">description</span>
                            </div>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma proposta encontrada</p>
                            <p className="text-gray-500 text-xs mt-1">Gere uma proposta em PDF para que ela apareça no histórico.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                <tr className="border-b border-gray-100 bg-gray-50/30">
                                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nº Proposta</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Gerada</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Total</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {proposals.map((prop) => (
                                    <tr key={prop.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">#{prop.proposal_number}</span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                            {new Date(prop.created_at).toLocaleDateString('pt-BR')} <span className="text-gray-300 font-normal">às</span> {new Date(prop.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-gray-700 text-right">{formatCurrency(prop.total_amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => {
                                                    onClose();
                                                    navigate(`/proposta/${prop.id}`);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F6CBD] text-white hover:bg-[#0c5aa5] transition-all text-[10px] font-bold uppercase shadow-sm shadow-blue-100 active:scale-95"
                                            >
                                                <span className="material-icons-outlined text-white text-base">visibility</span>
                                                Visualizar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter italic">As propostas são salvas automaticamente sempre que um PDF é gerado.</p>
                </div>
            </div>
        </div>
    );
};
