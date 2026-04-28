import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCatalog } from '../src/hooks/useCatalog';
import CatalogCard from '../src/components/catalog/CatalogCard';
import CatalogTemplatePicker, { type CatalogTemplate } from '../src/components/catalog/CatalogTemplatePicker';
import { useAuth } from '../lib/auth';
import { DEFAULT_CATALOG } from '../src/types/catalog';

const CatalogListPage: React.FC = () => {
  const navigate = useNavigate();
  const { appUser } = useAuth();
  const { catalogs, loading, createCatalog, duplicateCatalog, deleteCatalog } = useCatalog();
  const [creating, setCreating] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
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
      navigate(`/catalogo/${catalog.id}`);
    } else {
      toast.error('Erro ao criar catálogo');
      setCreating(false);
    }
  };

  const handleTemplateSelect = (template: CatalogTemplate) => {
    handleCreate(template.settings);
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    const copy = await duplicateCatalog(id);
    if (copy) {
      toast.success('Catálogo duplicado com sucesso!');
    } else {
      toast.error('Erro ao duplicar catálogo');
    }
    setDuplicating(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Todas as páginas e produtos do catálogo serão excluídos.')) return;
    const ok = await deleteCatalog(id);
    if (ok) toast.success('Catálogo excluído.');
    else toast.error('Erro ao excluir catálogo.');
  };

  return (
    <div className="max-w-[1920px] w-full mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shadow-none"
            style={{ background: '#1e3a5f' }}
          >
            <span className="material-icons-outlined text-white text-xl">auto_stories</span>
          </div>
          <div>
            <h1 className="text-xl font-medium text-gray-900 uppercase tracking-tight leading-none">
              Catálogos
            </h1>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">
              Criar e gerenciar catálogos de produtos
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTemplatePicker(true)}
          disabled={creating}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-[11px] font-medium uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 shadow-none"
          style={{ background: '#1e3a5f' }}
        >
          <span className="material-icons-outlined text-sm">{creating ? 'sync' : 'add'}</span>
          {creating ? 'Criando...' : 'Novo Catálogo'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="material-icons-outlined text-gray-300 text-4xl animate-spin">sync</span>
          <p className="text-[10px] font-medium text-gray-300 uppercase tracking-widest">Carregando catálogos...</p>
        </div>
      ) : catalogs.length === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center py-24 gap-5 rounded-md border-2 border-dashed"
          style={{ borderColor: '#e5e7eb', background: '#fafafa' }}
        >
          <div
            className="w-16 h-16 rounded-md flex items-center justify-center"
            style={{ background: '#f0f4f8' }}
          >
            <span className="material-icons-outlined text-3xl" style={{ color: '#1e3a5f', opacity: 0.3 }}>auto_stories</span>
          </div>
          <div className="text-center">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Nenhum catálogo criado</h2>
            <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest">
              Crie seu primeiro catálogo de produtos
            </p>
          </div>
          <button
            onClick={() => setShowTemplatePicker(true)}
            disabled={creating}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-md text-[11px] font-medium uppercase tracking-widest text-white transition-all hover:opacity-90 shadow-none disabled:opacity-60"
            style={{ background: '#1e3a5f' }}
          >
            <span className="material-icons-outlined text-sm">add</span>
            Criar Primeiro Catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
};

export default CatalogListPage;
