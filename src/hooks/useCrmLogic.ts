'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLeads, usePerformanceStats, Lead, useUpdateLead, useCreateLead, useDeleteLead } from './useCRM';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useCrmLogic() {
    const { appUser } = useAuth();
    const router = useRouter();
    
    // Basic States
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'RECORDS' | 'TRANSFERENCIAS'>('RECORDS');
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [periodFilter, setPeriodFilter] = useState('Todos');
    const [sellerFilter, setSellerFilter] = useState('Todos');

    // Safety check for activeTab - Vendedores can only see RECORDS
    useEffect(() => {
        if (appUser?.role === 'VENDEDOR' && activeTab === 'TRANSFERENCIAS') {
            setActiveTab('RECORDS');
        }
    }, [appUser, activeTab]);

    // Initialize seller filter for salespeople
    useEffect(() => {
        if (appUser && appUser.role === 'VENDEDOR' && sellerFilter === 'Todos') {
            setSellerFilter(appUser.salesperson || 'NONE');
        }
    }, [appUser, sellerFilter]);
    
    // Period Filter Effect
    useEffect(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        switch (periodFilter) {
            case 'Hoje':
                setStartDate(today);
                setEndDate(today);
                break;
            case '7d':
                const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
                setStartDate(sevenDaysAgo);
                setEndDate(today);
                break;
            case '30d':
                const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
                setStartDate(thirtyDaysAgo);
                setEndDate(today);
                break;
            case 'Todos':
                setStartDate('');
                setEndDate('');
                break;
            case 'Personalizado':
                // Keep current values
                if (!startDate) setStartDate(today);
                if (!endDate) setEndDate(today);
                break;
        }
    }, [periodFilter]);

    const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);

    // Modal States
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [isLostModalOpen, setIsLostModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [selectedPartnerToTransfer, setSelectedPartnerToTransfer] = useState<any | null>(null);
    const [newLead, setNewLead] = useState<Partial<Lead>>({});
    
    // Transfer Requests State
    const [transferRequests, setTransferRequests] = useState<any[]>([]);
    const [isLoadingTransfers, setIsLoadingTransfers] = useState(false);

    // Client Management States
    const [partnerSaved, setPartnerSaved] = useState(false);
    const [showClientForm, setShowClientForm] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
    const [isSavingPartner, setIsSavingPartner] = useState(false);

    // Mutations
    const updateLeadMutation = useUpdateLead();
    const createLeadMutation = useCreateLead();
    const deleteLeadMutation = useDeleteLead();

    // Queries
    const isSalesperson = appUser?.role === 'VENDEDOR';
    const fetchSalesperson = isSalesperson ? (appUser?.salesperson || 'NONE') : undefined;
    
    // Debounce search term for server-side query
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: leads = [], isLoading: isLoadingLeads, refetch: refetchLeads } = useLeads(startDate, endDate, fetchSalesperson, debouncedSearch);

    // Sync selectedLead with query data so it's reactive to updates
    const activeLead = useMemo(() => {
        if (!selectedLead) return null;
        return leads.find(l => l.id === selectedLead.id) || selectedLead;
    }, [selectedLead, leads]);

    const { data: stats = null } = usePerformanceStats();

    // Fetch Transfer Requests
    const fetchTransferRequests = useCallback(async () => {
        try {
            setIsLoadingTransfers(true);
            const { data, error } = await supabase
                .from('client_transfer_requests')
                .select(`
                    *,
                    lead:crm_leads!lead_id (client_name, salesperson),
                    partner:partners!partner_id (name, salesperson),
                    requester:user_profiles!requester_id (name, salesperson_id),
                    target:user_profiles!target_salesperson_id (name, salesperson_id)
                `)
                .eq('status', 'PENDING');
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            setTransferRequests(data || []);
        } catch (err: any) {
            console.error('Error fetching transfers:', err.message || JSON.stringify(err));
        } finally {
            setIsLoadingTransfers(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'TRANSFERENCIAS') {
            fetchTransferRequests();
        }
    }, [activeTab, fetchTransferRequests]);

    // Initial Lead State
    const initialLeadState: Partial<Lead> = useMemo(() => ({
        client_name: '',
        client_contact_name: '',
        client_phone: '',
        client_email: '',
        client_doc: '',
        salesperson: appUser?.salesperson || 'VENDAS 01',
        status: 'ATENDIMENTO',
        priority: 'NORMAL',
        closing_metadata: {
            quoted_item: '',
            wa_template: ''
        }
    }), [appUser]);

    // Client Search Logic
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
                    .or(`name.ilike.%${clientSearchTerm}%, email.ilike.%${clientSearchTerm}%, phone.ilike.%${clientSearchTerm}%`)
                    .limit(5);

                if (!error && data) {
                    setClientSearchResults(data);
                }
            } catch (err) {
                console.error('Error searching clients:', err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [clientSearchTerm]);

    // Filtering Logic
    const filteredLeads = useMemo(() => {
        let filtered = leads.filter(lead => {
            // Seller filter
            const matchesSeller = sellerFilter === 'Todos' || lead.salesperson === sellerFilter;
            if (!matchesSeller) return false;

            // Status filter
            if (statusFilter !== 'Todos') {
                if (statusFilter === 'PEDIDO_ABERTO') {
                    return lead.atendimento_status === 'PEDIDO_ABERTO' || lead.status === 'PEDIDO_ABERTO';
                }
                return lead.atendimento_status === statusFilter || lead.status === statusFilter;
            }

            return true;
        });

        const PRIORITY_WEIGHT: Record<string, number> = {
            'URGENTE': 100,
            'ALTA': 80,
            'NORMAL': 40,
            'VIP': 40,
            'BAIXA': 20
        };

        // Sort: Status 'ATENDIMENTO' First, then Priority, then by date desc
        return [...filtered].sort((a, b) => {
            const statusA = a.atendimento_status || 'ATENDIMENTO';
            const statusB = b.atendimento_status || 'ATENDIMENTO';
            
            // Absolute first priority: 'ATENDIMENTO' (Em Andamento)
            if (statusA === 'ATENDIMENTO' && statusB !== 'ATENDIMENTO') return -1;
            if (statusA !== 'ATENDIMENTO' && statusB === 'ATENDIMENTO') return 1;

            // Absolute second priority: 'URGENTE'
            if (a.priority === 'URGENTE' && b.priority !== 'URGENTE') return -1;
            if (a.priority !== 'URGENTE' && b.priority === 'URGENTE') return 1;

            // Third priority: Weight
            const weightA = PRIORITY_WEIGHT[a.priority || 'NORMAL'] || 40;
            const weightB = PRIORITY_WEIGHT[b.priority || 'NORMAL'] || 40;
            
            if (weightA !== weightB) return weightB - weightA;

            // Fourth priority: 'PROPOSTA_ENVIADA'
            if (statusA === 'PROPOSTA_ENVIADA' && statusB !== 'PROPOSTA_ENVIADA') return -1;
            if (statusA !== 'PROPOSTA_ENVIADA' && statusB === 'PROPOSTA_ENVIADA') return 1;

            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [leads, searchTerm, sellerFilter, statusFilter]);

    // Actions
    const handleNewLead = () => {
        setSelectedLead(null);
        setNewLead(initialLeadState);
        setPartnerSaved(false);
        setShowClientForm(false);
        setIsLeadModalOpen(true);
    };

    const handleEditLead = (lead: Lead) => {
        setSelectedLead(lead);
        setNewLead(lead);
        setPartnerSaved(true);
        setShowClientForm(true);
        setIsLeadModalOpen(true);
    };

    const handleSavePartner = async () => {
        if (!newLead.client_name || !newLead.client_contact_name || !newLead.client_doc || !newLead.client_phone || !newLead.client_email) {
            toast.error('Todos os campos de identificação do cliente são obrigatórios.');
            return;
        }

        const doc = newLead.client_doc?.trim();
        const PLACEHOLDER_DOCS = ['00.000.000/0000-00', '00.000.000/0001-00', ''];
        if (PLACEHOLDER_DOCS.includes(doc)) {
            toast.error('Informe um documento (CPF/CNPJ) válido.');
            return;
        }

        setIsSavingPartner(true);
        try {
            const doc = newLead.client_doc?.trim();
            // Placeholders ou doc vazio não podem ser usados como chave de upsert
            const PLACEHOLDER_DOCS = ['00.000.000/0000-00', '00.000.000/0001-00', ''];
            const hasValidDoc = doc && !PLACEHOLDER_DOCS.includes(doc);

            const partnerData = {
                name: newLead.client_name,
                contact_name: newLead.client_contact_name,
                phone: newLead.client_phone,
                email: newLead.client_email,
                doc: doc || null,
                salesperson: newLead.salesperson,
                type: 'CLIENTE' as const
            };

            let data: any;
            let error: any;

            if (hasValidDoc) {
                // First check if already exists to avoid ON CONFLICT error if no unique constraint
                const { data: existingPartner } = await supabase
                    .from('partners')
                    .select('id')
                    .eq('doc', doc)
                    .maybeSingle();

                if (existingPartner) {
                    ({ data, error } = await supabase
                        .from('partners')
                        .update(partnerData)
                        .eq('id', existingPartner.id)
                        .select()
                        .single());
                } else {
                    ({ data, error } = await supabase
                        .from('partners')
                        .insert([partnerData])
                        .select()
                        .single());
                }
            } else {
                // INSERT simples: sem doc ou doc placeholder
                ({ data, error } = await supabase
                    .from('partners')
                    .insert([partnerData])
                    .select()
                    .single());
            }

            if (error) throw error;

            setNewLead(prev => ({ 
                ...prev, 
                client_id: data.id,
                client_name: data.name,
                client_contact_name: data.contact_name,
                client_phone: data.phone,
                client_email: data.email,
                client_doc: data.doc
            }));
            setPartnerSaved(true);
            toast.success('Cliente vinculado com sucesso!');
        } catch (err: any) {
            toast.error('Erro ao salvar cliente: ' + err.message);
        } finally {
            setIsSavingPartner(false);
        }
    };

    const handleSaveLead = async () => {
        if (!partnerSaved) {
            toast.error('Salve os dados do cliente primeiro.');
            return;
        }

        if (!newLead.closing_metadata?.quoted_item?.trim()) {
            toast.error('O preenchimento do item ou produto de interesse é obrigatório.');
            return;
        }

        try {
            if (selectedLead) {
                const currentTimeline = selectedLead.closing_metadata?.timeline || [];
                const timelineUpdate = { date: new Date().toISOString(), action: 'Atendimento atualizado (Dados Gerais)', user: appUser?.name || 'Sistema' };
                await updateLeadMutation.mutateAsync({ 
                    id: selectedLead.id, 
                    updates: {
                        ...newLead,
                        closing_metadata: {
                            ...(newLead.closing_metadata || {}),
                            timeline: [...currentTimeline, timelineUpdate]
                        }
                    } 
                });
                toast.success('Atendimento atualizado!');
            } else {
                await createLeadMutation.mutateAsync({
                    ...newLead,
                    closing_metadata: {
                        ...(newLead.closing_metadata || {}),
                        timeline: [{ date: new Date().toISOString(), action: 'Atendimento criado', user: appUser?.name || 'Sistema' }]
                    }
                } as Lead);
                toast.success('Novo atendimento criado!');
            }
            setIsLeadModalOpen(false);
            return true;
        } catch (err: any) {
            toast.error('Erro ao salvar: ' + err.message);
            return false;
        }
    };

    const handleDeleteLead = async (id: string) => {
        try {
            await deleteLeadMutation.mutateAsync(id);
            toast.success('Atendimento excluído!');
            setIsLeadModalOpen(false);
        } catch (err: any) {
            toast.error('Erro ao excluir: ' + err.message);
        }
    };

    const handleTransfer = (lead: Lead) => {
        setSelectedLead(lead);
        setSelectedPartnerToTransfer(null);
        setIsTransferModalOpen(true);
    };

    const handleRequestTransfer = (partner: any) => {
        setSelectedPartnerToTransfer(partner);
        setSelectedLead(null);
        setIsTransferModalOpen(true);
    };

    const handleRequestAccess = async (partner: any) => {
        try {
            // Validate essential data
            if (!partner?.id) throw new Error("ID do parceiro não encontrado.");
            
            const salespersonCode = appUser?.salesperson || 'SISTEMA';

            // 1. Create the transfer request record
            const { error: requestError } = await supabase
                .from('client_transfer_requests')
                .insert([{
                    partner_id: partner.id,
                    requester_id: appUser?.id,
                    requesting_salesperson: salespersonCode,
                    reason: 'SOLICITAÇÃO DE ACESSO DIRETO VIA CRM',
                    status: 'PENDING'
                }]);

            if (requestError) throw requestError;

            // 2. Create a notification for management
            const { error: notifyError } = await supabase
                .from('notifications')
                .insert([{
                    user_email: 'gerencia@naturezabrindes.com.br', // Generic management email or specific roles
                    title: '🔄 SOLICITAÇÃO DE TRANSFERÊNCIA',
                    message: `${appUser?.salesperson || 'UM VENDEDOR'} SOLICITOU O CLIENTE: ${partner.name}`,
                    type: 'info',
                    read: false,
                    link: '/crm?tab=TRANSFERENCIAS'
                }]);

            if (notifyError) console.error('Error creating notification:', notifyError);

            toast.success(`Solicitação para o cliente ${partner.name} enviada com sucesso!`);
        } catch (err: any) {
            console.error('Request access error:', err);
            toast.error('Erro ao solicitar acesso: ' + (err.message || 'Erro desconhecido'));
        }
    };

    const confirmTransfer = async (leadOrPartner: any, targetSalesperson: string, note: string) => {
        try {
            // First, find the target user's UUID from their salesperson code/name
            const { data: targetUser, error: findError } = await supabase
                .from('user_profiles')
                .select('id, email, name')
                .eq('salesperson_id', targetSalesperson)
                .single();

            if (findError || !targetUser) {
                console.error('Target user not found:', findError);
                throw new Error(`Vendedor "${targetSalesperson}" não encontrado no sistema.`);
            }

            const isLead = !!leadOrPartner.atendimento_status || !!leadOrPartner.status;
            const currentStatus = leadOrPartner.atendimento_status || leadOrPartner.status;
            
            // Check if it should be direct (No approval needed for 'ATENDIMENTO' or if user is ADM)
            const isDirectTransfer = (currentStatus === 'ATENDIMENTO') || (appUser?.role !== 'VENDEDOR');

            if (isDirectTransfer) {
                // 1. Update Lead/Partner directly
                if (isLead) {
                    const timeline = leadOrPartner.closing_metadata?.timeline || [];
                    const auditEntry = {
                        date: new Date().toISOString(),
                        action: `🔄 TRANSFERÊNCIA DIRETA: De ${leadOrPartner.salesperson || '---'} para ${targetSalesperson}`,
                        user: appUser?.name || 'Sistema'
                    };

                    await supabase
                        .from('crm_leads')
                        .update({ 
                            salesperson: targetSalesperson,
                            closing_metadata: {
                                ...(leadOrPartner.closing_metadata || {}),
                                timeline: [...timeline, auditEntry]
                            }
                        })
                        .eq('id', leadOrPartner.id);
                    
                    // If it has a client_id (partner), transfer that too and all related data
                    if (leadOrPartner.client_id) {
                        await supabase.from('partners').update({ salesperson: targetSalesperson }).eq('id', leadOrPartner.client_id);
                        await supabase.from('budgets').update({ salesperson: targetSalesperson }).eq('client_id', leadOrPartner.client_id);
                        await supabase.from('proposals').update({ salesperson: targetSalesperson }).eq('client_id', leadOrPartner.client_id);
                        await supabase.from('orders').update({ salesperson: targetSalesperson }).eq('client_id', leadOrPartner.client_id);
                    }
                } else {
                    // It's a direct partner transfer
                    await supabase.from('partners').update({ salesperson: targetSalesperson }).eq('id', leadOrPartner.id);
                    await supabase.from('budgets').update({ salesperson: targetSalesperson }).eq('client_id', leadOrPartner.id);
                    await supabase.from('proposals').update({ salesperson: targetSalesperson }).eq('client_id', leadOrPartner.id);
                    await supabase.from('orders').update({ salesperson: targetSalesperson }).eq('client_id', leadOrPartner.id);
                }

                // 2. Record the request as already APPROVED for history
                await supabase
                    .from('client_transfer_requests')
                    .insert([{
                        lead_id: isLead ? leadOrPartner.id : null,
                        partner_id: isLead ? (leadOrPartner.client_id || null) : leadOrPartner.id,
                        requester_id: appUser?.id,
                        target_salesperson_id: targetUser.id,
                        requesting_salesperson: appUser?.salesperson || 'SISTEMA',
                        reason: note || 'TRANSFERÊNCIA DIRETA',
                        status: 'APPROVED'
                    }]);

                // 3. Notify the target salesperson
                await supabase.from('notifications').insert([{
                    user_email: targetUser.email,
                    title: '✅ LEAD TRANSFERIDO PARA VOCÊ',
                    message: `${appUser?.salesperson} transferiu o cliente ${leadOrPartner.client_name || leadOrPartner.name} diretamente para sua carteira.`,
                    type: 'success',
                    read: false,
                    link: '/crm'
                }]);

                toast.success(`Transferência realizada com sucesso!`);
            } else {
                // PENDING REQUEST (For other statuses like 'PEDIDO_ABERTO' if a salesperson tries to move it)
                const { error } = await supabase
                    .from('client_transfer_requests')
                    .insert([{
                        lead_id: isLead ? leadOrPartner.id : null,
                        partner_id: isLead ? (leadOrPartner.client_id || null) : leadOrPartner.id,
                        requester_id: appUser?.id,
                        target_salesperson_id: targetUser.id,
                        requesting_salesperson: appUser?.salesperson || 'SISTEMA',
                        reason: note,
                        status: 'PENDING'
                    }]);

                if (error) throw error;

                // Notify the target salesperson for approval
                await supabase.from('notifications').insert([{
                    user_email: targetUser.email,
                    title: '🔄 SOLICITAÇÃO DE TRANSFERÊNCIA',
                    message: `${appUser?.salesperson} deseja transferir o cliente ${leadOrPartner.client_name || leadOrPartner.name} para você.`,
                    type: 'info',
                    read: false,
                    link: '/crm?tab=TRANSFERENCIAS'
                }]);

                toast.success(`Solicitação de transferência enviada.`);
            }

            setIsTransferModalOpen(false);
            setSelectedPartnerToTransfer(null);
            refetchLeads();
        } catch (err: any) {
            toast.error('Erro ao transferir: ' + err.message);
        }
    };

    const handleFinalize = (lead: Lead) => {
        setSelectedLead(lead);
        setIsFinalizeModalOpen(true);
    };

    const confirmFinalize = async (data: { success: boolean, value?: number, notes?: string }) => {
        if (!selectedLead) return;
        try {
            await updateLeadMutation.mutateAsync({
                id: selectedLead.id,
                updates: {
                    status: data.success ? 'FINALIZADO' : 'PERDIDO',
                    closing_metadata: {
                        ...(selectedLead.closing_metadata || {}),
                        sale_value: data.value,
                        notes: data.notes,
                        closed_at: new Date().toISOString()
                    }
                }
            });
            toast.success(data.success ? 'Parabéns pela venda!' : 'Atendimento encerrado.');
            setIsFinalizeModalOpen(false);
        } catch (err: any) {
            toast.error('Erro ao finalizar: ' + err.message);
        }
    };

    const handleMarkAsLost = (lead: Lead) => {
        setSelectedLead(lead);
        setIsLostModalOpen(true);
    };

    const confirmLost = async (data: { category: string, reason: string }) => {
        if (!selectedLead) return;
        try {
            await updateLeadMutation.mutateAsync({
                id: selectedLead.id,
                updates: {
                    status: 'PERDIDO',
                    closing_metadata: {
                        ...(selectedLead.closing_metadata || {}),
                        lost_category: data.category,
                        lost_reason: data.reason,
                        closed_at: new Date().toISOString()
                    }
                }
            });
            toast.success('Atendimento marcado como perdido.');
            setIsLostModalOpen(false);
        } catch (err: any) {
            toast.error('Erro ao salvar motivo: ' + err.message);
        }
    };

    const handleUpdateStatus = async (lead: Lead, status: string, subStatus?: string | null) => {
        try {
            // Keep status and atendimento_status in sync
            const updates: any = { 
                atendimento_status: status,
                status: status as any 
            };
            
            if (subStatus !== undefined) {
                updates.sub_status = subStatus;
            } else if (lead.atendimento_status !== status) {
                // se mudou de status principal, limpa o substatus antigo
                updates.sub_status = null;
            }

            const currentTimeline = lead.closing_metadata?.timeline || [];
            updates.closing_metadata = {
                ...(lead.closing_metadata || {}),
                timeline: [
                    ...currentTimeline,
                    { date: new Date().toISOString(), action: `Status alterado para ${status}${subStatus ? ` (${subStatus})` : ''}`, user: appUser?.name || 'Sistema' }
                ]
            };

            await updateLeadMutation.mutateAsync({
                id: lead.id,
                updates
            });
            toast.success('Status atualizado!');
        } catch (err: any) {
            toast.error('Erro ao atualizar status: ' + err.message);
        }
    };

    const handleRespondToTransfer = async (requestId: string, approved: boolean) => {
        try {
            const { data: request, error: fetchError } = await supabase
                .from('client_transfer_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            
            if (fetchError) throw fetchError;

            if (approved) {
                // Determine the recipient ID: if target_salesperson_id is set (PUSH), they are the recipient.
                // Otherwise (PULL), the requester is the recipient.
                const recipientUserId = request.target_salesperson_id || request.requester_id;
                
                // Fetch the target salesperson's name/code to update the lead/partner
                const { data: targetProfile } = await supabase
                    .from('user_profiles')
                    .select('salesperson_id, name')
                    .eq('id', recipientUserId)
                    .single();

                const salespersonCode = targetProfile?.salesperson_id || targetProfile?.name || request.requesting_salesperson || 'VENDAS 01';

                if (request.lead_id) {
                    // Fetch current lead to get timeline
                    const { data: currentLead } = await supabase
                        .from('crm_leads')
                        .select('closing_metadata')
                        .eq('id', request.lead_id)
                        .single();

                    const timeline = currentLead?.closing_metadata?.timeline || [];
                    const auditEntry = {
                        date: new Date().toISOString(),
                        action: `🔄 TRANSFERÊNCIA APROVADA: De ${request.lead?.salesperson || '---'} para ${salespersonCode}`,
                        user: appUser?.name || 'Gestão'
                    };

                    await supabase
                        .from('crm_leads')
                        .update({ 
                            salesperson: salespersonCode,
                            closing_metadata: {
                                ...(currentLead?.closing_metadata || {}),
                                timeline: [...timeline, auditEntry]
                            }
                        })
                        .eq('id', request.lead_id);
                }

                if (request.partner_id) {
                    // Update the partner
                    const { error: updateError } = await supabase
                        .from('partners')
                        .update({ 
                            salesperson: salespersonCode,
                            // If we had the column, we'd store original_salesperson here
                        })
                        .eq('id', request.partner_id);
                    
                    if (updateError) throw updateError;

                    // ALSO TRANSFER ALL RELATED DATA: Budgets, Proposals, Orders
                    console.log(`Transferring all data for partner ${request.partner_id} to ${salespersonCode}`);
                    
                    // 1. Budgets
                    await supabase
                        .from('budgets')
                        .update({ salesperson: salespersonCode })
                        .eq('client_id', request.partner_id);

                    // 2. Proposals
                    await supabase
                        .from('proposals')
                        .update({ salesperson: salespersonCode })
                        .eq('client_id', request.partner_id);

                    // 3. Orders
                    await supabase
                        .from('orders')
                        .update({ salesperson: salespersonCode })
                        .eq('client_id', request.partner_id);
                }
            }

            const { error: updateError } = await supabase
                .from('client_transfer_requests')
                .update({ status: approved ? 'APPROVED' : 'REJECTED' })
                .eq('id', requestId);

            if (updateError) throw updateError;

            toast.success(approved ? 'Transferência aprovada!' : 'Transferência rejeitada.');
            fetchTransferRequests();
            refetchLeads();
        } catch (err: any) {
            toast.error('Erro ao responder: ' + err.message);
        }
    };

    const handleTogglePriority = async (lead: Lead) => {
        const priorityOrder = ['NORMAL', 'ALTA', 'URGENTE'];
        const currentPriority = lead.priority === 'VIP' ? 'NORMAL' : (lead.priority || 'NORMAL');
        const currentIndex = priorityOrder.indexOf(currentPriority);
        const nextPriority = priorityOrder[(currentIndex + 1) % priorityOrder.length] as Lead['priority'];

        try {
            await updateLeadMutation.mutateAsync({
                id: lead.id,
                updates: { priority: nextPriority }
            });
            toast.success(`Prioridade alterada para ${nextPriority}`);
        } catch (err: any) {
            toast.error('Erro ao alterar prioridade: ' + err.message);
        }
    };

    const handleConvertToBudget = useCallback((lead: Lead) => {
        router.push(`/orcamentos/novo?leadId=${lead.id}`);
    }, [router]);

    return {
        // Data
        leads: filteredLeads,
        stats,
        transferRequests,
        loading: isLoadingLeads || isLoadingTransfers,
        
        // Filters State
        searchTerm,
        setSearchTerm,
        activeTab,
        setActiveTab,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        sellerFilter,
        setSellerFilter,
        periodFilter,
        setPeriodFilter,
        statusFilter,
        setStatusFilter,
        
        // UI State
        openStatusMenuId,
        setOpenStatusMenuId,
        isLeadModalOpen,
        setIsLeadModalOpen,
        isTransferModalOpen,
        setIsTransferModalOpen,
        isFinalizeModalOpen,
        setIsFinalizeModalOpen,
        isLostModalOpen,
        setIsLostModalOpen,
        selectedLead: activeLead,
        selectedPartnerToTransfer,
        newLead,
        setNewLead,
        
        // Client Flow State
        partnerSaved,
        setPartnerSaved,
        showClientForm,
        setShowClientForm,
        clientSearchTerm,
        setClientSearchTerm,
        clientSearchResults,
        setClientSearchResults,
        isSavingPartner,
        initialLeadState,
        appUser,
        appUserInitials: appUser?.name ? appUser.name.split(' ').map((n: any) => n[0]).join('').toUpperCase().substring(0, 2) : 'AD',

        // Actions
        handleNewLead,
        handleEditLead,
        handleTransfer,
        handleRequestTransfer,
        handleRequestAccess,
        confirmTransfer,
        handleFinalize,
        confirmFinalize,
        handleMarkAsLost,
        confirmLost,
        handleUpdateStatus,
        handleRespondToTransfer,
        handleSavePartner,
        handleSaveLead,
        handleDeleteLead,
        handleConvertToBudget,
        handleTogglePriority,
        refreshLeads: refetchLeads
    };
}
