'use client';

import React, { useState } from 'react';
import CrmHeader from '@/components/crm/CrmHeader';
import CrmStats from '@/components/crm/CrmStats';
import CrmTable from '@/components/crm/CrmTable';
import TransferTable from '@/components/crm/TransferTable';
import { LeadModal } from '@/components/crm/LeadModal';
import TransferModal from '@/components/crm/TransferModal';
import FinalizeLeadModal from '@/components/crm/FinalizeLeadModal';
import LostLeadModal from '@/components/crm/LostLeadModal';
import { useCrmLogic } from '@/hooks/useCrmLogic';
import { Lead } from '@/hooks/useCRM';
import { SELLERS } from '@/constants/crm';


export default function CrmPage() {
    const {
        leads,
        stats,
        transferRequests,
        loading,
        searchTerm,
        setSearchTerm,
        activeTab,
        setActiveTab,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        sellerFilter,
        setSellerFilter,
        periodFilter,
        setPeriodFilter,
        openStatusMenuId,
        setOpenStatusMenuId,
        handleNewLead,
        handleEditLead,
        refreshLeads,
        // Lead Modal Logic
        isLeadModalOpen,
        setIsLeadModalOpen,
        selectedLead,
        selectedPartnerToTransfer,
        newLead,
        setNewLead,
        partnerSaved,
        setPartnerSaved,
        showClientForm,
        setShowClientForm,
        clientSearchTerm,
        setClientSearchTerm,
        clientSearchResults,
        setClientSearchResults,
        isSavingPartner,
        handleSavePartner,
        handleSaveLead,
        handleDeleteLead,
        // Transfer Logic
        isTransferModalOpen,
        setIsTransferModalOpen,
        handleTransfer,
        handleRequestTransfer,
        handleRequestAccess,
        confirmTransfer,
        handleRespondToTransfer,
        // Finalize Logic
        isFinalizeModalOpen,
        setIsFinalizeModalOpen,
        handleFinalize,
        confirmFinalize,
        isLostModalOpen,
        setIsLostModalOpen,
        handleMarkAsLost,
        confirmLost,
        // Utils
        initialLeadState,
        appUser,
        appUserInitials,
        handleConvertToBudget,
        handleUpdateStatus,
        handleTogglePriority
    } = useCrmLogic();

    const [statusFilter, setStatusFilter] = useState('Todos');
    
    // Internal state for Modals (since useCrmLogic doesn't currently expose full form state)
    const [finalizeForm, setFinalizeForm] = useState({ success: true, value: 0, notes: '', category: '' });
    const [lostForm, setLostForm] = useState({ category: '', reason: '' });



    const handleExport = () => {
        console.log('Exporting to Excel...', leads);
    };

    const canSeeAll = appUser?.role !== 'VENDEDOR';
    const activeSellers = canSeeAll ? SELLERS : [appUser?.salesperson].filter(Boolean) as string[];

    return (
        <div className="flex flex-col min-h-screen bg-[#F5F5F8] pb-20">
            <CrmHeader 
                onNewLead={handleNewLead}
                pendingTransferCount={transferRequests.length}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                userInitials={appUserInitials || 'AD'}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClearDates={() => { setStartDate(''); setEndDate(''); }}
                isSeller={!canSeeAll}
            />

            <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                {activeTab === 'RECORDS' && (
                    <CrmStats 
                        leads={leads}
                        kanbanSellerFilter={sellerFilter}
                        setKanbanSellerFilter={setSellerFilter}
                        canSeeAll={canSeeAll}
                        userSalesperson={appUser?.salesperson || ''}
                    />
                )}

                {activeTab === 'RECORDS' ? (
                    <CrmTable 
                        leads={leads.filter(l => statusFilter === 'Todos' || (l.atendimento_status || l.status || 'ATENDIMENTO') === statusFilter)}
                        loading={loading}
                        onTogglePriority={handleTogglePriority}
                        onUpdateStatus={handleUpdateStatus}
                        onEdit={handleEditLead}
                        onTransfer={handleTransfer}
                        onConvertToBudget={handleConvertToBudget}
                        onFinalize={handleFinalize}
                        onMarkAsLost={handleMarkAsLost}
                        openStatusMenuId={openStatusMenuId}
                        setOpenStatusMenuId={setOpenStatusMenuId}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        sellerFilter={sellerFilter}
                        setSellerFilter={setSellerFilter}
                        periodFilter={periodFilter}
                        setPeriodFilter={setPeriodFilter}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endDate={endDate}
                        setEndDate={setEndDate}
                        onRefresh={refreshLeads}
                        onExport={handleExport}
                        sellers={activeSellers}
                    />
                ) : (
                    <TransferTable 
                        requests={transferRequests}
                        loading={loading}
                        onRespond={handleRespondToTransfer}
                    />
                )}
            </div>

            <LeadModal 
                isOpen={isLeadModalOpen}
                onClose={() => setIsLeadModalOpen(false)}
                editingLead={selectedLead}
                newLead={newLead}
                setNewLead={setNewLead}
                initialLeadState={initialLeadState}
                partnerSaved={partnerSaved}
                setPartnerSaved={setPartnerSaved}
                showClientForm={showClientForm}
                setShowClientForm={setShowClientForm}
                clientSearchTerm={clientSearchTerm}
                setClientSearchTerm={setClientSearchTerm}
                clientSearchResults={clientSearchResults}
                setClientSearchResults={setClientSearchResults}
                isSavingPartner={isSavingPartner}
                handleSavePartner={handleSavePartner}
                saveLead={handleSaveLead}
                appUser={appUser}
                userSalesperson={appUser?.salesperson || ''}
                isSeller={!canSeeAll}
                setSelectedClientToTransfer={handleRequestAccess} 
                setIsTransferModalOpen={setIsTransferModalOpen} 
                onDelete={handleDeleteLead}
            />

            <TransferModal 
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                lead={selectedLead || selectedPartnerToTransfer}
                onTransfer={confirmTransfer}
            />

            <FinalizeLeadModal 
                isOpen={isFinalizeModalOpen}
                onClose={() => setIsFinalizeModalOpen(false)}
                finalizeForm={finalizeForm}
                setFinalizeForm={setFinalizeForm}
                onConfirm={() => confirmFinalize(finalizeForm)}
            />

            <LostLeadModal 
                isOpen={isLostModalOpen}
                onClose={() => setIsLostModalOpen(false)}
                lostForm={lostForm}
                setLostForm={setLostForm}
                onConfirm={() => confirmLost(lostForm)}
            />
        </div>
    );
}
