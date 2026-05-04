'use client';

import React from 'react';
import { Lead, useUpdateLead } from '@/hooks/useCRM';

interface OrderChecklistProps {
    lead: Lead;
    onChange?: (checklist: any) => void;
}

export const OrderChecklist: React.FC<OrderChecklistProps> = ({ lead, onChange }) => {
    const updateLead = useUpdateLead();
    const checklist = lead.closing_metadata?.order_checklist || {};

    const [localChecklist, setLocalChecklist] = React.useState(checklist);
    
    // Sync local state when lead changes (e.g., after a successful mutation)
    React.useEffect(() => {
        setLocalChecklist(lead.closing_metadata?.order_checklist || {});
    }, [lead.closing_metadata?.order_checklist]);

    const keys = [
        'enviar_resumo', 'conferir_estoque', 'conferir_cadastro', 
        'solicitar_logo', 'solicitar_layout', 'solicitar_aprovacao', 
        'confirmar_prazos', 'pagamento_confirmado',
        'solicitar_compra', 'solicitar_confirmacao', 'conferencia_expedicao',
        'agendar_entrega', 'nfe_emitida', 'rastreio_enviado', 'acompanhamento_pedido'
    ];
    const completedCount = keys.filter(k => !!localChecklist[k]).length;
    const progressPct = Math.round((completedCount / keys.length) * 100);

    const handleUpdate = (field: string, value: any) => {
        const newChecklist = { ...localChecklist, [field]: value };
        setLocalChecklist(newChecklist);
        
        if (onChange) {
            onChange(newChecklist);
        } else {
            updateLead.mutate({ 
                id: lead.id, 
                updates: { 
                    closing_metadata: { ...(lead.closing_metadata || {}), order_checklist: newChecklist } 
                } 
            });
        }
    };

    const CheckboxRow = ({ id, label, icon, children }: { id: string, label: string, icon: string, children?: React.ReactNode }) => (
        <div 
            onClick={() => handleUpdate(id, !localChecklist[id])}
            className={`group relative flex flex-col gap-2 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none overflow-hidden ${
                localChecklist[id] 
                    ? 'border-emerald-200 bg-emerald-50/40 shadow-sm' 
                    : 'border-gray-200 bg-white hover:border-[#0F6CBD]/30 hover:shadow-md hover:-translate-y-0.5'
            }`}
        >
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full transition-all duration-500 opacity-[0.03] ${
                localChecklist[id] ? 'bg-emerald-500 scale-150' : 'bg-[#0F6CBD] group-hover:scale-150'
            }`} />

            <div className="flex items-center gap-4 relative z-10">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    localChecklist[id] 
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                        : 'bg-gray-50 text-gray-400 group-hover:bg-[#0F6CBD]/10 group-hover:text-[#0F6CBD]'
                }`}>
                    <span className="material-icons-outlined text-[20px]">{localChecklist[id] ? 'check_circle' : icon}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                    <span className={`block text-[11px] font-bold uppercase tracking-wider font-jakarta transition-all ${
                        localChecklist[id] ? 'text-emerald-700/60 line-through' : 'text-gray-700 group-hover:text-[#0F6CBD]'
                    }`}>
                        {label}
                    </span>
                    {localChecklist[id] && (
                        <span className="text-[9px] font-medium text-emerald-600 uppercase tracking-tighter">Concluído</span>
                    )}
                </div>

                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    localChecklist[id] 
                        ? 'border-emerald-500 bg-emerald-500' 
                        : 'border-gray-200 group-hover:border-[#0F6CBD]'
                }`}>
                    {localChecklist[id] && <span className="material-icons text-white text-[12px]">check</span>}
                </div>
            </div>
            
            {children && (
                <div className="pl-14 pr-2 pb-1 relative z-10" onClick={e => e.stopPropagation()}>
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Progress Header */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F6CBD] flex items-center justify-center text-white shadow-lg shadow-blue-100">
                            <span className="material-icons-outlined">fact_check</span>
                        </div>
                        <div>
                            <h5 className="text-[14px] font-bold text-gray-900 uppercase tracking-tight font-jakarta">Acompanhamento de Pedido</h5>
                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">Gestão de Workflow CRM</p>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <div className="text-[20px] font-black text-[#0F6CBD] font-jakarta leading-none">{progressPct}%</div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{completedCount}/{keys.length} ETAPAS</div>
                    </div>
                </div>

                <div className="relative h-2.5 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
                    <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#0F6CBD] to-[#3b82f6] transition-all duration-1000 ease-out"
                        style={{ width: `${progressPct}%` }}
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-bar-stripes_1s_linear_infinite]" />
                </div>
                
                {updateLead.isPending && (
                    <div className="flex items-center justify-center gap-2 text-[#0F6CBD] animate-pulse py-1">
                        <span className="material-icons-outlined text-[14px] animate-spin">sync</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sincronizando com a Nuvem...</span>
                    </div>
                )}
            </div>
            
            {/* Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">Abertura e Cadastro</p>
                    <CheckboxRow id="enviar_resumo" label="Enviar Resumo do Pedido" icon="description" />
                    <CheckboxRow id="conferir_estoque" label="Verificar Estoque/Dispo." icon="inventory" />
                    <CheckboxRow id="conferir_cadastro" label="Conferir Dados Cadastrais" icon="contact_mail" />
                    <CheckboxRow id="solicitar_logo" label="Solicitar Logo/Arte" icon="brush" />
                </div>
                
                <div className="space-y-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">Processamento e Layout</p>
                    <CheckboxRow id="solicitar_layout" label="Solicitar Layout" icon="dashboard_customize" />
                    <CheckboxRow id="solicitar_aprovacao" label="Aprovação de Layout" icon="rule" />
                    <CheckboxRow id="confirmar_prazos" label="Validar Prazos Fornec." icon="timer" />
                    <CheckboxRow id="pagamento_confirmado" label="Pagamento Confirmado" icon="payments" />
                </div>

                <div className="space-y-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2">Produção e Logística</p>
                    <CheckboxRow id="solicitar_compra" label="Compra do Produto" icon="shopping_cart" />
                    <CheckboxRow id="solicitar_confirmacao" label="Confirmação Fornecedor" icon="assignment_ind" />
                    <CheckboxRow id="conferencia_expedicao" label="Conferência Expedição" icon="inventory_2" />
                    <CheckboxRow id="agendar_entrega" label="Agendar Entrega" icon="event_available" />
                    <CheckboxRow id="nfe_emitida" label="NF-e Emitida" icon="receipt_long" />
                    <CheckboxRow id="rastreio_enviado" label="Rastreio Enviado" icon="local_shipping" />
                </div>
            </div>

            {/* Special Item: Follow-up Date */}
            <div className="pt-2">
                <CheckboxRow id="acompanhamento_pedido" label="Realizar Acompanhamento" icon="history_edu">
                    <div className="space-y-2 mt-3 p-4 bg-white/60 rounded-lg border border-gray-100">
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="material-icons-outlined text-[14px]">calendar_month</span>
                            Data do Acompanhamento
                        </label>
                        <input 
                            type="date" 
                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-700 focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/5 transition-all outline-none"
                            value={localChecklist.data_acompanhamento || ''}
                            onChange={(e) => handleUpdate('data_acompanhamento', e.target.value)}
                        />
                    </div>
                </CheckboxRow>
            </div>
        </div>
    );
};
