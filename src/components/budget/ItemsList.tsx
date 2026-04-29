'use client';

import React from 'react';
import {
    DndContext, 
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import BudgetItemCard from './BudgetItemCard';

interface ItemsListProps {
    items: any[];
    suppliersList: any[];
    productsList: any[];
    factors: any[];
    onUpdateItem: (id: string | number, field: string, value: any) => void;
    onRemoveItem: (id: string | number) => void;
    onDuplicateItem: (item: any) => void;
    onAddItem: () => void;
    onSearchProducts?: (term: string) => void;
    onReorderItems: (items: any[]) => void;
    isLocked?: boolean;
    invalidItemIds?: (string | number)[];
    onAddSupplier?: () => void;
}

export default function ItemsList({
    items,
    suppliersList,
    productsList,
    factors,
    onUpdateItem,
    onRemoveItem,
    onDuplicateItem,
    onAddItem,
    onSearchProducts,
    onReorderItems,
    isLocked = false,
    invalidItemIds = [],
    onAddSupplier
}: ItemsListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            onReorderItems(arrayMove(items, oldIndex, newIndex));
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2 text-slate-900">
                    <span className="material-icons-outlined text-emerald-600">format_list_bulleted</span>
                    <h2 className="text-sm font-medium uppercase tracking-widest">Itens da Proposta</h2>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                        {items.length} {items.length === 1 ? 'Item' : 'Itens'}
                    </span>
                </div>
                
                {!isLocked && (
                    <button 
                        onClick={onAddItem}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-emerald-600 text-white text-[10px] font-medium uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95"
                    >
                        <span className="material-icons-outlined text-lg">add_box</span>
                        Novo Item
                    </button>
                )}
            </div>

            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <div className="space-y-4">
                    <SortableContext 
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {items.map((item, index) => (
                            <BudgetItemCard 
                                key={item.id}
                                index={index}
                                item={item}
                                suppliersList={suppliersList}
                                productsList={productsList}
                                factors={factors}
                                onUpdate={(field, value) => onUpdateItem(item.id, field, value)}
                                onRemove={() => onRemoveItem(item.id)}
                                onDuplicate={() => onDuplicateItem(item)}
                                onSearch={onSearchProducts}
                                isLocked={isLocked}
                                isInvalid={invalidItemIds.includes(item.id)}
                            />
                        ))}
                    </SortableContext>
                </div>
            </DndContext>

            {items.length > 0 && !isLocked && (
                <button 
                    onClick={onAddItem}
                    className="w-full py-8 border-2 border-dashed border-[#E3E3E4] rounded-md text-[#707070] hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50/10 transition-all flex flex-col items-center justify-center gap-2 group"
                >
                    <span className="material-icons-outlined text-3xl group-hover:scale-110 transition-transform">add_circle_outline</span>
                    <span className="text-[10px] font-medium uppercase tracking-widest">Adicionar outro item ao orçamento</span>
                </button>
            )}
        </div>
    );
}
