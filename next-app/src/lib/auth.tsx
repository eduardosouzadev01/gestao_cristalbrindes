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
  canViewMargins: boolean;
  canEditCatalog: boolean;
  canDeleteCRM: boolean;
}

export interface AppUser {
  email: string;
  name: string;
  role?: string;
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

    if (data.active === false) {
      console.warn('User is inactive:', data.email);
      return null;
    }

    return {
      email: data.email,
      name: data.name,
      role: data.role,
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
      // Remove legacy user data stored in localStorage by older app versions
      localStorage.removeItem('app_user');

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
      
      // Handle network/DNS errors specifically
      if (error.message?.includes('fetch') || error.name === 'AuthRetryableFetchError' || error.message?.includes('network')) {
        const currentUrl = (supabase as any).supabaseUrl || 'N/A';
        
        if (currentUrl.includes('placeholder')) {
          return {
            success: false,
            error: 'Erro Crítico: O sistema está configurado com uma URL de teste (placeholder). Verifique as variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL).'
          };
        }

        const domain = currentUrl.replace('https://', '').split('/')[0];

        return { 
          success: false, 
          error: `Erro de conexão com o servidor (${domain}). Sua rede ou firewall pode estar bloqueando o acesso ao banco de dados Supabase. Tente usar outra rede (Wi-Fi/4G) ou solicite ao TI a liberação deste domínio.` 
        };

      }
      
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

    // Profile lives only in React state — never persisted to localStorage
    setAppUser(profile);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAppUser(null);
    // Clean up only the last-visited route, not user credentials
    localStorage.removeItem('lastPath');
  };

  const hasPermission = (permission: string): boolean => {
    if (!appUser) return false;
    if (appUser.permissions.fullAccess) return true;

    switch (permission) {
      case 'pedidos':
        return true; // All users can see orders (filtered by their own if needed)
      case 'pedidos.all':
        return appUser.permissions.viewAllOrders || appUser.salesperson === 'VENDAS 04';
      case 'adm':
      case 'gestao':
        return appUser.permissions.fullAccess || appUser.role === 'ADMIN' || appUser.role === 'GESTAO' || appUser.role === 'SUPERVISOR' || appUser.salesperson === 'VENDAS 04';
      case 'cadastros':
        return appUser.permissions.cadastros;
      case 'produtos':
        return appUser.permissions.produtos;
      case 'canDelete':
        return appUser.permissions.canDelete;
      case 'crm.performance':
        return appUser.permissions.crmPerformance || appUser.salesperson === 'VENDAS 04';
      case 'crm.financeiro':
        return appUser.permissions.crmFinanceiro;
      case 'financeiro':
        return !!appUser.permissions.financeiro?.contasReceber || !!appUser.permissions.financeiro?.contasPagar;
      case 'financeiro.receber':
        return !!appUser.permissions.financeiro?.contasReceber;
      case 'financeiro.pagar':
        return !!appUser.permissions.financeiro?.contasPagar;
      case 'comissoes':
        return appUser.permissions.comissoes;
      case 'relatorios':
        return appUser.permissions.relatorios;
      case 'fatores':
        return appUser.permissions.fatores;
      case 'margins':
        return appUser.permissions.canViewMargins;
      case 'catalog.edit':
        return appUser.permissions.canEditCatalog;
      case 'crm.delete':
        return appUser.permissions.canDeleteCRM;
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
