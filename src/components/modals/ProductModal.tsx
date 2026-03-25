import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';
import { QuickSupplierModal, NewSupplierData } from './QuickSupplierModal';

export interface ProductFormData {
    id?: string;
    name: string;
    description: string;
    code: string;
    unit_price: number;
    image_url: string;
    notes: string;
    source: string;
    supplier_id?: string;
}

interface ProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSuccess: () => void;
    editingProduct?: ProductFormData | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
    isOpen,
    onClose,
    onSaveSuccess,
    editingProduct
}) => {
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        description: '',
        code: '',
        unit_price: 0,
        image_url: '',
        notes: '',
        source: 'LOCAL',
        supplier_id: ''
    });
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false);
    const [newSupplier, setNewSupplier] = useState<NewSupplierData>({
        name: '',
        doc: '',
        phone: '',
        email: '',
        supplier_category: 'PRODUTOS'
    });
    const [quickSupplierLoading, setQuickSupplierLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                ...editingProduct,
                source: editingProduct.source || 'LOCAL',
                supplier_id: editingProduct.supplier_id || ''
            });
        } else {
            setFormData({
                name: '',
                description: '',
                code: '',
                unit_price: 0,
                image_url: '',
                notes: '',
                source: 'LOCAL',
                supplier_id: ''
            });
        }
    }, [editingProduct, isOpen]);

    const fetchSuppliers = async () => {
        try {
            const { data, error } = await supabase
                .from('partners')
                .select('id, name, supplier_category')
                .eq('type', 'FORNECEDOR')
                .order('name');
            if (error) throw error;
            setSuppliers(data || []);
        } catch (error: any) {
            console.error('Error fetching suppliers:', error);
        }
    };

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'unit_price' ? parseFloat(value) || 0 : value
        }));

        // Se mudar o fornecedor, atualizar o source também para manter compatibilidade
        if (name === 'supplier_id') {
            const supplier = suppliers.find(s => s.id === value);
            if (supplier) {
                setFormData(prev => ({ ...prev, source: supplier.name, supplier_id: value }));
            }
        }
    };

    const uploadFile = async (file: File) => {
        if (!file) return;

        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor, selecione um arquivo de imagem (PNG, JPG, etc).');
            return;
        }

        try {
            setUploading(true);

            // Gerar nome único para o arquivo
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            // Fazer upload para o bucket 'products'
            const { error } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (error) {
                if (error.message.includes('bucket not found')) {
                    throw new Error('Bucket de armazenamento "products" não encontrado. Configure o Supabase Storage.');
                }
                throw error;
            }

            // Obter URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
            toast.success('Imagem carregada com sucesso!');
        } catch (error: any) {
            console.error('Error uploading file:', error);
            toast.error('Erro ao carregar imagem: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            toast.error('O título do produto é obrigatório.');
            return;
        }

        if (!formData.supplier_id) {
            toast.error('O fornecedor é obrigatório.');
            return;
        }

        try {
            setLoading(true);

            const productData: any = {
                name: formData.name,
                description: formData.description,
                code: formData.code,
                unit_price: formData.unit_price,
                image_url: formData.image_url,
                notes: formData.notes,
                source: formData.source || 'LOCAL',
                supplier_id: formData.supplier_id,
                updated_at: new Date().toISOString()
            };

            if (formData.id) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', formData.id);

                if (error) throw error;
                toast.success('Produto atualizado com sucesso!');
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) throw error;
                toast.success('Produto criado com sucesso!');
            }

            onSaveSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving product:', error);
            toast.error('Erro ao salvar produto: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveQuickSupplier = async () => {
        if (!newSupplier.name.trim() || !newSupplier.doc.trim()) {
            toast.error('Nome e CNPJ/CPF são obrigatórios.');
            return;
        }

        try {
            setQuickSupplierLoading(true);
            const { data, error } = await supabase
                .from('partners')
                .insert([{
                    ...newSupplier,
                    type: 'FORNECEDOR'
                }])
                .select()
                .single();

            if (error) throw error;

            toast.success('Fornecedor cadastrado com sucesso!');
            await fetchSuppliers();
            setFormData(prev => ({ ...prev, supplier_id: data.id, source: data.name }));
            setIsQuickSupplierModalOpen(false);
            setNewSupplier({
                name: '',
                doc: '',
                phone: '',
                email: '',
                supplier_category: 'PRODUTOS'
            });
        } catch (error: any) {
            console.error('Error saving quick supplier:', error);
            toast.error('Erro ao salvar fornecedor: ' + error.message);
        } finally {
            setQuickSupplierLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500">inventory_2</span>
                        {formData.id ? 'Editar Produto' : 'Novo Produto'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Título do Produto <span className="text-red-500">*</span></label>
                            <input
                                name="name"
                                className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ex: Caneta Executiva"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Fornecedor Vinculado <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <select
                                    name="supplier_id"
                                    className="form-select block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500 font-bold"
                                    value={formData.supplier_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Selecione um fornecedor...</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setIsQuickSupplierModalOpen(true)}
                                    className="px-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center justify-center shrink-0"
                                    title="Cadastrar Novo Fornecedor"
                                >
                                    <span className="material-icons-outlined">add</span>
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Foto do Produto</label>
                            <div 
                                className={`mt-1 flex items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-all bg-gray-50/30 group ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-[1.01]' : 'border-gray-200 hover:border-blue-400'}`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="w-24 h-24 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm flex items-center justify-center">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="material-icons-outlined text-gray-300 text-4xl">image</span>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-[10px] text-gray-500 font-medium">PNG, JPG ou JPEG (Máx. 5MB)</p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
                                        >
                                            <span className="material-icons-outlined text-sm">{uploading ? 'sync' : 'cloud_upload'}</span>
                                            {uploading ? 'Carregando...' : 'Fazer Upload'}
                                        </button>
                                        {formData.image_url && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                            >
                                                Remover
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    {/* Fallback para URL caso o usuário prefira */}
                                    <div className="mt-2">
                                        <input
                                            name="image_url"
                                            className="w-full bg-transparent border-b border-gray-200 text-[10px] focus:border-blue-500 outline-none py-1"
                                            value={formData.image_url}
                                            onChange={handleChange}
                                            placeholder="Ou cole a URL da imagem aqui..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referência (SKU)</label>
                            <input
                                name="code"
                                className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="Ex: REF-100"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Custo (R$)</label>
                            <input
                                name="unit_price"
                                type="number"
                                step="0.01"
                                className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={formData.unit_price}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descrição</label>
                            <textarea
                                name="description"
                                rows={3}
                                className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Descrição detalhada do produto..."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nota Interna</label>
                            <textarea
                                name="notes"
                                rows={2}
                                className="form-input block w-full rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Observações internas, fornecedor específico, etc."
                            />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t border-gray-100 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors cursor-pointer">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={loading || uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2">
                        {loading && <span className="material-icons-outlined animate-spin text-sm">sync</span>}
                        {loading ? 'Salvando...' : 'Salvar Produto'}
                    </button>
                </div>
            </div>

            <QuickSupplierModal
                isOpen={isQuickSupplierModalOpen}
                onClose={() => setIsQuickSupplierModalOpen(false)}
                newSupplier={newSupplier}
                setNewSupplier={setNewSupplier}
                onSave={handleSaveQuickSupplier}
                loading={quickSupplierLoading}
            />
        </div>
    );
};
