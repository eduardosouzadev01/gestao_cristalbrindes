import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Order {
    id: string;
    order_number: string;
    status: string;
    order_date: string;
    total_amount: number;
    entry_amount: number;
    remaining_amount: number;
    salesperson: string;
    payment_due_date: string | null;
    supplier_departure_date: string | null;
    created_at: string;
    partners?: { name: string, doc: string };
}

export function useOrders(filters?: { 
    salesperson?: string, 
    status?: string, 
    page?: number, 
    pageSize?: number,
    searchTerm?: string
}) {
    const page = filters?.page || 0;
    const pageSize = filters?.pageSize || 10;

    return useQuery({
        queryKey: ['orders', filters],
        queryFn: async () => {
            let query = supabase
                .from('orders')
                .select('*, partners(name, doc)', { count: 'exact' });

            if (filters?.salesperson && filters.salesperson !== 'Todos os Vendedores') {
                query = query.eq('salesperson', filters.salesperson);
            }

            if (filters?.status && filters.status !== 'Todos') {
                query = query.eq('status', filters.status);
            }

            if (filters?.searchTerm) {
                // Simplistic search, for production consider a better approach or filter locally
                // query = query.or(`order_number.ilike.%${filters.searchTerm}%, partners.name.ilike.%${filters.searchTerm}%`);
            }

            query = query
                .order('created_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as Order[], totalCount: count || 0 };
        }
    });
}

export function useDeleteOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('orders')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
    });
}
