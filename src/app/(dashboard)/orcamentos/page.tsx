'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useBudgetsLogic } from '@/hooks/useBudgetsLogic';
import BudgetTable from '@/components/budget/BudgetTable';

export default function BudgetsPage() {
    const router = useRouter();
    const {
        budgets,
        isLoading,
        searchTerm,
        setSearchTerm,
        sellerFilter,
        setSellerFilter,
        periodFilter,
        setPeriodFilter,
        statusFilter,
        setStatusFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        appUser
    } = useBudgetsLogic();

    const canSeeAll = appUser?.role !== 'VENDEDOR';
    const SELLERS = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05'];
    const activeSellers = canSeeAll ? SELLERS : [appUser?.salesperson].filter(Boolean) as string[];


    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F8] pb-10">
            {/* Minimal Header */}
            <div className="max-w-[1920px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                
                {/* Section Title */}
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">request_quote</span>
                        Gestão de Orçamentos
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Controle de orçamentos e cotações</p>
                </div>
                
                {/* Clean Filters Bar - Separated from Table */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-md border border-[#E3E3E4]">
                    {/* Search - Left Side */}
                    <div className="relative min-w-[300px] flex-1 max-w-md">
                        <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por número ou cliente..."
                            className="w-full !pl-12 pr-4 py-2 bg-[#F9FAFB] border border-gray-100 rounded-md text-xs font-medium text-gray-600 outline-none hover:border-gray-200 focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/5 transition-all font-jakarta"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filters - Right Side */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Seller filter */}
                        <select
                            className="bg-white border border-gray-200 text-xs font-medium text-gray-500 py-2 px-3 rounded-md outline-none cursor-pointer font-jakarta hover:border-gray-300 transition-all"
                            value={sellerFilter}
                            onChange={e => setSellerFilter(e.target.value)}
                        >
                            {canSeeAll && <option value="Todos">Vendedor: Todos</option>}
                            {activeSellers.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>


                        {/* Status filter */}
                        <select
                            className="bg-white border border-gray-200 text-xs font-medium text-gray-500 py-2 px-3 rounded-md outline-none cursor-pointer font-jakarta hover:border-gray-300 transition-all"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="Todos">Status: Todos</option>
                            <option value="EM ABERTO">EM ABERTO</option>
                            <option value="PROPOSTA ENVIADA">PROPOSTA ENVIADA</option>
                            <option value="NEGOCIAÇÃO">NEGOCIAÇÃO</option>
                            <option value="APROVADO">APROVADO</option>
                            <option value="PERDIDO">PERDIDO</option>
                        </select>

                        {/* Period filter */}
                        <select
                            className="bg-white border border-gray-200 text-xs font-medium text-gray-500 py-2 px-3 rounded-md outline-none cursor-pointer font-jakarta hover:border-gray-300 transition-all"
                            value={periodFilter}
                            onChange={e => setPeriodFilter(e.target.value)}
                        >
                            <option value="Todos">Período: Todos</option>
                            <option value="Hoje">Hoje</option>
                            <option value="7d">Últimos 7 dias</option>
                            <option value="30d">Últimos 30 dias</option>
                            <option value="Personalizado">Personalizado</option>
                        </select>
                    </div>
                </div>

                {/* Date inputs for Personalizado - Separate bar if needed or inside filter */}
                {periodFilter === 'Personalizado' && (
                    <div className="flex items-center gap-3 px-6 py-3 bg-white border border-[#E3E3E4] rounded-md animate-in slide-in-from-top-1 duration-200">
                        <span className="text-[10px] font-medium text-[#707070] uppercase">Período Personalizado:</span>
                        <div className="flex items-center gap-2 bg-[#F9FAFB] px-3 py-1.5 rounded-md border border-gray-100">
                            <span className="text-[9px] font-medium text-gray-400">DE:</span>
                            <input
                                type="date"
                                className="bg-transparent border-0 p-0 text-[10px] font-medium text-gray-600 outline-none"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-[#F9FAFB] px-3 py-1.5 rounded-md border border-gray-100">
                            <span className="text-[9px] font-medium text-gray-400">ATÉ:</span>
                            <input
                                type="date"
                                className="bg-transparent border-0 p-0 text-[10px] font-medium text-gray-600 outline-none"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* Table Section */}
                <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                    <BudgetTable 
                        budgets={budgets}
                        loading={isLoading}
                    />
                </div>
        </div>
    </div>
    );
}
