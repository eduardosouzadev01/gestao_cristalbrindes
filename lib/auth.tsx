import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

// User permission types
export interface UserPermissions {
  fullAccess: boolean;
  viewAllOrders: boolean;
  viewOwnOrdersOnly: boolean;
  cadastros: boolean;
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

// Predefined users
const PREDEFINED_USERS: Record<string, AppUser> = {
  'cristalbrindes@cristalbrindes.com.br': {
    email: 'cristalbrindes@cristalbrindes.com.br',
    name: 'Gestão',
    permissions: {
      fullAccess: true,
      viewAllOrders: true,
      viewOwnOrdersOnly: false,
      cadastros: true,
      financeiro: {
        contasReceber: true,
        contasPagar: true,
      },
      comissoes: true,
      relatorios: true,
      fatores: true,
    },
  },
  'adm01@cristalbrindes.com.br': {
    email: 'adm01@cristalbrindes.com.br',
    name: 'Administrativo',
    permissions: {
      fullAccess: false,
      viewAllOrders: true,
      viewOwnOrdersOnly: false,
      cadastros: true,
      financeiro: {
        contasReceber: true,
        contasPagar: false,
      },
      comissoes: false,
      relatorios: false,
      fatores: false,
    },
  },
  'vendas01@cristalbrindes.com.br': {
    email: 'vendas01@cristalbrindes.com.br',
    name: 'Vendas 01',
    salesperson: 'VENDAS 01',
    permissions: {
      fullAccess: false,
      viewAllOrders: false,
      viewOwnOrdersOnly: true,
      cadastros: false,
      financeiro: {
        contasReceber: false,
        contasPagar: false,
      },
      comissoes: false,
      relatorios: false,
      fatores: false,
    },
  },
  'vendas02@cristalbrindes.com.br': {
    email: 'vendas02@cristalbrindes.com.br',
    name: 'Vendas 02',
    salesperson: 'VENDAS 02',
    permissions: {
      fullAccess: false,
      viewAllOrders: false,
      viewOwnOrdersOnly: true,
      cadastros: false,
      financeiro: {
        contasReceber: false,
        contasPagar: false,
      },
      comissoes: false,
      relatorios: false,
      fatores: false,
    },
  },
  'vendas03@cristalbrindes.com.br': {
    email: 'vendas03@cristalbrindes.com.br',
    name: 'Vendas 03',
    salesperson: 'VENDAS 03',
    permissions: {
      fullAccess: false,
      viewAllOrders: false,
      viewOwnOrdersOnly: true,
      cadastros: false,
      financeiro: {
        contasReceber: false,
        contasPagar: false,
      },
      comissoes: false,
      relatorios: false,
      fatores: false,
    },
  },
  'vendas04@cristalbrindes.com.br': {
    email: 'vendas04@cristalbrindes.com.br',
    name: 'Vendas 04',
    salesperson: 'VENDAS 04',
    permissions: {
      fullAccess: false,
      viewAllOrders: false,
      viewOwnOrdersOnly: true,
      cadastros: false,
      financeiro: {
        contasReceber: false,
        contasPagar: false,
      },
      comissoes: false,
      relatorios: false,
      fatores: false,
    },
  },
  'vendas05@cristalbrindes.com.br': {
    email: 'vendas05@cristalbrindes.com.br',
    name: 'Vendas 05',
    salesperson: 'VENDAS 05',
    permissions: {
      fullAccess: false,
      viewAllOrders: false,
      viewOwnOrdersOnly: true,
      cadastros: false,
      financeiro: {
        contasReceber: false,
        contasPagar: false,
      },
      comissoes: false,
      relatorios: false,
      fatores: false,
    },
  },
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

      if (session?.user?.email) {
        const userEmail = session.user.email.toLowerCase();
        const predefined = PREDEFINED_USERS[userEmail];

        if (predefined) {
          setAppUser(predefined);
        } else {
          // Invalid user session
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

    // 2. Verificar permissões no mapa local (baseado no e-mail)
    const userEmail = data.user.email.toLowerCase();
    const predefinedUser = PREDEFINED_USERS[userEmail];

    if (!predefinedUser) {
      // Se logou no Supabase mas não está no nosso mapa de permissões
      // Podemos negar o acesso ou dar um acesso padrão (sem permissões)
      await supabase.auth.signOut();
      return { success: false, error: 'E-mail autenticado mas não autorizado no sistema. Contate o administrador.' };
    }

    const userWithAuth = { ...predefinedUser };
    setAppUser(userWithAuth);
    localStorage.setItem('app_user', JSON.stringify(userWithAuth));
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
