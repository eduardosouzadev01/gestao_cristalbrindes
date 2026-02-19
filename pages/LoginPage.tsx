import React, { useState } from 'react';
import { useAuth } from '../lib/auth';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);

        if (!result.success) {
            setError(result.error || 'Erro ao fazer login.');
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-300 rounded-full opacity-15 blur-3xl"></div>
                <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-20 blur-2xl"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-200 mb-6">
                        <span className="material-icons-outlined text-white text-4xl">diamond</span>
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Cristal Brindes</h1>
                    <p className="text-sm text-gray-500 mt-2 font-medium">Sistema de Gestão de Pedidos</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Entrar no Sistema</h2>
                        <p className="text-xs text-gray-400 mt-1">Utilize suas credenciais de acesso</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                            <span className="material-icons-outlined text-red-500 text-lg">error</span>
                            <span className="text-sm text-red-600 font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">mail</span>
                                </span>
                                <input
                                    type="email"
                                    required
                                    className="form-input block w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 text-sm font-medium focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Senha
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">lock</span>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="form-input block w-full pl-10 pr-12 py-3 rounded-xl border-gray-200 text-sm font-medium focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <span className="material-icons-outlined text-lg">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl uppercase text-sm tracking-wider shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    ENTRANDO...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-outlined text-lg">login</span>
                                    ENTRAR
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[10px] text-gray-400 mt-6 font-medium">
                    © 2026 Cristal Brindes. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
