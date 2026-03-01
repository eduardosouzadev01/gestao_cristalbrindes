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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center gap-3">
            <span className="material-icons-outlined text-emerald-500 text-3xl">local_shipping</span>
            Gerenciamento de Fornecedores
          </h2>
          <p className="mt-1 text-sm text-gray-500">Visualize e gerencie seus parceiros de negócio divididos por categorias.</p>
        </div>
        <Link
          to="/cadastros/novo?tipo=FORNECEDOR"
          className="ml-3 inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
        >
          <span className="material-icons-outlined mr-2">add</span>
          Adicionar Fornecedor
        </Link>
      </div>

      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab('PRODUTOS')}
              className={`${activeTab === 'PRODUTOS' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-gray-500'} border-b-2 font-bold text-sm flex items-center gap-2 pb-2 transition-all`}
            >
              Produtos <span className={`py-0.5 px-2.5 rounded-full text-xs ${activeTab === 'PRODUTOS' ? 'bg-emerald-100 text-emerald-500' : 'bg-gray-100 text-gray-500'}`}>{partners.filter(p => p.supplier_category === 'PRODUTOS').length}</span>
            </button>
            <button
              onClick={() => setActiveTab('PERSONALIZACAO')}
              className={`${activeTab === 'PERSONALIZACAO' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-gray-500'} border-b-2 font-bold text-sm flex items-center gap-2 pb-2 transition-all`}
            >
              Personalização <span className={`py-0.5 px-2.5 rounded-full text-xs ${activeTab === 'PERSONALIZACAO' ? 'bg-emerald-100 text-emerald-500' : 'bg-gray-100 text-gray-500'}`}>{partners.filter(p => p.supplier_category === 'PERSONALIZACAO').length}</span>
            </button>
            <button
              onClick={() => setActiveTab('TRANSPORTADORES')}
              className={`${activeTab === 'TRANSPORTADORES' ? 'border-emerald-500 text-emerald-500' : 'border-transparent text-gray-500'} border-b-2 font-bold text-sm flex items-center gap-2 pb-2 transition-all`}
            >
              Transportadores <span className={`py-0.5 px-2.5 rounded-full text-xs ${activeTab === 'TRANSPORTADORES' ? 'bg-emerald-100 text-emerald-500' : 'bg-gray-100 text-gray-500'}`}>{partners.filter(p => p.supplier_category === 'TRANSPORTADORES').length}</span>
            </button>
          </nav>
          <div className="relative max-w-xs w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons-outlined text-gray-400 text-sm">filter_list</span>
            <input
              type="text"
              placeholder="Filtrar por nome, CNPJ..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {['Nome / Razão Social', 'CNPJ/CPF', 'Telefone', 'E-mail', ''].map(h => (
                <th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500">Carregando fornecedores...</td></tr>
            ) : currentData.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-500">Nenhum registro encontrado nesta categoria.</td></tr>
            ) : (
              currentData.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${c.color}`}>{c.initials}</div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                        <div className="text-xs text-emerald-600 font-bold tracking-widest uppercase">{c.supplier_category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.doc || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{c.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.email || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <button className="text-emerald-500 hover:text-emerald-700 mx-2"><span className="material-icons-outlined">edit</span></button>
                    {hasPermission('canDelete') && (
                      <button className="text-gray-400 hover:text-red-600 mx-2"><span className="material-icons-outlined">delete</span></button>
                    )}
                  </td>
                </tr>
              )))}
          </tbody>
        </table>

        <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Mostrando <span className="font-medium">{currentData.length > 0 ? 1 : 0}</span> a <span className="font-medium">{currentData.length}</span> de <span className="font-medium">{currentData.length}</span> resultados
          </p>
          <nav className="inline-flex rounded-md shadow-sm -space-x-px">
            <button className="px-2 py-2 rounded-l-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"><span className="material-icons-outlined text-sm">chevron_left</span></button>
            <button className="bg-emerald-50 border-emerald-500 text-emerald-500 px-4 py-2 border text-sm font-medium">1</button>
            <button className="px-2 py-2 rounded-r-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"><span className="material-icons-outlined text-sm">chevron_right</span></button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;
