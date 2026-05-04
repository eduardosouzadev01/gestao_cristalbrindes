// CRM Status and Configuration Constants
export const SELLERS = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05'];

export const CRM_STATUS_CONFIG: Record<string, { label: string; colorClass: string; icon: string }> = {
    'ATENDIMENTO': { 
        label: '🔵 Em Andamento', 
        colorClass: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#DBEAFE]', 
        icon: 'pending' 
    },
    'PROPOSTA_ENVIADA': { 
        label: '🟠 Proposta Enviada', 
        colorClass: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]', 
        icon: 'description' 
    },
    'ENVIO_CATALOGO': { 
        label: '⚪ Catálogo Enviado', 
        colorClass: 'bg-[#F9FAFB] text-[#1F2937] border-[#E5E7EB]', 
        icon: 'auto_stories' 
    },
    'PEDIDO_ABERTO': { 
        label: '🟢 Pedido Aberto', 
        colorClass: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]', 
        icon: 'task_alt' 
    },
    'NAO_APROVADO': { 
        label: '⚫ Não Aprovado', 
        colorClass: 'bg-[#FFF7ED] text-[#9A3412] border-[#FED7AA]', 
        icon: 'cancel' 
    }
};

export const SUB_STATUS_CONFIG: Record<string, { options: { value: string; label: string; colorClass: string; dotColor: string }[] }> = {
    'ATENDIMENTO': {
        options: [
            { value: 'aguardando_cliente', label: 'Aguardando inf. cliente', colorClass: 'bg-sky-50 text-sky-700 border-sky-200', dotColor: 'bg-sky-500' },
            { value: 'aguardando_fornecedor', label: 'Aguardando fornecedor', colorClass: 'bg-violet-50 text-violet-700 border-violet-300', dotColor: 'bg-violet-500' },
            { value: 'gerando_orcamento', label: 'Gerando orçamento', colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-500' },
        ]
    },
    'PROPOSTA_ENVIADA': {
        options: [
            { value: 'aguardando_analise', label: 'Aguardando Análise', colorClass: 'bg-yellow-50 text-yellow-700 border-yellow-200', dotColor: 'bg-yellow-500' },
            { value: 'acompanhamento_01', label: 'Acompanhamento 01', colorClass: 'bg-orange-50 text-orange-700 border-orange-200', dotColor: 'bg-orange-500' },
            { value: 'acompanhamento_02', label: 'Acompanhamento 02', colorClass: 'bg-red-50 text-red-700 border-red-200', dotColor: 'bg-red-500' },
        ]
    },
    'NAO_APROVADO': {
        options: [
            { value: 'nao_atende_prazo', label: 'Não atende o prazo', colorClass: 'bg-rose-50 text-rose-700 border-rose-200', dotColor: 'bg-rose-500' },
            { value: 'fornecedor_preco_melhor', label: 'Fornecedor preço melhor', colorClass: 'bg-pink-50 text-pink-700 border-pink-200', dotColor: 'bg-pink-500' },
            { value: 'cliente_desistiu', label: 'Cliente desistiu s/ retorno', colorClass: 'bg-slate-100 text-slate-600 border-slate-200', dotColor: 'bg-slate-500' },
        ]
    }
};

export const getStatusStyle = (status: string) => {
    return CRM_STATUS_CONFIG[status] || { label: status, colorClass: 'bg-gray-50 text-gray-600 border-gray-100', icon: 'help_outline' };
};

export const getSubStatusStyle = (status: string, subStatus: string) => {
    const config = SUB_STATUS_CONFIG[status]?.options.find(opt => opt.value === subStatus);
    return config || { label: 'Selecionar', colorClass: 'bg-gray-50 text-gray-400 border-gray-200', dotColor: 'bg-gray-300' };
};
