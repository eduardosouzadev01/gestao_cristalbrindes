
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
        client_name: '', client_phone: '', client_email: '', client_doc: ''
    };

    const tabParam = searchParams.get('tab') as 'LEADS' | 'PERFORMANCE' | 'FINANCEIRO' | null;
    const [activeTab, setActiveTab] = useState<'LEADS' | 'PERFORMANCE' | 'FINANCEIRO'>(tabParam || 'LEADS');
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
        topProducts: [] as any[],
        salesByStatus: [] as any[]
    });

    useEffect(() => {
        if (activeTab === 'LEADS') fetchLeads();
        else if (activeTab === 'PERFORMANCE') fetchPerformanceData();
        else if (activeTab === 'FINANCEIRO') fetchFinancialData();
    }, [activeTab, startDate, endDate, month, year, selectedSalesperson]);

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
            const leadPayload = { ...newLead, priority: newLead.priority || 'NORMAL' };

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

    const fetchFinancialData = async () => {
        try {
            setLoading(true);
            const startStr = new Date(year, month - 1, 1).toISOString();
            const endStr = new Date(year, month, 0).toISOString();

            let orderQuery = supabase
                .from('orders')
                .select(`
                    id, status, total_amount, salesperson,
                    order_items ( product_name, quantity, unit_price, customization_cost, supplier_transport_cost, client_transport_cost, extra_expense )
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
            const productMap: any = {};
            const statusMap: any = {};

            (orders || []).forEach(o => {
                totalSales += o.total_amount || 0;
                statusMap[o.status] = (statusMap[o.status] || 0) + (o.total_amount || 0);

                o.order_items?.forEach((item: any) => {
                    const estItemCost = (item.quantity * (item.unit_price || 0)) + (item.customization_cost || 0) + (item.supplier_transport_cost || 0) + (item.client_transport_cost || 0) + (item.extra_expense || 0);
                    totalCostEst += estItemCost;
                    productMap[item.product_name || 'N/A'] = (productMap[item.product_name || 'N/A'] || 0) + (item.quantity * (item.unit_price || 0));
                });
            });

            setFinStats({
                totalSales,
                totalNet: totalSales - totalCostEst - totalCommissions - expensesTotal,
                totalCommissions,
                totalFixedExpenses: expensesTotal,
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
        { id: 'ATENDIMENTO', title: 'Em Atendimento', color: '#7b68ee', icon: 'support_agent' },
        { id: 'ORCAMENTO', title: 'Em Orçamento', color: '#ff9800', icon: 'description' },
        { id: 'PROPOSTA_ENVIADA', title: 'Proposta Enviada', color: '#1db954', icon: 'send' },
        { id: 'PEDIDO_ABERTO', title: 'Pedido Aberto', color: '#00bcd4', icon: 'shopping_cart' },
        { id: 'PEDIDO_ENTREGUE', title: 'Pedido Entregue', color: '#e91e63', icon: 'local_shipping' },
    ];

    const getSalespersonInitials = (name?: string) => {
        if (!name) return 'V';
        if (name.toUpperCase().startsWith('VENDAS ')) return 'V' + name.toUpperCase().replace('VENDAS ', '');
        const parts = name.split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-8">
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
                        <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                            <button
                                onClick={() => setActiveTab('LEADS')}
                                className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'LEADS' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <span className="material-icons-outlined text-sm">view_kanban</span>
                                Atendimentos
                            </button>
                            {hasPermission('crm.performance') && (
                                <button
                                    onClick={() => setActiveTab('PERFORMANCE')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'PERFORMANCE' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <span className="material-icons-outlined text-sm">insert_chart</span>
                                    Performance
                                </button>
                            )}
                            {hasPermission('crm.financeiro') && (
                                <button
                                    onClick={() => setActiveTab('FINANCEIRO')}
                                    className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'FINANCEIRO' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <span className="material-icons-outlined text-sm">payments</span>
                                    Financeiro
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {activeTab === 'LEADS' && (
                <>
                    <div className="flex justify-end mb-6">
                        <button onClick={() => {
                            setNewLead({ ...initialLeadState, salesperson: isSeller ? appUser?.salesperson : 'VENDAS 01' });
                            setEditingLead(null);
                            setShowClientForm(false);
                            setPartnerSaved(false);
                            setIsLeadModalOpen(true);
                        }} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2">
                            <span className="material-icons-outlined">add</span> Novo Atendimento
                        </button>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto pb-4 gap-4 cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300"
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
                        {leadColumns.map(col => (
                            <div
                                key={col.id}
                                className={`min-w-[280px] w-[280px] flex-shrink-0 flex flex-col max-h-[calc(100vh-250px)] transition-all rounded-xl border ${dragOverColumn === col.id ? 'ring-2 ring-blue-400' : ''}`}
                                style={{ backgroundColor: `${col.color}12`, borderColor: dragOverColumn === col.id ? undefined : `${col.color}30` }}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, col.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className="p-4 flex justify-between items-center group/header">
                                    <div className="flex items-center gap-2">
                                        <span className="material-icons-outlined text-sm" style={{ color: col.color }}>{col.icon}</span>
                                        <div
                                            className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider shadow-sm border border-gray-100 bg-white"
                                            style={{ color: col.color }}
                                        >
                                            {col.title}
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-400 bg-gray-100/50 px-2 py-0.5 rounded-full">
                                            {leads.filter(l => l.status === col.id).length}
                                        </span>
                                    </div>
                                    <button className="opacity-0 group-hover/header:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
                                        <span className="material-icons-outlined text-sm">more_horiz</span>
                                    </button>
                                </div>

                                <div className="px-3 flex-1 overflow-y-auto space-y-3 pb-4">
                                    {leads.filter(l => l.status === col.id).map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead)}
                                            onDragEnd={handleDragEnd}
                                            className="bg-white rounded-xl shadow-sm border border-gray-100 border-l-[3px] hover:shadow-md hover:-translate-y-0.5 transition-all group relative cursor-pointer active:cursor-grabbing p-4 flex flex-col min-h-[140px]"
                                            style={{ borderLeftColor: col.color }}
                                            onClick={() => {
                                                setEditingLead(lead);
                                                setNewLead(lead);
                                                setPartnerSaved(true);
                                                setIsLeadModalOpen(true);
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                {lead.priority && (
                                                    <span className={`px-2 py-[2px] rounded text-[9px] font-bold tracking-wider ${lead.priority === 'ALTA' ? 'bg-red-50 text-red-600' :
                                                            lead.priority === 'BAIXA' ? 'bg-gray-50 text-gray-500' : 'bg-blue-50 text-blue-600'
                                                        }`}>
                                                        {lead.priority}
                                                    </span>
                                                )}
                                                <div className="flex items-center text-gray-400 text-[10px] font-medium transition-colors group-hover:text-gray-600">
                                                    <span className="material-icons-outlined text-[12px] mr-1">schedule</span>
                                                    {formatDate(lead.created_at)}
                                                </div>
                                            </div>

                                            <h4 className="font-bold text-gray-800 text-[14px] leading-snug line-clamp-2 mb-1 pr-4">{lead.client_name}</h4>

                                            {lead.description && (
                                                <p className="text-gray-500 text-[11px] mb-3 line-clamp-2 leading-relaxed flex-1">
                                                    {lead.description}
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <div className="flex items-center gap-2">
                                                    {lead.salesperson && (
                                                        <div
                                                            className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-[9px] border border-blue-100 shadow-sm"
                                                            title={lead.salesperson}
                                                        >
                                                            {getSalespersonInitials(lead.salesperson)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    {lead.client_phone && <span className="material-icons-outlined text-[13px] text-gray-400 group-hover:text-blue-500 transition-colors" title="Telefone Registrado">phone</span>}
                                                    {lead.client_email && <span className="material-icons-outlined text-[13px] text-gray-400 group-hover:text-blue-500 transition-colors" title="E-mail Registrado">email</span>}
                                                </div>
                                            </div>

                                            {/* Hover Quick Actions */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-xl border border-gray-100 rounded-lg p-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate('/pedidos', { state: { clientName: lead.client_name } }); }}
                                                    className="p-1 hover:bg-indigo-50 rounded text-indigo-500" title="Ver Pedidos"
                                                >
                                                    <span className="material-icons-outlined text-sm">shopping_bag</span>
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        let clientId = '';
                                                        const conditions = [];
                                                        if (lead.client_doc) conditions.push(`doc.eq.${lead.client_doc}`);
                                                        if (lead.client_email) conditions.push(`email.eq.${lead.client_email}`);
                                                        if (lead.client_phone) conditions.push(`phone.eq.${lead.client_phone}`);
                                                        if (conditions.length === 0) conditions.push(`name.ilike.${lead.client_name}`);

                                                        const { data } = await supabase.from('partners').select('id').or(conditions.join(',')).eq('type', 'CLIENTE').limit(1);
                                                        if (data && data.length > 0) clientId = data[0].id;

                                                        navigate('/orcamentos', { state: { clientName: lead.client_name, clientId: clientId } });
                                                    }}
                                                    className="p-1 hover:bg-emerald-50 rounded text-emerald-500" title="Orçamentos em andamento"
                                                >
                                                    <span className="material-icons-outlined text-sm">request_quote</span>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); convertToBudget(lead); }}
                                                    className="p-1 hover:bg-gray-100 rounded text-purple-500" title="Criar Orçamento"
                                                >
                                                    <span className="material-icons-outlined text-sm">add_circle</span>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPendingStatusLead(lead);
                                                        setIsFinalizeModalOpen(true);
                                                    }}
                                                    className="p-1 hover:bg-green-50 rounded text-green-500" title="Finalizar"
                                                >
                                                    <span className="material-icons-outlined text-sm">check_circle</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {activeTab === 'PERFORMANCE' && (
                <PerformanceTab
                    totalBudgets={totalBudgets}
                    totalApproved={totalApproved}
                    totalValue={totalValue}
                    stats={stats}
                    recentBudgets={recentBudgets}
                    formatCurrency={formatCurrency}
                    leads={leads}
                />
            )}

            {activeTab === 'FINANCEIRO' && (
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
            )}

            {/* Modal Lead */}
            {isLeadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
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
                                            className="form-input w-full pl-10 rounded-lg border-blue-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Busque por Nome, E-mail, CPF/CNPJ ou Telefone..."
                                            value={clientSearchTerm}
                                            onChange={e => searchClients(e.target.value)}
                                        />
                                        {showClientResults && clientSearchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                                {clientSearchResults.map(client => (
                                                    <div
                                                        key={client.id}
                                                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                        onClick={() => {
                                                            selectClient(client);
                                                            setShowClientForm(true); // Always show fields when a client is selected to confirm
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <p className="font-bold text-gray-800 text-sm">{client.name}</p>
                                                            {client.salesperson && (
                                                                <span className="text-[10px] font-bold bg-gray-100 px-1 rounded text-gray-500 uppercase">
                                                                    {client.salesperson}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-500">{client.email} | {client.phone}</p>
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
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Cliente / Empresa *</label>
                                            <input
                                                className={`form-input w-full rounded-lg border-gray-300 ${partnerSaved ? 'bg-gray-50' : ''}`}
                                                placeholder="Nome do cliente ou empresa"
                                                value={newLead.client_name || ''}
                                                onChange={e => { setNewLead({ ...newLead, client_name: e.target.value }); setPartnerSaved(false); }}
                                            />
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
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição do Pedido / Interesse</label>
                                <textarea className="form-textarea w-full rounded-lg border-gray-300" rows={3} placeholder="O que o cliente está buscando?" value={newLead.description || ''} onChange={e => setNewLead({ ...newLead, description: e.target.value })} ></textarea>
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
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status do Funil</label>
                                            <select className="form-select w-full rounded-lg border-gray-300" value={newLead.status} onChange={e => setNewLead({ ...newLead, status: e.target.value as any })}>
                                                <option value="NOVO">ABERTOS</option>
                                                <option value="CRIANDO_ORCAMENTO">EM COTAÇÃO</option>
                                                <option value="ORCAMENTO_ENVIADO">PENDENTE</option>
                                                <option value="ACOMPANHAMENTO">FOLLOW-UP</option>
                                                <option value="PEDIDO_ABERTO">GANHO</option>
                                                <option value="ENTREGUE">ENTREGUE</option>
                                                <option value="POS_VENDA">PÓS-VENDA</option>
                                            </select>
                                        </div>
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
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Anotações Internas</label>
                                <textarea className="form-textarea w-full rounded-lg border-gray-300 bg-yellow-50" rows={2} placeholder="Notas apenas para a equipe..." value={newLead.notes || ''} onChange={e => setNewLead({ ...newLead, notes: e.target.value })} ></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
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
            )}
            {/* Lost Reason Modal */}
            {isLostReasonModalOpen && (
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
            )}
            {/* Finalize Lead Modal */}
            {isFinalizeModalOpen && (
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
            )}

            {/* Check Client Modal */}
            {isCheckClientModalOpen && (
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
            )}
        </div>
    );
};

export default ManagementPage;
