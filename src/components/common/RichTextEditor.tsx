import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder,
    disabled: disabledProp,
    readOnly,
    className
}) => {
    const disabled = disabledProp || readOnly;
    const editorRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    // Update editor content when value changes from outside (e.g. initial load)
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string) => {
        document.execCommand(command, false);
        handleInput();
        if (editorRef.current) editorRef.current.focus();
    };

    return (
        <>
            {isExpanded && (
                <div 
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] animate-in fade-in duration-300" 
                    onClick={() => setIsExpanded(false)} 
                />
            )}
            <div className={`flex flex-col border rounded-md overflow-hidden transition-all duration-300 bg-white ${isExpanded ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl h-[60vh] z-[9999] shadow-none border-blue-200' : 'relative h-auto'} ${className}`}>
                {/* Toolbar */}
                <div className="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-gray-100 select-none">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => execCommand('bold')}
                            className="p-1 rounded-md hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                            title="Negrito"
                            disabled={disabled}
                        >
                            <span className="material-icons-outlined text-sm">format_bold</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => execCommand('italic')}
                            className="p-1 rounded-md hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                            title="Itálico"
                            disabled={disabled}
                        >
                            <span className="material-icons-outlined text-sm">format_italic</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => execCommand('underline')}
                            className="p-1 rounded-md hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                            title="Sublinhado"
                            disabled={disabled}
                        >
                            <span className="material-icons-outlined text-sm">format_underlined</span>
                        </button>
                        <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                        <button
                            type="button"
                            onClick={() => execCommand('insertUnorderedList')}
                            className="p-1 rounded-md hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
                            title="Lista"
                            disabled={disabled}
                        >
                            <span className="material-icons-outlined text-sm">format_list_bulleted</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 rounded-md hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
                        title={isExpanded ? "Recolher" : "Expandir"}
                    >
                        <span className="material-icons-outlined text-sm">{isExpanded ? 'fullscreen_exit' : 'fullscreen'}</span>
                    </button>
                </div>

                {/* Editor Area */}
                <div
                    ref={editorRef}
                    contentEditable={!disabled}
                    onInput={handleInput}
                    className={`p-4 text-[11px] outline-none overflow-y-auto bg-white custom-scrollbar leading-[1.4] ${isExpanded ? 'flex-1' : 'min-h-[162px] max-h-[162px]'} ${value && editorRef.current && editorRef.current.scrollHeight > 162 ? 'border-2 border-red-300 bg-red-50/10' : ''}`}
                    style={{ 
                        wordBreak: 'break-word',
                        height: isExpanded ? '100%' : '162px'
                    }}
                />
                
                {/* Character Count & Limit Warning */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${editorRef.current && editorRef.current.scrollHeight > 162 ? 'text-red-500' : 'text-slate-400'}`}>
                            {value.replace(/<[^>]*>?/gm, '').length} Chars | {editorRef.current && Math.round(editorRef.current.scrollHeight / 15.4)} Linhas aprox.
                        </span>
                        {(editorRef.current && editorRef.current.scrollHeight > 162) && (
                            <span className="text-[10px] font-bold text-red-500 uppercase animate-pulse">
                                Conteúdo excede o limite da proposta!
                            </span>
                        )}
                    </div>
                    {isExpanded ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="px-4 py-1 bg-blue-600 text-white rounded-md font-medium text-[10px] uppercase shadow-none hover:bg-blue-700 transition-colors"
                        >
                            Concluir
                        </button>
                    ) : (
                        <span className="text-[9px] text-gray-300 uppercase tracking-widest font-medium">Limite Ideal: 800</span>
                    )}
                </div>

                {/* Placeholder shim */}
                {(!value || value === '<br>') && !isExpanded && (
                    <div className="absolute top-9 left-3 text-gray-400 pointer-events-none text-[10px] italic">
                        {placeholder}
                    </div>
                )}
            </div>
        </>
    );
};

export default RichTextEditor;
