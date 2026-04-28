'use client';

import React from 'react';

interface CrmFiltersProps {
    searchTerm: string;
    onSearchChange: (v: string) => void;
    startDate: string;
    setStartDate: (v: string) => void;
    endDate: string;
    setEndDate: (v: string) => void;
    sellerFilter: string;
    setSellerFilter: (v: string) => void;
    periodFilter: string;
    setPeriodFilter: (v: string) => void;
}

const CrmFilters: React.FC<CrmFiltersProps> = ({
    searchTerm,
    onSearchChange,
    sellerFilter,
    setSellerFilter,
    periodFilter,
    setPeriodFilter
}) => {
    const STATUS_OPTIONS = ['Todos', 'Em Andamento', 'Proposta Enviada', 'Aprovado', 'Cancelado'];
    const SALESPERSON_OPTIONS = ['Todos', 'VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04'];
    const PERIOD_OPTIONS = ['Hoje', 'Este Mês', 'Últimos 3 Meses', 'Todos'];

    return (
        <div className="flex flex-wrap items-center gap-6 mb-8">
            {/* Search Input */}
            <div className="flex-1 min-w-[320px] relative group h-12">
                <input 
                    type="text"
                    placeholder="PESQUISAR POR CLIENTE, EMPRESA OU PROJETO..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full h-full bg-[#F9FAFB] border border-[#D1D1D1] rounded-md px-5 text-[11px] font-medium text-[#242424] placeholder:text-[#BDBDBD] outline-none focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/10 transition-all uppercase tracking-[0.04em] shadow-none font-jakarta"
                />
            </div>

            {/* Selects Row */}
            <div className="flex flex-wrap items-center gap-6">
                {/* Status Filter */}
                <div className="flex-1 min-w-[240px] relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="material-icons-outlined text-[#707070] text-[20px]">sort</span>
                        <span className="text-[10px] font-medium text-[#707070] uppercase font-jakarta tracking-wider">STATUS:</span>
                    </div>
                    <select
                        className="w-full h-14 pl-[110px] pr-12 bg-white border border-[#D1D1D1] rounded-md text-[11px] font-medium text-[#242424] font-jakarta focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all appearance-none uppercase tracking-wider"
                        value=""
                        onChange={() => {}}
                    >
                        <option value="">TODOS</option>
                        <option value="atendimento">ATENDIMENTO</option>
                        <option value="proposta_enviada">PROPOSTA ENVIADA</option>
                    </select>
                    <span className="material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#707070] pointer-events-none">expand_more</span>
                </div>

                {/* Seller Filter */}
                <div className="flex-1 min-w-[240px] relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="material-icons-outlined text-[#707070] text-[20px]">person</span>
                        <span className="text-[10px] font-medium text-[#707070] uppercase font-jakarta tracking-wider">VENDEDOR:</span>
                    </div>
                    <select
                        className="w-full h-14 pl-[125px] pr-12 bg-white border border-[#D1D1D1] rounded-md text-[11px] font-medium text-[#242424] font-jakarta focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all appearance-none uppercase tracking-wider"
                        value={sellerFilter}
                        onChange={(e) => setSellerFilter(e.target.value)}
                    >
                        <option value="">TODOS</option>
                        <option value="VENDAS 01">VENDAS 01</option>
                        <option value="VENDAS 02">VENDAS 02</option>
                        <option value="VENDAS 03">VENDAS 03</option>
                        <option value="VENDAS 04">VENDAS 04</option>
                    </select>
                    <span className="material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#707070] pointer-events-none">expand_more</span>
                </div>

                {/* Period Filter */}
                <div className="flex-1 min-w-[240px] relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="material-icons-outlined text-[#707070] text-[20px]">date_range</span>
                        <span className="text-[10px] font-medium text-[#707070] uppercase font-jakarta tracking-wider">PERÍODO:</span>
                    </div>
                    <select
                        className="w-full h-14 pl-[115px] pr-12 bg-white border border-[#D1D1D1] rounded-md text-[11px] font-medium text-[#242424] font-jakarta focus:ring-4 focus:ring-[#0F6CBD]/10 focus:border-[#0F6CBD] transition-all appearance-none uppercase tracking-wider"
                        value={periodFilter}
                        onChange={(e) => setPeriodFilter(e.target.value)}
                    >
                        <option value="current_month">ATUAL (MÊS)</option>
                        <option value="last_30_days">ÚLTIMOS 30 DIAS</option>
                        <option value="all">TODOS</option>
                        <option value="custom">PERSONALIZADO</option>
                    </select>
                    <span className="material-icons-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#707070] pointer-events-none">expand_more</span>
                </div>
            </div>
        </div>
    );
};

export default CrmFilters;
