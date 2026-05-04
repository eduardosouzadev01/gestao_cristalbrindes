'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderLogic } from '@/hooks/useOrderLogic';
import { formatCurrency } from '@/utils/formatCurrency';
import { fixClientName } from '@/utils/textUtils';
import OrderHeader from '@/components/orders/OrderHeader';
import OrderClientInfo from '@/components/orders/OrderClientInfo';
import OrderItemsList from '@/components/orders/OrderItemsList';
import OrderFinanceInfo from '@/components/orders/OrderFinanceInfo';
import OrderLogs from '@/components/orders/OrderLogs';
import { OrderChecklist } from '@/components/crm/OrderChecklist';
import ExtratoConsolidado from '@/components/orders/ExtratoConsolidado';

export default function OrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const logic = useOrderLogic(id as string);

    if (logic.isSaving && !id) {
         return (
            <div className="flex items-center justify-center min-h-screen bg-[#F5F5F8]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Processando Pedido...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F8] pb-20">
            {/* Fixed Header with Top Actions */}
            <OrderHeader 
                orderNumber={logic.orderNumber}
                status={logic.status}
                isSaving={logic.isSaving}
                onSave={() => logic.handleSave()}
                onStatusUpdate={logic.handleAtomicStatusUpdate}
                onBack={() => router.push('/pedidos')}
            />

            <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Top Section: Client & General Info */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                        <OrderClientInfo 
                            clientData={logic.clientData}
                            setClientData={logic.setClientData}
                            vendedor={logic.vendedor}
                            setVendedor={logic.setVendedor}
                            dataPedido={logic.dataPedido}
                            setDataPedido={logic.setDataPedido}
                            dataOrcamento={logic.dataOrcamento}
                            setDataOrcamento={logic.setDataOrcamento}
                            emitente={logic.emitente}
                            setEmitente={logic.setEmitente}
                            clientsList={logic.clientsList}
                            isSeller={logic.isSeller}
                            supplierDepartureDate={logic.supplierDepartureDate}
                            setSupplierDepartureDate={logic.setSupplierDepartureDate}
                        />

                        <OrderItemsList 
                            items={logic.items}
                            updateItem={logic.updateItem}
                            removeItem={logic.removeItem}
                            duplicateItem={logic.duplicateItem}
                            suppliersList={logic.suppliersList}
                            productsList={logic.productsList}
                            factorsList={logic.factorsList}
                            totalRevenue={logic.totalRevenue}
                            totalProfit={logic.totalProfit}
                            addLog={logic.addLog}
                        />
                    </div>

                    <div className="space-y-6">
                        <OrderFinanceInfo 
                            modalidade={logic.modalidade}
                            setModalidade={logic.setModalidade}
                            opcaoPagamento={logic.opcaoPagamento}
                            setOpcaoPagamento={logic.setOpcaoPagamento}
                            dataLimite={logic.dataLimite}
                            setDataLimite={logic.setDataLimite}
                            recebimentoEntrada={logic.recebimentoEntrada}
                            setRecebimentoEntrada={logic.setRecebimentoEntrada}
                            recebimentoRestante={logic.recebimentoRestante}
                            setRecebimentoRestante={logic.setRecebimentoRestante}
                            dataEntrada={logic.dataEntrada}
                            dataRestante={logic.dataRestante}
                            entryForecastDate={logic.entryForecastDate}
                            setEntryForecastDate={logic.setEntryForecastDate}
                            remainingForecastDate={logic.remainingForecastDate}
                            setRemainingForecastDate={logic.setRemainingForecastDate}
                            entradaConfirmed={logic.entradaConfirmed}
                            restanteConfirmed={logic.restanteConfirmed}
                            purchaseOrder={logic.purchaseOrder}
                            setPurchaseOrder={logic.setPurchaseOrder}
                            invoiceNumber={logic.invoiceNumber}
                            setInvoiceNumber={logic.setInvoiceNumber}
                            totalPedido={logic.totalRevenue}
                            totalCostsReal={logic.totalCostsReal}
                            managementApproved={logic.managementApproved}
                            setManagementApproved={logic.setManagementApproved}
                            deliveryDateExpected={logic.deliveryDateExpected}
                            setDeliveryDateExpected={logic.setDeliveryDateExpected}
                            deliveryDateActual={logic.deliveryDateActual}
                            setDeliveryDateActual={logic.setDeliveryDateActual}
                            shippingType={logic.shippingType}
                            setShippingType={logic.setShippingType}
                            handleConfirmPayment={logic.handleConfirmPayment}
                            logs={logic.logs}
                            items={logic.items}
                        />

                        <div className="bg-white rounded-md border border-[#E3E3E4] p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-md bg-[#F0F7FF] text-[#0F6CBD] flex items-center justify-center">
                                    <span className="material-icons-outlined text-sm">sticky_note_2</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Observações</h4>
                            </div>
                            <textarea
                                className="w-full p-4 bg-[#F9FAFB] border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 focus:ring-4 focus:ring-[#0F6CBD]/5 focus:border-[#0F6CBD] transition-all min-h-[120px] resize-none outline-none"
                                value={logic.observacoes}
                                onChange={e => logic.setObservacoes(e.target.value)}
                                placeholder="Anotações importantes sobre o pedido..."
                            />
                        </div>


                        <OrderLogs logs={logic.logs} addLog={logic.addLog} />

                        {logic.relatedLead && (
                            <div className="mt-6">
                                <OrderChecklist lead={logic.relatedLead} />
                            </div>
                        )}

                        <ExtratoConsolidado items={logic.items} totalPedido={logic.totalRevenue} />
                    </div>
                </div>
            </div>
        </div>
    );
}
