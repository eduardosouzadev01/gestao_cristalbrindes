
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
import { formatDate } from '../src/utils/dateUtils';
import { maskPhone, maskCpfCnpj } from '../src/utils/maskUtils';

// Interfaces
interface Lead {
    id: string;
    client_name: string;
    client_phone?: string;
    client_email?: string;
    client_doc?: string;
    description?: string;
    status: 'NOVO' | 'CRIANDO_ORCAMENTO' | 'ORCAMENTO_ENVIADO' | 'ACOMPANHAMENTO' | 'PEDIDO_ABERTO' | 'NAO_APROVADO' | 'ENTREGUE' | 'POS_VENDA' | 'FINALIZADO';
    salesperson?: string;
    next_action_date?: string;
    notes?: string;
    created_at: string;
    priority?: 'ALTA' | 'NORMAL' | 'BAIXA';
    lost_reason?: string;
    estimated_value?: number;
}

const ManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const initialLeadState: Partial<Lead> = {
        status: 'NOVO',
        salesperson: 'VENDAS 01',
        priority: 'NORMAL',
        estimated_value: 0,
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
        status: 'NOVO',
        salesperson: 'VENDAS 01', // Default
        priority: 'NORMAL',
        estimated_value: 0
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

        const { data, error } = await query;
        if (error) {
            // If table doesn't exist yet (migration propagation), suppress specific error or handle gracefully
            if (error.code === '42P01') {
                toast.error('ERRO CRÍTICO: Tabela CRM não encontrada. Contacte o suporte para rodar a migração.');
            } else {
                toast.error('Erro ao carregar leads: ' + error.message);
            }
        } else {
            // Sort by Priority then Date
            const priorityWeight = { 'ALTA': 3, 'NORMAL': 2, 'BAIXA': 1 };
            const sorted = (data || []).sort((a, b) => {
                const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
                if (pA !== pB) return pB - pA; // Descending priority
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
                salesperson: foundClient.salesperson || baseLead.salesperson
            });
            setEditingLead(null);
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
    };

    const saveLead = async () => {
        if (!newLead.client_name) {
            toast.error('Nome do cliente é obrigatório.');
            return;
        }

        try {
            // 1. Save/Update Partner (Client)
            if (newLead.client_name) {
                const partnerPayload = {
                    name: newLead.client_name,
                    phone: newLead.client_phone,
                    email: newLead.client_email,
                    doc: newLead.client_doc,
                    type: 'CLIENTE',
                    salesperson: newLead.salesperson // Assign salesperson if new
                };

                // Try to find existing by doc
                let existingClientId = null;
                if (newLead.client_doc) {
                    const { data: existing } = await supabase.from('partners').select('id').eq('doc', newLead.client_doc).single();
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
            setNewLead({ status: 'NOVO', salesperson: 'VENDAS 01', priority: 'NORMAL' });
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
            const { data, error } = await supabase
                .from('budgets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Global Stats
            setTotalBudgets(data.length);
            setTotalApproved(data.filter((b: any) => b.status === 'PROPOSTA ACEITA').length);
            setTotalValue(data.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0));
            setRecentBudgets(data.slice(0, 5));

            // Group by salesperson
            const grouped = data.reduce((acc: any, b: any) => {
                const sp = b.salesperson || 'N/A';
                if (!acc[sp]) acc[sp] = {
                    name: sp,
                    total: 0,
                    approved: 0,
                    pending: 0,
                    refused: 0,
                    value: 0
                };
                acc[sp].total += 1;
                acc[sp].value += (b.total_amount || 0);

                if (b.status === 'PROPOSTA ACEITA') acc[sp].approved += 1;
                else if (b.status === 'PROPOSTA RECUSADA' || b.status === 'CANCELADO') acc[sp].refused += 1;
                else acc[sp].pending += 1;

                return acc;
            }, {});

            setStats(Object.values(grouped));
        } catch (error: any) {
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
        { id: 'NOVO', title: 'Novo Atendimento', color: 'bg-blue-100 text-blue-800' },
        { id: 'CRIANDO_ORCAMENTO', title: 'Criando orçamento', color: 'bg-indigo-100 text-indigo-800' },
        { id: 'ORCAMENTO_ENVIADO', title: 'Orçamento enviado', color: 'bg-sky-100 text-sky-800' },
        { id: 'ACOMPANHAMENTO', title: 'Acompanhamento', color: 'bg-yellow-100 text-yellow-800' },
        { id: 'PEDIDO_ABERTO', title: 'Pedido aberto', color: 'bg-orange-100 text-orange-800' },
        { id: 'ENTREGUE', title: 'Pedido entregue', color: 'bg-teal-100 text-teal-800' },
        { id: 'POS_VENDA', title: 'Pós-venda', color: 'bg-purple-100 text-purple-800' },
    ];

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
                    <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setActiveTab('LEADS')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'LEADS' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <span className="material-icons-outlined text-sm">view_kanban</span>
                            Atendimentos
                        </button>
                        <button
                            onClick={() => setActiveTab('PERFORMANCE')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'PERFORMANCE' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <span className="material-icons-outlined text-sm">insert_chart</span>
                            Performance
                        </button>
                        <button
                            onClick={() => setActiveTab('FINANCEIRO')}
                            className={`px-4 py-2 rounded-md text-xs font-bold uppercase transition-all flex items-center gap-2 ${activeTab === 'FINANCEIRO' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <span className="material-icons-outlined text-sm">payments</span>
                            Financeiro
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'LEADS' && (
                <>
                    <div className="flex justify-end mb-6">
                        <button onClick={() => { setCheckClientInput(''); setIsCheckClientModalOpen(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2">
                            <span className="material-icons-outlined">add</span> Novo Atendimento
                        </button>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto pb-8 gap-6 cursor-grab active:cursor-grabbing select-none"
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
                                className={`min-w-[300px] w-[300px] flex-shrink-0 bg-gray-50 rounded-xl border-2 flex flex-col max-h-[calc(100vh-250px)] transition-all ${dragOverColumn === col.id ? 'border-blue-500 bg-blue-50/50 shadow-inner scale-[1.01]' : 'border-gray-200'}`}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, col.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className={`p-4 border-b border-gray-200 rounded-t-xl font-bold uppercase text-xs flex justify-between items-center ${col.color}`}>
                                    {col.title}
                                    <span className="bg-white/50 px-2 py-0.5 rounded-full text-[10px]">{leads.filter(l => l.status === col.id).length}</span>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                    {leads.filter(l => l.status === col.id).map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead)}
                                            onDragEnd={handleDragEnd}
                                            className={`p-4 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-all group relative cursor-pointer active:cursor-grabbing ${col.id === 'NOVO' ? 'bg-blue-50/30 border-l-blue-500 border-r border-t border-b border-blue-100' :
                                                col.id === 'CRIANDO_ORCAMENTO' ? 'bg-purple-50/30 border-l-purple-500 border-r border-t border-b border-purple-100' :
                                                    col.id === 'ORCAMENTO_ENVIADO' ? 'bg-amber-50/30 border-l-amber-500 border-r border-t border-b border-amber-100' :
                                                        col.id === 'ACOMPANHAMENTO' ? 'bg-yellow-50/30 border-l-yellow-500 border-r border-t border-b border-yellow-100' :
                                                            col.id === 'PEDIDO_ABERTO' ? 'bg-emerald-50/30 border-l-emerald-500 border-r border-t border-b border-emerald-100' :
                                                                col.id === 'NAO_APROVADO' ? 'bg-red-50/30 border-l-red-500 border-r border-t border-b border-red-100' :
                                                                    col.id === 'ENTREGUE' ? 'bg-green-50/30 border-l-green-600 border-r border-t border-b border-green-100' :
                                                                        col.id === 'POS_VENDA' ? 'bg-sky-50/30 border-l-sky-500 border-r border-t border-b border-sky-100' :
                                                                            'bg-gray-50/30 border-l-gray-500 border-r border-t border-b border-gray-100' // FINALIZADO
                                                }`}
                                            onClick={() => { setEditingLead(lead); setNewLead(lead); setIsLeadModalOpen(true); }}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{lead.salesperson}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1">
                                                        <span className="material-icons-outlined text-[10px]">timer</span>
                                                        {Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias na fila
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-gray-400">{formatDate(lead.created_at)}</span>
                                                    {lead.priority && (
                                                        <span className={`text-[9px] font-bold px-1.5 rounded uppercase mt-1 ${lead.priority === 'ALTA' ? 'bg-red-100 text-red-600' :
                                                            lead.priority === 'BAIXA' ? 'bg-gray-100 text-gray-500' :
                                                                'bg-blue-50 text-blue-500' // Normal default
                                                            }`}>
                                                            {lead.priority}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-gray-800 text-sm mb-1">{lead.client_name}</h4>
                                            {lead.estimated_value ? <p className="text-xs font-black text-green-600 mb-2">{formatCurrency(lead.estimated_value)}</p> : null}
                                            {lead.client_phone && <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><span className="material-icons-outlined text-[10px]">call</span> {lead.client_phone}</p>}
                                            {lead.client_email && <p className="text-xs text-gray-500 flex items-center gap-1 mb-2"><span className="material-icons-outlined text-[10px]">email</span> {lead.client_email}</p>}
                                            {lead.description && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-2 line-clamp-3">{lead.description}</p>}
                                            {lead.lost_reason && (
                                                <div className="text-[10px] bg-red-50 text-red-600 p-2 rounded border border-red-100 mb-2 italic">
                                                    <strong>Motivo Recusa:</strong> {lead.lost_reason}
                                                </div>
                                            )}

                                            <div className="mt-3 pt-3 border-t border-gray-100 hidden group-hover:flex flex-col gap-2">
                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate('/orcamentos', { state: { clientName: lead.client_name } });
                                                        }}
                                                        className="px-2 py-1.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase hover:bg-blue-100 flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-icons-outlined text-[12px]">folder_open</span> Orçamentos
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate('/', { state: { clientName: lead.client_name } });
                                                        }}
                                                        className="px-2 py-1.5 bg-green-50 text-green-600 rounded text-[10px] font-bold uppercase hover:bg-green-100 flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-icons-outlined text-[12px]">inventory_2</span> Pedidos
                                                    </button>
                                                </div>

                                                <div className="flex justify-between items-center mt-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); convertToBudget(lead); }}
                                                        className="text-[10px] font-bold text-purple-600 uppercase hover:underline flex items-center gap-1"
                                                    >
                                                        <span className="material-icons-outlined text-[12px]">add_circle</span> Criar Orçamento
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPendingStatusLead(lead);
                                                            setFinalizeForm({ success: true, value: lead.estimated_value || 0, notes: '' });
                                                            setIsFinalizeModalOpen(true);
                                                        }}
                                                        className="text-[10px] font-bold text-green-600 uppercase hover:underline flex items-center gap-1"
                                                    >
                                                        <span className="material-icons-outlined text-[12px]">check_circle</span> Finalizar
                                                    </button>
                                                </div>
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
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Stats Cards */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Total de Orçamentos</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{totalBudgets}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                <span className="material-icons-outlined text-2xl">description</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Taxa de Conversão Global</p>
                                <p className="text-3xl font-black text-green-600 mt-1">
                                    {totalBudgets > 0 ? ((totalApproved / totalBudgets) * 100).toFixed(1) : 0}%
                                </p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-xl text-green-600">
                                <span className="material-icons-outlined text-2xl">trending_up</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Valor Total em Propostas</p>
                                <p className="text-3xl font-black text-purple-600 mt-1">{formatCurrency(totalValue)}</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                                <span className="material-icons-outlined text-2xl">attach_money</span>
                            </div>
                        </div>
                    </div>

                    {/* Salesperson Performance */}
                    <h2 className="text-lg font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                        <span className="material-icons-outlined text-gray-400">groups</span> Desempenho por Vendedor
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {stats.length === 0 ? (
                            <p className="text-gray-400 italic col-span-3 text-center py-10">Nenhum dado disponível.</p>
                        ) : (
                            stats.map((s) => (
                                <div key={s.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:border-purple-300 transition-all">
                                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-200">
                                                {s.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-black text-gray-700 uppercase text-xs">{s.name}</span>
                                        </div>
                                        <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-1 rounded-full">{s.total} PROPOSTAS</span>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-3 gap-2 mb-4">
                                            <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                                                <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Aprovados</p>
                                                <p className="text-lg font-black text-green-700">{s.approved}</p>
                                            </div>
                                            <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                                                <p className="text-[9px] font-bold text-yellow-600 uppercase mb-1">Em Aberto</p>
                                                <p className="text-lg font-black text-yellow-700">{s.pending}</p>
                                            </div>
                                            <div className="text-center p-2 bg-red-50 rounded-lg border border-red-100">
                                                <p className="text-[9px] font-bold text-red-400 uppercase mb-1">Perdidos</p>
                                                <p className="text-lg font-black text-red-500">{s.refused}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Volume de Vendas</span>
                                                <span className="text-sm font-black text-gray-800">{formatCurrency(s.value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                                <span className="material-icons-outlined text-gray-400">history</span> Atividade Recente
                            </h2>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Orçamento</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Cliente</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentBudgets.map((b) => (
                                            <tr key={b.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">#{b.budget_number}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{b.client_id ? 'CLIENTE REGISTRADO' : 'CLIENTE NOVO/PENDENTE'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'PROPOSTA ACEITA' ? 'bg-green-100 text-green-700' :
                                                        b.status.includes('RECUSAD') || b.status.includes('CANCEL') ? 'bg-red-100 text-red-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {b.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                                    {formatCurrency(b.total_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                                <span className="material-icons-outlined text-red-400">cancel</span> Motivos de Perda (Pedido não aprovado)
                            </h2>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                                <div className="space-y-4">
                                    {Array.from(new Set(leads.filter(l => l.status === 'NAO_APROVADO' && l.lost_reason).map(l => l.lost_reason))).length === 0 ? (
                                        <p className="text-gray-400 italic text-center py-4">Nenhum motivo registrado ainda.</p>
                                    ) : (
                                        Object.entries(
                                            leads.filter(l => l.status === 'NAO_APROVADO' && l.lost_reason)
                                                .reduce((acc: any, curr) => {
                                                    acc[curr.lost_reason!] = (acc[curr.lost_reason!] || 0) + 1;
                                                    return acc;
                                                }, {})
                                        ).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([reason, count]) => (
                                            <div key={reason} className="flex flex-col">
                                                <div className="flex justify-between items-center text-xs mb-1">
                                                    <span className="font-bold text-gray-700 uppercase">{reason}</span>
                                                    <span className="font-black text-gray-400">{count} ocorrências</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-2 rounded-full">
                                                    <div
                                                        className="bg-red-400 h-2 rounded-full"
                                                        style={{ width: `${((count as number) / leads.filter(l => l.status === 'NAO_APROVADO').length) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'FINANCEIRO' && (
                <div className="space-y-8">
                    {/* Finance Filters */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-center justify-between">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Mês de Referência</label>
                                <select
                                    className="form-select rounded-xl border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 min-w-[140px] focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={month}
                                    onChange={e => setMonth(parseInt(e.target.value))}
                                >
                                    {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Ano</label>
                                <select
                                    className="form-select rounded-xl border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 min-w-[100px] focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={year}
                                    onChange={e => setYear(parseInt(e.target.value))}
                                >
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Filtrar por Vendedor</label>
                                <select
                                    className="form-select rounded-xl border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 min-w-[180px] focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={selectedSalesperson}
                                    onChange={e => setSelectedSalesperson(e.target.value)}
                                >
                                    <option value="Todos">Todos os Vendedores</option>
                                    <option value="VENDAS 01">VENDAS 01</option>
                                    <option value="VENDAS 02">VENDAS 02</option>
                                    <option value="VENDAS 03">VENDAS 03</option>
                                    <option value="VENDAS 04">VENDAS 04</option>
                                    <option value="VENDAS 05">VENDAS 05</option>
                                </select>
                            </div>
                        </div>
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hidden sm:block">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Período Selecionado</p>
                            <p className="text-xs font-black text-blue-600 uppercase">
                                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][month - 1]} · {year}
                            </p>
                        </div>
                    </div>

                    {/* Finance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-all">
                            <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-blue-500 opacity-5 group-hover:opacity-10 transition-opacity">shopping_cart</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vendas (Bruto)</p>
                            <h3 className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(finStats.totalSales)}</h3>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold">{finStats.orderCount} Pedidos | TM: {formatCurrency(finStats.ticketMedio)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-all">
                            <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-purple-500 opacity-5 group-hover:opacity-10 transition-opacity">payments</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Comissões</p>
                            <h3 className="text-2xl font-black text-purple-600 tracking-tighter">{formatCurrency(finStats.totalCommissions)}</h3>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase">Devido aos vendedores</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-red-200 transition-all">
                            <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-red-500 opacity-5 group-hover:opacity-10 transition-opacity">money_off</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Despesas Fixas</p>
                            <h3 className="text-2xl font-black text-red-600 tracking-tighter">{formatCurrency(finStats.totalFixedExpenses)}</h3>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase">Gastos da Unidade</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-green-200 transition-all">
                            <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-green-500 opacity-5 group-hover:opacity-10 transition-opacity">account_balance</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                            <h3 className={`text-2xl font-black tracking-tighter ${finStats.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(finStats.totalNet)}</h3>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase italic">Estimado (Sem Impostos)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Products */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 pb-2 border-b border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="material-icons-outlined text-orange-500">emoji_events</span> Produtos Mais Vendidos
                                </div>
                                <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Top 5</span>
                            </h3>
                            <div className="space-y-4">
                                {finStats.topProducts.length === 0 ? (
                                    <p className="text-gray-400 italic text-center text-xs py-4">Nenhum produto vendido no período.</p>
                                ) : finStats.topProducts.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                            <p className="text-xs font-bold text-gray-700 uppercase group-hover:text-blue-600 transition-colors">{p.name}</p>
                                        </div>
                                        <span className="text-sm font-black text-gray-900">{formatCurrency(p.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Breakdown */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 pb-2 border-b border-gray-50 flex items-center gap-2">
                                <span className="material-icons-outlined text-blue-500">pie_chart</span> Volume por Status de Pedido
                            </h3>
                            <div className="space-y-4">
                                {finStats.salesByStatus.length === 0 ? (
                                    <p className="text-gray-400 italic text-center text-xs py-4">Sem movimentação no período.</p>
                                ) : finStats.salesByStatus.map((s, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-[10px] font-bold mb-1 uppercase text-gray-500 tracking-tighter">
                                            <span>{s.status}</span>
                                            <span className="text-gray-900">{formatCurrency(s.total)}</span>
                                        </div>
                                        <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                                            <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(s.total / (finStats.totalSales || 1)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
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
                                                        onClick={() => selectClient(client)}
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
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Cliente *</label>
                                <input className="form-input w-full rounded-lg border-gray-300" placeholder="Nome do cliente ou empresa" value={newLead.client_name || ''} onChange={e => setNewLead({ ...newLead, client_name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telefone / WhatsApp</label>
                                    <input
                                        className="form-input w-full rounded-lg border-gray-300"
                                        placeholder="(00) 00000-0000"
                                        value={newLead.client_phone || ''}
                                        onChange={e => setNewLead({ ...newLead, client_phone: maskPhone(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">CPF / CNPJ</label>
                                    <input
                                        className="form-input w-full rounded-lg border-gray-300"
                                        placeholder="000.000.000-00"
                                        value={newLead.client_doc || ''}
                                        onChange={e => setNewLead({ ...newLead, client_doc: maskCpfCnpj(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">E-mail</label>
                                <input
                                    type="email"
                                    className="form-input w-full rounded-lg border-gray-300"
                                    placeholder="cliente@exemplo.com"
                                    value={newLead.client_email || ''}
                                    onChange={e => setNewLead({ ...newLead, client_email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Descrição do Pedido / Interesse</label>
                                <textarea className="form-textarea w-full rounded-lg border-gray-300" rows={3} placeholder="O que o cliente está buscando?" value={newLead.description || ''} onChange={e => setNewLead({ ...newLead, description: e.target.value })} ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vendedor Responsável</label>
                                    <select className="form-select w-full rounded-lg border-gray-300" value={newLead.salesperson} onChange={e => setNewLead({ ...newLead, salesperson: e.target.value })}>
                                        <option value="VENDAS 01">VENDAS 01</option>
                                        <option value="VENDAS 02">VENDAS 02</option>
                                        <option value="VENDAS 03">VENDAS 03</option>
                                        <option value="VENDAS 04">VENDAS 04</option>
                                        <option value="VENDAS 05">VENDAS 05</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor Estimado (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input w-full rounded-lg border-gray-300"
                                        placeholder="0,00"
                                        value={newLead.estimated_value || 0}
                                        onChange={e => setNewLead({ ...newLead, estimated_value: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Status do Funil</label>
                                    <select className="form-select w-full rounded-lg border-gray-300" value={newLead.status} onChange={e => setNewLead({ ...newLead, status: e.target.value as any })}>
                                        <option value="NOVO">NOVO ATENDIMENTO</option>
                                        <option value="CRIANDO_ORCAMENTO">CRIANDO ORÇAMENTO</option>
                                        <option value="ORCAMENTO_ENVIADO">ORÇAMENTO ENVIADO</option>
                                        <option value="ACOMPANHAMENTO">ACOMPANHAMENTO</option>
                                        <option value="PEDIDO_ABERTO">PEDIDO ABERTO</option>
                                        <option value="NAO_APROVADO">ORÇAMENTO NÃO APROVADO</option>
                                        <option value="ENTREGUE">PEDIDO ENTREGUE</option>
                                        <option value="POS_VENDA">PÓS-VENDA</option>
                                        <option value="FINALIZADO">PEDIDO FINALIZADO</option>
                                    </select>
                                </div>
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
                            {editingLead ? <button onClick={() => deleteLead(editingLead.id)} className="text-red-500 font-bold uppercase text-xs hover:underline">Excluir</button> : <div></div>}
                            <div className="flex gap-2">
                                <button onClick={() => setIsLeadModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-bold uppercase text-xs text-gray-600 hover:bg-gray-50">Cancelar</button>
                                <button onClick={saveLead} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold uppercase text-xs hover:bg-blue-700 shadow-lg shadow-blue-200">Salvar</button>
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
