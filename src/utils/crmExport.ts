import { Lead } from '../hooks/useCRM';
import { exportToCSV, formatDateForExport } from './csvExport';

export const exportLeadsToExcel = (leads: Lead[]) => {
    const columns = [
        { header: 'Data Criação', accessor: (l: Lead) => formatDateForExport(l.created_at.split('T')[0]) },
        { header: 'Cliente', accessor: 'client_name' },
        { header: 'Contato', accessor: 'client_contact_name' },
        { header: 'Telefone', accessor: 'client_phone' },
        { header: 'E-mail', accessor: 'client_email' },
        { header: 'Status', accessor: 'status' },
        { header: 'Vendedor', accessor: 'salesperson' },
        { header: 'Valor Estimado', accessor: (l: Lead) => l.estimated_value || 0 },
        { header: 'Próxima Ação', accessor: (l: Lead) => l.next_action_date ? formatDateForExport(l.next_action_date) : '---' },
        { header: 'Prioridade', accessor: 'priority' },
        { header: 'Notas', accessor: 'notes' },
        { header: 'Motivo Perda', accessor: 'lost_reason' || '---' },
    ];

    exportToCSV(leads, columns, 'Exportacao_CRM_Cristal_Brindes');
};
