'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import NotificationCenter from '@/components/NotificationCenter';

const Header: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser, logout, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    setShowMenu(false);
    router.push('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/' || pathname.startsWith('/pedido');
    return pathname.startsWith(path);
  };

  const menuStructure = [
    {
      name: 'CRM & Gestão',
      permission: 'pedidos',
      path: '#',
      icon: 'hub',
      subItems: [
        { name: 'Atendimentos', path: '/crm', permission: 'pedidos', icon: 'view_kanban' }
      ]
    },
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
      name: 'Marketing',
      permission: 'fatores',
      path: '#',
      icon: 'campaign',
      subItems: [
        { name: 'Catálogos', path: '/catalogos', permission: 'fatores', icon: 'auto_stories' }
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
        { name: 'Planilha de Controle', path: '/financeiro-controle', permission: 'financeiro.receber', icon: 'table_view' },
        { name: 'Contas a Pagar', path: '/payables', permission: 'financeiro.pagar', icon: 'credit_card_off' },
        { name: 'Comissões', path: '/comissoes', permission: 'comissoes', icon: 'monetization_on' }
      ]
    },
    {
      name: 'Processos',
      permission: 'financeiro',
      path: '/processos',
      icon: 'assignment'
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
        { name: 'Usuários', path: '/usuarios', permission: 'fatores', icon: 'manage_accounts' }
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
    <header className="relative bg-white border-b border-gray-200 shadow-none">
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-[52px]">
          <div className="flex items-center">
            <Link
              href={appUser?.email === 'cristalbrindes@cristalbrindes' ? '/crm?tab=PERFORMANCE' : '/crm'}
              className="flex-shrink-0 flex items-center h-full mr-8 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src="/img/Cristal Brindes_menu.png"
                alt="Cristal Brindes"
                className="h-8 w-auto object-contain"
                style={{ mixBlendMode: 'multiply' }}
              />
            </Link>
                <nav className="hidden sm:ml-2 sm:flex sm:space-x-0 h-full items-center">
              {menuStructure.map((item) => {
                if (!hasPermission(item.permission)) return null;
                
                const accessibleSubItems = item.subItems?.filter(sub => hasPermission(sub.permission)) || [];
                const hasDropdown = accessibleSubItems.length > 1;
                const onlyOne = accessibleSubItems.length === 1;
                
                const resolvedPath = onlyOne ? accessibleSubItems[0].path : item.path;
                const displayName = onlyOne ? accessibleSubItems[0].name : item.name;
                const active = isActive(resolvedPath) && resolvedPath !== '#';

                return (
                  <div key={item.name} className="relative h-full flex items-center group">
                    <Link
                      href={resolvedPath}
                      className={`relative inline-flex items-center gap-1.5 px-4 h-full text-[13px] font-medium transition-all ${active
                        ? 'text-[#0F6CBD]'
                        : 'text-[#616161] hover:text-[#111827]'
                        }`}
                      onClick={e => { if (resolvedPath === '#') e.preventDefault(); }}
                    >
                      {active && (
                        <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-[#0F6CBD] rounded-t-full" />
                      )}
                      {displayName}
                      {hasDropdown && (
                        <span className="material-icons-outlined text-[14px] opacity-40 group-hover:opacity-100 group-hover:rotate-180 transition-all duration-200">expand_more</span>
                      )}
                    </Link>

                    {hasDropdown && (
                      <div className="hidden group-hover:flex flex-col absolute top-[calc(100%-8px)] left-0 w-52 z-50 pt-3">
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-none rounded-md py-1.5 overflow-hidden">
                          {accessibleSubItems.map(sub => (
                            <Link
                              key={sub.name}
                              href={sub.path}
                              className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors ${pathname.startsWith(sub.path)
                                ? 'bg-[#EBF3FC] text-[#0F6CBD] font-medium'
                                : 'text-[#374151] hover:bg-gray-50 hover:text-[#111827]'
                                }`}
                            >
                              <span className="material-icons-outlined text-[15px] opacity-60">{(sub as any).icon || 'circle'}</span>
                              {sub.name}
                            </Link>
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
                className="h-8 w-8 rounded-full bg-[#0F6CBD] hover:bg-[#0c5aa5] flex items-center justify-center text-white text-[11px] font-medium focus:outline-none cursor-pointer transition-all ring-2 ring-white/50"
              >
                {getInitials()}
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                  <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-xl rounded-md shadow-none py-1 z-20 border border-gray-200/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#EBF3FC] text-[#0F6CBD] flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {getInitials()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-[#111827] truncate">{appUser?.name || 'Usuário'}</p>
                        <p className="text-[11px] text-[#6B7280] truncate">{appUser?.email}</p>
                      </div>
                    </div>
                    {appUser?.salesperson && (
                      <div className="px-4 py-2.5 border-b border-gray-100 bg-[#F9FAFB]">
                        <p className="text-[10px] uppercase font-medium text-[#9CA3AF] mb-0.5 tracking-wider">Vendedor</p>
                        <p className="text-sm font-medium text-[#0F6CBD]">{appUser.salesperson}</p>
                      </div>
                    )}
                    <div className="p-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-[#DC2626] hover:bg-red-50 rounded-md font-medium flex items-center gap-2 transition-colors"
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

export default Header;
