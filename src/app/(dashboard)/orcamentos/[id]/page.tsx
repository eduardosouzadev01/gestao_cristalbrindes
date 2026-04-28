'use client';

import React, { use } from 'react';
import { useBudgetLogic } from '@/hooks/useBudgetLogic';
import BudgetHeader from '@/components/budget/BudgetHeader';
import BudgetGeneralInfo from '@/components/budget/BudgetGeneralInfo';
import ClientInfo from '@/components/budget/ClientInfo';
import ItemsList from '@/components/budget/ItemsList';
import CommercialTerms from '@/components/budget/CommercialTerms';
import { GenerateOrderModal } from '@/components/modals/GenerateOrderModal';
import { useState } from 'react';

export default function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const logic = useBudgetLogic(id);

    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [commercialData, setCommercialData] = useState({
        payment_term: logic.paymentMethod || '',
        supplier_deadline: logic.deliveryDeadline || '',
        shipping_deadline: '',
        invoice_number: '',
        purchase_order: '',
        layout_info: '',
        entry_forecast_date: '',
        remaining_forecast_date: '',
        supplier_payment_dates: {},
        supplier_departure_dates: {}
    });

    if (logic.isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Carregando Orçamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F5F8] pb-32">
            <BudgetHeader 
                budgetNumber={logic.budgetNumber}
                status={logic.status}
                onSave={logic.handleSave}
                onDuplicate={logic.handleDuplicate}
                onGenerateOrder={() => setIsOrderModalOpen(true)}
                onGenerateProposal={logic.handleGenerateProposal}
                onViewProposal={logic.handleViewProposal}
                isSaving={logic.isSaving}
            />

            <main className="max-w-[1600px] mx-auto px-4 py-6">
                <fieldset disabled={['PROPOSTA GERADA', 'PROPOSTA ENVIADA', 'PROPOSTA ACEITA', 'PEDIDO GERADO'].includes(logic.status)} className="space-y-4 border-0 p-0 m-0 min-w-0">
                
                {/* Header info & Client Info Grid */}
                <div className="grid grid-cols-12 gap-4 items-stretch">
                    <div className="col-span-12 xl:col-span-4 flex flex-col">
                        <BudgetGeneralInfo
                            budgetNumber={logic.budgetNumber}
                            salesperson={logic.salesperson}
                            setSalesperson={logic.setSalesperson}
                            status={logic.status}
                            setStatus={logic.setStatus}
                            budgetDate={logic.budgetDate}
                            setBudgetDate={logic.setBudgetDate}
                            issuer={logic.issuer}
                            setIssuer={logic.setIssuer}
                        />
                    </div>
                    <div className="col-span-12 xl:col-span-8 flex flex-col">
                        <ClientInfo 
                            clientData={logic.clientData}
                            setClientData={logic.setClientData}
                        />
                    </div>
                </div>

                {/* Section: Terms */}
                <section>
                    <CommercialTerms 
                        validity={logic.validity} setValidity={logic.setValidity}
                        shipping={logic.shipping} setShipping={logic.setShipping}
                        deadline={logic.deliveryDeadline} setDeadline={logic.setDeliveryDeadline}
                        payment={logic.paymentMethod} setPayment={logic.setPaymentMethod}
                        observation={logic.observation} setObservation={logic.setObservation}
                    />
                </section>

                {/* Section: Items */}
                <section>
                    <ItemsList 
                        items={logic.items}
                        suppliersList={logic.suppliersList}
                        productsList={logic.productsList}
                        factors={logic.factors}
                        onAddItem={logic.addItem}
                        onUpdateItem={logic.updateItem}
                        onRemoveItem={logic.removeItem}
                        onDuplicateItem={logic.duplicateItem}
                        onSearchProducts={logic.handleSearchProducts}
                        isLocked={['PROPOSTA GERADA', 'PROPOSTA ENVIADA', 'PROPOSTA ACEITA', 'PEDIDO GERADO', 'ORÇAMENTO APROVADO'].includes(logic.status)}
                    />
                </section>
                </fieldset>



            </main>

            <GenerateOrderModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                commercialData={commercialData}
                setCommercialData={setCommercialData}
                onConfirm={() => logic.handleGenerateOrder(commercialData)}
                loading={logic.isGeneratingOrder || false}
                approvedItems={logic.items.filter(it => it.isApproved)}
                suppliersList={logic.suppliersList}
            />
        </div>
    );
}
