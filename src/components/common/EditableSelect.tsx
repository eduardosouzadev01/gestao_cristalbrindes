'use client';

import React from 'react';

interface EditableSelectProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    required?: boolean;
}

export const EditableSelect: React.FC<EditableSelectProps> = ({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder, 
    disabled, 
    className,
    required
}) => {
    const [showOptions, setShowOptions] = React.useState(false);

    return (
        <div className={`space-y-1 ${className}`}>
            <label className="block text-[9px] font-medium text-[#717171] uppercase ml-1 tracking-wider">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
                <input
                    type="text"
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setShowOptions(true)}
                    onBlur={() => setTimeout(() => setShowOptions(false), 200)}
                    placeholder={placeholder}
                    className="w-full h-11 pl-3 pr-10 bg-white border border-slate-300 rounded-md text-[12px] font-medium text-slate-800 outline-none focus:ring-1 focus:ring-slate-800 focus:border-slate-800 transition-all"
                />
                <button 
                    type="button"
                    onClick={() => setShowOptions(!showOptions)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 border-l border-slate-100"
                >
                    <span className="material-icons-outlined text-slate-400 text-base group-hover:text-slate-600 transition-colors">expand_more</span>
                </button>

                {showOptions && !disabled && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-1 duration-200">
                        {options.map((opt, i) => (
                            <button
                                key={i}
                                type="button"
                                className="w-full text-left px-3 py-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                onClick={() => {
                                    onChange(opt);
                                    setShowOptions(false);
                                }}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
