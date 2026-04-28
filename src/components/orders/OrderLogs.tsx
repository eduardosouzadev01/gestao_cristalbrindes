'use client';

import React from 'react';

interface Log {
    user: string;
    msg: string;
    time: string;
}

interface OrderLogsProps {
    logs: Log[];
}

export default function OrderLogs({ logs }: OrderLogsProps) {
    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-6 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                <div className="w-8 h-8 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
                    <span className="material-icons-outlined text-sm">history</span>
                </div>
                <div>
                    <h3 className="text-[10px] font-medium text-[#111827] uppercase tracking-widest">Histórico do Pedido</h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 opacity-40">
                        <span className="material-icons-outlined text-3xl mb-2">event_note</span>
                        <p className="text-[10px] font-medium uppercase tracking-widest">Nenhum log registrado</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 mt-1"></div>
                                <div className="w-px flex-1 bg-slate-100 my-1"></div>
                            </div>
                            <div className="pb-1">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-medium text-[#0F6CBD] uppercase">{log.user.split('@')[0]}</span>
                                    <span className="text-[9px] font-medium text-slate-300">{log.time}</span>
                                </div>
                                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{log.msg}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
