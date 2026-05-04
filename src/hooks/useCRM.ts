import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SELLERS } from '@/constants/crm';


// Interfaces baseadas no ManagementPage original
export interface Lead {
    id: string;
    client_id?: string;
    client_name: string;
    client_contact_name?: string;
    client_phone?: string;
    client_email?: string;
    client_doc?: string;
    description?: string;
    status: 'ATENDIMENTO' | 'ORCAMENTO' | 'PROPOSTA_ENVIADA' | 'PEDIDO_ABERTO' | 'PEDIDO_ENTREGUE' | 'NAO_APROVADO' | 'FINALIZADO' | 'ENVIO_CATALOGO' | 'PERDIDO';
    sub_status?: string;
    atendimento_status?: string;
    salesperson?: string;
    next_action_date?: string;
    notes?: string;
    created_at: string;
    updated_at?: string;
    priority?: 'URGENTE' | 'ALTA' | 'VIP' | 'NORMAL' | 'BAIXA';
    lost_reason?: string;
    estimated_value?: number;
    follow_up_done?: boolean;
    follow_up_at?: string;
    finish_reason_category?: string;
    budget_id?: string;
    budget_number?: string;
    budget_date?: string;
    closing_metadata?: {
        checklist?: { id: string; text: string; completed: boolean }[];
        wa_template?: string;
        show_on_card?: boolean;
        quoted_item?: string;
        [key: string]: any;
    };
}

