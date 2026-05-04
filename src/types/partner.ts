export interface Partner {
    id: string;
    type: 'CLIENTE' | 'FORNECEDOR';
    name: string;
    company_name: string;
    doc: string;
    ie?: string;
    phone: string;
    email: string;
    zip_code?: string;
    address: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    contact_name: string;
    notes: string;
    seller_id: string;
    salesperson: string;
    created_at: string;
}
