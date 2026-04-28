import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../src/utils/dateUtils';
import { formatCurrency, parseCurrencyToNumber } from '../src/utils/formatCurrency';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth';
import {
    getSaleValue, getRealCost, getMargin, getPendingAmount
} from '../src/hooks/useOrderFinancials';

// --- Types ---
interface OrderItem {
    id: string;
    product_name: string;
    product_color: string;
    quantity: number;
    unit_price: number;
    customization_cost: number;
    supplier_transport_cost: number;
    client_transport_cost: number;
    extra_expense: number;
    layout_cost: number;
    total_item_value: number;
    bv_pct: number;
    calculation_factor: number;
    
    // Real Costs
    real_unit_price: number;
    real_customization_cost: number;
    real_supplier_transport_cost: number;
    real_client_transport_cost: number;
    real_extra_expense: number;
    real_layout_cost: number;
    
    // Payment status flags
    unit_price_paid: boolean;
    customization_paid: boolean;
    supplier_transport_paid: boolean;
    client_transport_paid: boolean;
    extra_expense_paid: boolean;
    layout_paid: boolean;

    // Payment Dates
    supplier_payment_date: string | null;
    customization_payment_date: string | null;
    transport_payment_date: string | null;
    layout_payment_date: string | null;
    extra_payment_date: string | null;
}

interface Order {
    id: string;
    order_number: string;
    salesperson: string;
    status: string;
    client_id: string;
    partners: { name: string } | null;
    issuer: string;
    order_date: string;
    payment_due_date: string;
    invoice_number: string;
    entry_forecast_date: string;
    remaining_forecast_date: string;
    order_items: OrderItem[];
}

interface FlattenedItem extends OrderItem {
    order_id: string;
    order_number: string;
    client_name: string;
    salesperson: string;
    order_date: string;
    delivery_date: string;
    invoice_number: string;
    issuer: string;
    order_status: string;
    // Calculated
    gross_profit: number;
    margin_percent: number;
}

