export interface Partner {
    id: string;
    type: 'CLIENTE' | 'FORNECEDOR';
    name: string;
    company_name: string;
    doc: string;
    phone: string;
    email: string;
    address: string;
    contact_name: string;
    notes: string;
    seller_id: string;
    salesperson: string;
    created_at: string;
}
