import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCatalog } from '../src/hooks/useCatalog';
import { useCatalogPages } from '../src/hooks/useCatalogPages';
import PageCanvas, { A4_WIDTH, A4_HEIGHT } from '../src/components/catalog/PageCanvas';
import { AVAILABLE_FONTS } from '../src/types/catalog';

const CatalogPreviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { catalog, loading: catalogLoading } = useCatalog(id);
  const { pages, fetchPages, loading: pagesLoading } = useCatalogPages(id);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (id) fetchPages(); }, [id, fetchPages]);

  // Load Google Fonts for preview
  useEffect(() => {
    if (!catalog?.font_family) return;
    const family = catalog.font_family.replace(/ /g, '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;600;700;900&display=swap`;
    if (!document.head.querySelector(`[data-preview-font="${family}"]`)) {
      link.setAttribute('data-preview-font', family);
      document.head.appendChild(link);
    }
  }, [catalog?.font_family]);

  const handleExportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    if (!printRef.current) return;

    const opt = {
      margin: 0,
      filename: `${catalog?.title || 'catalogo'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      },
      jsPDF: {
        unit: 'px' as const,
        format: [A4_WIDTH, A4_HEIGHT],
        orientation: 'portrait' as const,
      },
      pagebreak: { mode: ['css', 'avoid-all'], selector: '.pdf-page' },
    };

    html2pdf().set(opt).from(printRef.current).save();
  };

  if (catalogLoading || pagesLoading || !catalog) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-52px)]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-icons-outlined text-gray-300 text-4xl animate-spin">sync</span>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Carregando preview...</p>
        </div>
      </div>
    );
  }

  const noop = () => {};

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)]" style={{ background: '#d1d5db' }}>
      {/* Toolbar */}
      <div
        className="sticky top-[52px] z-30 flex items-center justify-between px-6 py-3 border-b"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderColor: '#e5e7eb' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/catalogo/${id}`)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-700 transition-colors"
          >
            <span className="material-icons-outlined text-sm">arrow_back</span>
            Voltar ao Editor
          </button>
          <span className="text-gray-200">·</span>
          <span className="text-[11px] font-black text-gray-700 truncate max-w-xs">{catalog.title}</span>
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{pages.length} página{pages.length !== 1 ? 's' : ''}</span>
        </div>

        <button
          onClick={handleExportPDF}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95 shadow-sm"
          style={{ background: '#1e3a5f' }}
        >
          <span className="material-icons-outlined text-sm">picture_as_pdf</span>
          Exportar PDF
        </button>
      </div>

      {/* Pages */}
      <div ref={printRef} className="flex flex-col items-center py-8 gap-8">
        {/* Cover page */}
        {catalog.cover_image && (
          <div
            className="pdf-page relative overflow-hidden shadow-2xl"
            style={{
              width: A4_WIDTH,
              minHeight: A4_HEIGHT,
              background: '#000',
              borderRadius: 4,
              pageBreakAfter: 'always',
            }}
          >
            <img
              src={catalog.cover_image}
              alt="Capa"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}
            />
            {catalog.logo_url && (
              <div className="absolute top-12 left-12">
                <img src={catalog.logo_url} alt="Logo" className="h-14 w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              </div>
            )}
            <div className="absolute bottom-12 left-12 right-12">
              <h1
                className="text-5xl font-black text-white leading-tight"
                style={{ fontFamily: catalog.font_family }}
              >
                {catalog.title}
              </h1>
              {catalog.subtitle && (
                <p className="text-xl text-white/80 mt-3" style={{ fontFamily: catalog.font_family }}>
                  {catalog.subtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content pages */}
        {pages.map(page => (
          <div
            key={page.id}
            className="pdf-page"
            style={{ pageBreakAfter: 'always' }}
          >
            <PageCanvas
              page={page}
              catalog={catalog}
              onAddProduct={noop}
              onEditSlot={noop as any}
              onClearSlot={noop}
              isPreview
              scale={1}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CatalogPreviewPage;
