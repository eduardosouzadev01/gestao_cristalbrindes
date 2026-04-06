
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
import { formatDate } from '../src/utils/dateUtils';
import { maskPhone, maskCpfCnpj } from '../src/utils/maskUtils';
import { PerformanceTab } from '../src/components/crm/PerformanceTab';
import { FinanceiroTab } from '../src/components/crm/FinanceiroTab';
import { Lead } from '../src/hooks/useCRM';

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
    const isSeller = !!appUser?.salesperson;

    const initialLeadState: Partial<Lead> = {
        status: 'ATENDIMENTO',
        salesperson: userSalesperson || 'VENDAS 01',
        priority: 'NORMAL',
        client_name: '', client_contact_name: '', client_phone: '', client_email: '', client_doc: ''
    };

    const tabParam = searchParams.get('tab') as 'LEADS' | 'PERFORMANCE' | 'FINANCEIRO' | 'TRANSFERENCIAS' | null;
    const [activeTab, setActiveTab] = useState<'LEADS' | 'PERFORMANCE' | 'FINANCEIRO' | 'TRANSFERENCIAS'>(tabParam || 'LEADS');
    const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
    const [pendingTransferCount, setPendingTransferCount] = useState(0);
    const [loadingTransfers, setLoadingTransfers] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedClientToTransfer, setSelectedClientToTransfer] = useState<any>(null);
    const [transferReason, setTransferReason] = useState('');
    const [loading, setLoading] = useState(true);

    // Filter Stats
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedSalesperson, setSelectedSalesperson] = useState('Todos');

    // Leads State
    const [leads, setLeads] = useState<Lead[]>([]);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const [isLostReasonModalOpen, setIsLostReasonModalOpen] = useState(false);
    const [pendingStatusLead, setPendingStatusLead] = useState<Lead | null>(null);
    const [lostForm, setLostForm] = useState({ category: 'PREÇO', reason: '' });

    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [newLead, setNewLead] = useState<Partial<Lead>>({
        status: 'ATENDIMENTO',
        salesperson: userSalesperson || 'VENDAS 01',
        priority: 'NORMAL'
    });

    // Client Search State
    const [clientSearchTerm, setClientSearchTerm] = useState('');
    const [clientSearchResults, setClientSearchResults] = useState<any[]>([]);
    const [showClientResults, setShowClientResults] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Performance State
    const [stats, setStats] = useState<any[]>([]);
    const [totalBudgets, setTotalBudgets] = useState(0);
    const [totalApproved, setTotalApproved] = useState(0);
    const [totalValue, setTotalValue] = useState(0);
    const [recentBudgets, setRecentBudgets] = useState<any[]>([]);


    const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [kanbanSellerFilter, setKanbanSellerFilter] = useState('Todos');
    const [kanbanPeriodFilter, setKanbanPeriodFilter] = useState('Todos');
    const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');

    const searchInputRef = React.useRef<HTMLInputElement>(null);

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

    // Scroll Click & Drag State
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [isDraggingScroll, setIsDraggingScroll] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    // Finalize Modal State
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [finalizeForm, setFinalizeForm] = useState({ success: true, value: 0, notes: '' });
    const [showClientForm, setShowClientForm] = useState(false);
    const [isSavingPartner, setIsSavingPartner] = useState(false);
    const [partnerSaved, setPartnerSaved] = useState(false);

    // Check Client Modal State
    const [isCheckClientModalOpen, setIsCheckClientModalOpen] = useState(false);
    const [checkClientInput, setCheckClientInput] = useState('');

    // Financial Stats (From ReportsPage)
    const [finStats, setFinStats] = useState({
        totalSales: 0,
        totalNet: 0,
        totalCommissions: 0,
        totalFixedExpenses: 0,
        orderCount: 0,
        ticketMedio: 0,
        totalExtra: 0,
        topProducts: [] as any[],
        salesByStatus: [] as any[]
    });

    useEffect(() => {
        if (activeTab === 'LEADS') fetchLeads();
        else if (activeTab === 'PERFORMANCE') fetchPerformanceData();
        else if (activeTab === 'FINANCEIRO') fetchFinancialData();
        else if (activeTab === 'TRANSFERENCIAS') fetchTransferRequests();
    }, [activeTab, startDate, endDate, month, year, selectedSalesperson]);

    // Sync checklist and template when lead changes
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

    // --- Leads Logic ---
    const fetchLeads = async () => {
        setLoading(true);
        let query = supabase.from('crm_leads').select('*').order('created_at', { ascending: false });

        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

        // Sellers can only see their own leads
        if (isSeller && userSalesperson) {
            query = query.eq('salesperson', userSalesperson);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01') {
                toast.error('ERRO CRÍTICO: Tabela CRM não encontrada. Contacte o suporte para rodar a migração.');
            } else {
                toast.error('Erro ao carregar leads: ' + error.message);
            }
        } else {
            const priorityWeight = { 'ALTA': 3, 'NORMAL': 2, 'BAIXA': 1 };
            const sorted = (data || []).sort((a, b) => {
                const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
                if (pA !== pB) return pB - pA;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setLeads(sorted);
        }
        setLoading(false);
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
                salesperson: isSeller ? userSalesperson : (foundClient.salesperson || baseLead.salesperson)
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
        // Ownership Check
        if (client.salesperson && newLead.salesperson && client.salesperson !== newLead.salesperson) {
            // Prevent selection if belongs to another salesperson
            alert(`ATENÇÃO: Este cliente pertence ao vendedor ${client.salesperson}.\n\nNão é permitido adicionar ao seu atendimento.`);
            return;
        }

        setNewLead({
            ...newLead,
            client_name: client.name,
            client_contact_name: client.contact_name || '',
            client_phone: client.phone,
            client_email: client.email || '',
            client_doc: client.doc || ''
        });
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

        if (newLead.client_email) {
            const openStatuses = ['ATENDIMENTO', 'ORCAMENTO', 'PROPOSTA_ENVIADA', 'PEDIDO_ABERTO'];
            let checkQuery = supabase
                .from('crm_leads')
                .select('id, salesperson')
                .eq('client_email', newLead.client_email)
                .in('status', openStatuses);

            if (editingLead && editingLead.id) {
                checkQuery = checkQuery.neq('id', editingLead.id);
            }

            const { data: existingLeads } = await checkQuery;

            if (existingLeads && existingLeads.length > 0) {
                alert(`Este e-mail já está em uso em um atendimento em aberto relacionado ao vendedor ${existingLeads[0].salesperson}. Você deve utilizar ou finalizar o atendimento existente.`);
                return;
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
            setNewLead({ ...initialLeadState, salesperson: isSeller ? appUser?.salesperson : 'VENDAS 01' });
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

        if (newStatus === 'FINALIZADO') {
            setPendingStatusLead(lead);
            setFinalizeForm({ success: true, value: lead.estimated_value || 0, notes: '' });
            setIsFinalizeModalOpen(true);
            return;
        }

        const { error } = await supabase.from('crm_leads').update({
            status: newStatus
        }).eq('id', lead.id);

        if (!error) {
            toast.success(`Status atualizado para ${newStatus}`);
            fetchLeads();
        }
    };

    const confirmFinalizeLead = async () => {
        if (!pendingStatusLead) return;

        const metadata = {
            success: finalizeForm.success,
            final_value: finalizeForm.value,
            notes: finalizeForm.notes,
            finalized_at: new Date().toISOString()
        };

        const { error } = await supabase.from('crm_leads').update({
            status: 'FINALIZADO',
            closing_metadata: metadata,
            estimated_value: finalizeForm.value // Update value with final value
        }).eq('id', pendingStatusLead.id);

        if (!error) {
            toast.success('Atendimento finalizado com sucesso!');
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
            lost_reason: `[${lostForm.category}] ${lostForm.reason}`
        }).eq('id', pendingStatusLead.id);

        if (!error) {
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
                vendedor: lead.salesperson || ''
            }
        });
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
        const el = e.target as HTMLElement;
        const clone = el.cloneNode(true) as HTMLElement;
        clone.style.position = 'absolute';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        clone.style.width = el.offsetWidth + 'px';
        clone.style.opacity = '1';
        clone.style.backgroundColor = '#ffffff';
        clone.style.borderRadius = '8px';
        clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        document.body.appendChild(clone);
        e.dataTransfer.setDragImage(clone, el.offsetWidth / 2, 20);
        setTimeout(() => { if (clone.parentNode) clone.parentNode.removeChild(clone); }, 0);
        el.style.opacity = '0.4';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
        setDraggedLead(null);
        setDragOverColumn(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        setDragOverColumn(colId);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        // Only clear if we are not moving into a child
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = (e: React.DragEvent, status: any) => {
        e.preventDefault();
        setDragOverColumn(null);
        if (draggedLead && draggedLead.status !== status) {
            updateLeadStatus(draggedLead, status);
        }
    };

    // --- Performance Logic ---
    const fetchPerformanceData = async () => {
        try {
            setLoading(true);

            // Fetch Budgets for conversion stats
            const { data: budgetsData, error: budgetError } = await supabase
                .from('budgets')
                .select('*')
                .order('created_at', { ascending: false });

            if (budgetError) throw budgetError;

            // Fetch CRM Leads for Kanban stats
            const { data: leadsData, error: leadError } = await supabase
                .from('crm_leads')
                .select('id, status, salesperson, estimated_value');

            if (leadError) throw leadError;

            const allBudgets = budgetsData || [];
            const allLeads = leadsData || [];

            // Global Stats (from budgets)
            setTotalBudgets(allBudgets.length);
            setTotalApproved(allBudgets.filter((b: any) => b.status === 'PROPOSTA ACEITA').length);
            setTotalValue(allBudgets.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0));
            setRecentBudgets(allBudgets.slice(0, 5));

            // Group by salesperson
            const sellers = Array.from(new Set([
                ...allBudgets.map(b => b.salesperson || 'N/A'),
                ...allLeads.map(l => l.salesperson || 'N/A')
            ]));

            const grouped = sellers.reduce((acc: any, sp: string) => {
                const spBudgets = allBudgets.filter(b => b.salesperson === sp);
                const spLeads = allLeads.filter(l => l.salesperson === sp);

                acc[sp] = {
                    name: sp,
                    total: spBudgets.length,
                    approved: spBudgets.filter((b: any) => b.status === 'PROPOSTA ACEITA').length,
                    pending: spBudgets.filter((b: any) => b.status !== 'PROPOSTA ACEITA' && b.status !== 'PROPOSTA RECUSADA' && b.status !== 'CANCELADO').length,
                    refused: spBudgets.filter((b: any) => b.status === 'PROPOSTA RECUSADA' || b.status === 'CANCELADO').length,
                    value: spBudgets.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
                    // New fields from CRM Leads
                    atendimento: spLeads.filter(l => l.status === 'ATENDIMENTO').length,
                    orcamento: spLeads.filter(l => l.status === 'ORCAMENTO').length,
                    proposta: spLeads.filter(l => l.status === 'PROPOSTA_ENVIADA').length,
                    aberto: spLeads.filter(l => l.status === 'PEDIDO_ABERTO').length,
                    entregue: spLeads.filter(l => l.status === 'PEDIDO_ENTREGUE').length
                };

                return acc;
            }, {});

            setStats(Object.values(grouped));
        } catch (error: any) {
            console.error(error);
            toast.error('Erro ao carregar dados do CRM.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransferRequests = async () => {
        try {
            setLoadingTransfers(true);
            
            // Fetch Client Transfers
            let clientQuery = supabase.from('client_transfer_requests').select('*, client:partners(name)');
            
            // If seller, filter by their participation
            if (isSeller && userSalesperson) {
                clientQuery = clientQuery.or(`requesting_salesperson.eq.${userSalesperson},current_salesperson.eq.${userSalesperson}`);
            }

            const { data: clients, error: clientError } = await clientQuery.order('created_at', { ascending: false });

            if (clientError) throw clientError;

            // Fetch Order Transfers
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
                    requesting_salesperson: o.current_salesperson, // In order transfer, the requester is the current seller
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
                    reason: transferReason,
                    status: 'PENDING',
                    requested_by_email: appUser?.email
                });

            if (error) throw error;

            // Notify Management
            await supabase.from('notifications').insert({
                user_email: 'cristalbrindes@cristalbrindes.com.br',
                title: `🔄 Troca de Carteira - ${selectedClientToTransfer.name}`,
                message: `${appUser?.salesperson || 'ADMIN'} solicita o cliente do vendedor ${selectedClientToTransfer.salesperson}. Motivo: ${transferReason}`,
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
                // 1. Update Client (Partner)
                const { error: clientError } = await supabase
                    .from('partners')
                    .update({ salesperson: request.requesting_salesperson })
                    .eq('id', request.client_id);

                if (clientError) throw clientError;

                // 2. Update Request Status
                const { error: requestError } = await supabase
                    .from('client_transfer_requests')
                    .update({ status: 'APPROVED' })
                    .eq('id', request.id);

                if (requestError) throw requestError;
            } else {
                // 1. Update Order
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({ salesperson: request.requested_salesperson })
                    .eq('id', request.order_id);

                if (orderError) throw orderError;

                // 2. Log in Order Change Logs
                await supabase.from('order_change_logs').insert({
                    order_id: request.order_id,
                    user_email: appUser?.email || 'SISTEMA',
                    field_name: 'vendedor',
                    old_value: request.current_salesperson,
                    new_value: request.requested_salesperson,
                    description: `Troca de vendedor aprovada pela gerência. Motivo: ${request.reason}`
                });

                // 3. Update Request Status
                const { error: requestError } = await supabase
                    .from('seller_transfer_requests')
                    .update({ status: 'APROVADO' })
                    .eq('id', request.id);

                if (requestError) throw requestError;
            }

            toast.success('Transferência aprovada com sucesso!');

            // Notify Requester
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

            // Notify Requester
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

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const startStr = new Date(year, month - 1, 1).toISOString();
            const endStr = new Date(year, month, 0).toISOString();

            let orderQuery = supabase
                .from('orders')
                .select(`
                    id, status, total_amount, salesperson,
                    order_items ( product_name, quantity, unit_price, total_item_value, extra_pct, customization_cost, supplier_transport_cost, client_transport_cost, extra_expense )
                `)
                .gte('order_date', startStr)
                .lte('order_date', endStr);

            if (selectedSalesperson !== 'Todos') {
                orderQuery = orderQuery.eq('salesperson', selectedSalesperson);
            }

            const { data: orders } = await orderQuery;

            // Fetch Fixed Expenses
            let expensesTotal = 0;
            if (selectedSalesperson === 'Todos') {
                const { data: expenses } = await supabase
                    .from('company_expenses')
                    .select('amount')
                    .gte('due_date', startStr)
                    .lte('due_date', endStr);
                if (expenses) expensesTotal = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            }

            // Fetch Commissions
            let commQuery = supabase.from('commissions').select('amount').gte('created_at', startStr).lte('created_at', endStr);
            if (selectedSalesperson !== 'Todos') commQuery = commQuery.eq('salesperson', selectedSalesperson);
            const { data: comms } = await commQuery;
            const totalCommissions = (comms || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);

            // Logic for Stats
            let totalSales = 0;
            let totalCostEst = 0;
            let totalExtra = 0;
            const productMap: any = {};
            const statusMap: any = {};

            (orders || []).forEach(o => {
                totalSales += o.total_amount || 0;
                statusMap[o.status] = (statusMap[o.status] || 0) + (o.total_amount || 0);

                o.order_items?.forEach((item: any) => {
                    const estItemCost = (item.quantity * (item.unit_price || 0)) + (item.customization_cost || 0) + (item.supplier_transport_cost || 0) + (item.client_transport_cost || 0) + (item.extra_expense || 0);
                    totalCostEst += estItemCost;
                    totalExtra += (item.total_item_value || 0) * ((item.extra_pct || 0) / 100);
                    productMap[item.product_name || 'N/A'] = (productMap[item.product_name || 'N/A'] || 0) + (item.quantity * (item.unit_price || 0));
                });
            });

            setFinStats({
                totalSales,
                totalNet: totalSales - totalCostEst - totalCommissions - expensesTotal,
                totalCommissions,
                totalFixedExpenses: expensesTotal,
                totalExtra,
                orderCount: orders?.length || 0,
                ticketMedio: totalSales / (orders?.length || 1),
                topProducts: Object.entries(productMap).map(([name, total]) => ({ name, total })).sort((a: any, b: any) => b.total - a.total).slice(0, 5),
                salesByStatus: Object.entries(statusMap).map(([status, total]) => ({ status, total })).sort((a: any, b: any) => b.total - a.total)
            });
        } catch (e: any) {
            toast.error('Erro ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    };

    const leadColumns = [
        { id: 'ATENDIMENTO', title: 'Em Atendimento', color: '#7C3AED', icon: 'support_agent' },
        { id: 'ORCAMENTO', title: 'Em Orçamento', color: '#F59E0B', icon: 'description' },
        { id: 'PROPOSTA_ENVIADA', title: 'Proposta Enviada', color: '#10B981', icon: 'send' },
        { id: 'PEDIDO_ABERTO', title: 'Pedido Aberto', color: '#3B82F6', icon: 'shopping_cart' },
        { id: 'PEDIDO_ENTREGUE', title: 'Pedido Entregue', color: '#065F46', icon: 'local_shipping' },
    ];

    const getSalespersonInitials = (name?: string) => {
        if (!name) return 'V';
        if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const [compactMode, setCompactMode] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Checklist State
    const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; completed: boolean }[]>([]);
    const [newItemText, setNewItemText] = useState('');

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
                    {/* Exibe o seletor de abas apenas se o usuário tiver acesso a mais do que "LEADS" */}
                    {(hasPermission('crm.performance') || hasPermission('crm.financeiro')) && (
                        <div className="flex items-center gap-1 bg-transparent">
                            <button
                                onClick={() => setActiveTab('LEADS')}
                                className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'LEADS' ? 'bg-[#1565C0] text-white' : 'bg-transparent text-gray-500 hover:text-[#1565C0] hover:underline decoration-2 underline-offset-4'}`}
                            >
                                <span className="material-icons-outlined text-sm">view_kanban</span>
                                Atendimentos
                            </button>
                            {hasPermission('crm.performance') && (
                                <button
                                    onClick={() => setActiveTab('PERFORMANCE')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'PERFORMANCE' ? 'bg-[#1565C0] text-white' : 'bg-transparent text-gray-500 hover:text-[#1565C0] hover:underline decoration-2 underline-offset-4'}`}
                                >
                                    <span className="material-icons-outlined text-sm">insert_chart</span>
                                    Performance
                                </button>
                            )}
                            {hasPermission('crm.financeiro') && (
                                <button
                                    onClick={() => setActiveTab('FINANCEIRO')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'FINANCEIRO' ? 'bg-[#1565C0] text-white' : 'bg-transparent text-gray-500 hover:text-[#1565C0] hover:underline decoration-2 underline-offset-4'}`}
                                >
                                    <span className="material-icons-outlined text-sm">payments</span>
                                    Financeiro
                                </button>
                            )}
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
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'LEADS' && (
                <>
                    {/* Board Summary */}
                    <div className="flex flex-wrap items-center justify-between mb-4 bg-gray-50/80 p-3 rounded-lg border border-gray-200 shadow-sm gap-4">
                        {(() => {
                            const proposalsWaiting = leads.filter(l => l.status === 'PROPOSTA_ENVIADA').length;
                            const openOrders = leads.filter(l => l.status === 'PEDIDO_ABERTO').length;
                            const delayedLeads = leads.filter(l => {
                                const diff = new Date().getTime() - new Date(l.updated_at || l.created_at).getTime();
                                return Math.floor(diff / 86400000) > 15;
                            }).length;
                            return (
                                <>
                                    <div className="flex gap-4 divide-x divide-gray-300 w-full md:w-auto">
                                        <div className="px-3">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Propostas aguardando</span>
                                            <span className="text-lg font-black text-gray-800">{proposalsWaiting}</span>
                                        </div>
                                        <div className="px-3">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Pedidos abertos</span>
                                            <span className="text-lg font-black text-blue-600">{openOrders}</span>
                                        </div>
                                        <div className="px-3 cursor-pointer group" onClick={() => {/* Filtro futuros */}}>
                                            <span className="text-[10px] uppercase font-bold text-gray-500 block">Atrasados</span>
                                            <span className={`text-lg font-black flex items-center gap-1 ${delayedLeads > 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                                {delayedLeads > 0 ? `${delayedLeads} 🔴` : '0'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Action and Filter Bar */}
                    <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
                        <div className="relative flex-1 min-w-[320px]">
                            <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input 
                                ref={searchInputRef}
                                type="text"
                                placeholder="Buscar cliente, empresa ou responsável... (Ctrl+K)"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <select 
                                className="bg-gray-50/50 border border-gray-200 text-sm font-medium text-gray-600 py-2 px-3 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 hover:bg-gray-50"
                                value={kanbanSellerFilter}
                                onChange={e => setKanbanSellerFilter(e.target.value)}
                            >
                                <option value="Todos">Vendedor: Todos</option>
                                {Array.from(new Set(leads.map(l => l.salesperson || 'N/A'))).sort().map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            
                            <select
                                className="bg-gray-50/50 border border-gray-200 text-sm font-medium text-gray-600 py-2 px-3 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 hover:bg-gray-50"
                                value={kanbanPeriodFilter}
                                onChange={e => setKanbanPeriodFilter(e.target.value)}
                            >
                                <option value="Todos">Período: Todos</option>
                                <option value="Hoje">Hoje</option>
                                <option value="7d">Últimos 7 dias</option>
                                <option value="30d">Últimos 30 dias</option>
                            </select>
                        </div>
                        <div className="ml-auto w-px h-8 bg-gray-200 mx-2 hidden md:block"></div>
                        <div className="ml-auto md:ml-0 flex gap-2">
                            <button onClick={() => setIsFullscreen(!isFullscreen)} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold uppercase text-[10px] hover:bg-gray-50 flex items-center gap-2 transition-all">
                                <span className="material-icons-outlined text-sm">{isFullscreen ? 'fullscreen_exit' : 'open_in_full'}</span>
                                <span className="hidden md:inline">{isFullscreen ? 'Sair Ampliado' : 'Ampliar CRM'}</span>
                            </button>
                            <button onClick={() => {
                                setNewLead({ ...initialLeadState, salesperson: isSeller ? appUser?.salesperson : 'VENDAS 01' });
                                setEditingLead(null);
                                setShowClientForm(false);
                                setPartnerSaved(false);
                                setIsLeadModalOpen(true);
                            }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold uppercase text-[10px] hover:bg-blue-700 shadow flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95">
                                <span className="material-icons-outlined text-sm">add</span> Novo Atendimento
                            </button>
                        </div>
                    </div>

                    <div className={isFullscreen ? "fixed inset-0 z-50 bg-gray-100 overflow-hidden flex flex-col" : ""}>
                        {isFullscreen && (
                            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined text-blue-600 text-2xl">view_kanban</span>
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">CRM & Vendas — Modo Ampliado</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => {
                                        setNewLead({ ...initialLeadState, salesperson: isSeller ? appUser?.salesperson : 'VENDAS 01' });
                                        setEditingLead(null);
                                        setShowClientForm(false);
                                        setPartnerSaved(false);
                                        setIsLeadModalOpen(true);
                                    }} className="px-4 py-2 bg-blue-600 text-white rounded font-bold uppercase text-[10px] hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-all">
                                        <span className="material-icons-outlined text-sm">add</span> Novo Atendimento
                                    </button>
                                    <button onClick={() => setIsFullscreen(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-all ml-2" title="Sair da Tela Cheia">
                                        <span className="material-icons-outlined text-sm">close</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    <div
                        ref={scrollContainerRef}
                        className={`flex gap-4 cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[::-webkit-scrollbar-thumb]:bg-gray-400 ${isFullscreen ? 'p-6 flex-1 overflow-x-auto overflow-y-hidden items-stretch' : 'overflow-x-auto pb-4 items-start'}`}
                        onMouseDown={(e) => {
                            if (!scrollContainerRef.current) return;
                            setIsDraggingScroll(true);
                            setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
                            setScrollLeft(scrollContainerRef.current.scrollLeft);
                        }}
                        onMouseLeave={() => {
                            setIsDraggingScroll(false);
                        }}
                        onMouseUp={() => {
                            setIsDraggingScroll(false);
                        }}
                        onMouseMove={(e) => {
                            if (!isDraggingScroll || !scrollContainerRef.current) return;
                            e.preventDefault();
                            const x = e.pageX - scrollContainerRef.current.offsetLeft;
                            const walk = (x - startX) * 2; // Scroll-fast
                            scrollContainerRef.current.scrollLeft = scrollLeft - walk;
                        }}
                    >
                        {leadColumns.map(col => {
                            const colLeads = leads.filter(l => l.status === col.id)
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
                                    if (!searchTerm) return true;
                                    const term = searchTerm.toLowerCase();
                                    return l.client_name.toLowerCase().includes(term) || (l.client_contact_name && l.client_contact_name.toLowerCase().includes(term)) || (l.client_phone && l.client_phone.includes(term)) || (l.salesperson && l.salesperson.toLowerCase().includes(term));
                                });

                            const totalVal = colLeads.reduce((s, l) => s + (l.estimated_value || 0), 0);
                            const isCollapsed = collapsedCols[col.id];

                            return (
                                <div
                                    key={col.id}
                                    className={`flex-shrink-0 flex flex-col transition-all rounded-xl border border-gray-200 border-t-[4px] bg-gray-50/50 ${dragOverColumn === col.id ? 'ring-2 ring-blue-400' : ''} ${isFullscreen ? 'h-full max-h-none overflow-hidden' : 'h-max'} ${isCollapsed ? 'min-w-[60px] w-[60px]' : 'min-w-[280px] md:min-w-[320px] w-[320px]'}`}
                                    style={{ borderTopColor: col.color }}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) => handleDragEnter(e, col.id)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                >
                                    <div 
                                        className={`p-3 flex justify-between items-start cursor-pointer hover:bg-black/5 transition-colors rounded-t-lg ${isCollapsed ? 'flex-col items-center py-6 h-full' : ''}`}
                                        style={{ backgroundColor: `${col.color}15` }}
                                        onClick={() => setCollapsedCols(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                                    >
                                        {isCollapsed ? (
                                            <>
                                                <span className="material-icons-outlined mb-2" style={{ color: col.color }}>{col.icon}</span>
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: col.color }}>{colLeads.length}</span>
                                                <div className="rotate-180 text-[10px] font-black tracking-widest uppercase mt-4" style={{ color: col.color, writingMode: 'vertical-rl' }}>{col.title}</div>
                                            </>
                                        ) : (
                                            <div className="w-full">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-icons-outlined text-sm" style={{ color: col.color }}>{col.icon}</span>
                                                        <span className="text-xs font-black uppercase tracking-tight" style={{ color: col.color }}>{col.title}</span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm" style={{ backgroundColor: col.color }}>
                                                            {colLeads.length}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] font-bold text-gray-500 mt-1">{formatCurrency(totalVal)} em aberto</p>
                                            </div>
                                        )}
                                    </div>

                                    {!isCollapsed && (
                                    <div className={`px-3 flex-1 space-y-3 py-3 ${isFullscreen ? 'overflow-y-auto' : ''}`}>
                                        {colLeads.map(lead => {
                                            const diffToNow = new Date().getTime() - new Date(lead.updated_at || lead.created_at).getTime();
                                            const stoppedDays = Math.floor(diffToNow / 86400000);
                                            
                                            // Indicador de tempo parado
                                            let timeColor = 'text-green-600';
                                            let timeBg = 'bg-green-50';
                                            let timeDot = 'bg-green-500';
                                            if (stoppedDays >= 15) { timeColor = 'text-red-600'; timeBg = 'bg-red-50'; timeDot = 'bg-red-500'; }
                                            else if (stoppedDays >= 7) { timeColor = 'text-yellow-600'; timeBg = 'bg-yellow-50'; timeDot = 'bg-yellow-500'; }

                                            return (
                                                <div
                                                    key={lead.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, lead)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.02)] border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing p-3 flex flex-col min-h-[90px] ${searchTerm && lead.id === globalSearchTerm ? 'ring-2 ring-blue-500' : ''}`}
                                                    onClick={() => {
                                                        setEditingLead(lead);
                                                        setNewLead(lead);
                                                        setPartnerSaved(true);
                                                        setIsLeadModalOpen(true);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className={`px-2 py-[2px] rounded text-[8px] font-black uppercase tracking-widest ${lead.priority === 'ALTA' || lead.priority === 'URGENTE' ? 'bg-red-50 text-red-600' : lead.priority === 'VIP' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {lead.priority || 'NORMAL'}
                                                        </span>
                                                        <div className="flex items-center text-gray-400 text-[9px] font-bold">
                                                            <span className="material-icons-outlined text-[10px] mr-1">calendar_today</span>
                                                            {formatDate(lead.created_at)}
                                                        </div>
                                                    </div>

                                                    <h4 className="font-bold text-gray-900 text-[14px] leading-tight line-clamp-2 mt-1" title={lead.client_name}>{lead.client_name}</h4>
                                                    <p className="text-[12px] text-gray-500 font-medium line-clamp-1 mt-0.5">{lead.client_contact_name || lead.client_phone}</p>

                                                    {lead.estimated_value ? (
                                                        <p className="text-[11px] font-black text-green-700 mt-1">{formatCurrency(lead.estimated_value)}</p>
                                                    ) : null}

                                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            {lead.salesperson && (
                                                                <div className="flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-black text-[9px] border border-gray-200" title={lead.salesperson}>
                                                                    {getSalespersonInitials(lead.salesperson)}
                                                                </div>
                                                            )}
                                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${timeBg} ${timeColor} text-[9px] font-bold`}>
                                                                <span className="material-icons-outlined text-[10px]">schedule</span>
                                                                {stoppedDays}d parado
                                                                {stoppedDays >= 15 && <span className={`w-1 h-1 rounded-full ${timeDot} animate-pulse ml-0.5`}></span>}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleAttendLead(e, lead.id)}
                                                            className="h-6 w-6 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-blue-500 hover:text-white transition-all shadow-sm border border-gray-200 hover:border-blue-500 opacity-60 group-hover:opacity-100"
                                                            title="Marcar como atualizado"
                                                        >
                                                            <span className="material-icons-outlined text-[12px]">refresh</span>
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Hover Quick Actions */}
                                                    <div className="absolute inset-x-0 bottom-0 h-[46px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-around bg-white/95 backdrop-blur shadow-[0_-10px_20px_rgba(0,0,0,0.05)] border-t border-gray-100 rounded-b-xl z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); navigate('/pedidos', { state: { clientName: lead.client_name } }); }} className="p-1 hover:bg-blue-50 rounded text-blue-600 transition-all"><span className="material-icons-outlined text-lg">shopping_bag</span></button>
                                                        <button onClick={async (e) => { e.stopPropagation();  let clientId = ''; const conditions = []; if (lead.client_doc) conditions.push(`doc.eq."${lead.client_doc.replace(/"/g, '""')}"`); if (lead.client_email) conditions.push(`email.eq."${lead.client_email.replace(/"/g, '""')}"`); if (lead.client_phone) conditions.push(`phone.eq."${lead.client_phone.replace(/"/g, '""')}"`); const safeClientName = lead.client_name.replace(/"/g, '""'); if (conditions.length === 0) conditions.push(`name.ilike."%${safeClientName}%"`); const { data } = await supabase.from('partners').select('id').or(conditions.join(',')).eq('type', 'CLIENTE').limit(1); if (data && data.length > 0) clientId = data[0].id; navigate('/orcamentos', { state: { clientName: lead.client_name, clientId: clientId } }); }} className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-all"><span className="material-icons-outlined text-lg">request_quote</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); convertToBudget(lead); }} className="p-1 hover:bg-purple-50 rounded text-purple-600 transition-all"><span className="material-icons-outlined text-lg">add_circle</span></button>
                                                        <button onClick={(e) => { e.stopPropagation(); setPendingStatusLead(lead); setIsFinalizeModalOpen(true); }} className="p-1 hover:bg-green-50 rounded text-green-600 transition-all"><span className="material-icons-outlined text-lg">check_circle</span></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    </div>
                </>
            )}

            {
                activeTab === 'PERFORMANCE' && (
                    <PerformanceTab
                        totalBudgets={totalBudgets}
                        totalApproved={totalApproved}
                        totalValue={totalValue}
                        stats={stats}
                        recentBudgets={recentBudgets}
                        formatCurrency={formatCurrency}
                        leads={leads}
                    />
                )
            }

            {
                activeTab === 'FINANCEIRO' && (
                    <FinanceiroTab
                        finStats={finStats}
                        month={month}
                        year={year}
                        selectedSalesperson={selectedSalesperson}
                        setMonth={setMonth}
                        setYear={setYear}
                        setSelectedSalesperson={setSelectedSalesperson}
                        formatCurrency={formatCurrency}
                    />
                )
            }

            {/* Transfer Requests Tab Content */}
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
                                                    <p className="text-sm font-bold text-gray-900">{req.type === 'CLIENT' ? req.client?.name : `Pedido #${req.order_number}`}</p>
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
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-2 py-2 text-sm border-b border-gray-100 flex justify-between items-center bg-blue-50">
                                <h3 className="font-bold text-blue-800 uppercase flex items-center gap-2">
                                    <span className="material-icons-outlined">person_add</span>
                                    {editingLead ? 'Editar Atendimento' : 'Novo Atendimento'}
                                </h3>
                                <button onClick={() => setIsLeadModalOpen(false)} className="text-gray-400 hover:text-gray-600"><span className="material-icons-outlined">close</span></button>
                            </div>
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

                                {/* Client Search */}
                                {!editingLead && (
                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                                        <label className="block text-xs font-bold text-blue-500 uppercase mb-1">Buscar Cliente Existente</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="material-icons-outlined text-blue-400 text-lg">search</span>
                                            </div>
                                            <input
                                                className="form-input w-full !pl-10 rounded-lg border-blue-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                                placeholder="Busque por Nome, E-mail, CPF/CNPJ ou Telefone..."
                                                value={clientSearchTerm}
                                                onChange={e => searchClients(e.target.value)}
                                            />
                                            {showClientResults && clientSearchResults.length > 0 && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                    {clientSearchResults.map(client => (
                                                        <div
                                                            key={client.id}
                                                            className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${client.salesperson && client.salesperson !== appUser?.salesperson ? 'bg-orange-50/50' : 'hover:bg-blue-50 cursor-pointer'}`}
                                                            onClick={() => {
                                                                if (client.salesperson && client.salesperson !== appUser?.salesperson && appUser?.role !== 'ADMIN') {
                                                                    setSelectedClientToTransfer(client);
                                                                    setIsTransferModalOpen(true);
                                                                } else {
                                                                    selectClient(client);
                                                                    setShowClientForm(true);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <p className="font-bold text-gray-800 text-sm">{client.name}</p>
                                                                    <p className="text-xs text-gray-500 font-medium">{client.email || 'Sem e-mail'} | {client.phone || 'Sem telefone'}</p>
                                                                </div>
                                                                {client.salesperson && (
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded shadow-sm border uppercase tracking-widest ${client.salesperson === appUser?.salesperson ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                                            {client.salesperson}
                                                                        </span>
                                                                        {client.salesperson !== appUser?.salesperson && (
                                                                            <span className="text-[8px] font-black text-orange-600 uppercase animate-pulse">Pertence a outro vendedor</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {client.salesperson && client.salesperson !== appUser?.salesperson && (
                                                                <div className="mt-2 flex justify-end">
                                                                    <button
                                                                        className="px-3 py-1 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-orange-600 active:scale-95 transition-all flex items-center gap-1"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedClientToTransfer(client);
                                                                            setIsTransferModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <span className="material-icons-outlined text-[12px]">swap_horiz</span>
                                                                        Solicitar Troca de Carteira
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {!showClientForm && (
                                            <div className="mt-4 flex items-center gap-2">
                                                <span className="text-xs text-blue-400 uppercase font-bold tracking-widest flex-1 border-t border-blue-200 mt-1"></span>
                                                <button
                                                    onClick={() => setShowClientForm(true)}
                                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-bold uppercase text-xs hover:bg-blue-100 transition-colors shadow-sm flex items-center gap-2 shrink-0"
                                                >
                                                    <span className="material-icons-outlined text-[16px]">add_circle</span> Cadastrar Novo Cliente
                                                </button>
                                                <span className="text-xs text-blue-400 uppercase font-bold tracking-widest flex-1 border-t border-blue-200 mt-1"></span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(editingLead || showClientForm) && (
                                    <div className={`p-4 rounded-xl border-2 transition-all ${partnerSaved ? 'border-green-500 bg-green-50' : 'border-blue-100 bg-white shadow-sm'}`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className={`text-xs font-black uppercase tracking-widest ${partnerSaved ? 'text-green-600' : 'text-blue-600'}`}>
                                                {partnerSaved ? '✓ Cliente Identificado/Salvo' : 'Dados do Cliente'}
                                            </h4>
                                            {partnerSaved && (
                                                <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">Salvo</span>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Empresa *</label>
                                                    <input
                                                        className={`form-input w-full rounded-lg border-gray-300 ${partnerSaved ? 'bg-gray-50' : ''}`}
                                                        placeholder="Ex: Empresa XYZ"
                                                        value={newLead.client_name || ''}
                                                        onChange={e => { setNewLead({ ...newLead, client_name: e.target.value }); setPartnerSaved(false); }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Contato</label>
                                                    <input
                                                        className={`form-input w-full rounded-lg border-gray-300 ${partnerSaved ? 'bg-gray-50' : ''}`}
                                                        placeholder="Ex: João da Silva"
                                                        value={newLead.client_contact_name || ''}
                                                        onChange={e => { setNewLead({ ...newLead, client_contact_name: e.target.value }); setPartnerSaved(false); }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone / WhatsApp</label>
                                                    <input
                                                        className={`form-input w-full rounded-lg border-gray-300 ${partnerSaved ? 'bg-gray-50' : ''}`}
                                                        placeholder="(00) 00000-0000"
                                                        value={newLead.client_phone || ''}
                                                        onChange={e => { setNewLead({ ...newLead, client_phone: maskPhone(e.target.value) }); setPartnerSaved(false); }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF / CNPJ</label>
                                                    <input
                                                        className={`form-input w-full rounded-lg border-gray-300 ${partnerSaved ? 'bg-gray-50' : ''}`}
                                                        placeholder="000.000.000-00"
                                                        value={newLead.client_doc || ''}
                                                        onChange={e => { setNewLead({ ...newLead, client_doc: maskCpfCnpj(e.target.value) }); setPartnerSaved(false); }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail</label>
                                                <input
                                                    type="email"
                                                    className={`form-input w-full rounded-lg border-gray-300 ${partnerSaved ? 'bg-gray-50' : ''}`}
                                                    placeholder="cliente@exemplo.com"
                                                    value={newLead.client_email || ''}
                                                    onChange={e => { setNewLead({ ...newLead, client_email: e.target.value }); setPartnerSaved(false); }}
                                                />
                                            </div>

                                            {!partnerSaved && (
                                                <div className="pt-2">
                                                    <button
                                                        onClick={handleSavePartner}
                                                        disabled={isSavingPartner}
                                                        className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold uppercase text-xs hover:bg-blue-600 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                                                    >
                                                        {isSavingPartner ? (
                                                            <>
                                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                                Salvando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="material-icons-outlined text-sm">save</span>
                                                                Salvar Dados do Cliente
                                                            </>
                                                        )}
                                                    </button>
                                                    <p className="text-[10px] text-gray-400 mt-2 text-center">Isso confirmará o cadastro no banco de dados antes de criar o atendimento.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-xs font-bold text-gray-400 uppercase">Anotações do Atendimento</label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={newLead.closing_metadata?.show_on_card || false}
                                                onChange={e => setNewLead({
                                                    ...newLead,
                                                    closing_metadata: { ...newLead.closing_metadata, show_on_card: e.target.checked }
                                                })}
                                            />
                                            <span className="text-[10px] font-bold text-blue-500 uppercase">Exibir no Card</span>
                                        </label>
                                    </div>
                                    <textarea
                                        className="form-textarea w-full rounded-lg border-gray-300"
                                        rows={3}
                                        placeholder="O que o cliente está buscando? Notas internas..."
                                        value={newLead.description || ''}
                                        onChange={e => setNewLead({ ...newLead, description: e.target.value })}
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {editingLead && (
                                        <>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vendedor Responsável</label>
                                                <select
                                                    className={`form-select w-full rounded-lg border-gray-300 ${isSeller ? 'bg-gray-100' : ''}`}
                                                    value={newLead.salesperson}
                                                    onChange={e => setNewLead({ ...newLead, salesperson: e.target.value })}
                                                    disabled={isSeller}
                                                >
                                                    <option value="VENDAS 01">VENDAS 01</option>
                                                    <option value="VENDAS 02">VENDAS 02</option>
                                                    <option value="VENDAS 03">VENDAS 03</option>
                                                    <option value="VENDAS 04">VENDAS 04</option>
                                                </select>
                                            </div>
                                            {/* Status do Funil removed from here to make it more minimalist as requested */}
                                        </>
                                    )}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Prioridade</label>
                                        <div className="flex gap-4">
                                            {['BAIXA', 'NORMAL', 'ALTA'].map(p => (
                                                <label key={p} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="priority"
                                                        checked={newLead.priority === p}
                                                        onChange={() => setNewLead({ ...newLead, priority: p as any })}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className={`text-xs font-bold uppercase ${p === 'ALTA' ? 'text-red-500' : p === 'BAIXA' ? 'text-gray-500' : 'text-blue-500'
                                                        }`}>{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                </div>

                                {/* Checklist Section */}
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <label className="block text-xs font-black text-gray-600 uppercase mb-3 tracking-widest flex items-center gap-2">
                                        <span className="material-icons-outlined text-sm">fact_check</span>
                                        Check-list de Processos
                                    </label>
                                    <div className="space-y-2 mb-3">
                                        {checklistItems.map(item => (
                                            <div key={item.id} className="flex items-center gap-2 group">
                                                <button
                                                    onClick={() => toggleChecklistItem(item.id)}
                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${item.completed ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300 text-transparent'}`}
                                                >
                                                    <span className="material-icons-outlined text-[14px]">check</span>
                                                </button>
                                                <span className={`text-sm flex-1 ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{item.text}</span>
                                                <button onClick={() => removeChecklistItem(item.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                                                    <span className="material-icons-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            className="form-input flex-1 rounded-lg border-gray-200 text-sm"
                                            placeholder="Novo item..."
                                            value={newItemText}
                                            onChange={e => setNewItemText(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                                        />
                                        <button onClick={addChecklistItem} className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm flex items-center justify-center">
                                            <span className="material-icons-outlined">add</span>
                                        </button>
                                    </div>
                                </div>

                                {/* WhatsApp Template Section */}
                                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-xs font-black text-green-700 uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-icons-outlined text-sm text-green-600">message</span>
                                            Template WhatsApp
                                        </label>
                                        {newLead.client_phone && (
                                            <a
                                                href={`https://wa.me/55${newLead.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(newLead.closing_metadata?.wa_template || '')}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full hover:bg-green-600 transition-all shadow-sm flex items-center gap-1"
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                                Enviar Agora
                                            </a>
                                        )}
                                    </div>
                                    <textarea
                                        className="form-textarea w-full rounded-lg border-green-100 bg-white text-sm focus:ring-green-500 focus:border-green-500"
                                        rows={2}
                                        placeholder="Mensagem rápida para o WhatsApp..."
                                        value={newLead.closing_metadata?.wa_template || ''}
                                        onChange={e => setNewLead({
                                            ...newLead,
                                            closing_metadata: { ...(newLead.closing_metadata || {}), wa_template: e.target.value }
                                        })}
                                    ></textarea>
                                    <p className="text-[10px] text-green-600/60 mt-2 italic font-medium">Use [cliente] para personalizar o nome se desejar (implementaremos o replace no envio).</p>
                                </div>
                            </div>
                            <div className="px-2 py-2 text-sm bg-gray-50 flex justify-between items-center">
                                <div></div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsLeadModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-bold uppercase text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
                                    <button
                                        onClick={saveLead}
                                        disabled={!partnerSaved}
                                        className={`px-6 py-2 rounded-lg font-bold uppercase text-xs shadow-lg transition-all ${partnerSaved ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
                                    >
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
                                            onClick={() => setFinalizeForm({ ...finalizeForm, success: true })}
                                            className={`py-3 rounded-xl text-xs font-black uppercase transition-all border ${finalizeForm.success ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                                        >
                                            Sim, Fez Pedido
                                        </button>
                                        <button
                                            onClick={() => setFinalizeForm({ ...finalizeForm, success: false })}
                                            className={`py-3 rounded-xl text-xs font-black uppercase transition-all border ${!finalizeForm.success ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                                        >
                                            Não Fez
                                        </button>
                                    </div>
                                </div>

                                {finalizeForm.success ? (
                                    <>
                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            {/* Valor Final Removed as per request */}
                                        </div>
                                        <div className="animate-in slide-in-from-top-2 duration-300 delay-75">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Qual o feedback dele?</label>
                                            <textarea
                                                className="form-textarea w-full rounded-2xl border-gray-100 focus:ring-green-500 focus:border-green-500 text-sm font-medium bg-gray-50"
                                                rows={3}
                                                placeholder="Ex: Gostou muito do atendimento..."
                                                value={finalizeForm.notes}
                                                onChange={e => setFinalizeForm({ ...finalizeForm, notes: e.target.value })}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Qual o motivo?</label>
                                        <textarea
                                            className="form-textarea w-full rounded-2xl border-gray-100 focus:ring-red-500 focus:border-red-500 text-sm font-medium bg-gray-50"
                                            rows={3}
                                            placeholder="Ex: Achou o preço alto..."
                                            value={finalizeForm.notes}
                                            onChange={e => setFinalizeForm({ ...finalizeForm, notes: e.target.value })}
                                        />
                                    </div>
                                )}

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

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Motivo da Solicitação</label>
                                    <textarea
                                        className="form-textarea w-full rounded-2xl border-gray-200 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium bg-gray-50 p-4"
                                        rows={3}
                                        placeholder="Ex: Cliente solicitou atendimento direto, ou parceria antiga..."
                                        value={transferReason}
                                        onChange={e => setTransferReason(e.target.value)}
                                    />
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
                                        disabled={!transferReason.trim()}
                                        className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl transition-all active:scale-95 ${transferReason.trim() ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                    >
                                        Enviar Solicitação
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ManagementPage;
