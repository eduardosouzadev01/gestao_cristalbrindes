
import { useState } from 'react';
import { calculateItemTotal, calculateItemRealTotal } from '../utils/formulas';

export const useOrderItems = (initialItems: any[] = []) => {
    const [items, setItems] = useState<any[]>(initialItems.length > 0 ? initialItems : [{
        id: Date.now(),
        productName: '',
        supplier_id: '',
        quantity: 1,
        priceUnit: 0,
        custoPersonalizacao: 0,
        transpFornecedor: 0,
        transpCliente: 0,
        despesaExtra: 0,
        layoutCost: 0,
        fator: 1.35,
        bvPct: 0,
        taxPct: 0,
        unforeseenPct: 0,
        marginPct: 0,
        realPriceUnit: 0,
        realCustoPersonalizacao: 0,
        realTranspFornecedor: 0,
        realTranspCliente: 0,
        realDespesaExtra: 0,
        realLayoutCost: 0,
        priceUnitPaid: false,
        custoPersonalizacaoPaid: false,
        transpFornecedorPaid: false,
        transpClientePaid: false,
        despesaExtraPaid: false,
        layoutCostPaid: false,
        isApproved: false
    }]);

    const addItem = () => {
        setItems(prev => [...prev, {
            id: Date.now(),
            productName: '',
            supplier_id: '',
            quantity: 1,
            priceUnit: 0,
            custoPersonalizacao: 0,
            transpFornecedor: 0,
            transpCliente: 0,
            despesaExtra: 0,
            layoutCost: 0,
            fator: 1.35,
            bvPct: 0,
            taxPct: 0,
            unforeseenPct: 0,
            marginPct: 0,
            realPriceUnit: 0,
            realCustoPersonalizacao: 0,
            realTranspFornecedor: 0,
            realTranspCliente: 0,
            realDespesaExtra: 0,
            realLayoutCost: 0,
            priceUnitPaid: false,
            custoPersonalizacaoPaid: false,
            transpFornecedorPaid: false,
            transpClientePaid: false,
            despesaExtraPaid: false,
            layoutCostPaid: false,
            isApproved: false
        }]);
    };

    const updateItem = (id: string | number, field: string, value: any) => {
        setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id: string | number) => {
        setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev);
    };

    const duplicateItem = (item: any) => {
        setItems(prev => [...prev, { ...item, id: Date.now(), isApproved: false }]);
    };

    const totalRevenue = items.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    const totalCostsReal = items.reduce((acc, item) => acc + calculateItemRealTotal(item), 0);

    return {
        items,
        setItems,
        addItem,
        updateItem,
        removeItem,
        duplicateItem,
        totalRevenue,
        totalCostsReal
    };
};
