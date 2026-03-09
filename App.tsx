import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './lib/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
import OrderList from './pages/OrderList';
import OrderForm from './pages/OrderForm';
import ClientList from './pages/ClientList';
import SupplierList from './pages/SupplierList';
import RegistrationForm from './pages/RegistrationForm';
import CalculationFactors from './pages/CalculationFactors';
import CalculationFactorForm from './pages/CalculationFactorForm';
import CommissionPage from './pages/CommissionPage';
// Redundant ReportsPage removed as it's merged into ManagementPage
import OrdersReceivablesPage from './pages/OrdersReceivablesPage';
import PayablesPage from './pages/PayablesPage';
import LoginPage from './pages/LoginPage';
import BudgetList from './pages/BudgetList';
import BudgetForm from './pages/BudgetForm';
import ProposalList from './pages/ProposalList';
import ProposalDetail from './pages/ProposalDetail';
import ManagementPage from './pages/ManagementPage';
import ProductsPage from './pages/ProductsPage';
import FinancialDashboardPage from './pages/FinancialDashboardPage';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import NotificationCenter from './src/components/NotificationCenter';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; permission?: string }> = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <span className="material-icons-outlined text-red-400 text-6xl mb-4">lock</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 mb-6">Você não tem permissão para acessar esta página.</p>
          <Link to="/" className="inline-flex items-center px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors">
            <span className="material-icons-outlined mr-2">arrow_back</span>
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { appUser, logout, hasPermission } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowMenu(false);
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname.startsWith('/pedido');
    return location.pathname.startsWith(path);
  };

  const menuStructure = [
    { name: 'CRM & Gestão', path: '/crm', permission: 'pedidos', icon: 'hub' },
    {
      name: 'Comercial',
      permission: 'pedidos',
      path: '#',
      icon: 'storefront',
      subItems: [
        { name: 'Orçamentos', path: '/orcamentos', permission: 'pedidos', icon: 'request_quote' },
        { name: 'Propostas', path: '/propostas', permission: 'pedidos', icon: 'description' },
        { name: 'Pedidos', path: '/pedidos', permission: 'pedidos', icon: 'receipt_long' }
      ]
    },
    {
      name: 'Financeiro',
      permission: 'financeiro',
      path: '#',
      icon: 'account_balance',
      subItems: [
        { name: 'Painel Financeiro', path: '/painel-financeiro', permission: 'financeiro.receber', icon: 'dashboard' },
        { name: 'Pedidos & Recebíveis', path: '/pedidos-recebiveis', permission: 'financeiro.receber', icon: 'payments' },
        { name: 'Contas a Pagar', path: '/payables', permission: 'financeiro.pagar', icon: 'credit_card_off' },
        { name: 'Comissões', path: '/comissoes', permission: 'comissoes', icon: 'monetization_on' }
      ]
    },
    {
      name: 'Cadastros',
      permission: 'cadastros',
      path: '#',
      icon: 'manage_accounts',
      subItems: [
        { name: 'Clientes', path: '/clientes', permission: 'cadastros', icon: 'groups' },
        { name: 'Fornecedores', path: '/fornecedores', permission: 'cadastros', icon: 'local_shipping' },
        { name: 'Produtos', path: '/produtos', permission: 'produtos', icon: 'inventory_2' },
        { name: 'Fatores', path: '/configuracoes', permission: 'fatores', icon: 'tune' }
      ]
    }
  ];

  const getInitials = () => {
    if (appUser?.salesperson) {
      const sp = appUser.salesperson.trim().toUpperCase();
      if (sp.length <= 3) return sp;
      return sp.substring(0, 3);
    }
    if (!appUser?.name) return 'U';
    const parts = appUser.name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50" style={{
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(209,213,219,0.6)',
      boxShadow: '0 1px 12px rgba(0,0,0,0.06)'
    }}>
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[52px]">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (appUser?.email === 'cristalbrindes@cristalbrindes') {
                  navigate('/crm?tab=PERFORMANCE');
                } else {
                  navigate('/crm');
                }
              }}
              className="flex-shrink-0 flex items-center gap-2 mr-8 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-lg bg-[#0F6CBD] flex items-center justify-center">
                <span className="material-icons-outlined text-white text-[16px]">diamond</span>
              </div>
              <span className="font-semibold text-[13px] text-[#111827] tracking-tight">Cristal Brindes</span>
            </button>
            <nav className="hidden sm:ml-2 sm:flex sm:space-x-0 h-full items-center">
              {menuStructure.map((item) => {
                if (!hasPermission(item.permission)) return null;
                const hasSub = item.subItems && item.subItems.some(sub => hasPermission(sub.permission));
                const active = isActive(item.path) && item.path !== '#';

                return (
                  <div key={item.name} className="relative h-full flex items-center group">
                    <Link
                      to={item.path}
                      className={`relative inline-flex items-center gap-1.5 px-3 h-full text-[13px] font-medium transition-all ${active
                        ? 'text-[#0F6CBD]'
                        : 'text-[#4B5563] hover:text-[#111827]'
                        }`}
                      onClick={e => { if (item.path === '#') e.preventDefault(); }}
                    >
                      {active && (
                        <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#0F6CBD] rounded-t-full" />
                      )}
                      {item.name}
                      {hasSub && (
                        <span className="material-icons-outlined text-[14px] opacity-50 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-200">expand_more</span>
                      )}
                    </Link>

                    {hasSub && (
                      <div className="hidden group-hover:flex flex-col absolute top-full left-0 w-52 z-50 pt-1">
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-xl rounded-xl py-1.5 overflow-hidden">
                          {item.subItems?.map(sub => (
                            hasPermission(sub.permission) && (
                              <Link
                                key={sub.name}
                                to={sub.path}
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${location.pathname.startsWith(sub.path)
                                  ? 'bg-[#EBF3FC] text-[#0F6CBD] font-medium'
                                  : 'text-[#374151] hover:bg-gray-50 hover:text-[#111827]'
                                  }`}
                              >
                                <span className="material-icons-outlined text-[15px] opacity-60">{(sub as any).icon || 'circle'}</span>
                                {sub.name}
                              </Link>
                            )
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="h-8 w-8 rounded-full bg-[#0F6CBD] hover:bg-[#0c5aa5] flex items-center justify-center text-white text-[11px] font-bold focus:outline-none cursor-pointer transition-all ring-2 ring-white/50"
              >
                {getInitials()}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl py-1 z-20 border border-gray-200/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#EBF3FC] text-[#0F6CBD] flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {getInitials()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-[#111827] truncate">{appUser?.name || 'Usuário'}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{appUser?.email}</p>
                      </div>
                    </div>
                    {appUser?.salesperson && (
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-[#F9FAFB]">
                        <p className="text-[10px] uppercase font-semibold text-[#9CA3AF] mb-0.5 tracking-wider">Vendedor</p>
                        <p className="text-sm font-semibold text-[#0F6CBD]">{appUser.salesperson}</p>
                      </div>
                    )}
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-[#DC2626] hover:bg-red-50 rounded-lg font-medium flex items-center gap-2 transition-colors"
                      >
                        <span className="material-icons-outlined text-sm">logout</span> Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-white border-t border-[#EDEBE9] mt-auto">
    <div className="max-w-[1920px] w-full mx-auto py-4 px-4 sm:px-6 lg:px-8">
      <p className="text-center text-xs text-[#A19F9D]">© 2026 Cristal Brindes. Todos os direitos reservados.</p>
    </div>
  </footer>
);

const AppLayout: React.FC = () => {
  const { isAuthenticated, appUser } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-6">
        <Routes>
          <Route path="/" element={<ProtectedRoute permission="pedidos">{appUser?.salesperson ? <Navigate to="/crm" replace /> : <OrderList />}</ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute permission="pedidos"><OrderList /></ProtectedRoute>} />
          <Route path="/pedido/novo" element={<ProtectedRoute permission="pedidos"><OrderForm /></ProtectedRoute>} />
          <Route path="/pedido/:id" element={<ProtectedRoute permission="pedidos"><OrderForm /></ProtectedRoute>} />
          <Route path="/orcamentos" element={<ProtectedRoute permission="pedidos"><BudgetList /></ProtectedRoute>} />
          <Route path="/orcamento/novo" element={<ProtectedRoute permission="pedidos"><BudgetForm /></ProtectedRoute>} />
          <Route path="/orcamento/:id" element={<ProtectedRoute permission="pedidos"><BudgetForm /></ProtectedRoute>} />
          <Route path="/propostas" element={<ProtectedRoute permission="pedidos"><ProposalList /></ProtectedRoute>} />
          <Route path="/proposta/:id" element={<ProtectedRoute permission="pedidos"><ProposalDetail /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute permission="pedidos"><ManagementPage /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute permission="produtos"><ProductsPage /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute permission="cadastros"><ClientList /></ProtectedRoute>} />
          <Route path="/fornecedores" element={<ProtectedRoute permission="cadastros"><SupplierList /></ProtectedRoute>} />
          <Route path="/cadastros/novo" element={<ProtectedRoute permission="cadastros"><RegistrationForm /></ProtectedRoute>} />
          <Route path="/cadastros/editar/:id" element={<ProtectedRoute permission="cadastros"><RegistrationForm /></ProtectedRoute>} />
          <Route path="/cadastros" element={<Navigate to="/clientes" replace />} />
          <Route path="/comissoes" element={<ProtectedRoute permission="comissoes"><CommissionPage /></ProtectedRoute>} />
          <Route path="/relatorios" element={<Navigate to="/crm" replace />} />
          <Route path="/painel-financeiro" element={<ProtectedRoute permission="financeiro.receber"><FinancialDashboardPage /></ProtectedRoute>} />
          <Route path="/pedidos-recebiveis" element={<ProtectedRoute permission="financeiro.receber"><OrdersReceivablesPage /></ProtectedRoute>} />
          <Route path="/saldo-pedidos" element={<Navigate to="/pedidos-recebiveis" replace />} />
          <Route path="/receivables" element={<Navigate to="/pedidos-recebiveis" replace />} />
          <Route path="/payables" element={<ProtectedRoute permission="financeiro.pagar"><PayablesPage /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute permission="fatores"><CalculationFactors /></ProtectedRoute>} />
          <Route path="/configuracoes/fatores/novo" element={<ProtectedRoute permission="fatores"><CalculationFactorForm /></ProtectedRoute>} />
          <Route path="/configuracoes/fatores/editar/:id" element={<ProtectedRoute permission="fatores"><CalculationFactorForm /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={appUser?.salesperson ? <Navigate to="/crm" replace /> : <OrderList />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <ErrorBoundary>
            <AppLayout />
          </ErrorBoundary>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;