import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    created_at: string;
}

const ProductsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
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
            setTotalCount(count || 0);
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
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <span className="material-icons-outlined text-blue-600 text-xl">inventory_2</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Produtos</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Catálogo de produtos disponíveis</p>
                        </div>
                    </div>

                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${syncing ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} transition-colors gap-2`}
                    >
                        <span className={`material-icons-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>
                            {syncing ? 'sync' : 'cached'}
                        </span>
                        {syncing ? 'Sincronizando...' : 'Sincronizar APIs'}
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Buscar Produto
                            </label>
                            <div className="relative">
                                <span className="material-icons-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    search
                                </span>
                                <input
                                    type="text"
                                    placeholder="Digite o nome do produto..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="w-48">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                Fornecedor
                            </label>
                            <select
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                value={sourceFilter}
                                onChange={(e) => {
                                    setSourceFilter(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="ALL">Todos</option>
                                <option value="XBZ">XBZ Brindes</option>
                                <option value="Asia">Asia Import</option>
                                <option value="Spot">Spot Gifts</option>
                                <option value="LOCAL">Cadastrado Local</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de Produtos</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{products.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                                <span className="material-icons-outlined text-blue-600 text-2xl">inventory</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resultados da Busca</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{filteredProducts.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <span className="material-icons-outlined text-emerald-600 text-2xl">filter_list</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Páginas</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{Math.ceil(totalCount / PAGE_SIZE)}</p>
                            </div>
                            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
                                <span className="material-icons-outlined text-amber-600 text-2xl">auto_stories</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Produto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Fonte
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Custo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Estoque
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <p className="text-sm text-gray-500">Carregando produtos...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <span className="material-icons-outlined text-gray-400 text-3xl">inventory_2</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 mb-1">Nenhum produto encontrado</p>
                                                    <p className="text-xs text-gray-500">
                                                        {searchTerm ? 'Tente ajustar os filtros de busca' : 'Nenhum produto cadastrado no sistema'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100">
                                                        {(product as any).image_url ? (
                                                            <img src={(product as any).image_url} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="material-icons-outlined text-gray-400 text-sm">image</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                                                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">REF: {(product as any).code || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${(product as any).source === 'XBZ' ? 'bg-orange-50 text-orange-600' :
                                                    (product as any).source === 'Asia' ? 'bg-red-50 text-red-600' :
                                                        (product as any).source === 'Spot' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-gray-50 text-gray-600'
                                                    }`}>
                                                    {(product as any).source || 'LOCAL'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-900">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((product as any).unit_price || 0)}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${((product as any).stock || 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                                    <p className="text-sm font-medium text-gray-700">{(product as any).stock || 0}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors">
                                                    Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                {!loading && totalCount > 0 && (
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-500">
                            Exibindo <span className="font-semibold text-gray-700">{products.length}</span> de{' '}
                            <span className="font-semibold text-gray-700">{totalCount}</span> produtos
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <span className="material-icons-outlined">chevron_left</span>
                            </button>

                            <div className="flex items-center gap-1">
                                {(() => {
                                    const totalPages = Math.ceil(totalCount / PAGE_SIZE);
                                    const getPageNumbers = () => {
                                        const pageNumbers: (number | string)[] = [];

                                        if (totalPages <= 7) {
                                            return Array.from({ length: totalPages }, (_, i) => i + 1);
                                        }

                                        // Always show first page
                                        pageNumbers.push(1);

                                        // Left ellipsis
                                        if (page > 3) {
                                            pageNumbers.push('...');
                                        }

                                        // Middle pages
                                        let start = Math.max(2, page - 1);
                                        let end = Math.min(totalPages - 1, page + 1);

                                        if (page < 3) {
                                            start = 2;
                                            end = Math.min(5, totalPages - 1); // Ensure we show enough context at start
                                        } else if (page > totalPages - 2) {
                                            start = Math.max(totalPages - 4, 2); // Ensure we show enough context at end
                                            end = totalPages - 1;
                                        }

                                        for (let i = start; i <= end; i++) {
                                            pageNumbers.push(i);
                                        }

                                        // Right ellipsis
                                        if (page < totalPages - 2) {
                                            pageNumbers.push('...');
                                        }

                                        // Always show last page
                                        if (totalPages > 1) {
                                            pageNumbers.push(totalPages);
                                        }

                                        return pageNumbers;
                                    };

                                    return getPageNumbers().map((pageNum, i) => (
                                        pageNum === '...' ? (
                                            <span key={`input-${i}`} className="px-2 text-gray-400">...</span>
                                        ) : (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPage(Number(pageNum))}
                                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === Number(pageNum)
                                                    ? 'bg-blue-600 text-white shadow-sm'
                                                    : 'text-gray-600 hover:bg-gray-100'
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
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                <span className="material-icons-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductsPage;