export function useLeads(startDate?: string, endDate?: string, salesperson?: string, searchTerm?: string) {
    return useQuery({
        queryKey: ['crm_leads', startDate, endDate, salesperson, searchTerm],
        queryFn: async () => {
            let query = supabase.from('crm_leads').select('*').neq('status', 'EXCLUIDO');

            if (salesperson) query = query.eq('salesperson', salesperson);
            if (startDate) query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
            if (endDate) query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
            
            if (searchTerm && searchTerm.length >= 2) {
                // Use ilike to search across name, email or phone
                query = query.or(`client_name.ilike.%${searchTerm}%,client_email.ilike.%${searchTerm}%,client_phone.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Lead[];
        },
    });
}


export function useUpdateLeadStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status, sub_status, notes, lost_reason, finish_reason_category }: { id: string; status: string; sub_status?: string | null; notes?: string; lost_reason?: string; finish_reason_category?: string }) => {
            const updates: any = { status, atendimento_status: status };
            if (sub_status !== undefined) updates.sub_status = sub_status;
            if (notes) updates.notes = notes;
            if (lost_reason) updates.lost_reason = lost_reason;
            if (finish_reason_category) updates.finish_reason_category = finish_reason_category;
            
            const { error } = await supabase.from('crm_leads').update(updates).eq('id', id);
            if (error) throw error;
            return { id, status, sub_status };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}

export function useCreateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (lead: Partial<Lead>) => {
            // Remove calculated or unwanted fields before insert
            const { id, created_at, ...dataToInsert } = lead;
            const { data, error } = await supabase
                .from('crm_leads')
                .insert([dataToInsert])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}

export function useUpdateLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
            // Remove calculated or unwanted fields before update
            const { id: _, created_at, ...dataToUpdate } = updates;
            const { data, error } = await supabase
                .from('crm_leads')
                .update(dataToUpdate)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}

export function useDeleteLead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('crm_leads').update({ status: 'EXCLUIDO' }).eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}

export function useProfiles() {
    return useQuery({
        queryKey: ['user_profiles'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useSalespeople() {
    return useQuery({
        queryKey: ['salespeople'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('salesperson_id')
                .not('salesperson_id', 'is', null)
                .order('salesperson_id');
            
            if (error) throw error;
            
            const unique = Array.from(new Set((data || []).map(p => p.salesperson_id).filter(Boolean)));
            return unique.length > 0 ? unique : SELLERS;
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useUpdateLeadField() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
            const updates: any = { [field]: value };
            if (field === 'status') updates.atendimento_status = value;
            if (field === 'atendimento_status') updates.status = value;
            
            const { error } = await supabase.from('crm_leads').update(updates).eq('id', id);
            if (error) throw error;
            return { id, field, value };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}

export function useCreateReminder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (reminder: { lead_id: string; user_email: string; title: string; message: string; scheduled_at: string }) => {
            const { data, error } = await supabase.from('crm_reminders').insert([reminder]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_reminders'] });
        },
    });
}

export function useAcknowledgeReminder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('crm_reminders').update({ acknowledged_at: new Date().toISOString() }).eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['crm_reminders'] });
        },
    });
}

export function useReminders(leadId: string) {
    return useQuery({
        queryKey: ['crm_reminders', leadId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('crm_reminders')
                .select('*')
                .eq('lead_id', leadId)
                .is('acknowledged_at', null)
                .order('scheduled_at', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!leadId,
    });
}

export function useSearchPartners(searchTerm: string, type?: 'CLIENTE' | 'FORNECEDOR') {
    return useQuery({
        queryKey: ['partnerSearch', searchTerm, type],
        queryFn: async () => {
            let query = supabase.from('partners').select('*');
            if (searchTerm.length >= 2) {
                query = query.or(`name.ilike.%${searchTerm}%,doc.ilike.%${searchTerm}%`);
            }
            if (type) query = query.eq('type', type);
            const { data, error } = await query.limit(5);
            if (error) throw error;
            return data;
        },
        enabled: searchTerm.length >= 2,
    });
}

export function useUpdatePartner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            // 1. Update partner in the master database
            const { error: partnerError } = await supabase.from('partners').update(updates).eq('id', id);
            if (partnerError) throw partnerError;

            // 2. Sync to active CRM Leads (Current attendances)
            // We only update leads that are NOT in a final state (delivered, lost, or deleted)
            const activeStatuses = ['ATENDIMENTO', 'ORCAMENTO', 'PROPOSTA_ENVIADA', 'PEDIDO_ABERTO', 'ENVIO_CATALOGO'];
            
            // Map partner fields to lead fields
            const leadUpdates: any = {};
            if (updates.name) leadUpdates.client_name = updates.name;
            if (updates.contact_name) leadUpdates.client_contact_name = updates.contact_name;
            if (updates.doc) leadUpdates.client_doc = updates.doc;
            if (updates.phone) leadUpdates.client_phone = updates.phone;
            if (updates.email) leadUpdates.client_email = updates.email;

            if (Object.keys(leadUpdates).length > 0) {
                // Perform the sync update
                const { error: leadError } = await supabase
                    .from('crm_leads')
                    .update(leadUpdates)
                    .eq('client_id', id)
                    .in('status', activeStatuses);
                
                if (leadError) {
                    console.error('Error syncing partner update to CRM leads:', leadError);
                    // We don't throw here to avoid blocking the main partner update success
                }
            }

            return { id, updates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['partnerSearch'] });
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['crm_leads'] });
        },
    });
}


// Hook de Performance
export function usePerformanceStats() {
    return useQuery({
        queryKey: ['crm_performance'],
        queryFn: async () => {
            // Fetch Budgets for conversion stats (Limitamos para não travar o sistema)
            const { data: budgetsData, error: budgetError } = await supabase
                .from('budgets')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000);

            if (budgetError) throw budgetError;

            // Fetch CRM Leads for Kanban stats
            const { data: leadsData, error: leadError } = await supabase
                .from('crm_leads')
                .select('id, status, atendimento_status, salesperson, estimated_value')
                .neq('status', 'EXCLUIDO') // FIX: Ensure stats match the visible table
                .limit(2000); 

            if (leadError) throw leadError;

            const allBudgets = budgetsData || [];
            const allLeads = leadsData || [];

            // Global Stats (from budgets)
            const totalBudgets = allBudgets.length;
            const totalApproved = allBudgets.filter((b: any) => b.status === 'ORÇAMENTO APROVADO' || b.status === 'PROPOSTA ACEITA').length;
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
                    approved: spBudgets.filter((b: any) => b.status === 'ORÇAMENTO APROVADO' || b.status === 'PROPOSTA ACEITA').length,
                    pending: spBudgets.filter((b: any) => b.status !== 'ORÇAMENTO APROVADO' && b.status !== 'PROPOSTA ACEITA' && b.status !== 'PROPOSTA RECUSADA' && b.status !== 'CANCELADO' && b.status !== 'PERDIDO').length,
                    refused: spBudgets.filter((b: any) => b.status === 'PROPOSTA RECUSADA' || b.status === 'CANCELADO' || b.status === 'PERDIDO').length,
                    value: spBudgets.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
                    // New fields from CRM Leads
                    atendimento: spLeads.filter(l => (l.atendimento_status || l.status) === 'ATENDIMENTO').length,
                    orcamento: spLeads.filter(l => (l.atendimento_status || l.status) === 'ORCAMENTO').length,
                    proposta: spLeads.filter(l => (l.atendimento_status || l.status) === 'PROPOSTA_ENVIADA').length,
                    aberto: spLeads.filter(l => (l.atendimento_status || l.status) === 'PEDIDO_ABERTO').length,
                    entregue: spLeads.filter(l => (l.atendimento_status || l.status) === 'PEDIDO_ENTREGUE').length
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
