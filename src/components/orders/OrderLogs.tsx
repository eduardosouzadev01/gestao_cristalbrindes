'use client';

import React, { useState } from 'react';

interface Log {
    user: string;
    msg: string;
    time: string;
}

interface OrderLogsProps {
    logs: Log[];
    addLog: (msg: string) => void;
}

export default function OrderLogs({ logs, addLog }: OrderLogsProps) {
    const [note, setNote] = useState('');

    const handleAddNote = () => {
        if (note.trim()) {
            addLog(note);
            setNote('');
        }
    };

    return (
        <div className="bg-white rounded-md border border-[#E3E3E4] flex flex-col p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#F0F7FF] text-[#0F6CBD] flex items-center justify-center">
                    <span className="material-icons-outlined text-sm">history</span>
                </div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Histórico</h3>
            </div>

            <div className="relative space-y-8 py-4">
                {/* Vertical Timeline Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-slate-50 -translate-x-1/2"></div>

                {logs.length === 0 ? (
                    <p className="text-[10px] text-slate-300 italic text-center py-4 relative z-10 bg-white mx-auto w-fit px-4">Nenhum evento registrado</p>
                ) : (
                    logs.map((log, i) => {
                        const isEven = i % 2 === 0;
                        return (
                            <div key={i} className={`flex items-center gap-4 relative z-10 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                                {/* Message Bubble */}
                                <div className={`w-[45%] p-4 bg-white border border-[#E3E3E4] rounded-md shadow-sm space-y-1 relative ${isEven ? 'text-left' : 'text-left'}`}>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${isEven ? 'text-[#0F6CBD]' : 'text-[#10B981]'}`}>
                                            {log.user.split('@')[0]}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-400">{log.time}</span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                                        {log.msg}
                                    </p>
                                </div>

                                {/* Timeline Dot */}
                                <div className={`w-3 h-3 rounded-full border-2 border-white ring-4 ring-slate-50 shrink-0 ${isEven ? 'bg-[#0F6CBD]' : 'bg-[#10B981]'}`}></div>

                                {/* Spacer for the other side */}
                                <div className="w-[45%]"></div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Note Input (Screenshot 2) */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <div className="flex-1 relative">
                    <input 
                        className="w-full h-12 pl-4 pr-12 bg-white border border-[#E3E3E4] rounded-md text-xs font-medium text-slate-700 placeholder:text-slate-300 outline-none focus:border-[#0F6CBD] transition-all"
                        placeholder="Adicionar nota..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                    />
                </div>
                <button 
                    onClick={handleAddNote}
                    className="w-12 h-12 bg-[#B1D1E9] text-white rounded-md flex items-center justify-center hover:bg-[#0F6CBD] transition-all shadow-sm"
                >
                    <span className="material-icons-outlined text-xl rotate-[-30deg]">send</span>
                </button>
            </div>
        </div>
    );
}

