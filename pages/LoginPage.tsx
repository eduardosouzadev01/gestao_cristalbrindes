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
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F5' }}>
            <div className="relative z-10 w-full max-w-[440px] px-4">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5" style={{ backgroundColor: '#EBF3FC' }}>
                        <span className="material-icons-outlined text-3xl" style={{ color: '#0F6CBD' }}>diamond</span>
                    </div>
                    <h1 className="text-2xl font-semibold" style={{ color: '#242424', letterSpacing: '-0.01em' }}>Cristal Brindes</h1>
                    <p className="text-sm mt-1" style={{ color: '#616161' }}>Sistema de Gestão de Pedidos</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-lg p-8" style={{ border: '1px solid #E0E0E0' }}>
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold" style={{ color: '#242424' }}>Entrar no Sistema</h2>
                        <p className="text-sm mt-1" style={{ color: '#707070' }}>Utilize suas credenciais de acesso</p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-md flex items-center gap-2" style={{ backgroundColor: '#FDE7E9', border: '1px solid #F6A2A5' }}>
                            <span className="material-icons-outlined text-lg" style={{ color: '#BC2F32' }}>error</span>
                            <span className="text-sm" style={{ color: '#BC2F32' }}>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#424242' }}>
                                E-mail
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-lg" style={{ color: '#BDBDBD' }}>mail</span>
                                </span>
                                <input
                                    type="email"
                                    required
                                    className="form-input block w-full !pl-10 pr-4 py-2.5 text-sm"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    style={{ borderRadius: '4px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-1.5" style={{ color: '#424242' }}>
                                Senha
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-lg" style={{ color: '#BDBDBD' }}>lock</span>
                                </span>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="form-input block w-full !pl-10 pr-12 py-2.5 text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    style={{ borderRadius: '4px' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-3 flex items-center transition-colors"
                                    style={{ color: '#BDBDBD' }}
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
                            className="w-full py-2.5 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#0F6CBD', borderRadius: '4px', transition: 'background 0.1s ease' }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#115EA3')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0F6CBD')}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Entrando...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-outlined text-lg">login</span>
                                    Entrar
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs mt-6" style={{ color: '#707070' }}>
                    © 2026 Cristal Brindes. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
