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

import { EditableSelect } from '../common/EditableSelect';

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

            <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-3">
                    <EditableSelect
                        label="Validade"
                        value={validity}
                        onChange={setValidity}
                        disabled={isLocked}
                        placeholder="Ex: 15 dias"
                        options={['1 dia', '2 dias', '3 dias', '7 dias', '10 dias', '15 dias']}
                    />
                </div>

                <div className="col-span-12 md:col-span-6">
                    <EditableSelect
                        label="Frete"
                        value={shipping}
                        onChange={setShipping}
                        disabled={isLocked}
                        placeholder="Condições de frete..."
                        options={[
                            'Frete incluso para Grande Vitória, exceto Guarapari.',
                            'Cliente retira.',
                            'Frete incluso.',
                            'Frete por conta do cliente.'
                        ]}
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <EditableSelect
                        label="Prazo Entrega"
                        value={deadline}
                        onChange={setDeadline}
                        disabled={isLocked}
                        placeholder="Prazo de entrega..."
                        options={[
                            '3 dias úteis.',
                            '7 dias úteis.',
                            '10 dias úteis',
                            '14 dias úteis',
                            '15 dias úteis.',
                            '15 / 20 dias úteis'
                        ]}
                    />
                </div>

                <div className="col-span-12 md:col-span-6">
                    <EditableSelect
                        label="Pagamento"
                        value={payment}
                        onChange={setPayment}
                        disabled={isLocked}
                        placeholder="Condições de pagamento..."
                        options={[
                            '50% no pedido e 50% no pedido pronto.',
                            '50% no pedido + 50% 30 Dias (Acrescimo 5%)',
                            '1 vez no cartão de crédito.',
                            '7 dias faturamento',
                            '10 dias faturamento',
                            '14 dias faturamento',
                            '21 dias faturamento',
                            '30 dias faturamento'
                        ]}
                    />
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
