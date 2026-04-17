/**
 * useOrderFinancials
 * Single source of truth for all order cost and payment calculations.
 * Replaces duplicated logic across FinancialDashboardPage, OrdersReceivablesPage, PayablesPage.
 */

// ---- Shared types ----

export interface OrderItemCosts {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    customization_cost: number;
    supplier_transport_cost: number;
    client_transport_cost: number;
    extra_expense: number;
    layout_cost: number;
    calculation_factor: number;
    total_item_value: number;
    bv_pct: number;
    // Real costs (filled after delivery)
    real_unit_price: number;
    real_customization_cost: number;
    real_supplier_transport_cost: number;
    real_client_transport_cost: number;
    real_extra_expense: number;
    real_layout_cost: number;
    // Payment status per cost type
    unit_price_paid: boolean;
    customization_paid: boolean;
    supplier_transport_paid: boolean;
    client_transport_paid: boolean;
    extra_expense_paid: boolean;
    layout_paid: boolean;
}

export interface OrderPaymentInfo {
    total_amount: number;
    entry_amount: number;
    entry_confirmed: boolean;
    remaining_amount: number;
    remaining_confirmed: boolean;
    status: string;
}

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';

// ---- Estimated cost (from order items fields) ----

export const getEstimatedCost = (items: OrderItemCosts[]): number =>
    items.reduce((acc, item) => {
        const productCost = item.quantity * (item.unit_price || 0);
        return acc
            + productCost
            + (item.customization_cost || 0)
            + (item.supplier_transport_cost || 0)
            + (item.client_transport_cost || 0)
            + (item.extra_expense || 0)
            + (item.layout_cost || 0);
    }, 0);

// ---- Real cost: uses real_* fields if filled, falls back to estimated ----

export const getRealCost = (items: OrderItemCosts[]): number =>
    items.reduce((acc, item) => {
        const productCost = item.quantity * (item.real_unit_price || item.unit_price || 0);
        return acc
            + productCost
            + (item.real_customization_cost ?? item.customization_cost ?? 0)
            + (item.real_supplier_transport_cost ?? item.supplier_transport_cost ?? 0)
            + (item.real_client_transport_cost ?? item.client_transport_cost ?? 0)
            + (item.real_extra_expense ?? item.extra_expense ?? 0)
            + (item.real_layout_cost ?? item.layout_cost ?? 0);
    }, 0);

// ---- Sale value (prefers total_amount, falls back to sum of item values) ----

export const getSaleValue = (order: OrderPaymentInfo, items: OrderItemCosts[]): number =>
    order.total_amount || items.reduce((acc, item) => acc + (item.total_item_value || 0), 0);

// ---- Amount received from client ----

export const getReceivedAmount = (order: OrderPaymentInfo): number => {
    let received = 0;
    if (order.entry_confirmed) received += order.entry_amount || 0;
    if (order.remaining_confirmed) received += order.remaining_amount || 0;
    return received;
};

// ---- Amount still pending from client ----

export const getPendingAmount = (order: OrderPaymentInfo, items: OrderItemCosts[]): number =>
    getSaleValue(order, items) - getReceivedAmount(order);

// ---- Net balance: received minus real costs ----

export const getOrderBalance = (order: OrderPaymentInfo, items: OrderItemCosts[]): number =>
    getReceivedAmount(order) - getRealCost(items);

// ---- Gross margin percentage based on real costs ----

export const getMargin = (order: OrderPaymentInfo, items: OrderItemCosts[]): number => {
    const sale = getSaleValue(order, items);
    const cost = getRealCost(items);
    return sale > 0 ? ((sale - cost) / sale) * 100 : 0;
};

// ---- Receivable payment status ----

export const getPaymentStatus = (order: OrderPaymentInfo): PaymentStatus => {
    if (order.entry_confirmed && order.remaining_confirmed) return 'PAID';
    if (order.entry_confirmed || order.remaining_confirmed) return 'PARTIAL';
    return 'PENDING';
};

// ---- BV (bonus) cost for a set of items ----

export const getBVCost = (items: OrderItemCosts[]): number =>
    items.reduce((acc, item) => {
        const saleValue = item.total_item_value || 0;
        return acc + saleValue * ((item.bv_pct || 0) / 100);
    }, 0);

// ---- Cost paid progress (n of m costs paid) ----

export interface CostPaidSummary {
    total: number;
    paid: number;
}

export const getCostPaidSummary = (items: OrderItemCosts[]): CostPaidSummary => {
    let total = 0;
    let paid = 0;
    items.forEach(item => {
        const costChecks = [
            { val: item.unit_price, isPaid: item.unit_price_paid },
            { val: item.customization_cost, isPaid: item.customization_paid },
            { val: item.supplier_transport_cost, isPaid: item.supplier_transport_paid },
            { val: item.client_transport_cost, isPaid: item.client_transport_paid },
            { val: item.extra_expense, isPaid: item.extra_expense_paid },
            { val: item.layout_cost, isPaid: item.layout_paid },
        ];
        costChecks.forEach(c => {
            if ((c.val || 0) > 0) {
                total++;
                if (c.isPaid) paid++;
            }
        });
    });
    return { total, paid };
};

// ---- Cash flow forecast: sum of unpaid receivables due within N days ----

export interface ReceivableEntry {
    amount: number;
    dueDate: string;
    isPaid: boolean;
    issuer?: string;
}

export const getCashFlowForecast = (
    receivables: ReceivableEntry[],
    days: number,
    issuerFilter = 'TODOS'
): number => {
    const today = new Date();
    const target = new Date();
    target.setDate(today.getDate() + days);
    const todayStr = today.toISOString().split('T')[0];
    const targetStr = target.toISOString().split('T')[0];

    return receivables
        .filter(r =>
            !r.isPaid &&
            r.dueDate >= todayStr &&
            r.dueDate <= targetStr &&
            (issuerFilter === 'TODOS' || r.issuer === issuerFilter)
        )
        .reduce((acc, r) => acc + r.amount, 0);
};
