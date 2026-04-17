import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatMonthYear } from '../src/utils/dateUtils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CommissionPage: React.FC = () => {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const sellers = ['VENDAS 01', 'VENDAS 02', 'VENDAS 03', 'VENDAS 04'];
  const sellerStats = sellers.map(seller => ({
    name: seller,
    total: commissions.filter(c => c.salesperson === seller).reduce((acc, curr) => acc + (curr.amount || 0), 0),
    pending: commissions.filter(c => c.salesperson === seller && c.status === 'PENDING').reduce((acc, curr) => acc + (curr.amount || 0), 0)
  }));

  const [yearlyStats, setYearlyStats] = useState<any[]>([]);
  const [showYearlyAnalysis, setShowYearlyAnalysis] = useState(false);

  useEffect(() => {
    fetchYearlyStats();
  }, [year]);

  const fetchYearlyStats = async () => {
    try {
      const startDate = `${year}-01-01T00:00:00Z`;
      const endDate = `${year}-12-31T23:59:59Z`;
      const { data } = await supabase.from('commissions').select('amount, created_at').gte('created_at', startDate).lte('created_at', endDate);
      if (data) {
        const months = Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          label: formatMonthYear(i + 1, year).split(' DE ')[0],
          total: data.filter(c => new Date(c.created_at).getMonth() === i).reduce((acc, curr) => acc + (curr.amount || 0), 0)
        }));
        setYearlyStats(months);
      }
    } catch (e) {
      console.error(e);
    }
  };

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
    <div className="max-w-[1920px] w-full mx-auto px-4 py-4 space-y-4">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm animate-pulse" role="alert">
          <span className="material-icons-outlined text-red-500">error_outline</span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest">ALERTA DE SISTEMA</p>
            <p className="text-[11px] font-bold mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Optimized Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center shadow-sm">
            <span className="material-icons-outlined text-white text-lg">payments</span>
          </div>
          <div>
            <h1 className="text-xl font-black leading-none text-gray-900 uppercase tracking-tighter">GESTÃO DE COMISSÕES</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Controle financeiro e performance de vendas</p>
          </div>
        </div>

        <div className="flex items-center gap-6 bg-white px-4 py-2 rounded border border-gray-200 shadow-sm">
          <div className="text-right">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">TOTAL ACUMULADO (MÊS)</p>
            <p className="text-lg font-black text-emerald-600 leading-none">{formatCurrency(totalCommissions)}</p>
          </div>
          <button
            onClick={() => setShowYearlyAnalysis(!showYearlyAnalysis)}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all ${showYearlyAnalysis ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'}`}
            title="Análise Anual"
          >
            <span className="material-icons-outlined text-sm">analytics</span>
          </button>
        </div>
      </div>

      {/* Compact Filters & Performance */}
      <div className="flex flex-col gap-4">
        <div className="bg-white p-2.5 rounded border border-gray-200 shadow-sm flex items-end gap-3">
          <div className="w-32">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">MÊS DE REFERÊNCIA</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-2 border border-gray-300 rounded h-8 text-[10px] font-black uppercase tracking-widest bg-white"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {formatMonthYear(i + 1, year).split(' DE ')[0]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">ANO</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-2 border border-gray-300 rounded h-8 text-[10px] font-black uppercase tracking-widest bg-white"
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Yearly Analysis Panel */}
        {showYearlyAnalysis && (
          <div className="bg-white p-4 rounded border border-blue-100 shadow-sm animate-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                <span className="material-icons-outlined text-blue-500 text-sm">trending_up</span>
                PERFORMANCE ANUAL {year}
              </h3>
              <span className="text-[9px] font-black text-gray-400 uppercase bg-white px-2 py-0.5 rounded border border-gray-100">
                TOTAL: {formatCurrency(yearlyStats.reduce((acc, curr) => acc + curr.total, 0))}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
              {yearlyStats.map((m) => {
                const max = Math.max(...yearlyStats.map(s => s.total)) || 1;
                const percent = (m.total / max) * 100;
                return (
                  <div key={m.month} className="group cursor-pointer">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[8px] font-black text-gray-500 uppercase">{m.label}</span>
                      <span className={`text-[9px] font-black ${m.total > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{formatCurrency(m.total)}</span>
                    </div>
                    <div className="h-1 w-full bg-white rounded-full overflow-hidden border border-gray-100">
                      <div
                        className={`h-full transition-all duration-700 ease-out ${m.month === month ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]' : 'bg-gray-200 group-hover:bg-blue-300'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Seller Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {sellerStats.map(stat => (
          <div
            key={stat.name}
            onClick={() => setSelectedSeller(selectedSeller === stat.name ? null : stat.name)}
            className={`cursor-pointer p-3 rounded border transition-all relative overflow-hidden group ${selectedSeller === stat.name ? 'bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-blue-300'}`}
          >
            <div className="flex justify-between items-start mb-1.5">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{stat.name}</p>
              {selectedSeller === stat.name && <span className="material-icons-outlined text-blue-600 text-[14px]">filter_alt</span>}
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-gray-900 leading-tight">{formatCurrency(stat.total)}</p>
              {stat.pending > 0 && (
                <p className="text-[8px] font-bold text-orange-600 uppercase tracking-tight flex items-center gap-1">
                  <span className="w-1 h-1 bg-orange-600 rounded-full animate-pulse"></span>
                  PENDENTE: {formatCurrency(stat.pending)}
                </p>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100/50">
              {stat.pending > 0 ? (
                <button
                  onClick={(e) => { e.stopPropagation(); payAllForSeller(stat.name); }}
                  className="w-full py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[8px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95"
                >
                  PAGAR TUDO
                </button>
              ) : stat.total > 0 ? (
                <div className="w-full py-1 bg-white text-gray-400 rounded text-[8px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1">
                  <span className="material-icons-outlined text-[10px]">check_circle</span>
                  PAGO
                </div>
              ) : (
                <div className="w-full py-1 transparent text-transparent rounded text-[8px]">.</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white border-b border-gray-100">
              <tr className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-4 py-2 text-left">VENDEDOR</th>
                <th className="px-4 py-2 text-left">PEDIDO</th>
                <th className="px-4 py-2 text-left">CLIENTE / DESCRIÇÃO</th>
                <th className="px-4 py-2 text-center">STATUS</th>
                <th className="px-4 py-2 text-right">VALOR COMISSÃO</th>
                <th className="px-4 py-2 text-center">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center pointer-events-none">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-icons-outlined animate-spin text-blue-600 text-2xl">sync</span>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Processando extrato...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-[10px] font-black text-gray-300 uppercase italic">Nenhuma comissão identificada no período</p>
                  </td>
                </tr>
              ) : (
                filteredCommissions.map((comm) => (
                  <tr key={comm.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <span className="text-[10px] font-black text-gray-700 uppercase">{comm.salesperson}</span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <button
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 underline underline-offset-2 decoration-blue-200"
                        onClick={() => comm.order_id ? navigate(`/pedido/${comm.order_id}`) : null}
                      >
                        #{comm.orders?.order_number || '---'}
                      </button>
                    </td>
                    <td className="px-4 py-1.5">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-gray-900 uppercase truncate max-w-[250px] leading-tight">
                          {comm.orders?.partners?.name || '---'}
                        </span>
                        {comm.description && (
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter truncate max-w-[250px] mt-0.5 italic">
                            {comm.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => togglePaidStatus(comm.id, comm.status)}
                        className={`px-2 py-0.5 text-[8px] font-black rounded border transition-all shadow-sm ${comm.status === 'PAID' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}
                      >
                        {comm.status === 'PENDING' ? 'PENDENTE' : 'LIQUIDADO'}
                      </button>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap text-right">
                      <span className="text-[10px] font-black text-emerald-600">
                        {formatCurrency(comm.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-1.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 select-none">
                        <button
                          onClick={() => openEditModal(comm)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                          title="Ajustar"
                        >
                          <span className="material-icons-outlined text-[16px]">edit_note</span>
                        </button>
                        <button
                          onClick={() => openSplitModal(comm)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-all"
                          title="Dividir"
                        >
                          <span className="material-icons-outlined text-[16px]">call_split</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimized Modals */}
      {(isEditModalOpen || isSplitModalOpen) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-2xl overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-200">
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">
                {isEditModalOpen ? 'AJUSTAR COMISSÃO' : 'DIVIDIR GANHOS'}
              </h3>
              <button
                onClick={() => { setIsEditModalOpen(false); setIsSplitModalOpen(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-icons-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {isEditModalOpen ? (
                /* Edit Form */
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">VENDEDOR</label>
                      <select
                        className="w-full px-2 border border-gray-300 rounded h-8 text-[10px] font-black uppercase tracking-widest bg-white"
                        value={editForm.salesperson}
                        onChange={e => setEditForm({ ...editForm, salesperson: e.target.value })}
                      >
                        {sellers.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">VALOR (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 border border-gray-300 rounded h-8 text-xs font-black bg-white"
                        value={editForm.amount}
                        onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">MOTIVO DO AJUSTE</label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded text-[10px] font-bold bg-white placeholder:text-gray-300"
                        rows={2}
                        placeholder="Descreva o motivo da alteração..."
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      onClick={saveEditValue}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                    >
                      SALVAR ALTERAÇÕES
                    </button>
                  </div>
                </>
              ) : (
                /* Split Form */
                <>
                  <div className="bg-blue-50 border border-blue-100 p-2 rounded flex justify-between items-center mb-4">
                    <span className="text-[8px] font-black text-blue-700 uppercase tracking-widest">TOTAL ORIGINAL</span>
                    <span className="text-xs font-black text-blue-800">{formatCurrency(editingComm?.amount || 0)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">% TRANSFERIR</label>
                      <div className="relative">
                        <input
                          type="number" min="1" max="99"
                          className="w-full px-2 pr-6 border border-gray-300 rounded h-8 text-xs font-black text-blue-600 bg-white"
                          value={splitForm.percentage}
                          onChange={e => calculateSplitByPercent(parseFloat(e.target.value))}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">VALOR (R$)</label>
                      <input
                        type="number" step="0.01"
                        className="w-full px-2 border border-gray-300 rounded h-8 text-xs font-black text-blue-600 bg-white"
                        value={splitForm.amount}
                        onChange={e => calculateSplitByAmount(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">DESTINO DA TRANSFERÊNCIA</label>
                    <select
                      className="w-full px-2 border border-gray-300 rounded h-8 text-[10px] font-black uppercase tracking-widest bg-white"
                      value={splitForm.otherSeller}
                      onChange={e => setSplitForm({ ...splitForm, otherSeller: e.target.value })}
                    >
                      {sellers.map(s => (
                        <option key={s} value={s} disabled={s === editingComm?.salesperson}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-white border border-gray-200 p-2 rounded flex justify-between items-center opacity-70">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none">SEU SALDO<br />RESTANTE</span>
                    <span className="text-[10px] font-black text-gray-700">{formatCurrency((editingComm?.amount || 0) - splitForm.amount)}</span>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={splitCommission}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100 transition-all active:scale-[0.98]"
                    >
                      CONFIRMAR DIVISÃO
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionPage;
