'use client';

import React from 'react';
import { Lead } from '@/hooks/useCRM';
import { SELLERS } from '@/constants/crm';

interface CrmStatsProps {
    leads: Lead[];
    kanbanSellerFilter: string;
    setKanbanSellerFilter: (v: string) => void;
    canSeeAll: boolean;
    userSalesperson?: string;
}


const getSalespersonInitials = (name?: string) => {
    if (!name) return 'V';
    if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

const CrmStats: React.FC<CrmStatsProps> = ({ leads, kanbanSellerFilter, setKanbanSellerFilter, canSeeAll, userSalesperson }) => {
    const sellers = canSeeAll
        ? SELLERS
        : [userSalesperson].filter(Boolean) as string[];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-4 mb-6">
            {sellers.map((seller) => {
                const count = leads.filter(l => {
                    const status = l.atendimento_status || l.status || 'ATENDIMENTO';
                    return l.salesperson === seller && status === 'ATENDIMENTO';
                }).length;
                const isActive = kanbanSellerFilter === seller;
                const showAsActive = isActive && canSeeAll;

                return (
                    <div
                        key={seller}
                        onClick={() => canSeeAll && setKanbanSellerFilter(isActive ? 'Todos' : seller)}
                        className={`flex-1 min-w-[200px] p-5 rounded-md border flex items-center gap-4 transition-all group ${canSeeAll ? 'cursor-pointer' : ''} ${
                            showAsActive
                                ? 'bg-blue-600 border-blue-700 ring-4 ring-blue-500/10'
                                : 'bg-white border-[#E3E3E4] hover:border-blue-100 font-jakarta'
                        }`}
                    >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform ${canSeeAll ? 'group-hover:scale-110' : ''} ${
                            showAsActive ? 'bg-white/20 text-white' : 'bg-[#E3F2FD] text-[#0D47A1]'
                        }`}>
                            <span className="material-icons-outlined text-xl">{showAsActive ? 'filter_alt' : 'person'}</span>
                        </div>
                        <div>
                            <p className={`text-[10px] uppercase font-medium tracking-widest ${showAsActive ? 'text-blue-100' : 'text-gray-400'}`}>
                                {seller}
                            </p>
                            <div className="flex items-baseline gap-1">
                                <p className={`text-xl font-medium ${showAsActive ? 'text-white' : 'text-[#0D47A1]'}`}>{count}</p>
                                <p className={`text-[11px] font-medium uppercase ${showAsActive ? 'text-blue-200' : 'text-gray-400'}`}>Em Andamento</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default CrmStats;
