import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Exemplo da nova arquitetura (Item 2 das Melhorias)
// Aqui extraímos a lógica do componente para React Query, assim ganhando Cache, isPending, isError automáticos.

export function useClients() {
    return useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('partners')
                .select(`
          *,
          salesperson:users!partners_salesperson_id_fkey(name)
        `)
                .eq('type', 'client')
                .order('name');

            if (error) throw error;
            return data;
        },
    });
}


export function useSuppliers() {
    return useQuery({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .eq('type', 'FORNECEDOR')
                .order('name');

            if (error) throw error;
            return data;
        },
    });
}

export function useCreatePartner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (partner: any) => {
            const { data, error } = await supabase
                .from('partners')
                .insert([partner])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            queryClient.invalidateQueries({ queryKey: ['clients'] });
        }
    });
}
