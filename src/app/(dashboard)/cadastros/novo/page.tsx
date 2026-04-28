'use client';

import PartnerForm from '@/components/partners/PartnerForm';
import { useSearchParams } from 'next/navigation';

export default function NewPartnerPage() {
    const searchParams = useSearchParams();
    const type = (searchParams.get('type') as 'CLIENTE' | 'FORNECEDOR') || 'CLIENTE';

    return <PartnerForm defaultType={type} />;
}
