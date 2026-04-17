import { useState, useCallback, useEffect, useRef } from 'react';
import { calculateItemTotal, calculateItemRealTotal } from '../utils/formulas';

export const useOrderItems = (initialItems: any[] = [], referenceNumber?: string) => {
    const initial = initialItems.length > 0 ? initialItems : [{
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
        fator: 1.29,
        mockMargin: 15,
        mockNF: 14,
        mockPayment: 0,
        bvPct: 0,
        extraPct: 0,
        factorId: '',
        taxPct: 0,
        unforeseenPct: 0,
        marginPct: 0,
        supplier_transport_supplier_id: '',
        client_transport_supplier_id: '',
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
        isApproved: false,
        supplier_payment_date: null,
        customization_payment_date: null,
        transport_payment_date: null,
        layout_payment_date: null,
        extra_payment_date: null,
        variations: [],
        productImage: '',
        productCode: ''
    }];

    const [items, _setItems] = useState<any[]>(initial);
    const [history, setHistory] = useState<any[][]>([initial]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const isUndoing = useRef(false);

    // Save to history when items change, with a small debounce to avoid flooding
    const saveToHistory = useCallback((newItems: any[]) => {
        if (isUndoing.current) {
            isUndoing.current = false;
            return;
        }

        setHistory(prev => {
            const currentHistory = prev.slice(0, historyIndex + 1);
            const updated = [...currentHistory, newItems ? JSON.parse(JSON.stringify(newItems)) : []];
            if (updated.length > 50) updated.shift();
            return updated;
        });
        setHistoryIndex(prev => {
            const next = prev + 1;
            return next > 49 ? 49 : next;
        });
    }, [historyIndex]);

    const setItems = useCallback((newItems: any[] | ((prev: any[]) => any[])) => {
        _setItems(prev => {
            const nextItems = typeof newItems === 'function' ? newItems(prev) : newItems;
            saveToHistory(nextItems);
            return nextItems;
        });
    }, [saveToHistory]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoing.current = true;
            const prevIndex = historyIndex - 1;
            const prevState = history[prevIndex];
            setHistoryIndex(prevIndex);
            if (prevState) {
                _setItems(JSON.parse(JSON.stringify(prevState)));
            }
        }
    }, [historyIndex, history]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoing.current = true;
            const nextIndex = historyIndex + 1;
            const nextState = history[nextIndex];
            setHistoryIndex(nextIndex);
            if (nextState) {
                _setItems(JSON.parse(JSON.stringify(nextState)));
            }
        }
    }, [historyIndex, history]);

    const commitHistory = useCallback(() => {
        setHistory(prev => {
            const currentState = prev[historyIndex];
            return currentState ? [JSON.parse(JSON.stringify(currentState))] : prev;
        });
        setHistoryIndex(0);
    }, [historyIndex]);

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Do not override if the active element is an input, textarea, or select
            const activeTag = document.activeElement?.tagName.toLowerCase();
            const isInputFocus = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable;
            
            if (isInputFocus) return;

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const isModern = !referenceNumber || referenceNumber === 'AUTO' || (!isNaN(parseInt(referenceNumber)) && parseInt(referenceNumber) >= 3526);
    const itemsWithContext = items.map(it => ({ ...it, useModernRounding: isModern }));

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
            fator: 1.29,
            mockMargin: 15,
            mockNF: 14,
            mockPayment: 0,
            bvPct: 0,
            extraPct: 0,
            factorId: '',
            taxPct: 0,
            unforeseenPct: 0,
            marginPct: 0,
            supplier_transport_supplier_id: '',
            client_transport_supplier_id: '',
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
            isApproved: false,
            supplier_payment_date: null,
            customization_payment_date: null,
            transport_payment_date: null,
            layout_payment_date: null,
            extra_payment_date: null,
            variations: [],
            productImage: '',
            productCode: ''
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

    const totalRevenue = itemsWithContext.reduce((acc, item) => acc + calculateItemTotal(item), 0);
    const totalCostsReal = itemsWithContext.reduce((acc, item) => acc + calculateItemRealTotal(item), 0);

    return {
        items: itemsWithContext,
        setItems,
        addItem,
        updateItem,
        removeItem,
        duplicateItem,
        undo,
        redo,
        commitHistory,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        totalRevenue,
        totalCostsReal
    };
};
