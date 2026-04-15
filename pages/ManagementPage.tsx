
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Lead } from '../src/hooks/useCRM';
import { fixClientName } from '../src/utils/textUtils';
import { formatDate } from '../src/utils/dateUtils';
import { maskPhone, maskCpfCnpj } from '../src/utils/maskUtils';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// CRM STATUS CONFIG (Independent for leads)
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

// --- Transfer Request Interface ---
interface TransferRequest {
    id: string;
    client_id?: string;
    order_id?: string;
    order_number?: string;
    requesting_salesperson: string;
    requested_salesperson?: string; // For SellerTransferRequest
    current_salesperson: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PENDENTE' | 'APROVADO' | 'REJEITADO';
    reason?: string;
    created_at: string;
    updated_at: string;
    requested_by_email?: string;
    client?: {
        name: string;
    };
    type: 'CLIENT' | 'ORDER';
}

// Interfaces (Lead importada de useCRM)

const ManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasPermission, appUser } = useAuth();

    const userSalesperson = appUser?.salesperson || '';
    const isSeller = !!appUser?.salesperson && !hasPermission('adm') && !hasPermission('gestao') && !hasPermission('crm.performance');

    const initialLeadState: Partial<Lead> = {
        status: 'ATENDIMENTO',
        atendimento_status: 'ATENDIMENTO',
        salesperson: userSalesperson || '', // Prevent silent default to VENDAS 01
        priority: 'NORMAL',
        client_name: '', client_contact_name: '', client_phone: '', client_email: '', client_doc: ''
    };

    const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (openStatusMenuId && !(event.target as Element).closest('.status-dropdown-container')) {
                setOpenStatusMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openStatusMenuId]);

    const tabParam = searchParams.get('tab') as 'RECORDS' | 'TRANSFERENCIAS' | null;
    const [activeTab, setActiveTab] = useState<'RECORDS' | 'TRANSFERENCIAS'>(tabParam || 'RECORDS');
    
    // Core Data States
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
    const [pendingTransferCount, setPendingTransferCount] = useState(0);
    const [loadingTransfers, setLoadingTransfers] = useState(false);

    // Filters & Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [kanbanSellerFilter, setKanbanSellerFilter] = useState('Todos');
    const [kanbanPeriodFilter, setKanbanPeriodFilter] = useState('Todos');
    const [kanbanStatusCategoryFilter, setKanbanStatusCategoryFilter] = useState('Todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // Lead Management States
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [newLead, setNewLead] = useState<Partial<Lead>>(initialLeadState);
    const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
    const [newItemText, setNewItemText] = useState('');
    const [isSavingPartner, setIsSavingPartner] = useState(false);
    const [partnerSaved, setPartnerSaved] = useState(false);
    const [showClientForm, setShowClientForm] = useState(false);

    // Finalization & Lost States
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [finalizeForm, setFinalizeForm] = useState({ success: true, value: 0, notes: '', category: 'VENDA' });
    const [isLostReasonModalOpen, setIsLostReasonModalOpen] = useState(false);
    const [lostForm, setLostForm] = useState({ category: 'PREÇO', reason: '' });
    const [pendingStatusLead, setPendingStatusLead] = useState<Lead | null>(null);

    // Transfer Modal States
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedClientToTransfer, setSelectedClientToTransfer] = useState<any>(null);
    const [transferReason, setTransferReason] = useState('');
    
    // Direct Transfer States
    const [isDirectTransferModalOpen, setIsDirectTransferModalOpen] = useState(false);
    const [leadToDirectTransfer, setLeadToDirectTransfer] = useState<Lead | null>(null);
    const [targetSalesperson, setTargetSalesperson] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    const SALESPERSON_OPTIONS = [
        'VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04'
    ];

    // Check Client Modal (initial check)
    const [isCheckClientModalOpen, setIsCheckClientModalOpen] = useState(false);
    const [checkClientInput, setCheckClientInput] = useState('');

    // Client Search State
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
    const [showClientResults, setShowClientResults] = useState(false);

    // Client Search logic for Modal
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (clientSearchTerm.length < 2) {
                setClientSearchResults([]);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('partners')
                    .select('*')
                    .eq('type', 'CLIENTE')
                    .or(`name.ilike.%${clientSearchTerm}%,contact_name.ilike.%${clientSearchTerm}%,phone.ilike.%${clientSearchTerm}%`)
                    .limit(5);

                if (error) throw error;
                setClientSearchResults(data || []);
            } catch (err) {
                console.error('Error searching clients:', err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [clientSearchTerm]);

    // UI State
    const [compactMode, setCompactMode] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Scroll Click & Drag State
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDraggingScroll, setIsDraggingScroll] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Effects
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (activeTab === 'RECORDS') fetchLeads();
        else if (activeTab === 'TRANSFERENCIAS') fetchTransferRequests();
    }, [activeTab, startDate, endDate]);

    useEffect(() => {
        if (isLeadModalOpen && newLead) {
            const metadata = newLead.closing_metadata || {};
            setChecklistItems(metadata.checklist || []);
        } else {
            setChecklistItems([]);
        }
    }, [isLeadModalOpen, newLead?.id]);

    const addChecklistItem = () => {
        if (!newItemText.trim()) return;
        const newItem = { id: Date.now().toString(), text: newItemText, completed: false };
        setChecklistItems([...checklistItems, newItem]);
        setNewItemText('');
    };

    const toggleChecklistItem = (id: string) => {
        setChecklistItems(checklistItems.map(item =>
            item.id === id ? { ...item, completed: !item.completed } : item
        ));
    };

    const removeChecklistItem = (id: string) => {
        setChecklistItems(checklistItems.filter(item => item.id !== id));
    };

    // --- Data Fetching Functions ---
    const fetchLeads = async () => {
        setLoading(true);
        try {
            let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });

            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

            if (isSeller && userSalesperson) {
                query = query.eq('salesperson', userSalesperson);
            }

            const { data, error } = await query;
            if (error) throw error;

            const priorityWeight = { 'ALTA': 3, 'NORMAL': 2, 'BAIXA': 1 };
            const sorted = (data || []).sort((a, b) => {
                const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
                if (pA !== pB) return pB - pA;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setLeads(sorted);
        } catch (error: any) {
            toast.error('Erro ao carregar leads: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransferRequests = async () => {
        try {
            setLoadingTransfers(true);
            let clientQuery = supabase.from('client_transfer_requests').select('*, client:partners(name)');
            if (isSeller && userSalesperson) {
                clientQuery = clientQuery.or(`requesting_salesperson.eq.${userSalesperson},current_salesperson.eq.${userSalesperson}`);
            }
            const { data: clients, error: clientError } = await clientQuery.order('created_at', { ascending: false });
            if (clientError) throw clientError;

            let orderQuery = supabase.from('seller_transfer_requests').select('*');
            if (isSeller && userSalesperson) {
                orderQuery = orderQuery.or(`requested_salesperson.eq.${userSalesperson},current_salesperson.eq.${userSalesperson}`);
            }
            const { data: orders, error: orderError } = await orderQuery.order('created_at', { ascending: false });
            if (orderError) throw orderError;

            const unified: TransferRequest[] = [
                ...(clients || []).map(c => ({ ...c, type: 'CLIENT' as const })),
                ...(orders || []).map(o => ({ 
                    ...o, 
                    type: 'ORDER' as const,
                    requesting_salesperson: o.current_salesperson,
                    requested_salesperson: o.requested_salesperson,
                    status: o.status === 'PENDENTE' ? 'PENDING' : o.status === 'APROVADO' ? 'APPROVED' : 'REJECTED'
                }))
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setTransferRequests(unified);
            setPendingTransferCount(unified.filter(r => r.status === 'PENDING').length);
        } catch (error: any) {
            console.error('Erro ao buscar solicitações:', error);
            toast.error('Erro ao carregar transferências');
        } finally {
            setLoadingTransfers(false);
        }
    };

    const handleRequestTransfer = async () => {
        if (!selectedClientToTransfer) return;
        try {
            const { error } = await supabase
                .from('client_transfer_requests')
                .insert({
                    client_id: selectedClientToTransfer.id,
                    requesting_salesperson: appUser?.salesperson || 'ADMIN',
                    current_salesperson: selectedClientToTransfer.salesperson,
                    reason: 'SOLICITAÇÃO DE TROCA VIA CRM',
                    status: 'PENDING',
                    requested_by_email: appUser?.email
                });

            if (error) throw error;

            // Notify Management
            await supabase.from('notifications').insert({
                user_email: 'cristalbrindes@cristalbrindes.com.br',
                title: `🔄 Troca de Carteira - ${selectedClientToTransfer.name}`,
                message: `${appUser?.salesperson || 'ADMIN'} solicita o cliente do vendedor ${selectedClientToTransfer.salesperson}.`,
                type: 'info',
                read: false,
                link: `/crm?tab=TRANSFERENCIAS`
            });

            toast.success('Solicitação enviada com sucesso!');
            setIsTransferModalOpen(false);
            setTransferReason('');
            setSelectedClientToTransfer(null);
            fetchTransferRequests();
        } catch (error: any) {
            toast.error('Erro ao enviar solicitação.');
            console.error(error);
        }
    };

    const handleApproveTransfer = async (request: TransferRequest) => {
        try {
            if (request.type === 'CLIENT') {
                const { error: clientError } = await supabase
                    .from('partners')
                    .update({ salesperson: request.requesting_salesperson })
                    .eq('id', request.client_id);
                if (clientError) throw clientError;

                const { error: requestError } = await supabase
                    .from('client_transfer_requests')
                    .update({ status: 'APPROVED' })
                    .eq('id', request.id);
                if (requestError) throw requestError;
            } else {
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({ salesperson: request.requested_salesperson })
                    .eq('id', request.order_id);
                if (orderError) throw orderError;

                await supabase.from('order_change_logs').insert({
                    order_id: request.order_id,
                    user_email: appUser?.email || 'SISTEMA',
                    field_name: 'vendedor',
                    old_value: request.current_salesperson,
                    new_value: request.requested_salesperson,
                    description: `Troca de vendedor aprovada pela gerência. Motivo: ${request.reason}`
                });

                const { error: requestError } = await supabase
                    .from('seller_transfer_requests')
                    .update({ status: 'APROVADO' })
                    .eq('id', request.id);
                if (requestError) throw requestError;
            }

            toast.success('Transferência aprovada com sucesso!');

            if (request.requested_by_email) {
                await supabase.from('notifications').insert({
                    user_email: request.requested_by_email,
                    title: `✅ Troca Aprovada`,
                    message: `Sua solicitação de troca para ${request.type === 'CLIENT' ? request.client?.name : 'Pedido #' + request.order_number} foi aprovada.`,
                    type: 'success',
                    read: false,
                    link: request.type === 'CLIENT' ? '/clientes' : `/pedido/${request.order_id}`
                });
            }
            fetchTransferRequests();
        } catch (error: any) {
            toast.error('Erro ao aprovar transferência.');
            console.error(error);
        }
    };

    const handleRejectTransfer = async (request: TransferRequest) => {
        try {
            if (request.type === 'CLIENT') {
                const { error } = await supabase
                    .from('client_transfer_requests')
                    .update({ status: 'REJECTED' })
                    .eq('id', request.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('seller_transfer_requests')
                    .update({ status: 'REJEITADO' })
                    .eq('id', request.id);
                if (error) throw error;
            }

            toast.success('Solicitação rejeitada.');

            if (request.requested_by_email) {
                await supabase.from('notifications').insert({
                    user_email: request.requested_by_email,
                    title: `❌ Troca Rejeitada`,
                    message: `Sua solicitação de troca para ${request.type === 'CLIENT' ? request.client?.name : 'Pedido #' + request.order_number} foi rejeitada pela gerência.`,
                    type: 'danger',
                    read: false
                });
            }
            fetchTransferRequests();
        } catch (error: any) {
            toast.error('Erro ao rejeitar solicitação.');
            console.error(error);
        }
    };

    const handleDirectTransfer = async () => {
        if (!leadToDirectTransfer || !targetSalesperson) return;
        
        setIsTransferring(true);
        try {
            // 1. Atualizar o atendimento (lead) no CRM
            const { error: leadError } = await supabase
                .from('crm_leads')
                .update({ salesperson: targetSalesperson })
                .eq('id', leadToDirectTransfer.id);

            if (leadError) throw leadError;

            // 2. Localizar e atualizar o parceiro (cliente)
            const conditions = [];
            if (leadToDirectTransfer.client_doc) conditions.push(`doc.eq."${leadToDirectTransfer.client_doc.replace(/"/g, '""')}"`);
            if (leadToDirectTransfer.client_email) conditions.push(`email.eq."${leadToDirectTransfer.client_email.replace(/"/g, '""')}"`);
            
            if (conditions.length > 0) {
                const { data: partners, error: fetchPartnerError } = await supabase
                    .from('partners')
                    .select('id')
                    .or(conditions.join(','))
                    .eq('type', 'CLIENTE')
                    .limit(1);

                if (!fetchPartnerError && partners && partners.length > 0) {
                    const { error: partnerUpdateError } = await supabase
                        .from('partners')
                        .update({ salesperson: targetSalesperson })
                        .eq('id', partners[0].id);
                    
                    if (partnerUpdateError) console.error('Erro ao atualizar vendedor do parceiro:', partnerUpdateError);
                }
            }

            toast.success(`Atendimento transferido com sucesso para ${targetSalesperson}!`);
            setIsDirectTransferModalOpen(false);
            setLeadToDirectTransfer(null);
            setTargetSalesperson('');
            fetchLeads();
        } catch (error: any) {
            console.error('Erro na transferência:', error);
            toast.error('Erro ao transferir atendimento: ' + error.message);
        } finally {
            setIsTransferring(false);
        }
    };

    const handleAttendLead = async (e: React.MouseEvent, leadId: string) => {
        e.stopPropagation();
        try {
            const { error } = await supabase
                .from('crm_leads')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', leadId);
            if (error) throw error;
            toast.success('Atendimento atualizado!');
            fetchLeads();
        } catch (error: any) {
            toast.error('Erro ao atualizar: ' + error.message);
        }
    };

    const checkClientAndProceed = async () => {
        if (!checkClientInput.trim()) return;

        setLoading(true);
        const term = checkClientInput.trim();
        const isEmail = term.includes('@');

        let foundClient = null;

        if (isEmail) {
            const { data } = await supabase.from('partners').select('*').ilike('email', term).maybeSingle();
            foundClient = data;
        } else {
            // Assume phone search
            const { data } = await supabase.from('partners').select('*').or(`phone.ilike.%${term}%,doc.ilike.%${term}%`).limit(1);
            if (data && data.length > 0) foundClient = data[0];
        }

        setLoading(false);
        setIsCheckClientModalOpen(false);
        setCheckClientInput('');

        // Reset lead state before opening
        const baseLead = { ...initialLeadState };

        if (foundClient) {
            toast.success(`Cliente Encontrado: ${foundClient.name}`);
            setNewLead({
                ...baseLead,
                client_name: foundClient.name,
                client_contact_name: foundClient.contact_name || '',
                client_phone: foundClient.phone,
                client_email: foundClient.email,
                client_doc: foundClient.doc || '',
                salesperson: userSalesperson || foundClient.salesperson || 'VENDAS 01',
            });
            setEditingLead(null);
            setPartnerSaved(true);
            setIsLeadModalOpen(true);
        } else {
            toast('Cliente não encontrado. Preencha o cadastro.', { icon: '📝' });
            setNewLead({
                ...baseLead,
                client_name: '',
                client_contact_name: '',
                client_phone: !isEmail ? term : '',
                client_email: isEmail ? term : '',
                client_doc: ''
            });
            setEditingLead(null);
            setPartnerSaved(false);
            setIsLeadModalOpen(true);
        }
    };

    const searchClients = async (term: string) => {
        setClientSearchTerm(term);
        if (term.length < 3) {
            setClientSearchResults([]);
            setShowClientResults(false);
            return;
        }

        // Expanded search: Name, Email, Doc, Phone
        const { data } = await supabase
            .from('partners')
            .select('*')
            .or(`name.ilike.%${term}%,email.ilike.%${term}%,doc.ilike.%${term}%,phone.ilike.%${term}%`)
            .limit(10);

        if (data) {
            setClientSearchResults(data);
            setShowClientResults(true);
        }
    };

    const selectClient = (client: any) => {
        if (client.salesperson && newLead.salesperson && client.salesperson !== newLead.salesperson) {
            // Trigger Transfer Request instead of just alert
            setSelectedClientToTransfer(client);
            setIsTransferModalOpen(true);
            return;
        }

        setNewLead(prev => ({
            ...prev,
            client_name: fixClientName(client.name),
            client_phone: client.phone,
            client_email: client.email,
            client_doc: client.doc,
            client_contact_name: client.contact_name
        }));
        setClientSearchTerm('');
        setShowClientResults(false);
        setPartnerSaved(true); // Treat existing clients as already saved
    };

    const handleSavePartner = async () => {
        if (!newLead.client_name) {
            toast.error('Nome do cliente é obrigatório.');
            return;
        }

        setIsSavingPartner(true);
        try {
            const partnerPayload = {
                name: newLead.client_name,
                contact_name: newLead.client_contact_name || null,
                phone: newLead.client_phone,
                email: newLead.client_email,
                doc: newLead.client_doc,
                type: 'CLIENTE' as const,
                salesperson: newLead.salesperson
            };

            let existingClientId = null;
            if (newLead.client_doc) {
                const { data: existing } = await supabase.from('partners').select('id').eq('doc', newLead.client_doc).maybeSingle();
                if (existing) existingClientId = existing.id;
            }

            if (existingClientId) {
                const { error } = await supabase.from('partners').update(partnerPayload).eq('id', existingClientId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('partners').insert([partnerPayload]);
                if (error) throw error;
            }

            setPartnerSaved(true);
            toast.success('Cliente salvo no banco de dados!');
        } catch (e: any) {
            toast.error('Erro ao salvar cliente: ' + e.message);
        } finally {
            setIsSavingPartner(false);
        }
    };

    const saveLead = async () => {
        if (!newLead.client_name) {
            toast.error('Nome do cliente é obrigatório.');
            return;
        }

        if (!newLead.salesperson) {
            toast.error('Vendedor responsável é obrigatório.');
            return;
        }

        if (newLead.client_email) {
            const openStatuses = ['ATENDIMENTO', 'PROPOSTA_ENVIADA', 'ENVIO_CATALOGO'];
            let checkQuery = supabase
                .from('crm_leads')
                .select('id, salesperson, closing_metadata')
                .eq('client_email', newLead.client_email)
                .in('status', openStatuses);

            if (editingLead && editingLead.id) {
                checkQuery = checkQuery.neq('id', editingLead.id);
            }

            const { data: existingLeads } = await checkQuery as { data: any[] };

            if (existingLeads && existingLeads.length > 0) {
                const hasSameItem = existingLeads.some(l => l.closing_metadata?.quoted_item === newLead.closing_metadata?.quoted_item);
                const seller = existingLeads[0].salesperson;
                const msg = hasSameItem 
                    ? `Este cliente já tem um atendimento em aberto para este MESMO ITEM com o vendedor ${seller}. Deseja criar outro atendimento duplicado mesmo assim?`
                    : `Este cliente já tem um atendimento em aberto para outro item com o vendedor ${seller}. Criar um novo atendimento paralelo para "${newLead.closing_metadata?.quoted_item || 'Novo Item'}"?`;
                
                if (!window.confirm(msg)) {
                    return;
                }
            }
        }

        try {
            // 1. Save/Update Partner (Client) - only if not already saved via the new button
            if (!partnerSaved && newLead.client_name) {
                const partnerPayload = {
                    name: newLead.client_name,
                    contact_name: newLead.client_contact_name || null,
                    phone: newLead.client_phone,
                    email: newLead.client_email,
                    doc: newLead.client_doc,
                    type: 'CLIENTE',
                    salesperson: newLead.salesperson
                };

                let existingClientId = null;
                if (newLead.client_doc) {
                    const { data: existing } = await supabase.from('partners').select('id').eq('doc', newLead.client_doc).maybeSingle();
                    if (existing) existingClientId = existing.id;
                }

                if (existingClientId) {
                    await supabase.from('partners').update(partnerPayload).eq('id', existingClientId);
                } else {
                    await supabase.from('partners').insert([partnerPayload]);
                }
            }

            // 2. Save Lead
            const leadPayload = {
                ...newLead,
                priority: newLead.priority || 'NORMAL',
                closing_metadata: {
                    ...(newLead.closing_metadata || {}),
                    checklist: checklistItems,
                }
            };

            if (editingLead && editingLead.id) {
                const { error } = await supabase.from('crm_leads').update(leadPayload).eq('id', editingLead.id);
                if (error) throw error;
                toast.success('Atendimento atualizado!');
            } else {
                const { error } = await supabase.from('crm_leads').insert([leadPayload]);
                if (error) throw error;
                toast.success('Novo atendimento criado!');
            }
            setIsLeadModalOpen(false);
            setEditingLead(null);
            setShowClientForm(false);
            setPartnerSaved(false);
            setNewLead({ ...initialLeadState, salesperson: userSalesperson || 'VENDAS 01' });
            setClientSearchTerm('');
            fetchLeads();
        } catch (e: any) {
            toast.error('Erro ao salvar: ' + e.message);
        }
    };

    const deleteLead = async (id: string) => {
        if (!window.confirm('Excluir este atendimento?')) return;
        const { error } = await supabase.from('crm_leads').delete().eq('id', id);
        if (error) toast.error('Erro ao excluir');
        else {
            toast.success('Atendimento excluído');
            fetchLeads();
        }
    };
    const updateLeadStatus = async (lead: Lead, newStatus: string) => {
        if (newStatus === 'NAO_APROVADO') {
            setPendingStatusLead(lead);
            setLostForm({ category: 'PREÇO', reason: '' });
            setIsLostReasonModalOpen(true);
            return;
        }

        if (newStatus === 'PEDIDO_ABERTO') {
            setPendingStatusLead(lead);
            setFinalizeForm({ success: true, value: lead.estimated_value || 0, notes: '', category: 'VENDA' });
            setIsFinalizeModalOpen(true);
            return;
        }

        // Optimistic update - update both fields to maintain consistency
        setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? { ...l, status: newStatus as any, atendimento_status: newStatus } : l));

        const { error } = await supabase.from('crm_leads').update({
            status: newStatus,
            atendimento_status: newStatus
        }).eq('id', lead.id);

        if (!error) {
            toast.success(`Status atualizado para ${CRM_STATUS_CONFIG[newStatus]?.label || newStatus}`);
            fetchLeads();
        } else {
            fetchLeads();
            toast.error('Erro ao atualizar status');
        }
    };

    const updateLeadAtendimentoStatus = async (lead: Lead, newStatus: string) => {
        // Optimistic update - update both fields for consistency
        setLeads(prevLeads => prevLeads.map(l => l.id === lead.id ? { ...l, atendimento_status: newStatus, status: newStatus as any } : l));

        const { error } = await supabase.from('crm_leads').update({
            atendimento_status: newStatus,
            status: newStatus
        }).eq('id', lead.id);

        if (!error) {
            toast.success(`Atendimento atualizado para ${CRM_STATUS_CONFIG[newStatus]?.label || newStatus}`);
            fetchLeads();
        } else {
            fetchLeads();
            toast.error('Erro ao atualizar status de atendimento');
        }
    };

    const togglePriority = async (lead: Lead) => {
        try {
            const priorities = ['NORMAL', 'ALTA', 'VIP', 'URGENTE'];
            const currentIndex = priorities.indexOf(lead.priority || 'NORMAL');
            const nextPriority = priorities[(currentIndex + 1) % priorities.length];

            const { error } = await supabase.from('crm_leads').update({
                priority: nextPriority
            }).eq('id', lead.id);

            if (error) throw error;
            toast.success(`Prioridade alterada para ${nextPriority}`);
            fetchLeads();
        } catch (error: any) {
            toast.error('Erro ao alterar prioridade');
        }
    };

    const confirmFinalizeLead = async () => {
        if (!pendingStatusLead) return;
        if (!finalizeForm.category) {
            toast.error('A categoria do motivo é obrigatória.');
            return;
        }

        const metadata = {
            success: finalizeForm.success,
            final_value: finalizeForm.value,
            notes: finalizeForm.notes,
            category: finalizeForm.category,
            finalized_at: new Date().toISOString()
        };

        const { error } = await supabase.from('crm_leads').update({
            status: 'PEDIDO_ABERTO',
            atendimento_status: 'PEDIDO_ABERTO',
            closing_metadata: metadata,
            estimated_value: finalizeForm.value,
            finish_reason_category: finalizeForm.category
        }).eq('id', pendingStatusLead.id);

        if (!error) {
            toast.success('Atendimento finalizado com sucesso! (Pedido Aberto)');
            setIsFinalizeModalOpen(false);
            setPendingStatusLead(null);
            fetchLeads();
        } else {
            toast.error('Erro ao finalizar: ' + error.message);
        }
    };

    const confirmLostLead = async () => {
        if (!pendingStatusLead) return;
        if (!lostForm.reason.trim()) {
            toast.error('O motivo é obrigatório.');
            return;
        }

        const { error } = await supabase.from('crm_leads').update({
            status: 'NAO_APROVADO',
            atendimento_status: 'NAO_APROVADO',
            lost_reason: `[${lostForm.category}] ${lostForm.reason}`,
            finish_reason_category: lostForm.category
        }).eq('id', pendingStatusLead.id);

        if (!error) {
            // Optimistic update
            setLeads(prevLeads => prevLeads.map(l => l.id === pendingStatusLead.id ? { ...l, status: 'NAO_APROVADO' } : l));
            toast.success('Atendimento marcado como não aprovado.');
            setIsLostReasonModalOpen(false);
            setPendingStatusLead(null);
            fetchLeads();
        }
    };

    const convertToBudget = async (lead: Lead) => {
        // Look up partner ID before navigating
        let clientId = '';
        if (lead.client_name) {
            const conditions: string[] = [];
            if (lead.client_doc) conditions.push(`doc.eq.${lead.client_doc}`);
            if (lead.client_email) conditions.push(`email.eq.${lead.client_email}`);
            if (lead.client_phone) conditions.push(`phone.eq.${lead.client_phone}`);
            if (conditions.length === 0) conditions.push(`name.ilike.${lead.client_name}`);

            const { data } = await supabase
                .from('partners')
                .select('id')
                .or(conditions.join(','))
                .eq('type', 'CLIENTE')
                .limit(1);

            if (data && data.length > 0) {
                clientId = data[0].id;
            }
        }

        navigate('/orcamento/novo', {
            state: {
                clientData: {
                    id: clientId,
                    name: lead.client_name,
                    phone: lead.client_phone || '',
                    email: lead.client_email || '',
                    doc: lead.client_doc || ''
                },
                vendedor: lead.salesperson || '',
                leadId: lead.id,
                quotedItem: lead.closing_metadata?.quoted_item
            }
        });
    };



    const leadColumns = Object.entries(CRM_STATUS_CONFIG)
        .filter(([id]) => !['PEDIDO_ABERTO', 'NAO_APROVADO'].includes(id)) // Keep only 'in progress' columns
        .map(([id, cfg]) => ({
            id,
            title: cfg.label,
            icon: cfg.icon
        }));

    const getSalespersonInitials = (name?: string) => {
        if (!name) return 'V';
        if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-600 text-3xl">analytics</span>
                        CRM & Vendas
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Gestão de atendimentos e desempenho comercial.</p>
                </div>
                <div className="flex items-center gap-4">
                    {activeTab !== 'LEADS' && (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                                <span className="material-icons-outlined text-gray-400 pl-2 text-sm">calendar_today</span>
                                <input
                                    type="date"
                                    className="border-0 text-xs font-bold text-gray-500 uppercase focus:ring-0 py-1"
                                    value={startDate}
                                    onChange={e => {
                                        const newStartDate = e.target.value;
                                        setStartDate(newStartDate);
                                        // Validate if end date is before start date
                                        if (endDate && newStartDate && endDate < newStartDate) {
                                            toast.error('Data final não pode ser anterior à data inicial');
                                        }
                                    }}
                                />
                                <span className="text-gray-300">-</span>
                                <input
                                    type="date"
                                    className="border-0 text-xs font-bold text-gray-500 uppercase focus:ring-0 py-1"
                                    value={endDate}
                                    onChange={e => {
                                        const newEndDate = e.target.value;
                                        // Validate if end date is before start date
                                        if (startDate && newEndDate && newEndDate < startDate) {
                                            toast.error('Data final não pode ser anterior à data inicial');
                                            return;
                                        }
                                        setEndDate(newEndDate);
                                    }}
                                />
                                {startDate && <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-gray-400 hover:text-red-500 pr-2"><span className="material-icons-outlined text-sm">close</span></button>}
                            </div>
                            {/* Validation message for incomplete date range */}
                            {(startDate && !endDate) || (!startDate && endDate) ? (
                                <span className="text-[10px] text-red-500 font-bold mt-1 ml-2">Preencha ambas as datas para filtrar</span>
                            ) : null}
                        </div>
                    )}
                <div className="flex items-center gap-1 bg-transparent">
                    <button
                        onClick={() => {
                            setEditingLead(null);
                            setNewLead({ ...initialLeadState, salesperson: userSalesperson || 'VENDAS 01' });
                            setIsLeadModalOpen(true);
                        }}
                        className="px-4 py-2 bg-[#1565C0] text-white rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-blue-500/40 transition-all flex items-center gap-2"
                    >
                        <span className="material-icons-outlined text-sm">add_circle</span>
                        Novo Atendimento
                    </button>
                    {(!isSeller || hasPermission('crm.performance')) && (
                        <button
                            onClick={() => setActiveTab('TRANSFERENCIAS')}
                            className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'TRANSFERENCIAS' ? 'bg-[#1565C0] text-white' : 'bg-transparent text-gray-500 hover:text-[#1565C0] hover:underline decoration-2 underline-offset-4'}`}
                        >
                            <span className="material-icons-outlined text-sm">swap_horiz</span>
                            Trocas
                            {pendingTransferCount > 0 && (
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                                    {pendingTransferCount}
                                </span>
                            )}
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('RECORDS')}
                        className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'RECORDS' ? 'bg-[#1565C0] text-white' : 'bg-transparent text-gray-400 hover:text-[#1565C0] hover:underline decoration-2 underline-offset-4'}`}
                    >
                        <span className="material-icons-outlined text-sm">table_view</span>
                        Planilha
                    </button>
                </div>
            </div>
        </div>

            {/* Records (Planilha) Tab Content */}
            {activeTab === 'RECORDS' && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    {/* Summary Counters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-4 mb-6">
                        {((hasPermission('adm') || hasPermission('gestao') || hasPermission('crm.performance'))
                            ? ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04']
                            : [userSalesperson].filter(Boolean)
                        ).map((seller) => {
                            const count = leads.filter(l => l.salesperson === seller && (l.atendimento_status || l.status) === 'ATENDIMENTO').length;
                            const isActive = kanbanSellerFilter === seller;
                            return (
                                <div 
                                    key={seller} 
                                    onClick={() => setKanbanSellerFilter(isActive ? 'Todos' : seller)}
                                    className={`flex-1 min-w-[200px] p-5 rounded-2xl border flex items-center gap-4 transition-all group cursor-pointer ${
                                        isActive 
                                        ? 'bg-blue-600 border-blue-700 shadow-lg shadow-blue-200 ring-4 ring-blue-500/10' 
                                        : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100'
                                    }`}
                                >
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-[#E3F2FD] text-[#0D47A1]'
                                    }`}>
                                        <span className="material-icons-outlined text-xl">{isActive ? 'filter_alt' : 'person'}</span>
                                    </div>
                                    <div>
                                        <p className={`text-[10px] uppercase font-black tracking-widest ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>{seller}</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className={`text-xl font-black ${isActive ? 'text-white' : 'text-[#0D47A1]'}`}>{count}</p>
                                            <p className={`text-[11px] font-bold uppercase ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>Em Andamento</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    <div className="p-6 border-b border-gray-200 flex flex-wrap justify-between items-center bg-gray-50 gap-4">
                            <div className="flex items-center gap-4">
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 uppercase">Planilha de Atendimentos</h2>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Histórico completo de atendimentos (Ativos e Finalizados)</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative min-w-[200px]">
                                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                                    <input 
                                        type="text"
                                        placeholder="Buscar na planilha..."
                                        className="w-full pl-12 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-600 uppercase tracking-tighter outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-gray-300 transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="bg-white border border-gray-200 text-xs font-bold text-gray-500 py-1.5 px-3 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                                    value={kanbanSellerFilter}
                                    onChange={e => setKanbanSellerFilter(e.target.value)}
                                >
                                    <option value="Todos">Vendedor: Todos</option>
                                    {Array.from(new Set(leads.map(l => l.salesperson || 'N/A'))).sort().map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <select
                                    className="bg-white border border-gray-200 text-xs font-bold text-gray-500 py-1.5 px-3 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                                    value={kanbanPeriodFilter}
                                    onChange={e => setKanbanPeriodFilter(e.target.value)}
                                >
                                    <option value="Todos">Período: Todos</option>
                                    <option value="Hoje">Hoje</option>
                                    <option value="7d">Últimos 7 dias</option>
                                    <option value="30d">Últimos 30 dias</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 bg-slate-100/50 border-b border-gray-200">
                                                    <div className="relative">
                                    <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">filter_list</span>
                                    <select 
                                        className="pl-9 pr-6 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-600 uppercase tracking-tighter outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:border-gray-300 transition-all"
                                        value={kanbanStatusCategoryFilter}
                                        onChange={e => setKanbanStatusCategoryFilter(e.target.value)}
                                    >
                                        <option value="Todos">Status: Todos</option>
                                        {Object.entries(CRM_STATUS_CONFIG).map(([id, cfg]) => (
                                            <option key={id} value={id}>{cfg.label}</option>
                                        ))}
                                    </select>
                                </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => fetchLeads()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Atualizar dados">
                                    <span className="material-icons-outlined text-sm">refresh</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300 text-[14px]">
                                <thead>
                                    <tr className="bg-gray-100/50">
                                        <th className="px-6 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Atendimento</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Prioridade</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Data</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Cliente / Empresa</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Item / Projeto</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Vendedor</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200">Ações Rápidas</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400 font-bold uppercase text-xs animate-pulse tracking-widest">Carregando dados da nuvem...</td></tr>
                                    ) : (leads || [])
                                        .filter(l => kanbanSellerFilter === 'Todos' || l.salesperson === kanbanSellerFilter)
                                        .filter(l => {
                                            if (kanbanPeriodFilter === 'Todos') return true;
                                            const diff = new Date().getTime() - new Date(l.created_at).getTime();
                                            const days = Math.floor(diff / 86400000);
                                            if (kanbanPeriodFilter === 'Hoje') return days === 0;
                                            if (kanbanPeriodFilter === '7d') return days <= 7;
                                            if (kanbanPeriodFilter === '30d') return days <= 30;
                                            return true;
                                        })
                                        .filter(l => {
                                            if (kanbanStatusCategoryFilter === 'Todos') return true;
                                            const currentStatus = l.atendimento_status || l.status;
                                            return currentStatus === kanbanStatusCategoryFilter;
                                        })
                                        .filter(l => {
                                            if (!searchTerm) return true;
                                            const term = searchTerm.toLowerCase();
                                            return l.client_name.toLowerCase().includes(term) || (l.client_contact_name && l.client_contact_name.toLowerCase().includes(term)) || (l.client_phone && l.client_phone.includes(term)) || (l.salesperson && l.salesperson.toLowerCase().includes(term)) || (l.closing_metadata?.quoted_item && l.closing_metadata.quoted_item.toLowerCase().includes(term));
                                        })
                                        .map(l => {

                                            return (
                                                <tr key={l.id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="relative status-dropdown-container">
                                                            <button 
                                                                onClick={() => setOpenStatusMenuId(openStatusMenuId === `${l.id}-atend` ? null : `${l.id}-atend`)}
                                                                className={`flex items-center justify-between w-full min-w-[150px] text-[11px] font-black uppercase tracking-tighter rounded-md py-2 px-3 outline-none transition-all shadow-md border ${
                                                                    getStatusStyle(l.atendimento_status || 'ATENDIMENTO').colorClass
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <span className="material-icons-outlined text-[14px] opacity-70">{getStatusStyle(l.atendimento_status || 'ATENDIMENTO').icon}</span>
                                                                    <span className="truncate">{getStatusStyle(l.atendimento_status || 'ATENDIMENTO').label}</span>
                                                                </div>
                                                                <span className="material-icons-outlined text-[14px] opacity-50 ml-1">expand_more</span>
                                                            </button>

                                                            {openStatusMenuId === `${l.id}-atend` && (
                                                                <div className="absolute z-[100] mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 left-0">
                                                                    <div className="p-2 bg-gray-50 border-b border-gray-100">
                                                                        <span className="text-[9px] font-black pointer-events-none text-gray-400 uppercase tracking-widest pl-1">Alterar Atendimento</span>
                                                                    </div>
                                                                    <div className="max-h-80 overflow-y-auto p-1.5 space-y-1">
                                                                        {Object.entries(CRM_STATUS_CONFIG).map(([id, cfg]) => (
                                                                            <button 
                                                                                key={id} 
                                                                                onClick={() => {
                                                                                    updateLeadStatus(l, id);
                                                                                    setOpenStatusMenuId(null);
                                                                                }}
                                                                                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-lg transition-all hover:scale-[1.02] active:scale-95 ${cfg.colorClass} border border-transparent hover:border-current/20`}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/50 shadow-inner">
                                                                                        <span className="material-icons-outlined text-[16px]">{cfg.icon}</span>
                                                                                    </div>
                                                                                    <span className="font-black text-[11px] uppercase tracking-wider">{cfg.label}</span>
                                                                                </div>
                                                                                {(l.atendimento_status || 'ATENDIMENTO') === id && <span className="material-icons-outlined text-sm opacity-50">check</span>}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); togglePriority(l); }}
                                                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                                                l.priority === 'URGENTE' ? 'bg-red-600 text-white border border-red-700 shadow-sm' :
                                                                l.priority === 'ALTA' ? 'bg-red-50 text-red-600 border border-red-100' :
                                                                l.priority === 'VIP' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                                'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                                            }`}
                                                            title="Clique para alterar prioridade"
                                                        >
                                                            {l.priority || 'NORMAL'}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-600 tabular-nums">
                                                        {formatDate(l.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-black text-gray-950 text-base line-clamp-1">{fixClientName(l.client_name)}</div>
                                                        <div className="text-xs font-bold text-gray-500">{l.client_contact_name || l.client_phone}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {l.closing_metadata?.quoted_item ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="material-icons-outlined text-[14px] text-blue-500">inventory_2</span>
                                                                <span className="font-black text-blue-700 uppercase text-[10px] tracking-tighter truncate max-w-[120px]">{l.closing_metadata.quoted_item}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 italic text-[11px]">Não informado</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-black text-[9px] border border-gray-200">
                                                                {getSalespersonInitials(l.salesperson)}
                                                            </div>
                                                            <span className="font-black text-gray-800 text-xs truncate max-w-[100px]">{l.salesperson}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); navigate('/pedidos', { state: { clientName: l.client_name } }); }}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Ver Pedidos do Cliente"
                                                            >
                                                                <span className="material-icons-outlined text-lg">shopping_bag</span>
                                                            </button>
                                                            <button 
                                                                onClick={async (e) => { 
                                                                    e.stopPropagation(); 
                                                                    let clientId = ''; 
                                                                    const conditions = []; 
                                                                    if (l.client_doc) conditions.push(`doc.eq."${l.client_doc.replace(/"/g, '""')}"`); 
                                                                    if (l.client_email) conditions.push(`email.eq."${l.client_email.replace(/"/g, '""')}"`); 
                                                                    if (l.client_phone) conditions.push(`phone.eq."${l.client_phone.replace(/"/g, '""')}"`); 
                                                                    const safeClientName = l.client_name.replace(/"/g, '""');
                                                                    if (conditions.length === 0) conditions.push(`name.ilike."%${safeClientName}%"`);
                                                                    const { data } = await supabase.from('partners').select('id').or(conditions.join(',')).eq('type', 'CLIENTE').limit(1);
                                                                    if (data && data.length > 0) clientId = data[0].id;
                                                                    navigate('/orcamentos', { state: { clientName: l.client_name, clientId: clientId } });
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                                title="Ver Orçamentos do Cliente"
                                                            >
                                                                <span className="material-icons-outlined text-lg">request_quote</span>
                                                            </button>
                                                            <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingLead(l);
                                                                    setNewLead(l);
                                                                    setPartnerSaved(true);
                                                                    setIsLeadModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Editar Detalhes"
                                                            >
                                                                <span className="material-icons-outlined text-lg">edit</span>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    setLeadToDirectTransfer(l);
                                                                    setTargetSalesperson(l.salesperson || '');
                                                                    setIsDirectTransferModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                                title="Transferir Atendimento"
                                                            >
                                                                <span className="material-icons-outlined text-lg">swap_horiz</span>
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); convertToBudget(l); }}
                                                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                                title="Gerar Novo Orçamento"
                                                            >
                                                                <span className="material-icons-outlined text-lg">add</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {
                activeTab === 'TRANSFERENCIAS' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 uppercase">Solicitações de Troca de Carteira</h2>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Aprovação de transferências entre vendedores</p>
                            </div>
                            <button onClick={fetchTransferRequests} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                <span className="material-icons-outlined">sync</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Alvo</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Destino</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                        <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {loadingTransfers ? (
                                        <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-bold uppercase text-xs">Carregando...</td></tr>
                                    ) : transferRequests.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-bold uppercase text-xs">Nenhuma solicitação encontrada.</td></tr>
                                    ) : (
                                        transferRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${req.type === 'CLIENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {req.type === 'CLIENT' ? 'Carteira' : 'Pedido'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-gray-900">{req.type === 'CLIENT' ? fixClientName(req.client?.name || '') : `Pedido #${req.order_number}`}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium italic">"{req.reason || 'Sem motivo informado'}"</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-gray-600">{req.current_salesperson}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-blue-600">{req.type === 'CLIENT' ? req.requesting_salesperson : req.requested_salesperson}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString()}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700 animate-pulse'
                                                        }`}>
                                                        {req.status === 'PENDING' ? 'Pendente' : req.status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    {req.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleApproveTransfer(req)} className="px-3 py-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded hover:bg-green-600 transition-all shadow-sm">Aprovar</button>
                                                            <button onClick={() => handleRejectTransfer(req)} className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded hover:bg-red-600 transition-all shadow-sm">Rejeitar</button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Modal Lead */}
            {
                isLeadModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20 animate-in slide-in-from-bottom-8 duration-500">
                            {/* Modal Header */}
                            <div className="p-6 bg-gradient-to-r from-blue-700 to-blue-600 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                        <span className="material-icons-outlined text-white text-2xl">{editingLead ? 'edit' : 'person_add'}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                                            {editingLead ? 'Editar Atendimento' : 'Novo Atendimento'}
                                        </h3>
                                        <p className="text-blue-100 text-[11px] font-bold uppercase tracking-widest mt-1 opacity-80">
                                            {editingLead ? `Lead ID: ${editingLead.id.slice(0, 8)}...` : 'Preencha os dados no Pipeline'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { setIsLeadModalOpen(false); setEditingLead(null); setNewLead(initialLeadState); }}
                                    className="w-10 h-10 rounded-xl hover:bg-white/20 text-white transition-all flex items-center justify-center active:scale-95 border border-transparent hover:border-white/20"
                                >
                                    <span className="material-icons-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-slate-50/20">
                                <div className="grid grid-cols-1 lg:grid-cols-12 min-h-full">
                                    {/* Left Side: Client Data/Selection */}
                                    <div className="lg:col-span-7 bg-white border-r border-slate-100 flex flex-col">
                                        <div className="p-8 space-y-8 flex-1">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                                                        <span className="material-icons-outlined text-xl">contact_page</span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Identificação do Cliente</h4>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-12">Associe este atendimento a um cliente da base</p>
                                            </div>
                                            
                                            {/* Search/New Choice Section */}
                                            {!editingLead && !showClientForm && (
                                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 shadow-inner group focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-blue-500 group-focus-within:text-blue-600">
                                                                <span className="material-icons-outlined text-xl">search</span>
                                                            </div>
                                                            <input
                                                                className="bg-transparent border-none focus:ring-0 text-xs font-black text-slate-900 uppercase placeholder:text-slate-300 placeholder:font-bold w-full tracking-wider"
                                                                placeholder="LOCALIZAR CLIENTE..."
                                                                value={clientSearchTerm}
                                                                onChange={e => setClientSearchTerm(e.target.value)}
                                                            />
                                                        </div>
                                                        
                                                        {clientSearchResults.length > 0 && (
                                                            <div className="mt-4 bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden divide-y divide-blue-50 animate-in zoom-in-95 duration-200">
                                                                <div className="px-4 py-2.5 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Base de Partners</span>
                                                                    <span className="text-[9px] font-bold text-blue-300 uppercase bg-white px-2 py-0.5 rounded-full border border-blue-50">{clientSearchResults.length} Resultados</span>
                                                                </div>
                                                                {clientSearchResults.map(l => (
                                                                    <div 
                                                                        key={l.id} 
                                                                        className="px-5 py-4 hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-all"
                                                                        onClick={() => {
                                                                            const isManager = appUser?.role === 'ADMIN' || appUser?.role === 'GESTAO' || appUser?.role === 'SUPERVISOR';
                                                                            if (!isManager && l.salesperson && userSalesperson && l.salesperson !== userSalesperson) {
                                                                                setSelectedClientToTransfer(l);
                                                                                setIsTransferModalOpen(true);
                                                                                return;
                                                                            }

                                                                            setNewLead({
                                                                                ...newLead,
                                                                                client_id: l.id,
                                                                                client_name: l.name,
                                                                                client_contact_name: l.contact_name,
                                                                                client_phone: l.phone,
                                                                                client_email: l.email,
                                                                                client_doc: l.doc,
                                                                                salesperson: userSalesperson || l.salesperson || 'VENDAS 01'
                                                                            });
                                                                            setClientSearchTerm('');
                                                                            setClientSearchResults([]);
                                                                            setShowClientForm(true);
                                                                            setPartnerSaved(true);
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <p className="text-sm font-black text-blue-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{fixClientName(l.name)}</p>
                                                                            <p className="text-[11px] text-blue-400 font-bold mt-0.5">
                                                                                {l.contact_name || 'Sem contato'} • {l.phone || 'Sem fone'} • {l.doc || 'S/ Doc'}
                                                                            </p>
                                                                            <div className="mt-1 flex items-center gap-1.5">
                                                                                <span className="material-icons-outlined text-[10px] text-blue-500">person</span>
                                                                                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{l.salesperson || 'Sem Vendedor'}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                            <span className="material-icons-outlined text-sm">add</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="relative py-2">
                                                        <div className="absolute inset-x-0 top-1/2 h-px bg-slate-100 -z-10"></div>
                                                        <div className="flex justify-center">
                                                            <span className="bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">OU</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            setShowClientForm(true);
                                                            setPartnerSaved(false);
                                                            setNewLead({...initialLeadState, salesperson: userSalesperson || 'VENDAS 01'});
                                                        }}
                                                        className="w-full py-4 bg-slate-50 text-slate-600 border border-slate-200 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                                                            <span className="material-icons-outlined text-lg">person_add_alt</span>
                                                        </div>
                                                        CADASTRAR NOVO CLIENTE DO ZERO
                                                    </button>
                                                </div>
                                            )}

                                            {(editingLead || showClientForm) && (
                                                <div className={`p-6 rounded-2xl border-2 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${partnerSaved ? 'border-green-500 bg-green-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                                                    <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-3.5 h-3.5 rounded-full ${partnerSaved ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]' : 'bg-slate-300 animate-pulse'}`}></div>
                                                            <div>
                                                                <h4 className={`text-[12px] font-black uppercase tracking-widest ${partnerSaved ? 'text-green-600' : 'text-slate-600'}`}>
                                                                    {partnerSaved ? 'Cliente Vinculado' : 'Cadastro de Cliente'}
                                                                </h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] text-blue-600 font-black uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                                                                        <span className="material-icons-outlined text-[12px]">person</span>
                                                                        VENDEDOR: {newLead.salesperson || 'NÃO DEFINIDO'}
                                                                    </span>
                                                                    {editingLead && <span className="text-[8px] text-slate-400 font-bold uppercase border border-slate-200 px-2 py-0.5 rounded-md">Editando</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {partnerSaved && !editingLead && (
                                                                <button 
                                                                    onClick={() => {
                                                                        setShowClientForm(false);
                                                                        setPartnerSaved(false);
                                                                        setNewLead(initialLeadState);
                                                                    }}
                                                                    className="px-4 py-2 bg-white text-slate-500 hover:text-red-500 border border-slate-200 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm flex items-center gap-2 hover:bg-red-50 hover:border-red-100"
                                                                >
                                                                    <span className="material-icons-outlined text-[14px]">logout</span> Alterar
                                                                </button>
                                                            )}
                                                            {partnerSaved && (
                                                                <span className="bg-emerald-500 text-white text-[11px] px-4 py-2 rounded-xl font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-100">
                                                                    <span className="material-icons-outlined text-sm">verified</span> CLIENTE OK
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 tracking-wider ml-1">Empresa / Razão Social *</label>
                                                            <input
                                                                className={`w-full py-3.5 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-[13px] font-black text-slate-700 placeholder:text-slate-300 transition-all ${partnerSaved ? 'bg-slate-50 border-transparent' : 'bg-white shadow-sm hover:border-slate-300'}`}
                                                                placeholder="DIGITE O NOME..."
                                                                value={newLead.client_name || ''}
                                                                onChange={e => { setNewLead({ ...newLead, client_name: e.target.value }); setPartnerSaved(false); }}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-5">
                                                            <div>
                                                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 tracking-wider ml-1">Contato</label>
                                                                <input
                                                                    className={`w-full py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-black text-slate-700 placeholder:text-slate-300 transition-all ${partnerSaved ? 'bg-slate-50 border-transparent' : 'bg-white shadow-sm hover:border-slate-300'}`}
                                                                    placeholder="NOME DO CONTATO..."
                                                                    value={newLead.client_contact_name || ''}
                                                                    onChange={e => { setNewLead({ ...newLead, client_contact_name: e.target.value }); setPartnerSaved(false); }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 tracking-wider ml-1">Doc (CPF/CNPJ)</label>
                                                                <input
                                                                    className={`w-full py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-black text-slate-700 placeholder:text-slate-300 transition-all ${partnerSaved ? 'bg-slate-50 border-transparent' : 'bg-white shadow-sm hover:border-slate-300'}`}
                                                                    placeholder="000.000.000-00"
                                                                    value={newLead.client_doc || ''}
                                                                    onChange={e => { setNewLead({ ...newLead, client_doc: maskCpfCnpj(e.target.value) }); setPartnerSaved(false); }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-5">
                                                            <div>
                                                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 tracking-wider ml-1">WhatsApp</label>
                                                                <input
                                                                    className={`w-full py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-black text-slate-700 placeholder:text-slate-300 transition-all ${partnerSaved ? 'bg-slate-50 border-transparent' : 'bg-white shadow-sm hover:border-slate-300'}`}
                                                                    placeholder="(00) 00000-0000"
                                                                    value={newLead.client_phone || ''}
                                                                    onChange={e => { setNewLead({ ...newLead, client_phone: maskPhone(e.target.value) }); setPartnerSaved(false); }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[11px] font-black text-slate-500 uppercase mb-2 tracking-wider ml-1">E-mail</label>
                                                                <input
                                                                    type="email"
                                                                    className={`w-full py-3 px-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-black text-slate-700 placeholder:text-slate-300 transition-all ${partnerSaved ? 'bg-slate-50 border-transparent' : 'bg-white shadow-sm hover:border-slate-300'}`}
                                                                    placeholder="CLIENTE@EMAIL.COM..."
                                                                    value={newLead.client_email || ''}
                                                                    onChange={e => { setNewLead({ ...newLead, client_email: e.target.value.toLowerCase() }); setPartnerSaved(false); }}
                                                                />
                                                            </div>
                                                        </div>

                                                        {!partnerSaved && (
                                                            <button
                                                                onClick={handleSavePartner}
                                                                disabled={isSavingPartner}
                                                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 group"
                                                            >
                                                                {isSavingPartner ? (
                                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <>
                                                                        <span className="material-icons-outlined text-sm transition-transform group-hover:rotate-12">save_as</span>
                                                                        Salvar Cliente
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Side: Lead Details */}
                                    <div className="lg:col-span-5 p-8 space-y-6 bg-slate-50/50">
                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                                            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                                    <span className="material-icons-outlined text-lg">description</span>
                                                </div>
                                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Detalhes do Atendimento</h4>
                                            </div>

                                            <div className="grid grid-cols-12 gap-6">
                                                <div className="col-span-12">
                                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Vendedor Responsável</label>
                                                        {isSeller && (
                                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                                                                <span className="material-icons-outlined text-[10px]">lock</span>
                                                                Vinculado à sua conta
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-blue-500">
                                                            <span className="material-icons-outlined text-lg">person</span>
                                                        </div>
                                                        <select
                                                            className={`w-full pl-12 pr-10 py-3.5 rounded-2xl border-slate-100 bg-slate-50 transition-all text-sm font-black text-blue-800 uppercase shadow-inner appearance-none ${isSeller ? 'cursor-not-allowed opacity-80' : 'cursor-pointer group-hover:bg-white focus:bg-white focus:ring-4 focus:ring-blue-500/10'}`}
                                                            value={newLead.salesperson || ''}
                                                            onChange={e => setNewLead({ ...newLead, salesperson: e.target.value })}
                                                            disabled={isSeller}
                                                        >
                                                            {['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05', 'RECEPÇÃO', 'INTERNO', 'EXTERNO'].map(v => (
                                                                <option key={v} value={v}>{v}</option>
                                                            ))}
                                                        </select>
                                                        {!isSeller && (
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                                <span className="material-icons-outlined">expand_more</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="col-span-12">
                                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Item Buscado *</label>
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-blue-500">
                                                            <span className="material-icons-outlined text-lg">inventory_2</span>
                                                        </div>
                                                        <input
                                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-slate-100 bg-slate-50 group-hover:bg-white transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-sm font-black text-blue-800 uppercase shadow-inner"
                                                            placeholder="EX: COPO TÉRMICO, CANETA..."
                                                            value={newLead.closing_metadata?.quoted_item || ''}
                                                            onChange={e => setNewLead({
                                                                ...newLead,
                                                                closing_metadata: { ...(newLead.closing_metadata || {}), quoted_item: e.target.value }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* WhatsApp Template Section */}
                                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mt-6">
                                                <label className="block text-xs font-black text-blue-700 uppercase tracking-widest flex items-center gap-2 mb-3">
                                                    <span className="material-icons-outlined text-sm text-blue-600">description</span>
                                                    Notas do Atendimento
                                                </label>
                                                <textarea
                                                    className="form-textarea w-full rounded-xl border-blue-200/60 bg-white text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm p-3"
                                                    rows={3}
                                                    placeholder="Adicione observações importantes sobre este atendimento..."
                                                    value={newLead.closing_metadata?.wa_template || ''}
                                                    onChange={e => setNewLead({
                                                        ...newLead,
                                                        closing_metadata: { ...(newLead.closing_metadata || {}), wa_template: e.target.value }
                                                    })}
                                                ></textarea>
                                                <p className="text-[10px] text-blue-600/60 mt-2 italic font-medium">Estas notas são internas e ajudam no acompanhamento do lead.</p>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                                <div></div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsLeadModalOpen(false)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold uppercase text-[11px] tracking-wider text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">Cancelar</button>
                                    <button
                                        onClick={saveLead}
                                        disabled={!partnerSaved}
                                        className={`px-8 py-2.5 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all flex items-center gap-2 ${partnerSaved ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] shadow-blue-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                                    >
                                        {partnerSaved && <span className="material-icons-outlined text-[14px]">save</span>}
                                        Salvar Atendimento
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )
            }
            {/* Lost Reason Modal */}
            {
                isLostReasonModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
                            <div className="p-8 text-center bg-red-50/50">
                                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-icons-outlined text-3xl">sentiment_very_dissatisfied</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Orçamento Perdido</h3>
                                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">Ajude-nos a entender o motivo</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Categoria do Motivo</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['PREÇO', 'PRAZO', 'CONCORRÊNCIA', 'OUTRO'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setLostForm({ ...lostForm, category: cat })}
                                                className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${lostForm.category === cat ? 'bg-red-500 text-white border-red-500 shadow-md scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-red-200'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Descrição Detalhada</label>
                                    <textarea
                                        className="form-textarea w-full rounded-2xl border-gray-100 focus:ring-red-500 focus:border-red-500 text-sm font-medium bg-gray-50"
                                        rows={3}
                                        placeholder="Ex: O cliente achou o frete alto demais..."
                                        value={lostForm.reason}
                                        onChange={e => setLostForm({ ...lostForm, reason: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => { setIsLostReasonModalOpen(false); setPendingStatusLead(null); }}
                                        className="flex-1 py-3 text-gray-400 font-bold uppercase text-xs hover:text-gray-600 transition-colors"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={confirmLostLead}
                                        className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all active:scale-95"
                                    >
                                        Confirmar Perda
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Finalize Lead Modal */}
            {
                isFinalizeModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-green-100">
                            <div className="p-8 text-center bg-green-50/50">
                                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-icons-outlined text-3xl">check_circle</span>
                                </div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Finalizar Atendimento</h3>
                                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">Resumo do fechamento</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-3 text-center">O cliente fez o pedido?</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setFinalizeForm({ ...finalizeForm, success: true, category: '' })}
                                            className={`py-3 rounded-xl text-xs font-black uppercase transition-all border ${finalizeForm.success ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                                        >
                                            Sim, Fez Pedido
                                        </button>
                                        <button
                                            onClick={() => setFinalizeForm({ ...finalizeForm, success: false, category: '' })}
                                            className={`py-3 rounded-xl text-xs font-black uppercase transition-all border ${!finalizeForm.success ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                                        >
                                            Não Fez
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Qual o Motivo principal?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(finalizeForm.success 
                                            ? ['QUALIDADE', 'PREÇO', 'ATENDIMENTO', 'PRAZO', 'FIDELIDADE', 'OUTRO']
                                            : ['PREÇO ALTO', 'PRAZO LONGO', 'CONCORRÊNCIA', 'DESISTIU', 'FALTA ESTOQUE', 'OUTRO']
                                        ).map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setFinalizeForm({ ...finalizeForm, category: cat })}
                                                className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase transition-all ${finalizeForm.category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-300 hover:bg-blue-50'}`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Observações Adicionais</label>
                                    <textarea
                                        className="form-textarea w-full rounded-2xl border-gray-100 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium bg-gray-50"
                                        rows={3}
                                        placeholder="Detalhes sobre a finalização..."
                                        value={finalizeForm.notes}
                                        onChange={e => setFinalizeForm({ ...finalizeForm, notes: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => { setIsFinalizeModalOpen(false); setPendingStatusLead(null); }}
                                        className="flex-1 py-3 text-gray-400 font-bold uppercase text-xs hover:text-gray-600 transition-colors"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={confirmFinalizeLead}
                                        className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-black transition-all active:scale-95"
                                    >
                                        Concluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Check Client Modal */}
            {
                isCheckClientModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-8 text-center bg-gray-50 border-b border-gray-100">
                                <h3 className="text-xl font-black text-gray-900 uppercase">Novo Atendimento</h3>
                                <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">Verificação de Cliente</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">E-mail ou Telefone</label>
                                    <input
                                        type="text"
                                        className="form-input w-full rounded-2xl border-gray-200 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold text-center py-3"
                                        placeholder="Digite para buscar..."
                                        value={checkClientInput}
                                        onChange={e => setCheckClientInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && checkClientAndProceed()}
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                                        Verificaremos se o cliente já existe no banco.
                                    </p>
                                </div>

                                <button
                                    onClick={checkClientAndProceed}
                                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Verificando...' : 'Verificar e Continuar'}
                                    {!loading && <span className="material-icons-outlined text-sm">arrow_forward</span>}
                                </button>

                                <button
                                    onClick={() => setIsCheckClientModalOpen(false)}
                                    className="w-full py-2 text-gray-400 font-bold uppercase text-[10px] hover:text-gray-600"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Request Transfer Modal (Small/Elegant) */}
            {
                isTransferModalOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                            <div className="p-6 bg-orange-50 border-b border-orange-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner text-orange-500">
                                    <span className="material-icons-outlined text-2xl">swap_horiz</span>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase">Solicitar Troca de Vendedor</h3>
                                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">Este cliente pertence a {selectedClientToTransfer?.salesperson}</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CLIENTE SELECIONADO</p>
                                    <p className="text-sm font-black text-gray-800">{selectedClientToTransfer?.name}</p>
                                    <p className="text-xs text-gray-500">{selectedClientToTransfer?.email || 'N/A'} | {selectedClientToTransfer?.phone || 'N/A'}</p>
                                </div>

                                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-start gap-3">
                                    <span className="material-icons-outlined text-blue-500 text-lg mt-0.5">info</span>
                                    <p className="text-[11px] text-blue-700 font-bold leading-relaxed uppercase">
                                        Ao clicar em enviar, uma solicitação será encaminhada para a gestão avaliar a troca de carteira deste cliente.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setIsTransferModalOpen(false)}
                                        className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px] hover:text-gray-600 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleRequestTransfer}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl transition-all active:scale-95 bg-orange-500 text-white hover:bg-orange-600 shadow-orange-200"
                                    >
                                        Enviar Solicitação
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Direct Transfer Modal (Immediate) - Redesigned Horizontal Landscape */}
            {
                isDirectTransferModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-[0_32px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-200 border-t border-slate-100">
                            {/* Modern Header */}
                            <div className="p-8 pb-4 flex flex-col md:flex-row items-center gap-6">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border-2 border-blue-100/50 shadow-sm shrink-0">
                                    <span className="material-icons-outlined text-3xl">swap_horiz</span>
                                </div>
                                <div className="text-center md:text-left flex-1">
                                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">Transferir Lead</h3>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50/50 rounded-full border border-blue-100">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{leadToDirectTransfer?.client_name}</span>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <button 
                                        onClick={() => { setIsDirectTransferModalOpen(false); setLeadToDirectTransfer(null); }}
                                        className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex items-center justify-center"
                                    >
                                        <span className="material-icons-outlined">close</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="px-8 pb-10 pt-2 space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Selecione o Novo Vendedor</label>
                                    </div>
                                    
                                    {/* Horizontal Selection Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {SALESPERSON_OPTIONS.map(sp => {
                                            const isSelected = targetSalesperson === sp;
                                            return (
                                                <button
                                                    key={sp}
                                                    onClick={() => setTargetSalesperson(sp)}
                                                    className={`group relative p-4 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 text-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 scale-105 z-10' : 'bg-slate-50/50 border-transparent text-slate-400 hover:border-blue-200 hover:bg-white hover:shadow-lg'}`}
                                                >
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${isSelected ? 'bg-white/20' : 'bg-white shadow-sm group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                                        {getSalespersonInitials(sp)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-wider leading-none ${isSelected ? 'text-white' : 'text-slate-800'}`}>{sp.replace('VENDAS ', 'V')}</p>
                                                        <p className={`text-[8px] font-bold uppercase mt-1 tracking-tighter ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>Equipe</p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2">
                                                            <span className="material-icons-outlined text-base animate-in zoom-in duration-300">check_circle</span>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-4">
                                    <button
                                        onClick={handleDirectTransfer}
                                        disabled={!targetSalesperson || isTransferring || targetSalesperson === leadToDirectTransfer?.salesperson}
                                        className={`flex-1 w-full py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.15em] transition-all active:scale-95 flex items-center justify-center gap-3 ${!targetSalesperson || isTransferring || targetSalesperson === leadToDirectTransfer?.salesperson ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-blue-600 shadow-xl shadow-slate-200 hover:shadow-blue-200'}`}
                                    >
                                        {isTransferring ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Transferindo...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-icons-outlined text-base">verified</span>
                                                Confirmar Transferência
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => { setIsDirectTransferModalOpen(false); setLeadToDirectTransfer(null); }}
                                        className="md:w-auto w-full px-8 py-5 text-slate-400 font-bold uppercase text-[9px] tracking-widest hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 rounded-3xl"
                                        disabled={isTransferring}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default ManagementPage;
