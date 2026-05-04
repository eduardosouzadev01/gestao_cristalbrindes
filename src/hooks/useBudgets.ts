import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Budget {
    id: string;
    budget_number: string;
    salesperson: string;
    status: string;
    client_id: string | null;
    issuer: string;
    total_amount: number;
    validity: string;
    shipping: string;
    delivery_deadline: string;
    payment_method: string;
    observation: string;
    created_at: string;
    budget_items?: BudgetItem[];
}

export interface BudgetItem {
    id: string;
    budget_id: string;
    product_name: string;
    supplier_id: string | null;
    quantity: number;
    unit_price: number;
    customization_cost: number;
    customization_supplier_id?: string | null;
    supplier_transport_cost: number;
    transport_supplier_id?: string | null;
    client_transport_cost: number;
    client_transport_supplier_id?: string | null;
    extra_expense: number;
    layout_cost: number;
    layout_supplier_id?: string | null;
    calculation_factor: number;
    bv_pct: number;
    extra_pct: number;
    total_item_value: number;
    is_approved: boolean;
    tax_pct: number;
    margin_pct: number;
    payment_tax_pct: number;
    payment_method_label?: string;
    product_description?: string;
    product_color?: string;
    product_code?: string;
    product_image_url?: string;
}

export function useBudgets(salesperson?: string) {
    return useQuery({
        queryKey: ['budgets', salesperson],
        queryFn: async () => {
            let query = supabase
                .from('budgets')
                .select('*, partners(name)');
            
            if (salesperson) query = query.eq('salesperson', salesperson);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });
}


export function useBudget(id: string) {
    return useQuery({
        queryKey: ['budget', id],
        queryFn: async () => {
            if (!id || id === 'novo') return null;
            const { data, error } = await supabase
                .from('budgets')
                .select('*, budget_items(*)')
                .eq('id', id)
                .single();
            if (error) throw error;
            return data as Budget;
        },
        enabled: !!id && id !== 'novo'
    });
}

export function useCreateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (budget: Partial<Budget>) => {
            const { data, error } = await supabase
                .from('budgets')
                .insert([budget])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
        }
    });
}

export function useUpdateBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<Budget> }) => {
            const { data, error } = await supabase
                .from('budgets')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
            queryClient.invalidateQueries({ queryKey: ['budget', data.id] });
        }
    });
}

export function useDeleteBudget() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budgets'] });
        }
    });
}
