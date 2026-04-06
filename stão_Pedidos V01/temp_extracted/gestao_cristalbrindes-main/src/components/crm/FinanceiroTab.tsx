import React from 'react';

interface FinanceiroTabProps {
    finStats: any;
    month: number;
    year: number;
    selectedSalesperson: string;
    setMonth: (month: number) => void;
    setYear: (year: number) => void;
    setSelectedSalesperson: (salesperson: string) => void;
    formatCurrency: (value: number) => string;
}

export const FinanceiroTab: React.FC<FinanceiroTabProps> = ({
    finStats,
    month,
    year,
    selectedSalesperson,
    setMonth,
    setYear,
    setSelectedSalesperson,
    formatCurrency
}) => {
    return (
        <div className="space-y-8">
            {/* Finance Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap gap-6 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Mês de Referência</label>
                        <select
                            className="form-select rounded-xl border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 min-w-[140px] focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={month}
                            onChange={e => setMonth(parseInt(e.target.value))}
                        >
                            {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                                <option key={i} value={i + 1}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Ano</label>
                        <select
                            className="form-select rounded-xl border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 min-w-[100px] focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={year}
                            onChange={e => setYear(parseInt(e.target.value))}
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Filtrar por Vendedor</label>
                        <select
                            className="form-select rounded-xl border-gray-100 bg-gray-50 text-xs font-bold text-gray-700 min-w-[180px] focus:ring-blue-500 focus:border-blue-500 transition-all"
                            value={selectedSalesperson}
                            onChange={e => setSelectedSalesperson(e.target.value)}
                        >
                            <option value="Todos">Todos os Vendedores</option>
                            <option value="VENDAS 01">VENDAS 01</option>
                            <option value="VENDAS 02">VENDAS 02</option>
                            <option value="VENDAS 03">VENDAS 03</option>
                            <option value="VENDAS 04">VENDAS 04</option>
                            <option value="VENDAS 05">VENDAS 05</option>
                        </select>
                    </div>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 hidden sm:block">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Período Selecionado</p>
                    <p className="text-xs font-black text-blue-600 uppercase">
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][month - 1]} · {year}
                    </p>
                </div>
            </div>

            {/* Finance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-blue-200 transition-all">
                    <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-blue-500 opacity-5 group-hover:opacity-10 transition-opacity">shopping_cart</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vendas (Bruto)</p>
                    <h3 className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(finStats.totalSales)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold">{finStats.orderCount} Pedidos | TM: {formatCurrency(finStats.ticketMedio)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-all">
                    <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-purple-500 opacity-5 group-hover:opacity-10 transition-opacity">payments</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Comissões</p>
                    <h3 className="text-2xl font-black text-purple-600 tracking-tighter">{formatCurrency(finStats.totalCommissions)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase">Devido aos vendedores</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-red-200 transition-all">
                    <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-red-500 opacity-5 group-hover:opacity-10 transition-opacity">money_off</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Despesas Fixas</p>
                    <h3 className="text-2xl font-black text-red-600 tracking-tighter">{formatCurrency(finStats.totalFixedExpenses)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase">Gastos da Unidade</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-green-200 transition-all">
                    <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-green-500 opacity-5 group-hover:opacity-10 transition-opacity">account_balance</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                    <h3 className={`text-2xl font-black tracking-tighter ${finStats.totalNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(finStats.totalNet)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase italic">Estimado (Sem Impostos)</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group hover:border-purple-200 transition-all col-span-1 md:col-span-2 lg:col-span-4">
                    <span className="material-icons-outlined absolute top-2 right-2 text-6xl text-purple-500 opacity-5 group-hover:opacity-10 transition-opacity">savings</span>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Saldo Extra Acumulado (Empresa)</p>
                    <h3 className="text-2xl font-black text-purple-600 tracking-tighter">{formatCurrency(finStats.totalExtra)}</h3>
                    <p className="text-[10px] text-gray-400 mt-2 font-bold whitespace-nowrap uppercase italic">Valores reservados sobre o faturamento</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Products */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 pb-2 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-icons-outlined text-orange-500">emoji_events</span> Produtos Mais Vendidos
                        </div>
                        <span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">Top 5</span>
                    </h3>
                    <div className="space-y-4">
                        {finStats.topProducts.length === 0 ? (
                            <p className="text-gray-400 italic text-center text-xs py-4">Nenhum produto vendido no período.</p>
                        ) : finStats.topProducts.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}</span>
                                    <p className="text-xs font-bold text-gray-700 uppercase group-hover:text-blue-600 transition-colors">{p.name}</p>
                                </div>
                                <span className="text-sm font-black text-gray-900">{formatCurrency(p.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Breakdown */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 pb-2 border-b border-gray-50 flex items-center gap-2">
                        <span className="material-icons-outlined text-blue-500">pie_chart</span> Volume por Status de Pedido
                    </h3>
                    <div className="space-y-4">
                        {finStats.salesByStatus.length === 0 ? (
                            <p className="text-gray-400 italic text-center text-xs py-4">Sem movimentação no período.</p>
                        ) : finStats.salesByStatus.map((s: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between text-[10px] font-bold mb-1 uppercase text-gray-500 tracking-tighter">
                                    <span>{s.status}</span>
                                    <span className="text-gray-900">{formatCurrency(s.total)}</span>
                                </div>
                                <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                                    <div className="bg-blue-500 h-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${(s.total / (finStats.totalSales || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
