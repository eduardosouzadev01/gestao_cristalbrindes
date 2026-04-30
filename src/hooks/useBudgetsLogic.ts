'use client';

import { useState, useMemo, useEffect } from 'react';
import { useBudgets } from './useBudgets';
import { useAuth } from '@/lib/auth';

export function useBudgetsLogic() {
    const { appUser } = useAuth();
    
    // Basic States
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    
    const [sellerFilter, setSellerFilter] = useState('Todos');
    const [periodFilter, setPeriodFilter] = useState('Todos');
    const [statusFilter, setStatusFilter] = useState('Todos');

    // Initialize seller filter for salespeople
    useEffect(() => {
        if (appUser && appUser.role === 'VENDEDOR' && sellerFilter === 'Todos') {
            setSellerFilter(appUser.salesperson || 'NONE');
        }
    }, [appUser, sellerFilter]);



    // Period Filter Effect
    useEffect(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        switch (periodFilter) {
            case 'Hoje':
                setStartDate(today);
                setEndDate(today);
                break;
            case '7d':
                const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
                setStartDate(sevenDaysAgo);
                setEndDate(today);
                break;
            case '30d':
                const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
                setStartDate(thirtyDaysAgo);
                setEndDate(today);
                break;
            case 'Todos':
                setStartDate('');
                setEndDate('');
                break;
            case 'Personalizado':
                if (!startDate) setStartDate(today);
                if (!endDate) setEndDate(today);
                break;
        }
    }, [periodFilter]);

    // Queries
    const isSalesperson = appUser?.role === 'VENDEDOR';
    const fetchSalesperson = isSalesperson ? (appUser?.salesperson || 'NONE') : undefined;
    const { data: budgets = [], isLoading } = useBudgets(fetchSalesperson);


    // Filtering Logic
    const filteredBudgets = useMemo(() => {
        return budgets.filter((budget: any) => {
            const matchesSearch = 
                budget.budget_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                budget.partners?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesSeller = sellerFilter === 'Todos' || budget.salesperson === sellerFilter;
            const matchesStatus = statusFilter === 'Todos' || budget.status === statusFilter;

            let matchesDate = true;
            if (startDate && endDate) {
                const budgetDate = new Date(budget.created_at).toISOString().split('T')[0];
                matchesDate = budgetDate >= startDate && budgetDate <= endDate;
            }

            return matchesSearch && matchesSeller && matchesStatus && matchesDate;
        });
    }, [budgets, searchTerm, sellerFilter, statusFilter, startDate, endDate]);

    return {
        budgets: filteredBudgets,
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
    };
}
