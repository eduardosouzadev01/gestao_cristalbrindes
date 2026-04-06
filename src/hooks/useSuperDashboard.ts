import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface DashLead {
  id: string;
  client_name: string;
  salesperson: string;
  status: string;
  priority: string;
  estimated_value: number;
  created_at: string;
  updated_at: string;
}

export interface DashBudget {
  id: string;
  budget_number: string;
  salesperson: string;
  status: string;
  total_amount: number;
  created_at: string;
  client_name: string; // from join partners.name
}

export interface DashProposal {
  id: string;
  proposal_number: string;
  salesperson: string;
  status: string;
  total_amount: number;
  created_at: string;
  client_name: string;
}

export interface DashOrder {
  id: string;
  order_number: string;
  salesperson: string;
  status: string;
  total_amount: number;
  entry_amount: number;
  remaining_amount: number;
  order_date: string;
  payment_due_date: string | null;
  supplier_departure_date: string | null;
  client_name: string;
  client_doc: string;
}

export interface SuperDashboardData {
  leads: DashLead[];
  budgets: DashBudget[];
  proposals: DashProposal[];
  orders: DashOrder[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date;
  refresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const diff = new Date().getTime() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  // Compara com hoje sem considerar o horário
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  return targetDate < today;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSuperDashboard(salespersonFilter?: string): SuperDashboardData {
  const [leads, setLeads] = useState<DashLead[]>([]);
  const [budgets, setBudgets] = useState<DashBudget[]>([]);
  const [proposals, setProposals] = useState<DashProposal[]>([]);
  const [orders, setOrders] = useState<DashOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, budgetsRes, proposalsRes, ordersRes] = await Promise.all([
        // Query 1: Active CRM leads (exclude lost/deleted)
        supabase
          .from('crm_leads')
          .select('id, client_name, salesperson, status, priority, estimated_value, created_at, updated_at')
          .in('status', ['ATENDIMENTO', 'ORCAMENTO', 'PROPOSTA_ENVIADA', 'PEDIDO_ABERTO', 'PEDIDO_ENTREGUE'])
          .order('created_at', { ascending: false }),

        // Query 2: All budgets with client name
        supabase
          .from('budgets')
          .select('id, budget_number, salesperson, status, total_amount, created_at, partners(name)')
          .order('created_at', { ascending: false })
          .limit(500),

        // Query 3: All proposals
        supabase
          .from('proposals')
          .select('id, proposal_number, salesperson, status, total_amount, created_at, client:partners(name)')
          .order('created_at', { ascending: false })
          .limit(500),

        // Query 4: All orders (active ones)
        supabase
          .from('orders')
          .select(`
            id, order_number, salesperson, status, total_amount,
            entry_amount, remaining_amount, order_date,
            payment_due_date, supplier_departure_date,
            partners(name, doc)
          `)
          .not('status', 'eq', 'FINALIZADO')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (leadsRes.error) throw new Error('Leads: ' + leadsRes.error.message);
      if (budgetsRes.error) throw new Error('Budgets: ' + budgetsRes.error.message);
      if (proposalsRes.error) throw new Error('Proposals: ' + proposalsRes.error.message);
      if (ordersRes.error) throw new Error('Orders: ' + ordersRes.error.message);

      // Normalize data
      let rawLeads = (leadsRes.data || []) as DashLead[];
      let rawBudgets = (budgetsRes.data || []).map((b: any) => ({
        ...b,
        client_name: b.partners?.name || 'Sem cliente',
      })) as DashBudget[];
      let rawProposals = (proposalsRes.data || []).map((p: any) => ({
        ...p,
        client_name: p.client?.name || 'Sem cliente',
      })) as DashProposal[];
      let rawOrders = (ordersRes.data || []).map((o: any) => ({
        ...o,
        client_name: o.partners?.name || 'Cliente removido',
        client_doc: o.partners?.doc || '-',
      })) as DashOrder[];

      // Apply salesperson filter if provided (for non-admin users)
      if (salespersonFilter) {
        rawLeads = rawLeads.filter(l => l.salesperson === salespersonFilter);
        rawBudgets = rawBudgets.filter(b => b.salesperson === salespersonFilter);
        rawProposals = rawProposals.filter(p => p.salesperson === salespersonFilter);
        rawOrders = rawOrders.filter(o => o.salesperson === salespersonFilter);
      }

      setLeads(rawLeads);
      setBudgets(rawBudgets);
      setProposals(rawProposals);
      setOrders(rawOrders);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [salespersonFilter]);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return { leads, budgets, proposals, orders, loading, error, lastRefresh, refresh };
}
