
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

const CalculationFactors: React.FC = () => {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFactors();
  }, []);

  const fetchFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('calculation_factors').select('*').order('created_at', { ascending: false });
    if (error) {
      toast.error('Erro ao carregar fatores.');
    } else {
      setFactors(data || []);
    }
    setLoading(false);
  };

  const deleteFactor = async (id: string, name: string) => {
    if (!window.confirm(`Excluir o fator "${name}"?`)) return;
    const { error } = await supabase.from('calculation_factors').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      toast.success('Fator excluído.');
      fetchFactors();
    }
  };

  const calculateMultiplier = (f: any) => {
    const val = 1 + (f.tax_percent || 0) / 100 + (f.contingency_percent || 0) / 100 + (f.margin_percent || 0) / 100;
    return val.toFixed(2) + 'x';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-500 text-3xl">calculate</span>
            Fatores de Cálculo
          </h2>
          <p className="mt-1 text-sm text-gray-500">Gerencie os multiplicadores e índices aplicados na precificação dos produtos.</p>
        </div>
        <Link to="/configuracoes/fatores/novo" className="ml-3 inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors">
          <span className="material-symbols-outlined mr-2">add</span> Adicionar Fator
        </Link>
      </div>

      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
        <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-500 py-1 px-3 rounded-md text-xs font-bold uppercase">Total</span>
            <span className="text-gray-900 font-semibold">{factors.length} Fatores</span>
          </div>
          <div className="relative max-w-xs w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[20px]">filter_list</span>
            <input type="text" placeholder="Filtrar fatores..." className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">Nome do Fator</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Descrição</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Multiplicador</th>
              <th className="relative px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {factors.map((f, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600`}><span className="material-symbols-outlined">percent</span></div>
                    <div className="ml-4">
                      <div className="text-sm font-bold text-gray-900">{f.name}</div>
                      {/* Removing hardcoded status since DB doesn't have it, assuming Active */}
                      <div className="text-xs font-medium text-green-600">Ativo</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4"><p className="text-sm text-gray-500 line-clamp-2">{f.description}</p></td>
                <td className="px-6 py-4"><span className="inline-flex px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700">{calculateMultiplier(f)}</span></td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/configuracoes/fatores/editar/${f.id}`} className="text-gray-400 hover:text-blue-500 mx-2 inline-block"><span className="material-symbols-outlined">edit</span></Link>
                  <button onClick={() => deleteFactor(f.id, f.name)} className="text-gray-400 hover:text-red-600 mx-2"><span className="material-symbols-outlined">delete</span></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalculationFactors;
