'use client';

import React, { useState } from 'react';
import { useSearchPartners, useUpdatePartner } from '@/hooks/useCRM';
import { fixClientName } from '@/utils/textUtils';
import { toast } from 'sonner';

interface ClientInfoProps {
    clientData: any;
    setClientData: (data: any) => void;
    isLocked?: boolean;
}

export default function ClientInfo({ clientData, setClientData, isLocked }: ClientInfoProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditingMode, setIsEditingMode] = useState(false);
    const { data: results = [], isLoading } = useSearchPartners(searchTerm, 'CLIENTE');
    const updatePartner = useUpdatePartner();

    return (
        <div className="bg-white p-6 rounded-md border border-slate-300 shadow-none space-y-4 font-sans h-full">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="material-icons-outlined text-slate-800 text-lg">person</span>
                    <h3 className="text-[10px] font-medium text-slate-800 uppercase tracking-wider">Cliente</h3>
                </div>
                {!clientData.id && (
                    <div className="flex items-center gap-2 flex-1 max-w-md ml-8">
                        <div className="relative flex-1 group">
                            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                            <input
                                type="text"
                                className="w-full h-9 pl-9 pr-4 bg-white border border-slate-300 rounded-md text-xs font-medium outline-none focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all"
                                placeholder="Buscar parceiro por nome ou documento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {isLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-[#0F6CBD]/20 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                                </div>
                            )}
                            
                            {results.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E3E3E4] rounded-md shadow-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {results.map((partner) => (
                                        <button
                                            key={partner.id}
                                            onClick={() => {
                                                setClientData({
                                                    id: partner.id,
                                                    name: partner.name || '',
                                                    contactName: partner.contact_name || '',
                                                    doc: partner.doc || '',
                                                    phone: partner.phone || '',
                                                    email: partner.email || '',
                                                    emailFin: partner.financial_email || ''
                                                });
                                                setSearchTerm('');
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-[#F9FAFB] flex flex-col gap-0.5 border-b border-[#F5F5F8] last:border-0 group transition-all"
                                        >
                                            <span className="text-[13px] font-medium text-[#111827] group-hover:text-[#0F6CBD] transition-colors">{partner.name}</span>
                                            <span className="text-[10px] font-medium text-[#717171] uppercase">{partner.doc || 'Sem documento'}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {clientData.id && !isEditingMode && (
                    <button 
                        onClick={() => setIsEditingMode(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 uppercase tracking-wider transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-[13px]">edit</span>
                        Atualizar Cadastro do Cliente
                    </button>
                )}
                {clientData.id && isEditingMode && (
                    <button 
                        onClick={async () => {
                            if (!clientData.id) return;
                            try {
                                await updatePartner.mutateAsync({
                                    id: clientData.id,
                                    updates: {
                                        name: clientData.name,
                                        contact_name: clientData.contactName,
                                        doc: clientData.doc,
                                        phone: clientData.phone,
                                        email: clientData.email,
                                        financial_email: clientData.emailFin
                                    }
                                });
                                toast.success('Os dados deste cliente foram atualizados com sucesso em todo o sistema!');
                                setIsEditingMode(false);
                            } catch {
                                toast.error('Erro ao atualizar dados do cliente.');
                            }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-medium text-white bg-[#059669] hover:bg-[#047857] shadow-sm uppercase tracking-wider transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-[13px]">save</span>
                        Salvar e Finalizar Edição
                    </button>
                )}
            </div>

            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-6">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Empresa / Razão Social</label>
                    <input
                        readOnly={!isEditingMode}
                        className={`w-full h-11 px-3 border rounded-md text-[13px] font-medium transition-all uppercase ${isEditingMode ? 'bg-white border-slate-300 text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800' : 'bg-[#F9FAFB] border-slate-200 text-slate-500 cursor-not-allowed outline-none'}`}
                        value={fixClientName(clientData.name || '')}
                        onChange={e => setClientData({ ...clientData, name: e.target.value })}
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Contato/Nome</label>
                    <input
                        readOnly={!isEditingMode}
                        className={`w-full h-11 px-3 border rounded-md text-[13px] font-medium transition-all uppercase ${isEditingMode ? 'bg-white border-slate-300 text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800' : 'bg-[#F9FAFB] border-slate-200 text-slate-500 cursor-not-allowed outline-none'}`}
                        value={clientData.contactName || ''}
                        onChange={e => setClientData({ ...clientData, contactName: e.target.value })}
                    />
                </div>

                <div className="col-span-12 md:col-span-3">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">Documento (CPF/CNPJ)</label>
                    <input
                        readOnly={!isEditingMode}
                        className={`w-full h-11 px-3 border rounded-md text-[13px] font-medium transition-all tabular-nums ${isEditingMode ? 'bg-white border-slate-300 text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800' : 'bg-[#F9FAFB] border-slate-200 text-slate-500 cursor-not-allowed outline-none'}`}
                        value={clientData.doc || ''}
                        onChange={e => setClientData({ ...clientData, doc: e.target.value })}
                    />
                </div>

                <div className="col-span-12 md:col-span-4">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">WhatsApp / Telefone</label>
                    <input
                        readOnly={!isEditingMode}
                        className={`w-full h-11 px-3 border rounded-md text-[13px] font-medium transition-all tabular-nums ${isEditingMode ? 'bg-white border-slate-300 text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800' : 'bg-[#F9FAFB] border-slate-200 text-slate-500 cursor-not-allowed outline-none'}`}
                        value={clientData.phone || ''}
                        onChange={e => setClientData({ ...clientData, phone: e.target.value })}
                    />
                </div>

                <div className="col-span-12 md:col-span-4">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">E-Mail Comercial</label>
                    <input
                        readOnly={!isEditingMode}
                        className={`w-full h-11 px-3 border rounded-md text-[13px] font-medium transition-all ${isEditingMode ? 'bg-white border-slate-300 text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800' : 'bg-[#F9FAFB] border-slate-200 text-slate-500 cursor-not-allowed outline-none'}`}
                        value={clientData.email || ''}
                        onChange={e => setClientData({ ...clientData, email: e.target.value })}
                    />
                </div>

                <div className="col-span-12 md:col-span-4">
                    <label className="block text-[9px] font-medium text-[#717171] uppercase mb-1 ml-1 tracking-wider">E-Mail Financeiro</label>
                    <input
                        readOnly={!isEditingMode}
                        className={`w-full h-11 px-3 border rounded-md text-[13px] font-medium transition-all ${isEditingMode ? 'bg-white border-slate-300 text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800' : 'bg-[#F9FAFB] border-slate-200 text-slate-500 cursor-not-allowed outline-none'}`}
                        value={clientData.emailFin || ''}
                        onChange={e => setClientData({ ...clientData, emailFin: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}
