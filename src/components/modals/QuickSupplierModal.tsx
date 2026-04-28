import React from 'react';
import { maskCpfCnpj, maskPhone } from '@/utils/maskUtils';

export interface NewSupplierData {
    name: string;
    doc: string;
    phone: string;
    email: string;
    supplier_category: string;
}

interface QuickSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    newSupplier: NewSupplierData;
    setNewSupplier: (data: NewSupplierData) => void;
    onSave: () => void;
    loading: boolean;
}

export const QuickSupplierModal: React.FC<QuickSupplierModalProps> = ({
    isOpen,
    onClose,
    newSupplier,
    setNewSupplier,
    onSave,
    loading
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-md shadow-none w-full max-w-lg border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500">local_shipping</span> Novo Fornecedor Rápido
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Nome / Razão Social <span className="text-red-500">*</span></label>
                        <input className="form-input block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">CNPJ / CPF <span className="text-red-500">*</span></label>
                            <input className="form-input block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={newSupplier.doc} onChange={(e) => setNewSupplier({ ...newSupplier, doc: maskCpfCnpj(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Categoria Fornecedor</label>
                            <select className="form-select block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 font-medium" value={newSupplier.supplier_category} onChange={(e) => setNewSupplier({ ...newSupplier, supplier_category: e.target.value })}>
                                <option value="PRODUTOS">PRODUTOS (FORNECEDOR)</option>
                                <option value="GRAVACOES">GRAVAÇÕES (PERSONALIZAÇÃO)</option>
                                <option value="TRANSPORTADORA">TRANSPORTADORA</option>
                                <option value="OUTROS">OUTROS</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">Telefone</label>
                            <input className="form-input block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: maskPhone(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">E-mail</label>
                            <input type="email" className="form-input block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-md border-t border-gray-100 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer">Cancelar</button>
                    <button onClick={onSave} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer">
                        {loading ? 'Salvando...' : 'Salvar Fornecedor'}
                    </button>
                </div>
            </div>
        </div>
    );
};
