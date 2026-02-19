import React, { useState } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth';
import OrderList from './pages/OrderList';
import OrderForm from './pages/OrderForm';
import RegistrationList from './pages/RegistrationList';
import RegistrationForm from './pages/RegistrationForm';
import CalculationFactors from './pages/CalculationFactors';
import CalculationFactorForm from './pages/CalculationFactorForm';
import CommissionPage from './pages/CommissionPage';
// Redundant ReportsPage removed as it's merged into ManagementPage
import ReceivablesPage from './pages/ReceivablesPage';
import PayablesPage from './pages/PayablesPage';
import LoginPage from './pages/LoginPage';
import BudgetList from './pages/BudgetList';
import BudgetForm from './pages/BudgetForm';
import ManagementPage from './pages/ManagementPage';
import ProductsPage from './pages/ProductsPage';

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
        { name: 'Pedidos', path: '/', permission: 'pedidos' }
      ]
    },
    {
      name: 'Financeiro',
      permission: 'financeiro',
      path: '#',
      subItems: [
        { name: 'Contas a Receber', path: '/receivables', permission: 'financeiro.receber' },
        { name: 'Contas a Pagar', path: '/payables', permission: 'financeiro.pagar' },
        { name: 'Comissões', path: '/comissoes', permission: 'comissoes' }
      ]
    },
    {
      name: 'Cadastros',
      permission: 'cadastros',
      path: '#',
      subItems: [
        { name: 'Clientes & Geral', path: '/cadastros', permission: 'cadastros' },
        { name: 'Produtos', path: '/produtos', permission: 'produtos' },
        { name: 'Fatores', path: '/configuracoes', permission: 'fatores' }
      ]
    }
  ];

  // Get user initials
  const getInitials = () => {
    if (!appUser?.name) return 'U';
    const parts = appUser.name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
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
              <span className="material-icons-outlined text-blue-600 text-2xl">diamond</span>
              <span className="font-bold text-lg text-gray-800">Cristal Brindes</span>
            </button>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8 h-full items-center">
              {menuStructure.map((item) => {
                if (!hasPermission(item.permission)) return null;
                const hasSub = item.subItems && item.subItems.some(sub => hasPermission(sub.permission));

                return (
                  <div key={item.name} className="relative h-full flex items-center group">
                    <Link
                      to={item.path}
                      className={`inline-flex items-center px-3 pt-1 border-b-2 text-sm font-medium transition-colors h-full ${isActive(item.path) && item.path !== '#'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                      onClick={e => { if (item.path === '#') e.preventDefault(); }}
                    >
                      {item.name}
                      {hasSub && (
                        <span className="ml-1 material-icons-outlined text-xs group-hover:rotate-180 transition-transform">expand_more</span>
                      )}
                    </Link>

                    {hasSub && (
                      <div className="hidden group-hover:block absolute top-[calc(100%-1px)] left-0 w-56 bg-white border border-gray-200 shadow-xl rounded-b-lg py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {item.subItems?.map(sub => (
                          hasPermission(sub.permission) && (
                            <Link
                              key={sub.name}
                              to={sub.path}
                              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
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
          <div className="flex items-center gap-4">
            <NotificationCenter />

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white text-xs font-bold focus:outline-none ring-2 ring-offset-2 ring-transparent focus:ring-blue-500 cursor-pointer transition-colors"
              >
                {getInitials()}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-1 z-20 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Logado como</p>
                      <p className="text-xs font-bold text-gray-900 truncate">{appUser?.name || 'Usuário'}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{appUser?.email}</p>
                    </div>
                    {appUser?.salesperson && (
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="text-[10px] uppercase font-bold text-gray-400">Vendedor</p>
                        <p className="text-xs font-bold text-blue-600">{appUser.salesperson}</p>
                      </div>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                    >
                      <span className="material-icons-outlined text-sm">logout</span> Sair
                    </button>
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
  <footer className="bg-white border-t border-gray-200 mt-auto">
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <p className="text-center text-xs text-gray-400">© 2026 Cristal Brindes. Todos os direitos reservados.</p>
    </div>
  </footer>
);

const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // If not authenticated, show login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <Routes>
          <Route path="/" element={<ProtectedRoute permission="pedidos"><OrderList /></ProtectedRoute>} />
          <Route path="/pedido/novo" element={<ProtectedRoute permission="pedidos"><OrderForm /></ProtectedRoute>} />
          <Route path="/pedido/:id" element={<ProtectedRoute permission="pedidos"><OrderForm /></ProtectedRoute>} />
          <Route path="/orcamentos" element={<ProtectedRoute permission="pedidos"><BudgetList /></ProtectedRoute>} />
          <Route path="/orcamento/novo" element={<ProtectedRoute permission="pedidos"><BudgetForm /></ProtectedRoute>} />
          <Route path="/orcamento/:id" element={<ProtectedRoute permission="pedidos"><BudgetForm /></ProtectedRoute>} />
          <Route path="/crm" element={<ProtectedRoute permission="pedidos"><ManagementPage /></ProtectedRoute>} />
          <Route path="/produtos" element={<ProtectedRoute permission="produtos"><ProductsPage /></ProtectedRoute>} />
          <Route path="/cadastros" element={<ProtectedRoute permission="cadastros"><RegistrationList /></ProtectedRoute>} />
          <Route path="/cadastros/novo" element={<ProtectedRoute permission="cadastros"><RegistrationForm /></ProtectedRoute>} />
          <Route path="/comissoes" element={<ProtectedRoute permission="comissoes"><CommissionPage /></ProtectedRoute>} />
          <Route path="/relatorios" element={<Navigate to="/crm" replace />} />
          <Route path="/receivables" element={<ProtectedRoute permission="financeiro.receber"><ReceivablesPage /></ProtectedRoute>} />
          <Route path="/payables" element={<ProtectedRoute permission="financeiro.pagar"><PayablesPage /></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute permission="fatores"><CalculationFactors /></ProtectedRoute>} />
          <Route path="/configuracoes/fatores/novo" element={<ProtectedRoute permission="fatores"><CalculationFactorForm /></ProtectedRoute>} />
          <Route path="/configuracoes/fatores/editar/:id" element={<ProtectedRoute permission="fatores"><CalculationFactorForm /></ProtectedRoute>} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<OrderList />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppLayout />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;