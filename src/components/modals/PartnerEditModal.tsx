import React, { useState, useEffect } from 'react';

interface PartnerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onSave: (updatedData: any) => Promise<void>;
    loading: boolean;
}

const PartnerEditModal: React.FC<PartnerEditModalProps> = ({ isOpen, onClose, data, onSave, loading }) => {
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (isOpen) setFormData({ ...data });
    }, [isOpen, data]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-md shadow-none w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500">edit_note</span> Editar Dados do Cliente
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">Nome / Razão Social</label>
                            <input 
                                className="w-full px-3 py-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="col-span-12">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">E-mail Comercial</label>
                            <input 
                                className="w-full px-3 py-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="col-span-12">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">E-mail Financeiro</label>
                            <input 
                                className="w-full px-3 py-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                                value={formData.financial_email || ''}
                                onChange={e => setFormData({ ...formData, financial_email: e.target.value })}
                            />
                        </div>
                        <div className="col-span-12">
                            <label className="block text-[10px] font-medium text-gray-400 uppercase mb-1">Celular / WhatsApp</label>
                            <input 
                                className="w-full px-3 py-2 border rounded-md text-sm font-medium focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-md p-3 flex gap-3 mt-4">
                        <span className="material-icons-outlined text-amber-500 text-lg">info</span>
                        <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                            <b>IMPORTANTE:</b> As alterações feitas aqui serão salvas permanentemente no cadastro geral do cliente e afetarão futuros orçamentos.
                        </p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors uppercase"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => onSave(formData)}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50 shadow-none shadow-none-blue-100 transition-all flex items-center gap-2 uppercase tracking-wide"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PartnerEditModal;
