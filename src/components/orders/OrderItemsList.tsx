'use client';

import React from 'react';
import OrderItemCard from './OrderItemCard';

interface OrderItemsListProps {
    items: any[];
    addItem: () => void;
    updateItem: (id: string | number, field: string, value: any) => void;
    removeItem: (id: string | number) => void;
    duplicateItem: (item: any) => void;
    suppliersList: any[];
    productsList: any[];
    factorsList: any[];
    totalRevenue: number;
    totalProfit: number;
}

export default function OrderItemsList({
    items,
    addItem,
    updateItem,
    removeItem,
    duplicateItem,
    suppliersList,
    productsList,
    factorsList,
    totalRevenue,
    totalProfit
}: OrderItemsListProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center">
                        <span className="material-icons-outlined">inventory_2</span>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-[#111827] uppercase tracking-tight">Itens do Pedido ({items.length})</h3>
                        <p className="text-[10px] font-medium text-slate-400">Gerenciamento de produtos e custos reais</p>
                    </div>
                </div>
                
                <button
                    onClick={addItem}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-[#0F6CBD] rounded-md text-[10px] font-medium uppercase tracking-widest border border-[#E3E3E4] hover:bg-[#F0F7FF] hover:border-[#0F6CBD] transition-all"
                >
                    <span className="material-icons-outlined text-sm">add</span>
                    Adicionar Item
                </button>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <OrderItemCard 
                        key={item.id}
                        item={item}
                        index={index}
                        updateItem={updateItem}
                        removeItem={removeItem}
                        duplicateItem={duplicateItem}
                        suppliersList={suppliersList}
                        productsList={productsList}
                        factorsList={factorsList}
                    />
                ))}
            </div>

            {/* Total Summary Footer for Items */}
            <div className="bg-white rounded-md border border-[#E3E3E4] p-8 flex flex-wrap justify-between items-center gap-6">
                <div className="flex gap-8">
                    <div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Faturamento Total</p>
                        <p className="text-lg font-medium text-[#111827]">{totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">Lucro Bruto Estimado</p>
                        <p className={`text-lg font-medium ${totalProfit >= 0 ? 'text-[#16A34A]' : 'text-rose-600'}`}>
                            {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
