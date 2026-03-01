import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// Interfaces baseadas no ManagementPage original
export interface Lead {
    id: string;
    client_name: string;
    client_phone?: string;
    client_email?: string;
    client_doc?: string;
    description?: string;
    status: 'ATENDIMENTO' | 'ORCAMENTO' | 'PROPOSTA_ENVIADA' | 'PEDIDO_ABERTO' | 'PEDIDO_ENTREGUE' | 'NAO_APROVADO' | 'FINALIZADO';
    salesperson?: string;
    next_action_date?: string;
    notes?: string;
    created_at: string;
    priority?: 'ALTA' | 'NORMAL' | 'BAIXA';
    lost_reason?: string;
    estimated_value?: number;
}

export function useLeads(startDate?: string, endDate?: string) {
    return useQuery({
        queryKey: ['crm_leads', startDate, endDate],
        queryFn: async () => {
            let query = supabase.from('crm_leads').select('*').neq('status', 'EXCLUIDO');

            if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
            if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Lead[];
        },
    });
}

export function useUpdateLeadStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { error } = await supabase.from('crm_leads').update({ status }).eq('id', id);
            if (error) throw error;
            return { id, status };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}

// Hook de Performance
export function usePerformanceStats() {
    return useQuery({
        queryKey: ['crm_performance'],
        queryFn: async () => {
            // Fetch Budgets for conversion stats
            const { data: budgetsData, error: budgetError } = await supabase
                .from('budgets')
                .select('*')
                .order('created_at', { ascending: false });

            if (budgetError) throw budgetError;

            // Fetch CRM Leads for Kanban stats
            const { data: leadsData, error: leadError } = await supabase
                .from('crm_leads')
                .select('id, status, salesperson, estimated_value');

            if (leadError) throw leadError;

            const allBudgets = budgetsData || [];
            const allLeads = leadsData || [];

            // Global Stats (from budgets)
            const totalBudgets = allBudgets.length;
            const totalApproved = allBudgets.filter((b: any) => b.status === 'PROPOSTA ACEITA').length;
            const totalValue = allBudgets.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
            const recentBudgets = allBudgets.slice(0, 5);

            // Group by salesperson
            const sellers = Array.from(new Set([
                ...allBudgets.map(b => b.salesperson || 'N/A'),
                ...allLeads.map(l => l.salesperson || 'N/A')
            ]));

            const grouped = sellers.reduce((acc: any, sp: string) => {
                const spBudgets = allBudgets.filter(b => b.salesperson === sp);
                const spLeads = allLeads.filter(l => l.salesperson === sp);

                acc[sp] = {
                    name: sp,
                    total: spBudgets.length,
                    approved: spBudgets.filter((b: any) => b.status === 'PROPOSTA ACEITA').length,
                    pending: spBudgets.filter((b: any) => b.status !== 'PROPOSTA ACEITA' && b.status !== 'PROPOSTA RECUSADA' && b.status !== 'CANCELADO').length,
                    refused: spBudgets.filter((b: any) => b.status === 'PROPOSTA RECUSADA' || b.status === 'CANCELADO').length,
                    value: spBudgets.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
                    // New fields from CRM Leads
                    atendimento: spLeads.filter(l => l.status === 'ATENDIMENTO').length,
                    orcamento: spLeads.filter(l => l.status === 'ORCAMENTO').length,
                    proposta: spLeads.filter(l => l.status === 'PROPOSTA_ENVIADA').length,
                    aberto: spLeads.filter(l => l.status === 'PEDIDO_ABERTO').length,
                    entregue: spLeads.filter(l => l.status === 'PEDIDO_ENTREGUE').length
                };

                return acc;
            }, {});

            return {
                totalBudgets,
                totalApproved,
                totalValue,
                recentBudgets,
                stats: Object.values(grouped)
            };
        },
    });
}
