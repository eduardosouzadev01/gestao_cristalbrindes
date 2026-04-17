// CRM Status and Configuration Constants

export const CRM_STATUS_CONFIG: Record<string, { label: string; colorClass: string; icon: string }> = {
    'ATENDIMENTO': { 
        label: 'Em Andamento', 
        colorClass: '!bg-sky-100 !text-sky-900 !border-sky-300', 
        icon: 'pending_actions' 
    },
    'ACOMPANHAMENTO_01': { 
        label: 'Acompanhamento 01', 
        colorClass: '!bg-cyan-100 !text-cyan-900 !border-cyan-300', 
        icon: 'assignment_turned_in' 
    },
    'ACOMPANHAMENTO_02': { 
        label: 'Acompanhamento 02', 
        colorClass: '!bg-indigo-100 !text-indigo-900 !border-indigo-300', 
        icon: 'task_alt' 
    },
    'PROPOSTA_ENVIADA': { 
        label: 'Proposta Enviada', 
        colorClass: '!bg-amber-100 !text-amber-900 !border-amber-300', 
        icon: 'send' 
    },
    'ENVIO_CATALOGO': { 
        label: 'Envio de Catálogo', 
        colorClass: '!bg-orange-100 !text-orange-900 !border-orange-300', 
        icon: 'auto_stories' 
    },
    'PEDIDO_ABERTO': { 
        label: 'Pedido Aberto', 
        colorClass: '!bg-emerald-100 !text-emerald-900 !border-emerald-300', 
        icon: 'verified' 
    },
    'NAO_ATENDE_PRAZO': { 
        label: 'Não atende Prazo', 
        colorClass: '!bg-rose-100 !text-rose-900 !border-rose-300', 
        icon: 'event_busy' 
    },
    'NAO_APROVADO': { 
        label: 'Não Aprovado', 
        colorClass: '!bg-red-100 !text-red-900 !border-red-300', 
        icon: 'cancel' 
    }
};

export const getStatusStyle = (status: string) => {
    return CRM_STATUS_CONFIG[status] || { label: status, colorClass: 'bg-gray-50 text-gray-600 border-gray-100', icon: 'help_outline' };
};
