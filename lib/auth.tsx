import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

// User permission types
export interface UserPermissions {
  fullAccess: boolean;
  viewAllOrders: boolean;
  viewOwnOrdersOnly: boolean;
  cadastros: boolean;
  produtos: boolean;
  canDelete: boolean;
  crmPerformance: boolean;
  crmFinanceiro: boolean;
  financeiro: {
    contasReceber: boolean;
    contasPagar: boolean;
  };
  comissoes: boolean;
  relatorios: boolean;
  fatores: boolean;
}

export interface AppUser {
  email: string;
  name: string;
  permissions: UserPermissions;
  salesperson?: string; // Maps to VENDAS 01, VENDAS 02, etc.
}

// Logic to fetch user profile from DB
const fetchUserProfile = async (userId: string): Promise<AppUser | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return {
      email: data.email,
      name: data.name,
      salesperson: data.salesperson_id,
      permissions: data.permissions as UserPermissions,
    };
  } catch (err) {
    console.error('Unexpected error fetching profile:', err);
    return null;
  }
};

interface AuthContextType {
  appUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  appUser: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => { },
  hasPermission: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check existing session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const profile = await fetchUserProfile(session.user.id);

        if (profile) {
          setAppUser(profile);
        } else {
          // No profile found in DB, even if authenticated in Supabase
          await supabase.auth.signOut();
          setAppUser(null);
        }
      } else {
        // Fallback or cleanup local storage if no session
        localStorage.removeItem('app_user');
        setAppUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Tentar login no Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    });

    if (error) {
      console.error('Supabase auth error:', error);
      return { success: false, error: 'E-mail ou senha incorretos.' };
    }

    if (!data.user || !data.user.email) {
      return { success: false, error: 'Erro ao obter dados do usuário.' };
    }

    // 2. Buscar perfil no banco de dados
    const profile = await fetchUserProfile(data.user.id);

    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Perfil de usuário não encontrado no sistema. Contate o administrador.' };
    }

    setAppUser(profile);
    localStorage.setItem('app_user', JSON.stringify(profile));
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    localStorage.removeItem('app_user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!appUser) return false;
    if (appUser.permissions.fullAccess) return true;

    switch (permission) {
      case 'pedidos':
        return true; // All users can see orders (filtered by their own if needed)
      case 'pedidos.all':
        return appUser.permissions.viewAllOrders;
      case 'cadastros':
        return appUser.permissions.cadastros;
      case 'produtos':
        return appUser.permissions.produtos;
      case 'canDelete':
        return appUser.permissions.canDelete;
      case 'crm.performance':
        return appUser.permissions.crmPerformance;
      case 'crm.financeiro':
        return appUser.permissions.crmFinanceiro;
      case 'financeiro':
        return appUser.permissions.financeiro.contasReceber || appUser.permissions.financeiro.contasPagar;
      case 'financeiro.receber':
        return appUser.permissions.financeiro.contasReceber;
      case 'financeiro.pagar':
        return appUser.permissions.financeiro.contasPagar;
      case 'comissoes':
        return appUser.permissions.comissoes;
      case 'relatorios':
        return appUser.permissions.relatorios;
      case 'fatores':
        return appUser.permissions.fatores;
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      appUser,
      isAuthenticated: !!appUser,
      isLoading,
      login,
      logout,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
