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

// Para usar Zod depois (Item 4 das Melhorias), você vai criar validações na mesma pasta do componente.
