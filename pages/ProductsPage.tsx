import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { ProductModal } from '../src/components/modals/ProductModal';

interface Product {
    id: string;
    name: string;
    created_at: string;
}

const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [globalCount, setGlobalCount] = useState(0);
    const PAGE_SIZE = 50;

    useEffect(() => {
        fetchProducts();
    }, [page, sourceFilter]);

    // Search after delay
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page !== 1) setPage(1);
            else fetchProducts();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchProducts = async () => {
        try {
            setLoading(true);

            let query = supabase
                .from('products')
                .select('*', { count: 'exact' });

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
            }

            if (sourceFilter !== 'ALL') {
                query = query.eq('source', sourceFilter);
            }

            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error, count } = await query
                .order('name')
                .range(from, to);

            if (error) throw error;
            setProducts(data || []);
            if (searchTerm || sourceFilter !== 'ALL') {
                const { count: gCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
                setGlobalCount(gCount || 0);
            } else {
                setGlobalCount(count || 0);
            }

        } catch (error: any) {
            console.error('Error fetching products:', error);
            toast.error('Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        const { syncAllProducts } = await import('../src/services/productSync');
        try {
            setSyncing(true);
            const res = await syncAllProducts((msg) => {
                // Toast notification with progress if possible, but simple for now
                console.log(msg);
            });
            if (res.success) {
                toast.success('Produtos sincronizados com sucesso!');
                fetchProducts();
            } else {
                toast.error('Erro ao sincronizar: ' + res.error);
            }
        } catch (error: any) {
            toast.error('Erro ao carregar serviço de sincronização');
        } finally {
            setSyncing(false);
        }
    };

    const filteredProducts = products;

    return (
        <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
            {/* Optimized Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
                        <span className="material-icons-outlined text-white text-lg">inventory_2</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-black leading-none text-gray-900 uppercase tracking-tighter">CATÁLOGO DE PRODUTOS</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Gestão centralizada de itens e SKUs</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setEditingProduct(null);
                            setIsModalOpen(true);
                        }}
                        className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 text-[10px] font-black uppercase tracking-widest text-gray-700 rounded shadow-sm hover:bg-gray-50 transition-all gap-2 cursor-pointer"
                    >
                        <span className="material-icons-outlined text-sm">add</span>
                        Novo Produto
                    </button>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent rounded shadow-sm text-[10px] font-black uppercase tracking-widest text-white ${syncing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-all gap-2 cursor-pointer`}
                    >
                        <span className={`material-icons-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>
                            {syncing ? 'sync' : 'cached'}
                        </span>
                        {syncing ? 'Sincronizando...' : 'Sincronizar APIs'}
                    </button>
                </div>
            </div>

            {/* Compact Filters & Stats Row */}
            <div className="grid grid-cols-12 gap-3 items-start">
                {/* Search and Source */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded border border-gray-200 p-2.5 shadow-sm flex items-end gap-3">
                    <div className="flex-1">
                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">BUSCAR PRODUTO</label>
                        <div className="relative">
                            <span className="material-icons-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="CÓDIGO OU NOME DO PRODUTO..."
                                className="w-full !pl-10 pr-4 border border-gray-300 rounded h-8 text-xs font-bold uppercase placeholder:text-gray-300 tracking-tight shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="w-40">
                        <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">FORNECEDOR</label>
                        <select
                            className="w-full px-2 border border-gray-300 rounded h-8 text-[10px] font-black uppercase tracking-widest bg-gray-50/50"
                            value={sourceFilter}
                            onChange={(e) => {
                                setSourceFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">TODOS</option>
                            <option value="XBZ">XBZ BRINDES</option>
                            <option value="Asia">ASIA IMPORT</option>
                            <option value="Spot">SPOT GIFTS</option>
                            <option value="LOCAL">CADASTRO LOCAL</option>
                        </select>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="col-span-12 lg:col-span-5 grid grid-cols-3 gap-2">
                    {[
                        { label: 'DISPONÍVEIS', value: globalCount, icon: 'inventory', color: 'blue' },
                        { label: 'FILTRADOS', value: products.length, icon: 'filter_list', color: 'emerald' },
                        { label: 'PÁGINAS', value: Math.ceil(totalCount / PAGE_SIZE), icon: 'auto_stories', color: 'amber' }
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white rounded border border-gray-200 p-2 shadow-sm flex items-center justify-between group">
                            <div className="min-w-0">
                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                <p className="text-sm font-black text-gray-900 leading-none">{stat.value}</p>
                            </div>
                            <div className={`w-6 h-6 bg-${stat.color}-50 rounded flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                <span className={`material-icons-outlined text-${stat.color}-600 text-[14px]`}>{stat.icon}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* High-Density Products Table */}
            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                                <th className="px-4 py-2 text-left">PRODUTO / REFERÊNCIA</th>
                                <th className="px-4 py-2 text-left">ORIGEM</th>
                                <th className="px-4 py-2 text-left">CUSTO UNIT.</th>
                                <th className="px-4 py-2 text-left">SALDO ESTOQUE</th>
                                <th className="px-4 py-2 text-right">AÇÕES</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center pointer-events-none">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="material-icons-outlined animate-spin text-blue-600 text-2xl">sync</span>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sincronizando catálogo...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <p className="text-[10px] font-black text-gray-300 uppercase italic">Nenhum produto localizado</p>
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-4 py-1.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-100 rounded border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                                                    {(product as any).image_url ? (
                                                        <img src={(product as any).image_url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="material-icons-outlined text-gray-300 text-[14px]">image</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-black text-gray-800 uppercase truncate max-w-[400px] leading-tight group-hover:text-blue-600 transition-colors">
                                                        {product.name}
                                                    </span>
                                                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">REF: {(product as any).code || '---'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 whitespace-nowrap">
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm border ${(product as any).source === 'XBZ' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                (product as any).source === 'Asia' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    (product as any).source === 'Spot' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                {(product as any).source || 'LOCAL'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-1.5 whitespace-nowrap">
                                            <span className="text-[10px] font-black text-gray-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product as any).unit_price || 0)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-1.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${((product as any).stock || 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                <span className={`text-[10px] font-black ${((product as any).stock || 0) > 0 ? 'text-gray-700' : 'text-red-600'}`}>
                                                    {(product as any).stock || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-1.5 text-right whitespace-nowrap">
                                            <button
                                                onClick={() => {
                                                    setEditingProduct(product);
                                                    setIsModalOpen(true);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 rounded transition-all cursor-pointer"
                                            >
                                                {(product as any).source === 'LOCAL' ? 'EDITAR' : 'DETALHES'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Dense Footer & Pagination */}
                {!loading && totalCount > 0 && (
                    <div className="bg-gray-50/50 border-t border-gray-200 px-4 py-2 flex items-center justify-between">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            MOSTRANDO <span className="text-gray-900">{products.length}</span> DE <span className="text-gray-900">{totalCount}</span> REGISTROS
                        </p>

                        <div className="flex items-center gap-2">
                            <nav className="inline-flex rounded shadow-sm overflow-hidden" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-1 py-1 border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                >
                                    <span className="material-icons-outlined text-xs">chevron_left</span>
                                </button>

                                <div className="flex items-center">
                                    {(() => {
                                        const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                                        const getPageNumbers = () => {
                                            const pageNumbers: (number | string)[] = [];
                                            if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
                                            pageNumbers.push(1);
                                            if (page > 3) pageNumbers.push('...');
                                            let start = Math.max(2, page - 1);
                                            let end = Math.min(totalPages - 1, page + 1);
                                            if (page < 3) end = Math.min(4, totalPages - 1);
                                            else if (page > totalPages - 2) start = Math.max(totalPages - 3, 2);
                                            for (let i = start; i <= end; i++) pageNumbers.push(i);
                                            if (page < totalPages - 2) pageNumbers.push('...');
                                            if (totalPages > 1) pageNumbers.push(totalPages);
                                            return pageNumbers;
                                        };

                                        return getPageNumbers().map((pageNum, i) => (
                                            pageNum === '...' ? (
                                                <span key={`dots-${i}`} className="px-1.5 py-1 border border-gray-300 bg-gray-50 text-[9px] text-gray-400">...</span>
                                            ) : (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setPage(Number(pageNum))}
                                                    className={`px-2.5 py-1 border border-gray-300 text-[9px] font-black transition-all ${page === Number(pageNum)
                                                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            )
                                        ));
                                    })()}
                                </div>

                                <button
                                    onClick={() => setPage(p => Math.min(Math.ceil(totalCount / PAGE_SIZE), p + 1))}
                                    disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                                    className="px-1 py-1 border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                >
                                    <span className="material-icons-outlined text-xs">chevron_right</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Form Modal */}
            {isModalOpen && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSaveSuccess={() => {
                        fetchProducts();
                    }}
                    editingProduct={editingProduct}
                />
            )}
        </div>
    );
};

export default ProductsPage;
