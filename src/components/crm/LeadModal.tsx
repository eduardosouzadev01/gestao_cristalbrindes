import React from 'react';
import { Lead } from '../../hooks/useCRM';
import { fixClientName } from '../../utils/textUtils';
import { maskPhone, maskCpfCnpj } from '../../utils/maskUtils';

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

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 transition-all">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
                
                {/* Modal Header */}
                <div className="px-6 lg:px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            {editingLead ? (
                                <><span className="material-icons-outlined text-blue-500">edit_square</span> Editar Atendimento</>
                            ) : (
                                <><span className="material-icons-outlined text-emerald-500">add_circle</span> Novo Atendimento CRM</>
                            )}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            {editingLead ? 'Atualize as informações do lead selecionado' : 'Cadastre um novo contato para acompanhamento'}
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition"
                    >
                        <span className="material-icons-outlined text-lg">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
                        
                        {/* Left Column: Client Data */}
                        <div className="flex flex-col space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 text-slate-800">
                                    <span className="material-icons-outlined text-blue-500">badge</span>
                                    <h4 className="text-sm font-bold uppercase tracking-wide">ID do Cliente</h4>
                                </div>
                                {partnerSaved && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <span className="material-icons-outlined text-[12px]">check_circle</span>
                                        Vinculado
                                    </span>
                                )}
                            </div>

                            {!editingLead && !showClientForm && (
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <span className="material-icons-outlined text-lg">search</span>
                                        </div>
                                        <input
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                                            placeholder="Buscar cliente na base..."
                                            value={clientSearchTerm}
                                            onChange={e => setClientSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {clientSearchResults.length > 0 && (
                                        <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                                            {clientSearchResults.map(l => (
                                                <div
                                                    key={l.id}
                                                    className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                                                    onClick={() => {
                                                        const isManager = appUser?.role === 'ADMIN' || appUser?.role === 'GESTAO' || appUser?.role === 'SUPERVISOR';
                                                        if (!isManager && l.salesperson && userSalesperson && l.salesperson !== userSalesperson) {
                                                            setSelectedClientToTransfer(l);
                                                            setIsTransferModalOpen(true);
                                                            return;
                                                        }
                                                        setNewLead({ ...newLead, client_id: l.id, client_name: l.name, client_contact_name: l.contact_name, client_phone: l.phone, client_email: l.email, client_doc: l.doc, salesperson: userSalesperson || l.salesperson || 'VENDAS 01' });
                                                        setClientSearchTerm(''); setClientSearchResults([]); setShowClientForm(true); setPartnerSaved(true);
                                                    }}
                                                >
                                                    <div className="text-sm">
                                                        <p className="font-bold text-slate-800">{fixClientName(l.name)}</p>
                                                        <p className="text-xs text-slate-500">{l.phone || l.doc || 'Sem contato'}</p>
                                                    </div>
                                                    <span className="material-icons-outlined text-slate-400 hover:text-blue-500">add_circle</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="relative py-2 hidden sm:block">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-slate-200"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="bg-white px-2 text-xs text-slate-400">ou</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setShowClientForm(true); setPartnerSaved(false); setNewLead({...initialLeadState, salesperson: userSalesperson || 'VENDAS 01'}); }}
                                        className="w-full py-2.5 bg-white border-2 border-dashed border-slate-300 text-slate-600 font-medium rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors flex justify-center items-center gap-2 text-sm"
                                    >
                                        <span className="material-icons-outlined text-lg">person_add</span> Cadastrar Novo
                                    </button>
                                </div>
                            )}

                            {(editingLead || showClientForm) && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Empresa / Razão Social <span className="text-red-500">*</span></label>
                                        <input
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            placeholder="Nome do cliente"
                                            value={newLead.client_name || ''}
                                            onChange={e => { setNewLead({ ...newLead, client_name: e.target.value }); setPartnerSaved(false); }}
                                            disabled={partnerSaved && !editingLead}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Contato/Nome</label>
                                            <input
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="Responsável"
                                                value={newLead.client_contact_name || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_contact_name: e.target.value }); setPartnerSaved(false); }}
                                                disabled={partnerSaved && !editingLead}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Doc (CPF/CNPJ)</label>
                                            <input
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="000.000.000-00"
                                                value={newLead.client_doc || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_doc: maskCpfCnpj(e.target.value) }); setPartnerSaved(false); }}
                                                disabled={partnerSaved && !editingLead}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp</label>
                                            <input
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="(00) 00000-0000"
                                                value={newLead.client_phone || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_phone: maskPhone(e.target.value) }); setPartnerSaved(false); }}
                                                disabled={partnerSaved && !editingLead}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail</label>
                                            <input
                                                type="email"
                                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="email@exemplo.com"
                                                value={newLead.client_email || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_email: e.target.value.toLowerCase() }); setPartnerSaved(false); }}
                                                disabled={partnerSaved && !editingLead}
                                            />
                                        </div>
                                    </div>

                                    {!partnerSaved ? (
                                        <button
                                            onClick={handleSavePartner}
                                            disabled={isSavingPartner}
                                            className="w-full py-2.5 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition flex justify-center items-center gap-2 mt-2"
                                        >
                                            {isSavingPartner ? <span className="material-icons-outlined animate-spin text-[16px]">sync</span> : <span className="material-icons-outlined text-[16px]">save</span>}
                                            Salvar Dados do Cliente
                                        </button>
                                    ) : (
                                        !editingLead && (
                                            <button 
                                                onClick={() => { setShowClientForm(false); setPartnerSaved(false); setNewLead(initialLeadState); }}
                                                className="w-full py-2 bg-slate-100 text-slate-600 hover:text-slate-800 hover:bg-slate-200 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 mt-2"
                                            >
                                                <span className="material-icons-outlined text-[14px]">swap_horiz</span> Trocar Cliente
                                            </button>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Lead Data */}
                        <div className="flex flex-col space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2 text-slate-800">
                                    <span className="material-icons-outlined text-orange-500">assignment</span>
                                    <h4 className="text-sm font-bold uppercase tracking-wide">Dados Operacionais</h4>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vendedor <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none ${isSeller ? 'cursor-not-allowed opacity-75' : 'focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'} font-medium`}
                                            value={newLead.salesperson || ''}
                                            onChange={e => setNewLead({ ...newLead, salesperson: e.target.value })}
                                            disabled={isSeller}
                                        >
                                            <option value="" disabled>Selecione</option>
                                            {['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05', 'RECEPÇÃO', 'INTERNO', 'EXTERNO'].map(v => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <span className="material-icons-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Item de Interesse / Produto <span className="text-red-500">*</span></label>
                                    <input
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Ex: 100 Copos Térmicos, Brindes..."
                                        value={newLead.closing_metadata?.quoted_item || ''}
                                        onChange={e => setNewLead({ ...newLead, closing_metadata: { ...(newLead.closing_metadata || {}), quoted_item: e.target.value } })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Anotações Internas</label>
                                    <textarea
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[100px] resize-y"
                                        placeholder="Observações adicionais para acompanhamento (não visível ao cliente)."
                                        value={newLead.closing_metadata?.wa_template || ''}
                                        onChange={e => setNewLead({ ...newLead, closing_metadata: { ...(newLead.closing_metadata || {}), wa_template: e.target.value } })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        {editingLead && onDelete && (
                            !isConfirmingDelete ? (
                                <button
                                    onClick={handleDeleteClick}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                >
                                    <span className="material-icons-outlined text-lg">delete_outline</span>
                                    Excluir Atendimento
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                    <span className="text-xs font-bold text-rose-600">Confirmar exclusão?</span>
                                    <button
                                        onClick={confirmDelete}
                                        className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all shadow-sm"
                                    >
                                        Sim, Excluir
                                    </button>
                                    <button
                                        onClick={() => setIsConfirmingDelete(false)}
                                        className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={saveLead}
                            disabled={!partnerSaved}
                            className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${partnerSaved ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            {partnerSaved && <span className="material-icons-outlined text-[16px]">check_circle</span>}
                            {editingLead ? 'Salvar Edição' : 'Criar Atendimento'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
