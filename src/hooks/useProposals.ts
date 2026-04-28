import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Proposal {
    id: string;
    proposal_number: string;
    budget_id: string | null;
    client_id: string | null;
    salesperson: string;
    total_amount: number;
    status: string;
    validity: string;
    shipping: string;
    delivery_deadline: string;
    payment_method: string;
    observation: string;
    issuer: string;
    last_sent_at: string | null;
    created_at: string;
    client?: { name: string };
    items?: any[];
}

export function useProposals(filters?: { salesperson?: string }) {
    return useQuery({
        queryKey: ['proposals', filters],
        queryFn: async () => {
            let query = supabase
                .from('proposals')
                .select('*, client:partners(name)')
                .order('created_at', { ascending: false });

            if (filters?.salesperson) {
                query = query.eq('salesperson', filters.salesperson);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Proposal[];
        }
    });
}

export function useProposal(id: string) {
    return useQuery({
        queryKey: ['proposal', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('proposals')
                .select('*, client:partners(*)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as Proposal;
        },
        enabled: !!id
    });
}

export function useDeleteProposal() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('proposals')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
        }
    });
}
