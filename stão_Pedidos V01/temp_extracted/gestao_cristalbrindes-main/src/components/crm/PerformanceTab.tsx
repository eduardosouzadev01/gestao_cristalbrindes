import React from 'react';
import { Lead } from '../../hooks/useCRM';

interface PerformanceTabProps {
    totalBudgets: number;
    totalApproved: number;
    totalValue: number;
    stats: any[];
    recentBudgets: any[];
    formatCurrency: (value: number) => string;
    leads: Lead[];
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({
    totalBudgets,
    totalApproved,
    totalValue,
    stats,
    recentBudgets,
    formatCurrency,
    leads
}) => {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Stats Cards */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Total de Orçamentos</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">{totalBudgets}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                        <span className="material-icons-outlined text-2xl">description</span>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Taxa de Conversão Global</p>
                        <p className="text-3xl font-black text-green-600 mt-1">
                            {totalBudgets > 0 ? ((totalApproved / totalBudgets) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-xl text-green-600">
                        <span className="material-icons-outlined text-2xl">trending_up</span>
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Valor Total em Propostas</p>
                        <p className="text-3xl font-black text-purple-600 mt-1">{formatCurrency(totalValue)}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
                        <span className="material-icons-outlined text-2xl">attach_money</span>
                    </div>
                </div>
            </div>

            {/* Salesperson Performance */}
            <h2 className="text-lg font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                <span className="material-icons-outlined text-gray-400">groups</span> Desempenho por Vendedor
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {stats.length === 0 ? (
                    <p className="text-gray-400 italic col-span-3 text-center py-10">Nenhum dado disponível.</p>
                ) : (
                    stats.map((s) => (
                        <div key={s.name} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:border-purple-300 transition-all">
                            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs border border-purple-200">
                                        {s.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-black text-gray-700 uppercase text-xs">{s.name}</span>
                                </div>
                                <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-1 rounded-full">{s.total} PROPOSTAS</span>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="text-center p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <p className="text-[9px] font-bold text-indigo-600 uppercase mb-1">Atendimento</p>
                                        <p className="text-lg font-black text-indigo-700">{s.atendimento}</p>
                                    </div>
                                    <div className="text-center p-2 bg-orange-50 rounded-lg border border-orange-100">
                                        <p className="text-[9px] font-bold text-orange-600 uppercase mb-1">Orçamento</p>
                                        <p className="text-lg font-black text-orange-700">{s.orcamento}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="text-center p-2 bg-green-50 rounded-lg border border-green-100">
                                        <p className="text-[9px] font-bold text-green-600 uppercase mb-1">Proposta</p>
                                        <p className="text-lg font-black text-green-700">{s.proposta}</p>
                                    </div>
                                    <div className="text-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                                        <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">Aberto</p>
                                        <p className="text-lg font-black text-blue-700">{s.aberto}</p>
                                    </div>
                                    <div className="text-center p-2 bg-pink-50 rounded-lg border border-pink-100">
                                        <p className="text-[9px] font-bold text-pink-600 uppercase mb-1">Entregue</p>
                                        <p className="text-lg font-black text-pink-700">{s.entregue}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Volume de Vendas</span>
                                        <span className="text-sm font-black text-gray-800">{formatCurrency(s.value)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                        <span className="material-icons-outlined text-gray-400">history</span> Atividade Recente
                    </h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Orçamento</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase">Status</th>
                                    <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentBudgets.map((b) => (
                                    <tr key={b.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">#{b.budget_number}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{b.client_id ? 'CLIENTE REGISTRADO' : 'CLIENTE NOVO/PENDENTE'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${b.status === 'PROPOSTA ACEITA' ? 'bg-green-100 text-green-700' :
                                                b.status.includes('RECUSAD') || b.status.includes('CANCEL') ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                                            {formatCurrency(b.total_amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-bold text-gray-800 uppercase mb-4 flex items-center gap-2">
                        <span className="material-icons-outlined text-red-400">cancel</span> Motivos de Perda (Pedido não aprovado)
                    </h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                        <div className="space-y-4">
                            {Array.from(new Set(leads.filter(l => l.status === 'NAO_APROVADO' && l.lost_reason).map(l => l.lost_reason))).length === 0 ? (
                                <p className="text-gray-400 italic text-center py-4">Nenhum motivo registrado ainda.</p>
                            ) : (
                                Object.entries(
                                    leads.filter(l => l.status === 'NAO_APROVADO' && l.lost_reason)
                                        .reduce((acc: any, curr) => {
                                            acc[curr.lost_reason!] = (acc[curr.lost_reason!] || 0) + 1;
                                            return acc;
                                        }, {})
                                ).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([reason, count]) => (
                                    <div key={reason} className="flex flex-col">
                                        <div className="flex justify-between items-center text-xs mb-1">
                                            <span className="font-bold text-gray-700 uppercase">{reason}</span>
                                            <span className="font-black text-gray-400">{count} ocorrências</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full">
                                            <div
                                                className="bg-red-400 h-2 rounded-full"
                                                style={{ width: `${((count as number) / leads.filter(l => l.status === 'NAO_APROVADO').length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
