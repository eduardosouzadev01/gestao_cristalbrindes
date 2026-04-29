'use client';

import React from 'react';
import { Lead } from '@/hooks/useCRM';
import { fixClientName } from '@/utils/textUtils';
import { maskPhone, maskCpfCnpj } from '@/utils/maskUtils';

export interface LeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingLead: Lead | null;
    newLead: Partial<Lead>;
    setNewLead: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
    initialLeadState: Partial<Lead>;
    partnerSaved: boolean;
    setPartnerSaved: React.Dispatch<React.SetStateAction<boolean>>;
    showClientForm: boolean;
    setShowClientForm: React.Dispatch<React.SetStateAction<boolean>>;
    clientSearchTerm: string;
    setClientSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    clientSearchResults: any[];
    setClientSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
    isSavingPartner: boolean;
    handleSavePartner: () => void;
    saveLead: () => void;
    appUser: any;
    userSalesperson: string;
    isSeller: boolean;
    setSelectedClientToTransfer: (client: any) => void;
    setIsTransferModalOpen: (open: boolean) => void;
    onDelete?: (id: string) => void;
}

export const LeadModal: React.FC<LeadModalProps> = ({
    isOpen,
    onClose,
    editingLead,
    newLead,
    setNewLead,
    initialLeadState,
    partnerSaved,
    setPartnerSaved,
    showClientForm,
    setShowClientForm,
    clientSearchTerm,
    setClientSearchTerm,
    clientSearchResults,
    setClientSearchResults,
    isSavingPartner,
    handleSavePartner,
    saveLead,
    appUser,
    userSalesperson,
    isSeller,
    setSelectedClientToTransfer,
    setIsTransferModalOpen,
    onDelete
}) => {
    const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

    if (!isOpen) return null;

    const handleDeleteClick = () => {
        setIsConfirmingDelete(true);
    };

    const confirmDelete = () => {
        if (editingLead && onDelete) {
            onDelete(editingLead.id);
            setIsConfirmingDelete(false);
        }
    };

    const SALESPERSONS = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05'];

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-[#1A1A1A]/40 backdrop-blur-sm p-0 sm:p-4 transition-all animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-6xl max-h-[95vh] sm:rounded-md rounded-t-[2.0rem] shadow-none overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-500 border border-[#E3E3E4]">
                
                {/* Modal Header */}
                <div className="px-8 py-8 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFBFC] shrink-0">
                    <div>
                        <h3 className="text-[20px] font-medium text-[#242424] flex items-center gap-4 font-jakarta">
                            <div className={`w-12 h-12 rounded-md flex items-center justify-center ${editingLead ? 'bg-[#EBF3FC] text-[#0F6CBD]' : 'bg-[#D1FAE5] text-[#059669]'}`}>
                                <span className="material-icons-outlined text-2xl">{editingLead ? 'edit_square' : 'add_circle'}</span>
                            </div>
                            {editingLead ? 'Editar Atendimento' : 'Novo Atendimento CRM'}
                        </h3>
                        <p className="text-[11px] text-[#707070] font-medium uppercase tracking-[0.04em] mt-1.5 ml-16 font-jakarta">
                            {editingLead ? 'Atualize as informações do lead com precisão' : 'Cadastre um novo contato na sua base de oportunidades'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 flex items-center justify-center rounded-md bg-[#F5F5F5] text-[#707070] hover:bg-[#FEE2E2] hover:text-[#DC2626] transition-all active:scale-95 border border-[#E0E0E0]"
                    >
                        <span className="material-icons-outlined text-xl">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E0E0E0]">
                        
                        {/* Left Column: Client Data */}
                        <div className="p-8 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#242424]">
                                    <span className="material-icons-outlined text-[#0F6CBD]">person_search</span>
                                    <h4 className="text-[11px] font-medium uppercase tracking-[0.04em] font-jakarta">Identificação do Cliente</h4>
                                </div>
                                {partnerSaved && (
                                    <span className="bg-[#D1FAE5] text-[#065F46] text-[10px] font-medium uppercase tracking-[0.04em] px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-[#6EE7B7] shadow-none font-jakarta">
                                        <span className="material-icons-outlined text-[16px]">verified</span>
                                        Vinculado
                                    </span>
                                )}
                            </div>

                            {!editingLead && !showClientForm && (
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#707070] group-focus-within:text-[#0F6CBD] transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            className="w-full h-14 pl-14 pr-6 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-[14px] font-medium text-[#242424] focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all placeholder:text-[#BDBDBD] font-jakarta uppercase tracking-tight"
                                            placeholder="BUSCAR NOME, E-MAIL OU TELEFONE..."
                                            value={clientSearchTerm}
                                            onChange={e => setClientSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {clientSearchResults.length > 0 && (
                                        <div className="bg-white border border-[#D1D1D1] rounded-md shadow-none max-h-72 overflow-y-auto divide-y divide-[#E0E0E0] animate-in fade-in slide-in-from-top-4 mt-[-10px]">
                                            {clientSearchResults.map(client => (
                                                <div
                                                    key={client.id}
                                                    className="p-5 hover:bg-[#EBF3FC] cursor-pointer flex justify-between items-center transition-colors group"
                                                    onClick={() => {
                                                        const isManager = appUser?.role === 'ADMIN' || appUser?.role === 'GESTAO' || appUser?.role === 'SUPERVISOR';
                                                        if (!isManager && client.salesperson && userSalesperson && client.salesperson !== userSalesperson) {
                                                            setSelectedClientToTransfer(client);
                                                            setIsTransferModalOpen(true);
                                                            return;
                                                        }
                                                        setNewLead({ ...newLead, client_id: client.id, client_name: client.name, client_contact_name: client.contact_name, client_phone: client.phone, client_email: client.email, client_doc: client.doc, salesperson: userSalesperson || client.salesperson || 'VENDAS 01' });
                                                        setClientSearchTerm(''); setClientSearchResults([]); setShowClientForm(true); setPartnerSaved(true);
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-md bg-[#F5F5F5] flex items-center justify-center text-[#707070] group-hover:bg-[#0F6CBD] group-hover:text-white transition-all shadow-none">
                                                            <span className="material-icons-outlined text-lg">person</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-[#242424] text-[14px] group-hover:text-[#0F6CBD] transition-colors font-jakarta uppercase tracking-tight">{fixClientName(client.name)}</p>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1 font-jakarta">
                                                                <span className="text-[10px] font-medium text-[#707070] uppercase tracking-wider">{client.contact_name || 'SEM CONTATO'}</span>
                                                                <span className="text-[#D1D1D1]">•</span>
                                                                <span className="text-[10px] font-medium text-[#0F6CBD] lowercase">{client.email || 'SEM E-MAIL'}</span>
                                                                <span className="text-[#D1D1D1]">•</span>
                                                                <span className="text-[10px] font-medium text-[#707070] tabular-nums">{client.phone || client.doc || 'S/ DADOS'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="material-icons-outlined text-[#D1D1D1] group-hover:text-[#0F6CBD] transition-colors">arrow_forward</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-6 py-2">
                                        <div className="flex-1 h-px bg-[#E0E0E0]"></div>
                                        <span className="text-[10px] font-medium text-[#D1D1D1] uppercase tracking-[0.04em] font-jakarta">OU</span>
                                        <div className="flex-1 h-px bg-[#E0E0E0]"></div>
                                    </div>

                                    <button
                                        onClick={() => { setShowClientForm(true); setPartnerSaved(false); setNewLead({...initialLeadState, salesperson: userSalesperson || 'VENDAS 01'}); }}
                                        className="w-full py-6 bg-white border-2 border-dashed border-[#D1D1D1] text-[#707070] font-medium text-[11px] uppercase tracking-[0.04em] rounded-md hover:border-[#0F6CBD] hover:text-[#0F6CBD] hover:bg-[#EBF3FC]/30 transition-all flex justify-center items-center gap-3 group font-jakarta"
                                    >
                                        <span className="material-icons-outlined text-xl group-hover:scale-110 transition-transform">person_add</span>
                                        NOVO CADASTRO MANUAL
                                    </button>
                                </div>
                            )}

                            {(editingLead || showClientForm) && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">EMPRESA / RAZÃO SOCIAL *</label>
                                        <input
                                            className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta uppercase tracking-tight"
                                            placeholder="NOME DA EMPRESA OU CLIENTE"
                                            value={newLead.client_name || ''}
                                            onChange={e => { setNewLead({ ...newLead, client_name: e.target.value }); setPartnerSaved(false); }}
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">CONTATO/NOME</label>
                                            <input
                                                className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta uppercase tracking-tight"
                                                placeholder="PESSOA DE CONTATO"
                                                value={newLead.client_contact_name || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_contact_name: e.target.value }); setPartnerSaved(false); }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">DOCUMENTO (CNPJ/CPF)</label>
                                            <input
                                                className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta tabular-nums"
                                                placeholder="00.000.000/0001-00"
                                                value={newLead.client_doc || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_doc: maskCpfCnpj(e.target.value) }); setPartnerSaved(false); }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">WHATSAPP</label>
                                            <input
                                                className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta tabular-nums"
                                                placeholder="(00) 00000-0000"
                                                value={newLead.client_phone || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_phone: maskPhone(e.target.value) }); setPartnerSaved(false); }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">E-MAIL</label>
                                            <input
                                                type="email"
                                                className="w-full h-12 px-4 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:bg-white focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta"
                                                placeholder="exemplo@empresa.com"
                                                value={newLead.client_email || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_email: e.target.value.toLowerCase() }); setPartnerSaved(false); }}
                                            />
                                        </div>
                                    </div>

                                    {!partnerSaved ? (
                                        <button
                                            onClick={handleSavePartner}
                                            disabled={isSavingPartner}
                                            className="w-full py-5 bg-[#242424] text-white text-[11px] font-medium uppercase tracking-[0.04em] rounded-md hover:bg-[#000000] transition-all active:scale-95 flex justify-center items-center gap-3 shadow-none font-jakarta"
                                        >
                                            {isSavingPartner ? <span className="material-icons-outlined animate-spin text-[18px]">sync</span> : <span className="material-icons-outlined">save</span>}
                                            VINCULAR CLIENTE À BASE
                                        </button>
                                    ) : (
                                        !editingLead && (
                                            <button 
                                                onClick={() => { setShowClientForm(false); setPartnerSaved(false); setNewLead(initialLeadState); }}
                                                className="w-full py-3 bg-[#F5F5F5] text-[#707070] hover:text-[#242424] hover:bg-[#E0E0E0] text-[10px] font-medium uppercase tracking-[0.04em] rounded-md transition-all flex items-center justify-center gap-2 border border-[#D1D1D1] font-jakarta"
                                            >
                                                <span className="material-icons-outlined text-[16px]">swap_horiz</span> ALTERAR SELEÇÃO
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Lead Data */}
                        <div className="p-8 space-y-8 bg-[#FAFBFC]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#242424]">
                                    <span className="material-icons-outlined text-[#0F6CBD]">assignment_turned_in</span>
                                    <h4 className="text-[11px] font-medium uppercase tracking-[0.04em] font-jakarta">Detalhes da Oportunidade</h4>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">VENDEDOR RESPONSÁVEL *</label>
                                    <div className="relative">
                                        <select
                                            className={`w-full h-12 pl-4 pr-10 bg-white border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] appearance-none shadow-none font-jakarta ${isSeller ? 'cursor-not-allowed bg-[#F9FAFB]' : 'focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD]'}`}
                                            value={newLead.salesperson || ''}
                                            onChange={e => setNewLead({ ...newLead, salesperson: e.target.value })}
                                            disabled={isSeller}
                                        >
                                            <option value="" disabled>ESCOLHA UM VENDEDOR</option>
                                            {SALESPERSONS.map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <span className="material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#707070] pointer-events-none">expand_more</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">PRODUTO / SERVIÇO DE INTERESSE *</label>
                                    <input
                                        className="w-full h-12 px-4 bg-white border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta uppercase tracking-tight"
                                        placeholder="EX: 500 CANETAS PERSONALIZADAS"
                                        value={newLead.closing_metadata?.quoted_item || ''}
                                        onChange={e => setNewLead({ ...newLead, closing_metadata: { ...(newLead.closing_metadata || {}), quoted_item: e.target.value } })}
                                    />
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {['Caneta', 'Ecobag', 'Caderneta', 'Copo', 'Garrafa', 'Bolsa Térmica'].map(item => (
                                            <button
                                                key={item}
                                                type="button"
                                                onClick={() => setNewLead({ ...newLead, closing_metadata: { ...(newLead.closing_metadata || {}), quoted_item: item } })}
                                                className="px-3 py-1.5 bg-[#F5F5F5] text-[#707070] text-[10px] font-medium uppercase tracking-[0.04em] rounded-md hover:bg-[#EBF3FC] hover:text-[#0F6CBD] hover:border-[#0F6CBD] transition-all border border-[#E0E0E0]"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                 <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">Nº DO ORÇAMENTO</label>
                                        <input
                                            className="w-full h-12 px-4 bg-white border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta uppercase tracking-tight"
                                            placeholder="EX: 12345"
                                            value={newLead.budget_number || ''}
                                            onChange={e => setNewLead({ ...newLead, budget_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">DATA DO ORÇAMENTO</label>
                                        <input
                                            type="date"
                                            className="w-full h-12 px-4 bg-white border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none font-jakarta"
                                            value={newLead.budget_date || ''}
                                            onChange={e => setNewLead({ ...newLead, budget_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#707070] uppercase tracking-[0.04em] ml-1 font-jakarta">ANOTAÇÕES DO ATENDIMENTO</label>
                                    <textarea
                                        className="w-full p-4 bg-white border border-[#D1D1D1] rounded-md text-[13px] font-medium text-[#242424] focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all shadow-none min-h-[160px] resize-none font-jakarta uppercase tracking-tight leading-relaxed"
                                        placeholder="DESCREVA AS NECESSIDADES DO CLIENTE, PRAZOS E DETALHES TÉCNICOS..."
                                        value={newLead.closing_metadata?.wa_template || ''}
                                        onChange={e => setNewLead({ ...newLead, closing_metadata: { ...(newLead.closing_metadata || {}), wa_template: e.target.value } })}
                                    ></textarea>
                                </div>

                                {/* Reminders Section */}
                                {editingLead && (
                                    <div className="pt-6 border-t border-[#E0E0E0] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[#242424]">
                                                <span className="material-icons-outlined text-[#0F6CBD]">alarm_add</span>
                                                <h4 className="text-[11px] font-medium uppercase tracking-[0.04em] font-jakarta">Agendar Aviso / Retorno</h4>
                                            </div>
                                        </div>

                                        <div className="bg-white p-6 rounded-md border border-[#E0E0E0] space-y-4 shadow-sm">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest font-jakarta">DATA E HORA</label>
                                                    <input 
                                                        type="datetime-local" 
                                                        id="reminder_at"
                                                        className="w-full h-11 px-3 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-xs font-medium text-[#242424] focus:bg-white focus:border-[#0F6CBD] transition-all font-jakarta"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest font-jakarta">ASSUNTO</label>
                                                    <input 
                                                        type="text" 
                                                        id="reminder_title"
                                                        placeholder="Ex: Retornar sobre nota"
                                                        className="w-full h-11 px-3 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-xs font-medium text-[#242424] focus:bg-white focus:border-[#0F6CBD] transition-all font-jakarta uppercase"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-[#707070] uppercase tracking-widest font-jakarta">DESCRIÇÃO DO AVISO</label>
                                                <textarea 
                                                    id="reminder_message"
                                                    placeholder="Detalhes do que precisa ser feito..."
                                                    className="w-full p-3 bg-[#F9FAFB] border border-[#D1D1D1] rounded-md text-xs font-medium text-[#242424] focus:bg-white focus:border-[#0F6CBD] transition-all font-jakarta uppercase resize-none h-20"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const dateVal = (document.getElementById('reminder_at') as HTMLInputElement).value;
                                                    const titleVal = (document.getElementById('reminder_title') as HTMLInputElement).value;
                                                    const msgVal = (document.getElementById('reminder_message') as HTMLInputElement).value;

                                                    if (!dateVal || !titleVal) {
                                                        import('sonner').then(({ toast }) => toast.error('Data e Título são obrigatórios.'));
                                                        return;
                                                    }

                                                    try {
                                                        const { error } = await import('@/lib/supabase').then(({ supabase }) => 
                                                            supabase.from('crm_reminders').insert([{
                                                                lead_id: editingLead.id,
                                                                user_email: appUser.email,
                                                                title: titleVal,
                                                                message: msgVal,
                                                                scheduled_at: new Date(dateVal).toISOString()
                                                            }])
                                                        );

                                                        if (error) throw error;
                                                        
                                                        import('sonner').then(({ toast }) => toast.success('Aviso agendado com sucesso!'));
                                                        
                                                        // Clear inputs
                                                        (document.getElementById('reminder_at') as HTMLInputElement).value = '';
                                                        (document.getElementById('reminder_title') as HTMLInputElement).value = '';
                                                        (document.getElementById('reminder_message') as HTMLInputElement).value = '';
                                                    } catch (err: any) {
                                                        import('sonner').then(({ toast }) => toast.error('Erro ao agendar: ' + err.message));
                                                    }
                                                }}
                                                className="w-full py-3 bg-[#242424] text-white text-[10px] font-bold uppercase tracking-widest rounded-md hover:bg-black transition-all flex items-center justify-center gap-2 font-jakarta shadow-md"
                                            >
                                                <span className="material-icons-outlined text-lg">calendar_today</span>
                                                AGENDAR AVISO
                                            </button>
                                        </div>

                                        {/* List of Pending Reminders */}
                                        <ReminderList leadId={editingLead.id} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-8 py-8 bg-[#F9FAFB] border-t border-[#E0E0E0] flex flex-col sm:flex-row justify-between items-center gap-6 shrink-0">
                    <div className="w-full sm:w-auto">
                        {editingLead && onDelete && (
                            !isConfirmingDelete ? (
                                <button
                                    onClick={handleDeleteClick}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-[11px] font-medium uppercase tracking-[0.04em] text-[#DC2626] hover:bg-[#FEE2E2] rounded-md transition-all border border-transparent hover:border-[#FCA5A5] active:scale-95 font-jakarta"
                                >
                                    <span className="material-icons-outlined text-[20px]">delete_forever</span>
                                    Excluir Atendimento
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 p-2 bg-[#FEE2E2] rounded-md animate-in zoom-in-95 duration-200 shadow-none border border-[#FCA5A5]">
                                    <span className="text-[10px] font-medium text-[#991B1B] uppercase tracking-[0.04em] px-3 font-jakarta">TEM CERTEZA?</span>
                                    <button
                                        onClick={confirmDelete}
                                        className="px-6 py-2.5 bg-[#DC2626] text-white text-[10px] font-medium uppercase tracking-[0.04em] rounded-md hover:bg-[#991B1B] transition-all shadow-none active:scale-90 font-jakarta"
                                    >
                                        Sim, Confirmar
                                    </button>
                                    <button
                                        onClick={() => setIsConfirmingDelete(false)}
                                        className="px-6 py-2.5 bg-white text-[#424242] text-[10px] font-medium uppercase tracking-[0.04em] rounded-md hover:bg-[#F5F5F5] transition-all border border-[#D1D1D1] font-jakarta"
                                    >
                                        Não, Cancelar
                                    </button>
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex w-full sm:w-auto gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 sm:flex-initial px-10 py-4 rounded-md text-[11px] font-medium uppercase tracking-[0.04em] text-[#707070] bg-white border border-[#D1D1D1] hover:bg-[#F5F5F5] transition-all active:scale-95 shadow-none font-jakarta"
                        >
                            FECHAR
                        </button>
                        <button
                            onClick={saveLead}
                            disabled={!partnerSaved}
                            className={`flex-1 sm:flex-initial px-10 py-4 rounded-md text-[11px] font-medium uppercase tracking-[0.04em] flex items-center justify-center gap-3 transition-all shadow-none font-jakarta ${partnerSaved ? 'bg-[#0F6CBD] text-white hover:bg-[#115EA3] active:scale-95 shadow-none-[#0F6CBD]/30' : 'bg-[#E0E0E0] text-[#BDBDBD] cursor-not-allowed shadow-none'}`}
                        >
                            {partnerSaved && <span className="material-icons-outlined text-[20px]">check_circle</span>}
                            {editingLead ? 'SALVAR ALTERAÇÕES' : 'INICIAR ATENDIMENTO'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

    );
};

const ReminderList: React.FC<{ leadId: string }> = ({ leadId }) => {
    const [reminders, setReminders] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    const fetchReminders = React.useCallback(async () => {
        try {
            const { data, error } = await import('@/lib/supabase').then(({ supabase }) => 
                supabase
                    .from('crm_reminders')
                    .select('*')
                    .eq('lead_id', leadId)
                    .is('acknowledged_at', null)
                    .order('scheduled_at', { ascending: true })
            );

            if (!error && data) {
                setReminders(data);
            }
        } catch (err) {
            console.error('Error fetching reminders:', err);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    React.useEffect(() => {
        fetchReminders();
    }, [fetchReminders]);

    if (loading) return null;
    if (reminders.length === 0) return null;

    return (
        <div className="space-y-3">
            <h5 className="text-[9px] font-bold text-[#707070] uppercase tracking-widest font-jakarta">Lembretes Pendentes</h5>
            <div className="space-y-2">
                {reminders.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-white border border-[#E0E0E0] rounded-md shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#EBF3FC] flex items-center justify-center text-[#0F6CBD]">
                                <span className="material-icons-outlined text-sm">alarm</span>
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-[#242424] uppercase font-jakarta">{r.title}</p>
                                <p className="text-[10px] text-[#707070] font-jakarta">
                                    {new Date(r.scheduled_at).toLocaleString('pt-BR')}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={async () => {
                                try {
                                    const { error } = await import('@/lib/supabase').then(({ supabase }) => 
                                        supabase
                                            .from('crm_reminders')
                                            .update({ acknowledged_at: new Date().toISOString() })
                                            .eq('id', r.id)
                                    );
                                    if (!error) fetchReminders();
                                } catch (err) {
                                    console.error('Error acknowledging reminder:', err);
                                }
                            }}
                            className="text-[10px] font-bold text-[#DC2626] hover:underline uppercase tracking-widest font-jakarta"
                        >
                            Remover
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
