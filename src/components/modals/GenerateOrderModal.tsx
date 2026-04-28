import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatCurrency';

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
    supplier_departure_dates: Record<string, string>;
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

    // Collect all unique supplier IDs from approved items and calculate totals
    const suppliersInfo = useMemo(() => {
        const supplierData = new Map<string, { name: string; total: number }>();
        
        const addValueToSupplier = (id: string, value: number) => {
            if (!id) return;
            const existing = supplierData.get(id);
            if (existing) {
                existing.total += value;
            } else {
                const found = suppliersList.find(s => s.id === id);
                if (found) {
                    supplierData.set(id, { name: found.name, total: value });
                }
            }
        };

        approvedItems.forEach(it => {
            const qty = Number(it.quantity || 0);
            
            // Core product cost
            addValueToSupplier(it.supplier_id, qty * Number(it.priceUnit || 0));
            
            // Services
            addValueToSupplier(it.customization_supplier_id, Number(it.custoPersonalizacao || 0));
            addValueToSupplier(it.layout_supplier_id, Number(it.layoutCost || 0));
            addValueToSupplier(it.transport_supplier_id, Number(it.transpFornecedor || 0));
            addValueToSupplier(it.client_transport_supplier_id, Number(it.transpCliente || 0));
        });

        return Array.from(supplierData.entries()); // [[id, {name, total}], ...]
    }, [approvedItems, suppliersList]);

    const updateSupplierPaymentDate = (supplierId: string, date: string) => {
        setCommercialData({
            ...commercialData,
            supplier_payment_dates: {
                ...commercialData.supplier_payment_dates,
                [supplierId]: date
            }
        });
    };

    const updateSupplierDepartureDate = (supplierId: string, date: string) => {
        setCommercialData({
            ...commercialData,
            supplier_departure_dates: {
                ...commercialData.supplier_departure_dates || {},
                [supplierId]: date
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-md shadow-none w-full max-w-7xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-[#005A9E] flex items-center justify-center text-white shadow-none shadow-none-blue-500/10">
                            <span className="material-icons-outlined text-2xl">assignment_turned_in</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-medium text-slate-800 tracking-tight">Gerar Pedido</h3>
                            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-[0.2em]">Configurações de Faturamento e Logística</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-full transition-all text-slate-400">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                
                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* COLUMN 1: GERAL & RECEBIMENTO */}
                    <div className="space-y-8">
                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">tune</span> Dados de Faturamento
                            </h4>
                            <div className="bg-slate-50/40 border border-slate-100 rounded-md p-6 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-medium text-slate-500 uppercase mb-2 ml-1">Forma de Faturamento <span className="text-red-500">*</span></label>
                                    <select 
                                        className="w-full rounded-md border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none transition-all" 
                                        value={commercialData.payment_term} 
                                        onChange={(e) => setCommercialData({ ...commercialData, payment_term: e.target.value })}
                                    >
                                        <option value="">SELECIONE...</option>
                                        <option value="50% no pedido e 50% no pedido pronto.">50% no pedido e 50% no pedido pronto.</option>
                                        <option value="1 vez no cartão de crédito.">1 vez no cartão de crédito.</option>
                                        <option value="À Vista">À Vista</option>
                                        <option value="Credito à vista">Credito à vista</option>
                                        <option value="Faturado 7 dias">Faturado 7 dias</option>
                                        <option value="Faturado 10 dias">Faturado 10 dias</option>
                                        <option value="Faturado 14 dias">Faturado 14 dias</option>
                                        <option value="Faturado 15 dias">Faturado 15 dias</option>
                                        <option value="Faturado 21 dias">Faturado 21 dias</option>
                                        <option value="Faturado 30 dias">Faturado 30 dias</option>
                                        <option value="Faturado 45 dias">Faturado 45 dias</option>
                                        {commercialData.payment_term && !['', '50% no pedido e 50% no pedido pronto.', '1 vez no cartão de crédito.', 'À Vista', 'Credito à vista', 'Faturado 7 dias', 'Faturado 10 dias', 'Faturado 14 dias', 'Faturado 15 dias', 'Faturado 21 dias', 'Faturado 30 dias', 'Faturado 45 dias'].includes(commercialData.payment_term) && (
                                            <option value={commercialData.payment_term}>{commercialData.payment_term}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-500 uppercase mb-2 ml-1">Nº Nota Fiscal</label>
                                        <input 
                                            className="w-full rounded-md border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none transition-all" 
                                            placeholder="Ex: 1234..." 
                                            value={commercialData.invoice_number} 
                                            onChange={(e) => setCommercialData({ ...commercialData, invoice_number: e.target.value })} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-slate-500 uppercase mb-2 ml-1">Ordem de Compra</label>
                                        <input 
                                            className="w-full rounded-md border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none transition-all" 
                                            placeholder="Ex: OC-001..." 
                                            value={commercialData.purchase_order} 
                                            onChange={(e) => setCommercialData({ ...commercialData, purchase_order: e.target.value })} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">schedule</span> Cronograma Cliente
                            </h4>
                            <div className="bg-blue-50/30 border border-blue-100 rounded-md p-6 space-y-5">
                                <div>
                                    <label className="block text-[10px] font-medium text-blue-600 uppercase mb-2 ml-1">Data Limite Recebimento <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        className="w-full rounded-md border-blue-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all" 
                                        value={commercialData.shipping_deadline} 
                                        onChange={(e) => setCommercialData({ ...commercialData, shipping_deadline: e.target.value })} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-blue-100/50 pt-5">
                                    <div>
                                        <label className="block text-[10px] font-medium text-blue-600/70 uppercase mb-2 ml-1">Prev. Pag. Entrada <span className="text-red-500">*</span></label>
                                        <input type="date" className="w-full rounded-md border-blue-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none outline-none" value={commercialData.entry_forecast_date} onChange={(e) => setCommercialData({ ...commercialData, entry_forecast_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-blue-600/70 uppercase mb-2 ml-1">Prev. Pag. 2ª Parcela</label>
                                        <input type="date" className="w-full rounded-md border-blue-100 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-none outline-none" value={commercialData.remaining_forecast_date} onChange={(e) => setCommercialData({ ...commercialData, remaining_forecast_date: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* COLUMN 2: DATAS DE SAÍDA */}
                    <div className="space-y-6">
                        <section className="h-full flex flex-col space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                    <span className="material-icons-outlined text-sm">local_shipping</span> Saída do Fornecedor
                                </h4>
                                <span className="text-[9px] font-medium text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md">Obrigatório</span>
                            </div>
                            <div className="bg-slate-50/20 border border-slate-100 rounded-md p-5 flex-1 min-h-[400px]">
                                <div className="space-y-3">
                                    {suppliersInfo.length > 0 ? suppliersInfo.map(([suppId, info]) => (
                                        <div key={suppId} className="group bg-white rounded-md p-4 border border-slate-100 shadow-none hover:border-blue-200 transition-all">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <span className="text-[11px] font-medium text-slate-700 uppercase truncate">{info.name}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    {formatCurrency(info.total)}
                                                </span>
                                            </div>
                                            <input
                                                type="date"
                                                className="w-full rounded-md border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                                                value={commercialData.supplier_departure_dates?.[suppId] || ''}
                                                onChange={(e) => updateSupplierDepartureDate(suppId, e.target.value)}
                                            />
                                        </div>
                                    )) : (
                                        <div className="text-center py-10">
                                            <span className="material-icons-outlined text-slate-200 text-4xl mb-2">inventory_2</span>
                                            <p className="text-[10px] text-slate-400 font-medium uppercase">Nenhum fornecedor detectado</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* COLUMN 3: PREVISÃO PARA PAGAR & LAYOUT */}
                    <div className="space-y-8">
                        <section className="flex flex-col space-y-4 overflow-hidden">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">payments</span> Pagamento de Fornecedores
                            </h4>
                            <div className="bg-slate-50/20 border border-slate-100 rounded-md p-5 max-h-[350px] overflow-y-auto custom-scrollbar">
                                <div className="space-y-3">
                                    {suppliersInfo.map(([suppId, info]) => (
                                        <div key={suppId} className="bg-white rounded-md p-4 border border-slate-100 shadow-none hover:border-red-100 transition-all">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                                    <span className="text-[11px] font-medium text-slate-700 uppercase truncate">{info.name}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                    {formatCurrency(info.total)}
                                                </span>
                                            </div>
                                            <input
                                                type="date"
                                                className="w-full rounded-md border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-400 outline-none transition-all"
                                                value={commercialData.supplier_payment_dates[suppId] || ''}
                                                onChange={(e) => updateSupplierPaymentDate(suppId, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h4 className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-widest px-1">
                                <span className="material-icons-outlined text-sm">draw</span> Instruções de Produção
                            </h4>
                            <div className="bg-slate-50/40 border border-slate-100 rounded-md p-5">
                                <textarea 
                                    rows={4} 
                                    className="w-full rounded-md border-slate-200 bg-white p-4 text-xs font-medium text-slate-600 shadow-none focus:ring-4 focus:ring-blue-500/5 focus:border-[#005A9E] outline-none resize-none transition-all" 
                                    placeholder="Ex: Utilizar logomarca centralizada, cor pantone 281C..." 
                                    value={commercialData.layout_info} 
                                    onChange={(e) => setCommercialData({ ...commercialData, layout_info: e.target.value })} 
                                />
                            </div>
                        </section>
                    </div>
                </div>

                <div className="px-10 py-6 bg-slate-50/30 flex justify-between items-center border-t border-slate-100 flex-shrink-0">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">* Campos obrigatórios</p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-md hover:bg-slate-50 font-medium text-[11px] uppercase tracking-widest transition-all">Cancelar</button>
                        <button 
                            onClick={onConfirm} 
                            disabled={loading || !commercialData.payment_term} 
                            className="px-10 py-3 bg-[#005A9E] text-white rounded-md hover:bg-[#004a82] font-medium text-[11px] uppercase tracking-widest transition-all shadow-none shadow-none-blue-500/20 disabled:opacity-50 disabled:shadow-none active:scale-95"
                        >
                            {loading ? 'Processando...' : 'Confirmar e Gerar Pedido'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
