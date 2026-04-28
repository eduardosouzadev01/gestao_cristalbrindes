'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Preencha todos os campos');
            return;
        }

        setLoading(true);
        try {
            const { success, error } = await login(email, password);
            if (success) {
                toast.success('Login realizado com sucesso!');
                router.push('/crm');
            } else {
                toast.error(error || 'Falha na autenticação');
            }
        } catch (err) {
            toast.error('Erro inesperado ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFBFC] p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-md shadow-none border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-500">
                <div className="p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-md flex items-center justify-center mx-auto mb-6 shadow-none shadow-none-blue-200">
                        <span className="material-icons-outlined text-white text-3xl">lock</span>
                    </div>
                    <h1 className="text-2xl font-medium text-gray-900 uppercase tracking-tighter">Cristal Brindes</h1>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">Gestão Inteligente</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-2 pl-1">E-mail Corporativo</label>
                            <div className="relative group flex items-center bg-gray-50 focus-within:bg-white border border-transparent focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-md transition-all px-4 py-3.5">
                                <span className="material-icons-outlined text-gray-400 text-lg group-focus-within:text-blue-500 transition-colors mr-3">alternate_email</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu@email.com.br"
                                    className="w-full bg-transparent text-sm font-medium text-gray-700 placeholder:text-gray-300 outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-2 pl-1">Senha de Acesso</label>
                            <div className="relative group flex items-center bg-gray-50 focus-within:bg-white border border-transparent focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-md transition-all px-4 py-3.5">
                                <span className="material-icons-outlined text-gray-400 text-lg group-focus-within:text-blue-500 transition-colors mr-3">password</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-transparent text-sm font-medium text-gray-700 placeholder:text-gray-300 outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 text-white rounded-md font-medium text-sm uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all shadow-none shadow-none-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <span>Acessar Sistema</span>
                                <span className="material-icons-outlined text-lg">arrow_forward</span>
                            </>
                        )}
                    </button>
                    
                    <div className="pt-4 text-center">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
                            Acesso restrito a colaboradores autorizados
                        </p>
                    </div>
                </form>
            </div>
            
            <p className="mt-8 text-[11px] text-gray-400 font-medium">
                © 2026 Cristal Brindes — Todos os direitos reservados
            </p>
        </div>
    );
}
