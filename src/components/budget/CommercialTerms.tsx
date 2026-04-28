'use client';

import React from 'react';

interface CommercialTermsProps {
    validity: string;
    setValidity: (v: string) => void;
    shipping: string;
    setShipping: (v: string) => void;
    deadline: string;
    setDeadline: (v: string) => void;
    payment: string;
    setPayment: (v: string) => void;
    observation: string;
    setObservation: (v: string) => void;
    isLocked?: boolean;
}

export default function CommercialTerms({
    validity, setValidity,
    shipping, setShipping,
    deadline, setDeadline,
    payment, setPayment,
    observation, setObservation,
    isLocked = false
}: CommercialTermsProps) {
    return (
        <div className="bg-white p-6 rounded-md border border-slate-300 shadow-none space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-slate-800 text-lg">description</span>
                    <h3 className="text-[10px] font-medium text-slate-800 uppercase tracking-wider">Condições</h3>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-3">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Validade</label>
                    <select
                        disabled={isLocked}
                        className="w-full h-11 px-3 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all cursor-pointer"
                        value={validity || '7 dias'}
                        onChange={(e) => setValidity(e.target.value)}
                    >
                        <option value="1 dia">1 dia</option>
                        <option value="2 dias">2 dias</option>
                        <option value="3 dias">3 dias</option>
                        <option value="7 dias">7 dias</option>
                        <option value="10 dias">10 dias</option>
                    </select>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Frete</label>
                    <select
                        disabled={isLocked}
                        className="w-full h-11 px-3 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all cursor-pointer"
                        value={shipping || 'Frete incluso para Grande Vitória, exceto Guarapari.'}
                        onChange={(e) => setShipping(e.target.value)}
                    >
                        <option value="Frete incluso para Grande Vitória, exceto Guarapari.">Frete incluso para GV (exceto Guarapari)</option>
                        <option value="Cliente retira.">Cliente retira.</option>
                        <option value="Frete incluso.">Frete incluso.</option>
                        <option value="Frete por conta do cliente.">Frete por conta do cliente.</option>
                    </select>
                </div>

                <div className="col-span-12 md:col-span-3">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Prazo Entrega</label>
                    <select
                        disabled={isLocked}
                        className="w-full h-11 px-3 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all cursor-pointer"
                        value={deadline || '15/20 dias úteis'}
                        onChange={(e) => setDeadline(e.target.value)}
                    >
                        <option value="3 dias úteis.">3 dias úteis.</option>
                        <option value="7 dias úteis.">7 dias úteis.</option>
                        <option value="10 dias úteis">10 dias úteis</option>
                        <option value="14 dias úteis">14 dias úteis</option>
                        <option value="15 dias úteis.">15 dias úteis.</option>
                        <option value="15/20 dias úteis">15/20 dias úteis</option>
                    </select>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Pagamento</label>
                    <select
                        disabled={isLocked}
                        className="w-full h-11 px-3 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all cursor-pointer"
                        value={payment || '50% no pedido e 50% no pedido pronto.'}
                        onChange={(e) => setPayment(e.target.value)}
                    >
                        <option value="50% no pedido e 50% no pedido pronto.">50% no pedido e 50% no pedido pronto.</option>
                        <option value="1 vez no cartão de crédito.">1 vez no cartão de crédito.</option>
                        <option value="7 dias faturamento">7 dias faturamento</option>
                        <option value="10 dias faturamento">10 dias faturamento</option>
                        <option value="14 dias faturamento">14 dias faturamento</option>
                        <option value="21 dias faturamento">21 dias faturamento</option>
                        <option value="30 dias faturamento">30 dias faturamento</option>
                    </select>
                </div>

                <div className="col-span-12 md:col-span-6">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Observações</label>
                    <textarea
                        disabled={isLocked}
                        className="w-full h-11 px-3 py-2.5 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all resize-none"
                        value={observation}
                        onChange={(e) => setObservation(e.target.value)}
                        placeholder="Observações adicionais..."
                        rows={1}
                    />
                </div>
            </div>
        </div>
    );
}
