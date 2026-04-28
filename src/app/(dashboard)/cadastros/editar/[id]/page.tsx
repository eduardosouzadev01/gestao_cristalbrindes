'use client';

import React, { useEffect, useState } from 'react';
import PartnerForm from '@/components/partners/PartnerForm';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Partner } from '@/types/partner';
import { toast } from 'sonner';

export default function EditPartnerPage() {
    const params = useParams();
    const id = params.id as string;
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchPartner();
    }, [id]);

    const fetchPartner = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('partners')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setPartner(data);
        } catch (error: any) {
            toast.error('Erro ao buscar dados: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-[#6B7280] font-medium uppercase text-xs animate-pulse tracking-widest">
                Carregando dados do parceiro...
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-[#6B7280] font-medium uppercase text-xs tracking-widest">
                Parceiro não encontrado.
            </div>
        );
    }

    return <PartnerForm initialData={partner} />;
}
