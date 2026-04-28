'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCatalog } from '@/hooks/useCatalog';
import CatalogCard from '@/components/catalog/CatalogCard';
import CatalogTemplatePicker, { type CatalogTemplate } from '@/components/catalog/CatalogTemplatePicker';
import { useAuth } from '@/lib/auth';
import { DEFAULT_CATALOG } from '@/types/catalog';


export default function CatalogListPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { catalogs, loading, createCatalog, duplicateCatalog, deleteCatalog } = useCatalog();
  const [creating, setCreating] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const handleCreate = async (templateSettings?: Partial<typeof DEFAULT_CATALOG>) => {
    setCreating(true);
    setShowTemplatePicker(false);
    const catalog = await createCatalog({
      ...DEFAULT_CATALOG,
      ...(templateSettings || {}),
      created_by: appUser?.email || null,
    });
    if (catalog) {
      router.push(`/catalogos/${catalog.id}`);
    } else {
      toast.error('Erro ao criar catálogo');
      setCreating(false);
    }
  };

  const handleTemplateSelect = (template: CatalogTemplate) => {
    handleCreate(template.settings);
  };

  const handleDuplicate = async (id: string) => {
    const copy = await duplicateCatalog(id);
    if (copy) {
      toast.success('Catálogo duplicado com sucesso!');
    } else {
      toast.error('Erro ao duplicar catálogo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Todas as páginas e produtos do catálogo serão excluídos.')) return;
    const ok = await deleteCatalog(id);
    if (ok) toast.success('Catálogo excluído.');
    else toast.error('Erro ao excluir catálogo.');
  };

  return (
      <div className="flex flex-col min-h-screen bg-[#F5F5F8]">
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-white border border-[#E3E3E4] flex items-center justify-center shadow-none">
                <span className="material-icons-outlined text-[#0F6CBD] text-2xl">auto_stories</span>
              </div>
              <div>
                <h1 className="text-2xl font-medium text-[#111827] tracking-tight">Catálogos</h1>
                <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Criar e gerenciar catálogos de produtos</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowTemplatePicker(true)}
              disabled={creating}
              className="flex items-center gap-3 px-6 py-3 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all shadow-none shadow-none-[#0F6CBD]/20"
            >
              <span className="material-icons-outlined text-sm">{creating ? 'sync' : 'add'}</span>
              {creating ? 'Criando...' : 'Novo Catálogo'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 opacity-40">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Sincronizando catálogos...</p>
            </div>
          ) : catalogs.length === 0 ? (
            <div className="bg-white rounded-md border-2 border-dashed border-[#E3E3E4] p-24 flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 rounded-md bg-slate-50 flex items-center justify-center">
                <span className="material-icons-outlined text-4xl text-slate-200">auto_stories</span>
              </div>
              <div>
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-widest">Inicie sua vitrine digital</h2>
                <p className="text-[11px] font-medium text-slate-300 mt-1 uppercase tracking-widest max-w-[300px]">Crie catálogos personalizados para seus clientes e impulsione suas vendas</p>
              </div>
              <button
                onClick={() => setShowTemplatePicker(true)}
                className="px-8 py-4 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all shadow-none shadow-none-[#0F6CBD]/10"
              >
                Criar Primeiro Catálogo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {catalogs.map(catalog => (
                <CatalogCard
                  key={catalog.id}
                  catalog={catalog}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Template Picker Modal */}
        {showTemplatePicker && (
          <CatalogTemplatePicker
            onSelect={handleTemplateSelect}
            onBlank={() => handleCreate()}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}
      </div>
  );
}