const FinancialControlPage: React.FC = () => {
    const navigate = useNavigate();
    const { appUser } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    partners(name),
                    order_items(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error: any) {
            toast.error('Erro ao carregar dados: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const flattenedData = useMemo(() => {
        const flat: FlattenedItem[] = [];
        orders.forEach(order => {
                order.order_items.forEach(item => {
                    // Calculation logic matching system rules
                    const itemSaleTotal = item.total_item_value || (item.quantity * item.unit_price);
                    
                    // Real Cost calculation
                    const realCost = (item.quantity * (item.real_unit_price || item.unit_price || 0))
                        + (item.real_customization_cost ?? item.customization_cost ?? 0)
                        + (item.real_supplier_transport_cost ?? item.supplier_transport_cost ?? 0)
                        + (item.real_client_transport_cost ?? item.client_transport_cost ?? 0)
                        + (item.real_extra_expense ?? item.extra_expense ?? 0)
                        + (item.real_layout_cost ?? item.layout_cost ?? 0);

                    const profit = itemSaleTotal - realCost;
                    const margin = itemSaleTotal > 0 ? (profit / itemSaleTotal) * 100 : 0;
                    
                    // Order level balance 
                    const orderPending = getPendingAmount(order as any, order.order_items as any);

                    flat.push({
                        ...item,
                        order_id: order.id,
                        order_number: order.order_number,
                        client_name: order.partners?.name || 'N/A',
                        salesperson: order.salesperson,
                        order_date: order.order_date,
                        delivery_date: order.payment_due_date,
                        invoice_number: order.invoice_number,
                        issuer: order.issuer,
                        order_status: order.status,
                        gross_profit: profit,
                        margin_percent: margin,
                        pending_order_amount: orderPending
                    });
                });
        });
        return flat;
    }, [orders]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return flattenedData;
        const s = searchTerm.toLowerCase();
        return flattenedData.filter(item => 
            item.order_number.toLowerCase().includes(s) ||
            item.client_name.toLowerCase().includes(s) ||
            item.product_name.toLowerCase().includes(s) ||
            item.salesperson.toLowerCase().includes(s)
        );
    }, [flattenedData, searchTerm]);

    const logChange = async (orderId: string, field: string, oldVal: any, newVal: any, desc: string) => {
        try {
            await supabase.from('order_change_logs').insert({
                order_id: orderId,
                user_email: appUser?.email || 'Sistema',
                field_name: field,
                old_value: String(oldVal),
                new_value: String(newVal),
                description: desc
            });
        } catch (err) {
            console.error('Erro ao logar alteração:', err);
        }
    };

    const handleUpdateOrder = async (orderId: string, field: string, value: any, oldVal: any) => {
        if (value === oldVal) return;
        try {
            const { error } = await supabase.from('orders').update({ [field]: value }).eq('id', orderId);
            if (error) throw error;
            toast.success('Pedido atualizado');
            logChange(orderId, field, oldVal, value, `Alteração direta na planilha de controle`);
            fetchOrders();
        } catch (error: any) {
            toast.error('Erro ao atualizar pedido: ' + error.message);
        }
    };

    const handleUpdateItem = async (itemId: string, orderId: string, field: string, value: any, oldVal: any) => {
        if (value === oldVal) return;
        try {
            const { error } = await supabase.from('order_items').update({ [field]: value }).eq('id', itemId);
            if (error) throw error;
            toast.success('Item atualizado');
            logChange(orderId, `item.${field}`, oldVal, value, `Alteração de item na planilha de controle`);
            fetchOrders();
        } catch (error: any) {
            toast.error('Erro ao atualizar item: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-medium text-gray-900">Planilha de Controle</h1>
                    <p className="text-gray-500 mt-1">Gestão detalhada de vendas, custos e lucratividade por item.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar pedido, cliente, produto..."
                            className="pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => fetchOrders()}
                        className="p-2 hover:bg-gray-100 rounded-md transition-colors text-gray-600"
                        title="Atualizar"
                    >
                        <span className="material-icons-outlined">refresh</span>
                    </button>
                    <button 
                        onClick={() => navigate('/pedidos')}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50 transition-colors"
                    >
                        <span className="material-icons-outlined text-sm">list_alt</span>
                        Lista de Pedidos
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200 shadow-none overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)]">
                    <table className="w-full text-left border-collapse min-w-[2800px]">
                        <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                            <tr>
                                {/* Order Info */}
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 border-r border-gray-200">Pedido</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider sticky left-[100px] bg-gray-50 border-r border-gray-200">Cliente</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Entrega</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Emitente</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">NF</th>

                                {/* Item Info */}
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Produto</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Venda Unit.</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider">Total Venda</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Saldo Cliente</th>

                                {/* Costs Info */}
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center bg-red-50/50">Custo Prod (R$)</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center bg-red-50/50">Custo Pers (R$)</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center bg-red-50/50">Frete Forn (R$)</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center bg-red-50/50">Frete Cli (R$)</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center bg-red-50/50">Extra (R$)</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center bg-red-50/50 border-r border-gray-200">Layout (R$)</th>

                                {/* Payment Dates & Paid Status */}
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center">Pg Fornec</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center">Data Forn</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center">Pg Pers</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center">Data Pers</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center">Pg Frete</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-center border-r border-gray-200">Data Frete</th>

                                {/* Financial Result */}
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider bg-green-50/50">Lucro Bruto</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider bg-green-50/50">Margem (%)</th>
                                <th className="px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wider text-right">Status do Pedido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((item, idx) => (
                                <tr key={`${item.order_id}-${item.id}-${idx}`} className="hover:bg-gray-50/80 transition-colors text-[12px] group">
                                    {/* Order Info */}
                                    <td className="px-4 py-2.5 font-medium text-blue-600 sticky left-0 bg-white border-r border-gray-100 group-hover:bg-gray-50">#{item.order_number}</td>
                                    <td className="px-4 py-2.5 font-medium text-gray-900 sticky left-[100px] bg-white border-r border-gray-100 truncate max-w-[150px] group-hover:bg-gray-50">{item.client_name}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{item.salesperson}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{formatDate(item.order_date)}</td>
                                    <td className="px-4 py-2.5 text-gray-600 font-medium">{formatDate(item.delivery_date)}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{item.issuer}</td>
                                    <td className="px-4 py-2.5 text-gray-600 border-r border-gray-100 bg-gray-50/30">
                                        <input 
                                            type="text" 
                                            defaultValue={item.invoice_number || ''}
                                            onBlur={(e) => handleUpdateOrder(item.order_id, 'invoice_number', e.target.value, item.invoice_number)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-20 text-[12px] focus:bg-white focus:outline-blue-500"
                                        />
                                    </td>

                                    {/* Item Info */}
                                    <td className="px-4 py-2.5 text-gray-900 font-medium truncate max-w-[200px]" title={item.product_name}>
                                        {item.product_name}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-600">{item.quantity}</td>
                                    <td className="px-4 py-2.5 text-gray-600">{formatCurrency(item.unit_price)}</td>
                                    <td className="px-4 py-2.5 font-medium text-gray-900">{formatCurrency(item.total_item_value || (item.quantity * item.unit_price))}</td>
                                    <td className="px-4 py-2.5 font-medium text-red-600 border-r border-gray-100">
                                        {(item as any).pending_order_amount > 0 ? formatCurrency((item as any).pending_order_amount) : '-'}
                                    </td>

                                    {/* Costs (Editable) */}
                                    <td className="px-4 py-2.5 text-center bg-red-50/5">
                                        <input 
                                            type="text"
                                            defaultValue={formatCurrency(item.real_unit_price || item.unit_price)}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'real_unit_price', parseCurrencyToNumber(e.target.value), item.real_unit_price || item.unit_price)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-24 text-[12px] text-center focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center bg-red-50/5">
                                        <input 
                                            type="text"
                                            defaultValue={formatCurrency(item.real_customization_cost ?? item.customization_cost ?? 0)}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'real_customization_cost', parseCurrencyToNumber(e.target.value), item.real_customization_cost ?? item.customization_cost ?? 0)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-24 text-[12px] text-center focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center bg-red-50/5">
                                        <input 
                                            type="text"
                                            defaultValue={formatCurrency(item.real_supplier_transport_cost ?? item.supplier_transport_cost ?? 0)}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'real_supplier_transport_cost', parseCurrencyToNumber(e.target.value), item.real_supplier_transport_cost ?? item.supplier_transport_cost ?? 0)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-24 text-[12px] text-center focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center bg-red-50/5">
                                        <input 
                                            type="text"
                                            defaultValue={formatCurrency(item.real_client_transport_cost ?? item.client_transport_cost ?? 0)}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'real_client_transport_cost', parseCurrencyToNumber(e.target.value), item.real_client_transport_cost ?? item.client_transport_cost ?? 0)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-24 text-[12px] text-center focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center bg-red-50/5">
                                        <input 
                                            type="text"
                                            defaultValue={formatCurrency(item.real_extra_expense ?? item.extra_expense ?? 0)}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'real_extra_expense', parseCurrencyToNumber(e.target.value), item.real_extra_expense ?? item.extra_expense ?? 0)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-24 text-[12px] text-center focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center bg-red-50/5 border-r border-gray-100">
                                        <input 
                                            type="text"
                                            defaultValue={formatCurrency(item.real_layout_cost ?? item.layout_cost ?? 0)}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'real_layout_cost', parseCurrencyToNumber(e.target.value), item.real_layout_cost ?? item.layout_cost ?? 0)}
                                            className="bg-transparent border-none p-0 focus:ring-0 w-24 text-[12px] text-center focus:bg-white"
                                        />
                                    </td>

                                    {/* Financial Status & Dates */}
                                    <td className="px-4 py-2.5 text-center">
                                        <button 
                                            onClick={() => handleUpdateItem(item.id, item.order_id, 'unit_price_paid', !item.unit_price_paid, item.unit_price_paid)}
                                            className={`p-1 rounded-md transition-colors ${item.unit_price_paid ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                                        >
                                            <span className="material-icons-outlined text-sm">{item.unit_price_paid ? 'check_circle' : 'circle'}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <input 
                                            type="date" 
                                            defaultValue={item.supplier_payment_date || ''}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'supplier_payment_date', e.target.value || null, item.supplier_payment_date)}
                                            className="bg-transparent border-none p-0 focus:ring-0 text-[11px] focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <button 
                                            onClick={() => handleUpdateItem(item.id, item.order_id, 'customization_paid', !item.customization_paid, item.customization_paid)}
                                            className={`p-1 rounded-md transition-colors ${item.customization_paid ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                                        >
                                            <span className="material-icons-outlined text-sm">{item.customization_paid ? 'check_circle' : 'circle'}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <input 
                                            type="date" 
                                            defaultValue={item.customization_payment_date || ''}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'customization_payment_date', e.target.value || null, item.customization_payment_date)}
                                            className="bg-transparent border-none p-0 focus:ring-0 text-[11px] focus:bg-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <button 
                                            onClick={() => handleUpdateItem(item.id, item.order_id, 'supplier_transport_paid', !item.supplier_transport_paid, item.supplier_transport_paid)}
                                            className={`p-1 rounded-md transition-colors ${item.supplier_transport_paid ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
                                        >
                                            <span className="material-icons-outlined text-sm">{item.supplier_transport_paid ? 'check_circle' : 'circle'}</span>
                                        </button>
                                    </td>
                                    <td className="px-4 py-2.5 text-center border-r border-gray-100">
                                        <input 
                                            type="date" 
                                            defaultValue={item.transport_payment_date || ''}
                                            onBlur={(e) => handleUpdateItem(item.id, item.order_id, 'transport_payment_date', e.target.value || null, item.transport_payment_date)}
                                            className="bg-transparent border-none p-0 focus:ring-0 text-[11px] focus:bg-white"
                                        />
                                    </td>

                                    {/* Result */}
                                    <td className={`px-4 py-2.5 font-medium bg-green-50/5 ${item.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                        {formatCurrency(item.gross_profit)}
                                    </td>
                                    <td className={`px-4 py-2.5 font-medium bg-green-50/5 ${item.margin_percent >= 25 ? 'text-green-700' : item.margin_percent >= 15 ? 'text-yellow-700' : 'text-red-700'}`}>
                                        {item.margin_percent.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                                            item.order_status === 'FINALIZADO' ? 'bg-green-100 text-green-700' :
                                            item.order_status === 'CANCELADO' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {item.order_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialControlPage;
