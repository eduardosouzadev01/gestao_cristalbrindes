'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '@/utils/formatCurrency';
import { fixClientName } from '@/utils/textUtils';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function OrdersListPage() {
    const { appUser } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVendedor, setFilterVendedor] = useState('TODOS');
    const [filterStatus, setFilterStatus] = useState('TODOS');

    const sellers = ['TODOS', 'VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05', 'VENDAS 06'];
    const statuses = ['TODOS', 'AGUARDANDO PAGAMENTO ENTRADA', 'EM PRODUÇÃO', 'EM TRANSPORTE', 'ENTREGUE', 'FINALIZADO', 'CANCELADO'];

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from('orders')
                    .select('*, partners(name)')
                    .order('created_at', { ascending: false });

                if (appUser?.role === 'VENDEDOR') {
                    query = query.eq('salesperson', appUser.salesperson);
                } else if (filterVendedor !== 'TODOS') {
                    query = query.eq('salesperson', filterVendedor);
                }

                if (filterStatus !== 'TODOS') {
                    query = query.eq('status', filterStatus);
                }

                const { data, error } = await query;
                if (error) throw error;
                setOrders(data || []);
            } catch (err) {
                console.error('Error fetching orders:', err);
                toast.error('Erro ao carregar pedidos.');
            } finally {
                setLoading(false);
            }
        };

        if (appUser) fetchOrders();
    }, [appUser, filterVendedor, filterStatus]);

    const filteredOrders = orders.filter(o => 
        (o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         o.partners?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F8]">
            {/* Header Section */}
            <div className="p-8 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                            <span className="material-icons-outlined text-[#0F6CBD] text-3xl">shopping_cart</span>
                            Gestão de Pedidos
                        </h1>
                        <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Controle total de produção e entrega</p>
                    </div>
                    <Link
                        href="/pedidos/novo"
                        className="flex items-center gap-3 px-6 py-3 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all shadow-none"
                    >
                        <span className="material-icons-outlined text-sm">add</span>
                        Novo Pedido
                    </Link>
                </div>
            </div>

            {/* Filters Section */}
            <div className="px-8 py-6">
                <div className="bg-white rounded-md border border-[#E3E3E4] p-6 flex flex-wrap items-center gap-6 shadow-none">
                    <div className="flex-1 min-w-[300px] relative group">
                        <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                        <input
                            placeholder="Buscar por número ou cliente..."
                            className="w-full h-12 !pl-12 pr-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {appUser?.role !== 'VENDEDOR' && (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Vendedor:</span>
                            <select 
                                className="h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] outline-none transition-all"
                                value={filterVendedor}
                                onChange={e => setFilterVendedor(e.target.value)}
                            >
                                {sellers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Status:</span>
                        <select 
                            className="h-12 px-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] outline-none transition-all"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="px-8 pb-12 flex-1">
                <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none h-full flex flex-col">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-[#E3E3E4]">
                                <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Número</th>
                                <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Vendedor</th>
                                <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Total</th>
                                <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-medium text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                                            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Carregando Pedidos...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <span className="material-icons-outlined text-4xl">inventory_2</span>
                                            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Nenhum pedido encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order, idx) => (
                                    <tr 
                                        key={order.id} 
                                        className={`group transition-all hover:bg-slate-50/80 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFB]'}`}
                                        onClick={() => router.push(`/pedidos/${order.id}`)}
                                        onAuxClick={(e) => {
                                            if (e.button === 1) window.open(`/pedidos/${order.id}`, '_blank');
                                        }}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-medium text-[#0F6CBD]">#{order.order_number}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-700 uppercase tracking-tight">{fixClientName(order.partners?.name || 'Sem Cliente')}</span>
                                                <span className="text-[9px] font-medium text-slate-400">{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-medium text-slate-400 uppercase">{order.salesperson}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-slate-700">
                                                {(order.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={`text-[9px] font-medium px-3 py-1 rounded-full uppercase tracking-widest ${
                                                    order.status === 'ENTREGUE' || order.status === 'FINALIZADO' ? 'bg-emerald-100 text-emerald-700' :
                                                    order.status === 'CANCELADO' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link 
                                                href={`/pedidos/${order.id}`}
                                                className="w-8 h-8 flex items-center justify-center rounded-md bg-white border border-[#E3E3E4] text-slate-400 hover:text-[#0F6CBD] hover:border-[#0F6CBD] transition-all group-hover:shadow-none"
                                            >
                                                <span className="material-icons-outlined text-sm">edit</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
