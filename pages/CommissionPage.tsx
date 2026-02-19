import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatMonthYear } from '../src/utils/dateUtils';
import { toast } from 'sonner';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CommissionPage: React.FC = () => {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissions();
  }, [month, year]);

  const fetchCommissions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Calculate start and end date of the selected month
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0).toISOString();

      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          orders (
            order_number,
            partners (
              name
            )
          )
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar comissões:', error);
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        setErrorMsg('ERRO DE CONFIGURAÇÃO: A tabela de comissões não foi encontrada. Por favor, execute o script "supabase/migrations/002_commissions.sql" no SQL Editor do Supabase.');
      } else {
        setErrorMsg(`Erro ao carregar comissões: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const totalCommissions = commissions.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const sellers = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04', 'VENDAS 05'];
  const sellerStats = sellers.map(seller => ({
    name: seller,
    total: commissions.filter(c => c.salesperson === seller).reduce((acc, curr) => acc + (curr.amount || 0), 0),
    pending: commissions.filter(c => c.salesperson === seller && c.status === 'PENDING').reduce((acc, curr) => acc + (curr.amount || 0), 0)
  }));
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null);

  const togglePaidStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
      const { error } = await supabase.from('commissions').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      fetchCommissions();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const payAllForSeller = async (seller: string) => {
    if (!window.confirm(`Deseja marcar TODAS as comissões pendentes de ${seller} neste mês como PAGAS?`)) return;
    try {
      const pendingIds = commissions
        .filter(c => c.salesperson === seller && c.status === 'PENDING')
        .map(c => c.id);

      if (pendingIds.length === 0) return;

      const { error } = await supabase.from('commissions').update({ status: 'PAID' }).in('id', pendingIds);
      if (error) throw error;
      fetchCommissions();
    } catch (err) {
      console.error('Erro ao pagar comissões:', err);
    }
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<any>(null);
  const [editForm, setEditForm] = useState({ salesperson: '', amount: 0, description: '' });

  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitForm, setSplitForm] = useState({
    percentage: 50,
    amount: 0,
    otherSeller: 'VENDAS 01'
  });

  const openEditModal = (comm: any) => {
    setEditingComm(comm);
    setEditForm({
      salesperson: comm.salesperson,
      amount: comm.amount,
      description: comm.description || ''
    });
    setIsEditModalOpen(true);
  };

  const openSplitModal = (comm: any) => {
    setEditingComm(comm);
    setSplitForm({
      percentage: 50,
      amount: comm.amount * 0.5,
      otherSeller: sellers.find(s => s !== comm.salesperson) || 'VENDAS 01'
    });
    setIsSplitModalOpen(true);
  };

  const calculateSplitByPercent = (percent: number) => {
    if (!editingComm) return;
    const amount = (editingComm.amount * percent) / 100;
    setSplitForm({ ...splitForm, percentage: percent, amount });
  };

  const calculateSplitByAmount = (amount: number) => {
    if (!editingComm) return;
    const percentage = (amount / editingComm.amount) * 100;
    setSplitForm({ ...splitForm, amount, percentage });
  };

  const saveEditValue = async () => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({
          salesperson: editForm.salesperson,
          amount: editForm.amount,
          description: editForm.description
        })
        .eq('id', editingComm.id);

      if (error) throw error;
      toast.success('Comissão atualizada!');
      setIsEditModalOpen(false);
      fetchCommissions();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
  };

  const splitCommission = async () => {
    if (!editingComm) return;
    const splitAmount = splitForm.amount;
    const otherSeller = splitForm.otherSeller;

    if (splitAmount <= 0 || splitAmount >= editingComm.amount) {
      toast.error("Valor inválido: deve ser maior que 0 e menor que o total atual.");
      return;
    }

    if (otherSeller === editingComm.salesperson) {
      toast.error("Selecione um vendedor diferente.");
      return;
    }

    try {
      // 1. Update current
      const { error: err1 } = await supabase
        .from('commissions')
        .update({
          amount: editingComm.amount - splitAmount,
          description: (editingComm.description ? editingComm.description + ' | ' : '') + `Transferido ${formatCurrency(splitAmount)} (${splitForm.percentage.toFixed(1)}%) para ${otherSeller}`
        })
        .eq('id', editingComm.id);
      if (err1) throw err1;

      // 2. Insert new
      const { error: err2 } = await supabase
        .from('commissions')
        .insert([{
          order_id: editingComm.order_id,
          salesperson: otherSeller,
          amount: splitAmount,
          type: editingComm.type,
          status: 'PENDING',
          description: `Parte recebida de ${editingComm.salesperson} (${splitForm.percentage.toFixed(1)}%).`
        }]);
      if (err2) throw err2;

      toast.success('Divisão realizada com sucesso!');
      setIsSplitModalOpen(false);
      fetchCommissions();
    } catch (e: any) {
      toast.error('Erro ao dividir: ' + e.message);
    }
  };

  const filteredCommissions = selectedSeller
    ? commissions.filter(c => c.salesperson === selectedSeller)
    : commissions;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      {errorMsg && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-md" role="alert">
          <p className="font-bold">Atenção</p>
          <p>{errorMsg}</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900 uppercase flex items-center gap-3">
          <span className="material-icons-outlined text-blue-500 text-3xl">payments</span>
          Gestão de Comissões
        </h2>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Mês</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="form-select rounded-lg border-gray-300 text-sm font-bold"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {formatMonthYear(i + 1, year).split(' DE ')[0]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Ano</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="form-select rounded-lg border-gray-300 text-sm font-bold"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-bold text-gray-400 uppercase">Total de Comissões</p>
          <p className="text-2xl font-black text-green-500">{formatCurrency(totalCommissions)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {sellerStats.map(stat => (
          <div
            key={stat.name}
            className={`p-4 rounded-xl border transition-all ${selectedSeller === stat.name ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-2" onClick={() => setSelectedSeller(selectedSeller === stat.name ? null : stat.name)}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.name}</p>
              {selectedSeller === stat.name && <span className="material-icons-outlined text-blue-500 text-sm">filter_alt</span>}
            </div>
            <div className="mb-3" onClick={() => setSelectedSeller(selectedSeller === stat.name ? null : stat.name)}>
              <p className="text-xl font-black text-gray-800">{formatCurrency(stat.total)}</p>
              {stat.pending > 0 && (
                <p className="text-[10px] font-bold text-orange-500 uppercase">Pendente: {formatCurrency(stat.pending)}</p>
              )}
            </div>
            {stat.pending > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); payAllForSeller(stat.name); }}
                className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-bold uppercase transition-colors"
              >
                Pagar Tudo
              </button>
            )}
            {stat.pending === 0 && stat.total > 0 && (
              <div className="w-full py-1.5 bg-gray-100 text-gray-400 rounded text-[10px] font-bold uppercase text-center">
                Tudo Pago
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Pedido</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Comissão</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Carregando...</td>
                </tr>
              ) : filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Nenhuma comissão encontrada neste período.</td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{comm.salesperson}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-bold">
                      #{comm.orders?.order_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{comm.orders?.partners?.name || 'Cliente Removido'}</div>
                      {comm.description && <div className="text-[10px] text-gray-400 italic max-w-[200px] truncate">{comm.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => togglePaidStatus(comm.id, comm.status)}
                        className={`px-3 py-1 text-[10px] font-black rounded-full transition-colors ${comm.status === 'PAID' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                      >
                        {comm.status === 'PENDING' ? 'PENDENTE' : 'PAGO'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                      {formatCurrency(comm.amount)}
                    </td>
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openEditModal(comm)}
                        className="p-1 px-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all flex items-center gap-1"
                        title="Editar"
                      >
                        <span className="material-icons-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => openSplitModal(comm)}
                        className="p-1 px-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all flex items-center gap-1"
                        title="Dividir"
                      >
                        <span className="material-icons-outlined text-sm">call_split</span>
                      </button>
                    </div>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase">Editar Comissão</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Vendedor</label>
                <select
                  className="form-select w-full rounded-lg border-gray-300"
                  value={editForm.salesperson}
                  onChange={e => setEditForm({ ...editForm, salesperson: e.target.value })}
                >
                  {sellers.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Valor da Comissão</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input w-full rounded-lg border-gray-300"
                  value={editForm.amount}
                  onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nota de Explicação</label>
                <textarea
                  className="form-textarea w-full rounded-lg border-gray-300"
                  rows={3}
                  placeholder="Explique o motivo do ajuste..."
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold uppercase text-xs hover:bg-gray-200 transition-all">Cancelar</button>
              <button onClick={saveEditValue} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Split Modal */}
      {isSplitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-1 uppercase tracking-wider text-blue-600">Dividir Comissão</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">Transfira parte deste ganho para outro vendedor</p>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-blue-700">Total Atual</span>
                <span className="font-black text-blue-800">{formatCurrency(editingComm?.amount || 0)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Em Porcentagem (%)</label>
                  <input
                    type="number" min="1" max="99"
                    className="form-input w-full rounded-xl border-gray-300 font-bold text-blue-600 focus:ring-blue-500 focus:border-blue-500"
                    value={splitForm.percentage}
                    onChange={e => calculateSplitByPercent(parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Em Valor (R$)</label>
                  <input
                    type="number" step="0.01"
                    className="form-input w-full rounded-xl border-gray-300 font-bold text-blue-600 focus:ring-blue-500 focus:border-blue-500"
                    value={splitForm.amount}
                    onChange={e => calculateSplitByAmount(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Transferir para o Vendedor</label>
                <select
                  className="form-select w-full rounded-xl border-gray-300 font-bold text-gray-700"
                  value={splitForm.otherSeller}
                  onChange={e => setSplitForm({ ...splitForm, otherSeller: e.target.value })}
                >
                  {sellers.map(s => (
                    <option key={s} value={s} disabled={s === editingComm?.salesperson}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400">
                  <span>Saldo Restante para {editingComm?.salesperson}</span>
                  <span>{formatCurrency((editingComm?.amount || 0) - splitForm.amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsSplitModalOpen(false)}
                className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px] hover:text-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={splitCommission}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px] shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                Confirmar Divisão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionPage;
