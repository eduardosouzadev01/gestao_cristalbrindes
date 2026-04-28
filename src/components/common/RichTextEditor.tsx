import React, { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
    value,
    onChange,
    placeholder,
    disabled,
    className
}) => {
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
                    className={`p-4 text-[13px] outline-none overflow-y-auto bg-white custom-scrollbar leading-relaxed ${isExpanded ? 'flex-1' : 'min-h-[60px] max-h-[150px] text-[11px]'}`}
                    style={{ 
                        wordBreak: 'break-word',
                        height: isExpanded ? '100%' : 'auto'
                    }}
                />
                
                {/* Placeholder shim (ContentEditable doesn't support placeholder natively well) */}
                {(!value || value === '<br>') && !isExpanded && (
                    <div className="absolute top-9 left-3 text-gray-400 pointer-events-none text-[10px] italic">
                        {placeholder}
                    </div>
                )}

                {isExpanded && (
                    <div className="bg-gray-50 border-t px-4 py-2 flex justify-between items-center shrink-0">
                        <span className="text-[10px] text-gray-400 font-medium">Modo de Edição Ampliado</span>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-md font-medium text-xs uppercase shadow-none hover:bg-blue-700 transition-colors"
                        >
                            Concluir e Voltar
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default RichTextEditor;
