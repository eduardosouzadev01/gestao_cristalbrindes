'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ProductModal } from '@/components/modals/ProductModal';

interface Product {
    id: string;
    code: string;
    name: string;
    source: string;
    unit_price: number;
    stock: number;
    image_url: string;
    updated_at: string;
}

const SOURCE_OPTIONS = [
    { value: 'Todos', label: 'Todos' },
    { value: 'XBZ', label: 'XBZ' },
    { value: 'Asia', label: 'Asia' },
    { value: 'Spot', label: 'Spot' },
    { value: 'LOCAL', label: 'Locais' },
];

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('Todos');
    
    // Pagination
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 50;

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    useEffect(() => {
        fetchProducts();
    }, [sourceFilter, page]);

    // Trigger search with delay (optional) or just on manual trigger
    // For now, let's trigger search when searchTerm changes with a small delay
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 0) {
                setPage(0);
            } else {
                fetchProducts();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let query = supabase.from('products').select('*', { count: 'exact' });
            
            if (searchTerm) {
                // Ao buscar, ignorar filtro de fonte para busca global
                query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
            } else if (sourceFilter === 'LOCAL') {
                // Para locais, mostrar tudo que NÃO é das fontes externas conhecidas
                query = query.not('source', 'in', '("XBZ","Asia","Spot")');
            } else if (sourceFilter !== 'Todos') {
                query = query.eq('source', sourceFilter);
            }

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error, count } = await query
                .order('name')
                .range(from, to);

            if (error) throw error;
            setProducts(data || []);
            setTotalCount(count || 0);
        } catch (error: any) {
            toast.error('Erro ao buscar produtos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            toast.success('Produto excluído com sucesso!');
            fetchProducts();
        } catch (error: any) {
            toast.error('Erro ao excluir: ' + error.message);
        }
    };

    return (
        <div className="max-w-[1920px] mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-[#111827] uppercase tracking-tighter flex items-center gap-3">
                        <span className="material-icons-outlined text-[#0F6CBD] text-3xl">shopping_bag</span>
                        Catálogo de Produtos
                    </h1>
                    <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mt-1">Gestão centralizada de inventário e custos</p>
                </div>
                <div className="flex gap-2">
                    <button
                        className="h-11 px-6 bg-white border border-[#E3E3E4] text-[#424242] rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2 active:scale-95"
                        onClick={() => toast.info('Sincronização iniciada...')}
                    >
                        <span className="material-icons-outlined text-[18px]">sync</span>
                        Sincronizar XBZ
                    </button>
                    <button
                        className="h-11 px-6 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all flex items-center gap-2 active:scale-95 shadow-none shadow-none-[#0F6CBD]/20"
                        onClick={() => {
                            setEditingProduct(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <span className="material-icons-outlined text-[18px]">add</span>
                        Novo Produto
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-md border border-[#E3E3E4]">
                <div className="relative flex-1 max-w-md group">
                    <span className="material-icons-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg group-focus-within:text-[#0F6CBD] transition-colors">search</span>
                    <input
                        type="text"
                        placeholder="Buscar por código ou nome..."
                        className="w-full h-11 !pl-12 pr-4 bg-white border border-[#E3E3E4] rounded-md text-[13px] font-medium text-[#111827] outline-none hover:border-gray-300 focus:border-[#0F6CBD] focus:ring-4 focus:ring-[#0F6CBD]/10 transition-all font-jakarta placeholder:text-gray-400"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest mr-2">Origem:</span>
                    {SOURCE_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                setSourceFilter(opt.value);
                                setPage(0);
                            }}
                            className={`h-9 px-4 rounded-md text-[10px] font-medium uppercase tracking-tight transition-all border ${
                                sourceFilter === opt.value
                                    ? 'bg-[#0F6CBD] text-white border-[#0F6CBD]'
                                    : 'bg-white text-[#6B7280] border-[#E3E3E4] hover:border-gray-300'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden shadow-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#E3E3E4] bg-[#F9FAFB]">
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight w-20 text-center">Img</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight">Referência</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-left">Produto</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Custo</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-center">Estoque</th>
                                <th className="px-6 py-4 text-[11px] font-medium text-[#6B7280] uppercase tracking-tight text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E3E3E4]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#6B7280] font-medium uppercase text-xs animate-pulse tracking-widest">
                                        Carregando lista...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-[#6B7280] font-medium uppercase text-xs tracking-widest">
                                        Nenhum produto encontrado.
                                    </td>
                                </tr>
                            ) : products.map((p, idx) => (
                                <tr key={p.id} className={`hover:bg-[#F5F5F8]/50 transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'}`}>
                                    <td className="px-6 py-4">
                                        <div className="w-14 h-14 bg-gray-50 rounded-md overflow-hidden border border-gray-100 p-1">
                                            {p.image_url ? (
                                                <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <span className="material-icons-outlined text-lg">image_not_supported</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[11px] font-medium text-[#6B7280] uppercase">{p.code || '---'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-left">
                                        <span className="text-[13px] font-medium text-[#111827] uppercase group-hover:text-[#0F6CBD] transition-colors line-clamp-2" title={p.name}>{p.name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-[12px] font-medium text-[#111827]">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.unit_price || 0)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-[11px] font-medium ${p.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {p.stock || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md hover:border-[#0F6CBD] hover:text-[#0F6CBD] transition-all shadow-none active:scale-90"
                                                onClick={() => handleEdit(p)}
                                            >
                                                <span className="material-icons-outlined text-lg">edit</span>
                                            </button>
                                            <button 
                                                className="w-8 h-8 flex items-center justify-center bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md hover:border-red-500 hover:text-red-500 transition-all shadow-none active:scale-90"
                                                onClick={() => handleDelete(p.id)}
                                            >
                                                <span className="material-icons-outlined text-lg">delete_outline</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {!loading && totalCount > 0 && (
                    <div className="bg-[#F9FAFB] border-t border-[#E3E3E4] px-6 py-4 flex items-center justify-between">
                        <p className="text-[10px] font-medium text-[#6B7280] uppercase tracking-widest">
                            Mostrando <span className="text-[#111827]">{products.length}</span> de <span className="text-[#111827]">{totalCount}</span> produtos
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(prev => Math.max(0, prev - 1))}
                                disabled={page === 0}
                                className="h-9 px-4 bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md text-[10px] font-medium uppercase tracking-tight hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Anterior
                            </button>
                            <span className="h-9 px-4 flex items-center text-[10px] font-medium text-[#111827] uppercase">
                                Página {page + 1} de {Math.ceil(totalCount / PAGE_SIZE)}
                            </span>
                            <button
                                onClick={() => setPage(prev => prev + 1)}
                                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                                className="h-9 px-4 bg-white border border-[#E3E3E4] text-[#6B7280] rounded-md text-[10px] font-medium uppercase tracking-tight hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Modal */}
            <ProductModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaveSuccess={fetchProducts}
                editingProduct={editingProduct}
            />
        </div>
    );
}
