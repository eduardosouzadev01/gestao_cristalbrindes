'use client';

import React from 'react';

interface LostLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    lostForm: { category: string; reason: string };
    setLostForm: (form: any) => void;
}

const LOST_CATEGORIES = ['PREÇO', 'PRAZO', 'CONCORRÊNCIA', 'OUTRO'];

const LostLeadModal: React.FC<LostLeadModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    lostForm,
    setLostForm
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-md w-full max-w-sm shadow-none overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
                {/* Header */}
                <div className="p-8 text-center bg-red-50/50">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-icons-outlined text-3xl">sentiment_very_dissatisfied</span>
                    </div>
                    <h3 className="text-xl font-medium text-gray-900 uppercase">Orçamento Perdido</h3>
                    <p className="text-xs text-gray-500 mt-2 font-medium uppercase tracking-widest">Ajude-nos a entender o motivo</p>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* Category grid */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-2 tracking-widest">Categoria do Motivo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {LOST_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setLostForm({ ...lostForm, category: cat })}
                                    className={`py-2 rounded-md text-[10px] font-medium uppercase transition-all border ${
                                        lostForm.category === cat
                                            ? 'bg-red-500 text-white border-red-500 shadow-none scale-105'
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-red-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason textarea */}
                    <div>
                        <label className="block text-[10px] font-medium text-gray-400 uppercase mb-2 tracking-widest">Descrição Detalhada</label>
                        <textarea
                            className="w-full rounded-md border border-gray-100 focus:ring-red-500 focus:border-red-500 text-sm font-medium bg-gray-50 p-3 outline-none"
                            rows={3}
                            placeholder="Ex: O cliente achou o frete alto demais..."
                            value={lostForm.reason}
                            onChange={e => setLostForm({ ...lostForm, reason: e.target.value })}
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
                            Confirmar Perda
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LostLeadModal;
