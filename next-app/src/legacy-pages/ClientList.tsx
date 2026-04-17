import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

const ClientList: React.FC = () => {
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
      let query = supabase.from('partners').select('*').eq('type', 'CLIENTE');

      if (search && search.trim()) {
        const s = search.trim().replace(/"/g, '""');
        query = query.or(`name.ilike."%${s}%",doc.ilike."%${s}%",phone.ilike."%${s}%",email.ilike."%${s}%",salesperson.ilike."%${s}%"`);
      }

      const { data, error } = await query.order('name').limit(1000);

      if (error) throw error;
      if (data) {
        setPartners(data.map(p => ({
          ...p,
          initials: p.name.substring(0, 2).toUpperCase(),
          color: 'bg-blue-100 text-blue-600',
          type: p.type
        })));
      }
    } catch (err) {
      console.error('Erro ao buscar parceiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentData = partners;

  return (
    <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black leading-none text-gray-900 uppercase tracking-tighter flex items-center gap-2">
            <span className="material-icons-outlined text-blue-600 text-2xl">people</span>
            GERENCIAMENTO DE CLIENTES
          </h2>
          <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base de dados de clientes e parceiros comerciais</p>
        </div>
        <Link
          to="/cadastros/novo?tipo=CLIENTE"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded shadow-sm text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all uppercase tracking-widest"
        >
          <span className="material-icons-outlined mr-2 text-sm">add</span>
          Novo Cliente
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded border border-gray-200 p-2.5 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            Total Custodiado:
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{partners.length}</span>
          </h3>
        </div>

        <div className="relative max-w-sm w-full">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <span className="material-icons-outlined text-gray-400 text-sm">search</span>
          </span>
          <input
            type="text"
            placeholder="NOME, CNPJ, TEL OU E-MAIL..."
            className="block w-full !pl-14 pr-3 border border-gray-300 focus:ring-0 focus:border-blue-500 rounded text-xs h-8 font-bold placeholder:text-gray-300 uppercase tracking-tight shadow-inner bg-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white border-b border-gray-100">
              <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                {['NOME / RAZÃO SOCIAL', 'CNPJ/CPF', 'CONTATO TELEFÔNICO', 'E-MAIL CORPORATIVO', 'GESTOR RESPONSÁVEL', 'AÇÕES'].map((h, i) => (
                  <th key={h} className={`px-4 py-2 text-left ${i === 5 ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-icons-outlined animate-spin text-blue-500 text-2xl">sync</span>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Aguarde, processando dados...</p>
                    </div>
                  </td>
                </tr>
              ) : partners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="material-icons-outlined text-gray-200 text-4xl mb-2">person_off</span>
                    <p className="text-[10px] font-black text-gray-400 uppercase italic">Nenhum registro localizado</p>
                  </td>
                </tr>
              ) : (
                partners.map((c, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-1.5">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-sm border ${i % 2 === 0 ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
                          {c.initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-black text-gray-800 uppercase truncate max-w-[250px] leading-tight group-hover:text-blue-600 transition-colors">
                            {c.name}
                          </span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {c.id?.substring(0, 8)}</span>
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
                      <span className="text-[10px] font-bold text-blue-600/70 lowercase hover:underline underline-offset-2">{c.email || '-'}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      {c.salesperson ? (
                        <span className="inline-flex px-2 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700 text-[8px] font-black uppercase shadow-sm">
                          {c.salesperson}
                        </span>
                      ) : (
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest italic">NÃO ATRIBUÍDO</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Link
                          to={`/cadastros/editar/${c.id}?tipo=CLIENTE`}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar Registro"
                        >
                          <span className="material-icons-outlined text-sm">edit</span>
                        </Link>
                        {hasPermission('canDelete') && (
                          <button
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Excluir Registro"
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

        {/* Footer / Pagination */}
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            REGISTROS ENCONTRADOS: <span className="text-gray-900">{partners.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <nav className="inline-flex rounded shadow-sm overflow-hidden" aria-label="Pagination">
              <button className="px-1 py-1 border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 transition-colors">
                <span className="material-icons-outlined text-sm leading-none">chevron_left</span>
              </button>
              <button className="z-10 bg-blue-600 border border-blue-600 text-white px-2.5 py-1 text-[9px] font-black">1</button>
              <button className="px-1 py-1 border border-gray-300 bg-white text-gray-400 hover:bg-gray-50 transition-colors">
                <span className="material-icons-outlined text-sm leading-none">chevron_right</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientList;
