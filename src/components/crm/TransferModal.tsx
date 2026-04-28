'use client';

import React, { useState } from 'react';
import { Lead } from '@/hooks/useCRM';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onTransfer: (lead: Lead, targetSalesperson: string, note: string) => void;
    isTransferring?: boolean;
}

const SALESPERSON_OPTIONS = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05'];

const getSalespersonInitials = (name?: string) => {
    if (!name) return 'V';
    if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export default function TransferModal({ isOpen, onClose, lead, onTransfer, isTransferring = false }: TransferModalProps) {
    const [targetSalesperson, setTargetSalesperson] = useState('');
    const [transferNote, setTransferNote] = useState('');

    if (!isOpen || !lead) return null;

    const handleConfirm = () => {
        if (!targetSalesperson || targetSalesperson === lead.salesperson) return;
        onTransfer(lead, targetSalesperson, transferNote);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-md w-full max-w-2xl shadow-none-[0_32px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-200 border-t border-slate-100">
                {/* Header */}
                <div className="p-8 pb-4 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center border-2 border-blue-100/50 shadow-none shrink-0">
                        <span className="material-icons-outlined text-3xl">swap_horiz</span>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h3 className="text-2xl font-medium text-slate-800 uppercase tracking-tighter leading-none mb-2">Transferir Lead</h3>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50/50 rounded-full border border-blue-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[10px] text-blue-600 font-medium uppercase tracking-widest">{lead.client_name}</span>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex items-center justify-center"
                        >
                            <span className="material-icons-outlined">close</span>
                        </button>
                    </div>
                </div>

                <div className="px-8 pb-10 pt-2 space-y-8">
                    {/* Seller grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em]">Selecione o Novo Vendedor</label>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {SALESPERSON_OPTIONS.map(sp => {
                                const isSelected = targetSalesperson === sp;
                                const isCurrent = sp === lead.salesperson;
                                return (
                                    <button
                                        key={sp}
                                        onClick={() => setTargetSalesperson(sp)}
                                        disabled={isCurrent}
                                        className={`group relative p-4 rounded-md border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-none shadow-none-blue-200 scale-105 z-10'
                                                : isCurrent
                                                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50'
                                                : 'bg-slate-50/50 border-transparent text-slate-400 hover:border-blue-200 hover:bg-white hover:shadow-none'
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-md flex items-center justify-center text-sm font-medium transition-all ${
                                            isSelected ? 'bg-white/20' : 'bg-white shadow-none group-hover:bg-blue-50 group-hover:text-blue-600'
                                        }`}>
                                            {getSalespersonInitials(sp)}
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-medium uppercase tracking-wider leading-none ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                                                {sp.replace('VENDAS ', 'V')}
                                            </p>
                                            <p className={`text-[8px] font-medium uppercase mt-1 tracking-tighter ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                                                {isCurrent ? 'ATUAL' : 'Equipe'}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2">
                                                <span className="material-icons-outlined text-base animate-in zoom-in duration-300">check_circle</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <button
                            onClick={handleConfirm}
                            disabled={!targetSalesperson || isTransferring || targetSalesperson === lead.salesperson}
                            className={`flex-1 w-full py-5 rounded-md font-medium uppercase text-[11px] tracking-[0.15em] transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                !targetSalesperson || isTransferring || targetSalesperson === lead.salesperson
                                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    : 'bg-slate-900 text-white hover:bg-blue-600 shadow-none shadow-none-slate-200 hover:shadow-none-blue-200'
                            }`}
                        >
                            {isTransferring ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    Transferindo...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-outlined text-base">verified</span>
                                    Confirmar Transferência
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isTransferring}
                            className="md:w-auto w-full px-8 py-5 text-slate-400 font-medium uppercase text-[9px] tracking-widest hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 rounded-md"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
