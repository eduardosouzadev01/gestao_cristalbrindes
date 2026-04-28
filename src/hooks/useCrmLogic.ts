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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sellerFilter, setSellerFilter] = useState('Todos');
    const [periodFilter, setPeriodFilter] = useState('Todos');

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
                // Keep current values, but allow user to edit
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
    const { data: leads = [], isLoading: isLoadingLeads, refetch: refetchLeads } = useLeads(startDate, endDate);
    const { data: stats = null } = usePerformanceStats();

    // Fetch Transfer Requests
    const fetchTransferRequests = useCallback(async () => {
        setIsLoadingTransfers(true);
        try {
            const { data, error } = await supabase
                .from('client_transfer_requests')
                .select(`
                    *,
                    crm_leads (client_name)
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
        return leads.filter(lead => {
            const matchesSearch = 
                lead.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (lead.client_email && lead.client_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (lead.client_phone && lead.client_phone.includes(searchTerm));
            
            const matchesSeller = sellerFilter === 'Todos' || lead.salesperson === sellerFilter;

            return matchesSearch && matchesSeller;
        });
    }, [leads, searchTerm, sellerFilter]);

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
        if (!newLead.client_name) {
            toast.error('Informe ao menos o nome da empresa.');
            return;
        }

        setIsSavingPartner(true);
        try {
            const partnerData = {
                name: newLead.client_name,
                contact_name: newLead.client_contact_name,
                phone: newLead.client_phone,
                email: newLead.client_email,
                doc: newLead.client_doc,
                salesperson_id: newLead.salesperson
            };

            const { data, error } = await supabase
                .from('partners')
                .upsert([partnerData], { onConflict: 'doc' })
                .select()
                .single();

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
                await updateLeadMutation.mutateAsync({ 
                    id: selectedLead.id, 
                    updates: newLead 
                });
                toast.success('Atendimento atualizado!');
            } else {
                await createLeadMutation.mutateAsync(newLead as Lead);
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
        setIsTransferModalOpen(true);
    };

    const confirmTransfer = async (lead: Lead, targetSalesperson: string, note: string) => {
        try {
            // First, find the target user's UUID from their salesperson code/name
            const { data: targetUser, error: findError } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('salesperson_id', targetSalesperson)
                .single();

            if (findError || !targetUser) {
                console.error('Target user not found:', findError);
                throw new Error(`Vendedor "${targetSalesperson}" não encontrado no sistema.`);
            }

            const { error } = await supabase
                .from('client_transfer_requests')
                .insert([{
                    lead_id: lead.id,
                    requester_id: appUser?.id,
                    target_salesperson_id: targetUser.id,
                    reason: note,
                    status: 'PENDING'
                }]);

            if (error) throw error;

            toast.success(`Solicitação de transferência enviada.`);
            setIsTransferModalOpen(false);
        } catch (err: any) {
            toast.error('Erro ao solicitar transferência: ' + err.message);
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
            const updates: any = { atendimento_status: status };
            
            if (subStatus !== undefined) {
                updates.sub_status = subStatus;
            } else if (lead.atendimento_status !== status) {
                // se mudou de status principal, limpa o substatus antigo
                updates.sub_status = null;
            }

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
                // Fetch the target salesperson's name/code to update the lead
                const { data: targetProfile } = await supabase
                    .from('user_profiles')
                    .select('salesperson_id, name')
                    .eq('id', request.target_salesperson_id)
                    .single();

                await updateLeadMutation.mutateAsync({
                    id: request.lead_id,
                    updates: { salesperson: targetProfile?.salesperson_id || targetProfile?.name || 'VENDAS 01' }
                });
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
        const priorityOrder = ['NORMAL', 'ALTA', 'URGENTE', 'VIP'];
        const currentPriority = lead.priority || 'NORMAL';
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
        selectedLead,
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
