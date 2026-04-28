'use client';

import React from 'react';

interface CrmHeaderProps {
    onNewLead: () => void;
    pendingTransferCount: number;
    activeTab: 'RECORDS' | 'TRANSFERENCIAS';
    onTabChange: (tab: 'RECORDS' | 'TRANSFERENCIAS') => void;
    userInitials?: string;
    startDate?: string;
    endDate?: string;
    onStartDateChange?: (v: string) => void;
    onEndDateChange?: (v: string) => void;
    onClearDates?: () => void;
    isSeller?: boolean;
}

const CrmHeader: React.FC<CrmHeaderProps> = ({
    onNewLead,
    pendingTransferCount,
    activeTab,
    onTabChange,
    userInitials = 'AD',
    startDate = '',
    endDate = '',
    onStartDateChange,
    onEndDateChange,
    onClearDates,
    isSeller = false,
}) => {
    return (
        <header className="w-full bg-[#F5F5F8] px-8 py-8 pb-4">
            <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">account_tree</span>
                        Gestão de Atendimentos
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">CRM e funil de vendas Cristal Brindes</p>
                </div>

                {/* Center/Right: Filters & Actions */}
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
                    
                    {/* Date picker removido - movido para CrmTable */}

                    <div className="flex items-center gap-2">
                        {/* Novo Atendimento */}
                        <button
                            onClick={onNewLead}
                            className="h-11 px-5 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all flex items-center gap-2 active:scale-95"
                        >
                            <span className="material-icons-outlined text-[18px]">add</span>
                            Novo Atendimento
                        </button>

                        {/* Trocas */}
                        {!isSeller && (
                            <button
                                onClick={() => onTabChange('TRANSFERENCIAS')}
                                className={`h-11 px-5 rounded-md text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border ${
                                    activeTab === 'TRANSFERENCIAS'
                                        ? 'bg-[#0F6CBD] text-white border-[#0F6CBD]'
                                        : 'bg-white text-[#424242] border-[#E3E3E4] hover:bg-[#F5F5F5]'
                                }`}
                            >
                                <span className="material-icons-outlined text-[18px]">swap_horiz</span>
                                Trocas
                                {pendingTransferCount > 0 && (
                                    <span className="w-5 h-5 bg-[#DC2626] text-white text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                                        {pendingTransferCount}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Planilha */}
                        <button
                            onClick={() => onTabChange('RECORDS')}
                            className={`h-11 px-5 rounded-md text-[10px] font-medium uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 border ${
                                activeTab === 'RECORDS'
                                    ? 'bg-[#0F6CBD] text-white border-[#0F6CBD]'
                                    : 'bg-white text-[#424242] border-[#E3E3E4] hover:bg-[#F5F5F5]'
                            }`}
                        >
                            <span className="material-icons-outlined text-[18px]">description</span>
                            Planilha
                        </button>
                    </div>

                    {/* User Avatar removido conforme solicitado */}
                </div>
            </div>
        </header>
    );
};

export default CrmHeader;
