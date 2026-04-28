import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Análise de erro capturada por ErrorBoundary:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-md shadow-none p-8 text-center border border-red-100">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-icons-outlined text-red-500 text-3xl">report_problem</span>
                        </div>
                        <h1 className="text-xl font-medium text-gray-900 mb-2">Ops! Algo deu errado.</h1>
                        <p className="text-gray-500 mb-6 text-sm">
                            Ocorreu um erro inesperado na aplicação. Nossa equipe foi notificada.
                        </p>
                        {this.state.error && (
                            <div className="mb-6 p-3 bg-gray-50 rounded-md text-left overflow-auto max-h-32">
                                <code className="text-[10px] text-red-600 font-mono">
                                    {this.state.error.message}
                                </code>
                            </div>
                        )}
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-[#0078D4] text-white rounded-md font-medium hover:bg-[#106EBE] transition-colors shadow-none"
                        >
                            Recarregar Sistema
                        </button>
                    </div>
                </div>
            );
        }


        // @ts-ignore - Bypass TS compiler bug finding props on React.Component
        return this.props.children;
    }
}
