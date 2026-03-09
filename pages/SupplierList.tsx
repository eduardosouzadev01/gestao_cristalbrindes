import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

const SupplierList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRODUTOS' | 'PERSONALIZACAO' | 'TRANSPORTADORES'>('PRODUTOS');
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { hasPermission } = useAuth();

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchPartners(searchTerm);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPartners = async (search?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('partners').select('*').eq('type', 'FORNECEDOR');

      if (search && search.trim()) {
        const s = search.trim();
        query = query.or(`name.ilike.%${s}%,doc.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
      }

      const { data, error } = await query.order('name').limit(1000);

      if (error) throw error;
      if (data) {
        setPartners(data.map(p => {
          // Determine category implicitly if not exists: 'PRODUTOS', 'PERSONALIZACAO', 'TRANSPORTADORES'
          let cat = p.supplier_category || 'PRODUTOS';
          if (p.name.toLowerCase().includes('transp')) cat = 'TRANSPORTADORES';
          if (p.name.toLowerCase().includes('grav') || cat === 'GRAVACOES' || cat === 'PERSONALIZACAO') cat = 'PERSONALIZACAO';
          return {
            ...p,
            supplier_category: cat,
            initials: p.name.substring(0, 2).toUpperCase(),
            color: 'bg-emerald-100 text-emerald-600',
            type: p.type
          }
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar parceiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentData = partners.filter(p => p.supplier_category === activeTab);

  return (
    <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black leading-none text-gray-900 uppercase tracking-tighter flex items-center gap-2">
            <span className="material-icons-outlined text-emerald-600 text-2xl">local_shipping</span>
            GERENCIAMENTO DE FORNECEDORES
          </h2>
          <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base de fornecedores, serviços e logística</p>
        </div>
        <Link
          to="/cadastros/novo?tipo=FORNECEDOR"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded shadow-sm text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all uppercase tracking-widest"
        >
          <span className="material-icons-outlined mr-2 text-sm">add</span>
          Novo Fornecedor
        </Link>
      </div>

      {/* Optimized Tabs & Filter Row */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/30 px-3 py-1.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <nav className="flex items-center gap-4">
            {[
              { id: 'PRODUTOS', label: 'PRODUTOS/MATERIAIS', icon: 'inventory_2' },
              { id: 'PERSONALIZACAO', label: 'PERSONALIZAÇÃO/GRAV.', icon: 'brush' },
              { id: 'TRANSPORTADORES', label: 'LOGÍSTICA/TRANSP.', icon: 'conveyor' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-1 px-1 flex items-center gap-2 border-b-2 transition-all group ${activeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700 font-black'
                    : 'border-transparent text-gray-400 font-bold hover:text-gray-600'
                  }`}
              >
                <span className={`material-icons-outlined text-sm ${activeTab === tab.id ? 'text-emerald-500' : 'text-gray-300 group-hover:text-gray-400'}`}>{tab.icon}</span>
                <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {partners.filter(p => p.supplier_category === tab.id).length}
                </span>
              </button>
            ))}
          </nav>

          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <span className="material-icons-outlined text-gray-400 text-xs">filter_list</span>
            </span>
            <input
              type="text"
              placeholder="PESQUISAR NESTA CATEGORIA..."
              className="block w-full pl-8 pr-3 border border-gray-300 focus:ring-0 focus:border-emerald-500 rounded text-[10px] h-7 font-black uppercase placeholder:text-gray-300 tracking-tight shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Dense Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                {['DADOS DO FORNECEDOR', 'DOCUMENTO (CNPJ/CPF)', 'TELEFONE/WHATSAPP', 'E-MAIL DE CONTATO', 'AÇÕES'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-left ${i === 4 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-icons-outlined animate-spin text-emerald-500 text-2xl">sync</span>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Sincronizando fornecedores...</p>
                    </div>
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                    <span className="material-icons-outlined text-gray-200 text-4xl mb-2">not_interested</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum registro nesta categoria</p>
                  </td>
                </tr>
              ) : (
                currentData.map((c, i) => (
                  <tr key={i} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-sm border ${i % 2 === 0 ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-white'}`}>
                          {c.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-gray-800 uppercase truncate max-w-[280px] leading-tight group-hover:text-emerald-600 transition-colors">
                            {c.name}
                          </span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{c.supplier_category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-gray-600">{c.doc || '-'}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-gray-600">{c.phone || '-'}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-bold text-emerald-600/70 lowercase hover:underline underline-offset-2">{c.email || '-'}</span>
                    </td>
                    <td className="px-4 py-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Link
                          to={`/cadastros/editar/${c.id}?tipo=FORNECEDOR`}
                          className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                        >
                          <span className="material-icons-outlined text-sm">edit</span>
                        </Link>
                        {hasPermission('canDelete') && (
                          <button
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            <span className="material-icons-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dense Pagination */}
        <div className="bg-gray-50/50 border-t border-gray-200 px-4 py-2 flex items-center justify-between">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            REGISTROS ENCONTRADOS: <span className="text-gray-900">{currentData.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <nav className="inline-flex rounded shadow-sm overflow-hidden" aria-label="Pagination">
              <button className="px-1 py-1 border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 transition-colors">
                <span className="material-icons-outlined text-xs leading-none">chevron_left</span>
              </button>
              <button className="z-10 bg-emerald-600 border border-emerald-600 text-white px-2.5 py-1 text-[9px] font-black">1</button>
              <button className="px-1 py-1 border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 transition-colors">
                <span className="material-icons-outlined text-xs leading-none">chevron_right</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;
