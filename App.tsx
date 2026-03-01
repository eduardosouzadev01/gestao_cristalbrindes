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
import ManagementPage from './pages/ManagementPage';
import ProductsPage from './pages/ProductsPage';
import FinancialDashboardPage from './pages/FinancialDashboardPage';

import NotificationCenter from './src/components/NotificationCenter';

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; permission?: string }> = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
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
    { name: 'CRM & Gestão', path: '/crm', permission: 'pedidos' },
    {
      name: 'Comercial',
      permission: 'pedidos',
      path: '#',
      subItems: [
        { name: 'Orçamentos', path: '/orcamentos', permission: 'pedidos' },
        { name: 'Pedidos', path: '/pedidos', permission: 'pedidos' }
      ]
    },
    {
      name: 'Financeiro',
      permission: 'financeiro',
      path: '#',
      subItems: [
        { name: 'Painel Financeiro', path: '/painel-financeiro', permission: 'financeiro.receber' },
        { name: 'Pedidos & Recebíveis', path: '/pedidos-recebiveis', permission: 'financeiro.receber' },
        { name: 'Contas a Pagar', path: '/payables', permission: 'financeiro.pagar' },
        { name: 'Comissões', path: '/comissoes', permission: 'comissoes' }
      ]
    },
    {
      name: 'Cadastros',
      permission: 'cadastros',
      path: '#',
      subItems: [
        { name: 'Clientes', path: '/clientes', permission: 'cadastros' },
        { name: 'Fornecedores', path: '/fornecedores', permission: 'cadastros' },
        { name: 'Produtos', path: '/produtos', permission: 'produtos' },
        { name: 'Fatores', path: '/configuracoes', permission: 'fatores' }
      ]
    }
  ];

  const getInitials = () => {
    if (!appUser?.name) return 'U';
    const parts = appUser.name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
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
              <span className="material-icons-outlined text-[#0078D4] text-2xl">diamond</span>
              <span className="font-bold text-[15px] text-[#323130]">Cristal Brindes</span>
            </button>
            <nav className="hidden sm:ml-4 sm:flex sm:space-x-1 h-full items-center">
              {menuStructure.map((item) => {
                if (!hasPermission(item.permission)) return null;
                const hasSub = item.subItems && item.subItems.some(sub => hasPermission(sub.permission));

                return (
                  <div key={item.name} className="relative h-full flex items-center group">
                    <Link
                      to={item.path}
                      className={`inline-flex items-center px-3 py-1.5 rounded-md text-[13px] font-semibold transition-all h-auto mx-0.5 ${isActive(item.path) && item.path !== '#'
                        ? 'bg-[#EBF3FC] text-[#0078D4]'
                        : 'text-[#605E5C] hover:bg-[#F3F2F1] hover:text-[#323130]'
                        }`}
                      onClick={e => { if (item.path === '#') e.preventDefault(); }}
                    >
                      {item.name}
                      {hasSub && (
                        <span className="ml-1 material-icons-outlined text-[14px] group-hover:rotate-180 transition-transform">expand_more</span>
                      )}
                    </Link>

                    {hasSub && (
                      <div className="hidden group-hover:block absolute top-full left-0 w-56 bg-white border border-[#E1DFDD] shadow-lg rounded-lg py-1.5 z-50 mt-0">
                        {item.subItems?.map(sub => (
                          hasPermission(sub.permission) && (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              className="block px-4 py-2.5 text-[13px] text-[#323130] hover:bg-[#F3F2F1] font-medium transition-colors"
                            >
                              {sub.name}
                            </Link>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationCenter />

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="h-9 w-9 rounded-full bg-[#0078D4] hover:bg-[#106EBE] flex items-center justify-center text-white text-xs font-bold focus:outline-none cursor-pointer transition-colors"
              >
                {getInitials()}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-1 z-20 border border-[#E1DFDD]">
                    <div className="px-4 py-3 border-b border-[#EDEBE9] flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#DEECF9] text-[#0078D4] flex items-center justify-center text-sm font-bold">
                        {getInitials()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-[#323130] truncate">{appUser?.name || 'Usuário'}</p>
                        <p className="text-xs text-[#605E5C] truncate">{appUser?.email}</p>
                      </div>
                    </div>
                    {appUser?.salesperson && (
                      <div className="px-4 py-2.5 border-b border-[#EDEBE9] bg-[#FAF9F8]">
                        <p className="text-[10px] uppercase font-bold text-[#A19F9D] mb-0.5">Vendedor</p>
                        <p className="text-sm font-semibold text-[#0078D4]">{appUser.salesperson}</p>
                      </div>
                    )}
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-[#A4262C] hover:bg-[#FDF3F4] rounded-md font-medium flex items-center gap-2 transition-colors"
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
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
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
    <div className="min-h-screen flex flex-col bg-white">
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
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <Toaster position="top-right" richColors />
          <AppLayout />
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
};

export default App;