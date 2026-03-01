import React, { useMemo } from 'react';

interface CommercialData {
    payment_term: string;
    supplier_deadline: string;
    shipping_deadline: string;
    invoice_number: string;
    purchase_order: string;
    layout_info: string;
    entry_forecast_date: string;
    remaining_forecast_date: string;
    supplier_payment_dates: Record<string, string>;
}

interface GenerateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    commercialData: CommercialData;
    setCommercialData: (data: CommercialData) => void;
    onConfirm: () => void;
    loading: boolean;
    approvedItems?: any[];
    suppliersList?: any[];
}

export const GenerateOrderModal: React.FC<GenerateOrderModalProps> = ({
    isOpen,
    onClose,
    commercialData,
    setCommercialData,
    onConfirm,
    loading,
    approvedItems = [],
    suppliersList = []
}) => {
    if (!isOpen) return null;

    // Collect all unique supplier IDs from approved items
    const uniqueSuppliers = useMemo(() => {
        const supplierMap = new Map<string, string>();
        approvedItems.forEach(it => {
            const addSupplier = (id: string) => {
                if (id && !supplierMap.has(id)) {
                    const found = suppliersList.find(s => s.id === id);
                    if (found) supplierMap.set(id, found.name);
                }
            };
            addSupplier(it.supplier_id);
            addSupplier(it.customization_supplier_id);
            addSupplier(it.transport_supplier_id);
            addSupplier(it.layout_supplier_id);
            addSupplier(it.extra_supplier_id);
        });
        return Array.from(supplierMap.entries()); // [[id, name], ...]
    }, [approvedItems, suppliersList]);

    const updateSupplierDate = (supplierId: string, date: string) => {
        setCommercialData({
            ...commercialData,
            supplier_payment_dates: {
                ...commercialData.supplier_payment_dates,
                [supplierId]: date
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500">storefront</span> Gerar Pedido
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Faturamento */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">Faturamento <span className="text-red-500">*</span></label>
                        <select className="form-select block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={commercialData.payment_term} onChange={(e) => setCommercialData({ ...commercialData, payment_term: e.target.value })}>
                            <option value="">SELECIONE...</option>
                            <option value="50% + 50%">50% + 50%</option>
                            <option value="À Vista">À Vista</option>
                            <option value="Credito à vista">Credito à vista</option>
                            <option value="Faturado 7 dias">Faturado 7 dias</option>
                            <option value="Faturado 14 dias">Faturado 14 dias</option>
                            <option value="Faturado 15 dias">Faturado 15 dias</option>
                            <option value="Faturado 21 dias">Faturado 21 dias</option>
                            <option value="Faturado 30 dias">Faturado 30 dias</option>
                            <option value="Faturado 45 dias">Faturado 45 dias</option>
                        </select>
                    </div>

                    {/* Datas de Saída */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">Data Saída do Fornecedor <span className="text-red-500">*</span></label>
                            <input type="date" className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={commercialData.supplier_deadline} onChange={(e) => setCommercialData({ ...commercialData, supplier_deadline: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">Data Limite Recebimento <span className="text-red-500">*</span></label>
                            <input type="date" className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={commercialData.shipping_deadline} onChange={(e) => setCommercialData({ ...commercialData, shipping_deadline: e.target.value })} />
                        </div>
                    </div>

                    {/* PREVISÃO DE PAGAMENTOS - A RECEBER */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <p className="text-[10px] font-bold text-green-700 uppercase mb-3 flex items-center gap-1">
                            <span className="material-icons-outlined text-sm">trending_up</span> Previsão de Recebimento (do Cliente)
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-green-600 uppercase mb-1">Prev. Pagamento Entrada <span className="text-red-500">*</span></label>
                                <input type="date" className="form-input block w-full rounded-lg border-green-300 text-sm focus:border-green-500 focus:ring-green-500 bg-white" value={commercialData.entry_forecast_date} onChange={(e) => setCommercialData({ ...commercialData, entry_forecast_date: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-green-600 uppercase mb-1">Prev. Pagamento 2ª Parcela</label>
                                <input type="date" className="form-input block w-full rounded-lg border-green-300 text-sm focus:border-green-500 focus:ring-green-500 bg-white" value={commercialData.remaining_forecast_date} onChange={(e) => setCommercialData({ ...commercialData, remaining_forecast_date: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* PREVISÃO DE PAGAMENTOS - FORNECEDORES */}
                    {uniqueSuppliers.length > 0 && (
                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <p className="text-[10px] font-bold text-red-700 uppercase mb-3 flex items-center gap-1">
                                <span className="material-icons-outlined text-sm">trending_down</span> Previsão para Pagar (Fornecedores)
                            </p>
                            <div className="space-y-3">
                                {uniqueSuppliers.map(([suppId, suppName]) => (
                                    <div key={suppId} className="flex items-center gap-3">
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-bold text-gray-700 truncate block">{suppName}</span>
                                        </div>
                                        <div className="w-48">
                                            <input
                                                type="date"
                                                className="form-input block w-full rounded-lg border-red-300 text-sm focus:border-red-500 focus:ring-red-500 bg-white"
                                                value={commercialData.supplier_payment_dates[suppId] || ''}
                                                onChange={(e) => updateSupplierDate(suppId, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NF e OC */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nº NF</label>
                            <input className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" placeholder="000.000.000" value={commercialData.invoice_number} onChange={(e) => setCommercialData({ ...commercialData, invoice_number: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Ordem de Compra</label>
                            <input className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Nº da Ordem" value={commercialData.purchase_order} onChange={(e) => setCommercialData({ ...commercialData, purchase_order: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Layout</label>
                        <textarea rows={2} className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Informações de Layout" value={commercialData.layout_info} onChange={(e) => setCommercialData({ ...commercialData, layout_info: e.target.value })} />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t border-gray-100 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer">Cancelar</button>
                    <button onClick={onConfirm} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer">
                        {loading ? 'Gerando...' : 'Confirmar e Gerar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
