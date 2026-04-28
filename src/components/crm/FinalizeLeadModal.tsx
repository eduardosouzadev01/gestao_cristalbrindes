'use client';

import React from 'react';

interface FinalizeLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    finalizeForm: { success: boolean; value: number; notes: string; category: string };
    setFinalizeForm: (form: any) => void;
}

const FinalizeLeadModal: React.FC<FinalizeLeadModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    finalizeForm,
    setFinalizeForm
}) => {
    if (!isOpen) return null;

    const successCategories = ['QUALIDADE', 'PREÇO', 'ATENDIMENTO', 'PRAZO', 'FIDELIDADE', 'OUTRO'];
    const failCategories = ['PREÇO ALTO', 'PRAZO LONGO', 'CONCORRÊNCIA', 'DESISTIU', 'FALTA ESTOQUE', 'OUTRO'];
    const categories = finalizeForm.success ? successCategories : failCategories;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-md w-full max-w-sm shadow-none overflow-hidden animate-in zoom-in-95 duration-200 border border-green-100">
                {/* Header */}
                <div className="p-8 text-center bg-green-50/50">
                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-outlined text-3xl">check_circle</span>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 uppercase">Finalizar Atendimento</h3>
                    <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-widest">Resumo do fechamento</p>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Sim / Não */}
                    <div>
                        <label className="block text-sm font-medium text-gray-800 mb-3 text-center">O cliente fez o pedido?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setFinalizeForm({ ...finalizeForm, success: true, category: '' })}
                                className={`py-3 rounded-md text-xs font-medium uppercase transition-all border ${
                                    finalizeForm.success
                                        ? 'bg-green-600 text-white border-green-600 shadow-none transform scale-105'
                                        : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                }`}
                            >
                                Sim, Fez Pedido
                            </button>
                            <button
                                onClick={() => setFinalizeForm({ ...finalizeForm, success: false, category: '' })}
                                className={`py-3 rounded-md text-xs font-medium uppercase transition-all border ${
                                    !finalizeForm.success
                                        ? 'bg-red-600 text-white border-red-600 shadow-none transform scale-105'
                                        : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'
                                }`}
                            >
                                Não Fez
                            </button>
                        </div>
                    </div>

                    {/* Category grid */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-2 tracking-widest">Qual o Motivo principal?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFinalizeForm({ ...finalizeForm, category: cat })}
                                    className={`py-2 px-3 rounded-md border text-[10px] font-medium uppercase transition-all ${
                                        finalizeForm.category === cat
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-none'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-2 tracking-widest">Observações Adicionais</label>
                        <textarea
                            className="w-full rounded-md border border-gray-100 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-gray-50 p-3 outline-none"
                            rows={3}
                            placeholder="Detalhes sobre a finalização..."
                            value={finalizeForm.notes}
                            onChange={e => setFinalizeForm({ ...finalizeForm, notes: e.target.value })}
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex gap-4 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-gray-400 font-medium uppercase text-xs hover:text-gray-600 transition-colors"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-4 bg-gray-900 text-white rounded-md font-medium uppercase text-xs shadow-none hover:bg-black transition-all active:scale-95"
                        >
                            Concluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalizeLeadModal;
