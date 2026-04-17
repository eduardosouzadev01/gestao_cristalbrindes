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

        {/* Back Cover page */}
        {(catalog.back_cover_logo_url || catalog.back_cover_message || catalog.back_cover_website || catalog.back_cover_instagram || catalog.back_cover_phone) && (
          <div
            className="pdf-page relative overflow-hidden shadow-2xl flex flex-col items-center justify-center p-16 text-center"
            style={{
              width: A4_WIDTH,
              minHeight: A4_HEIGHT,
              background: catalog.back_cover_color || '#ffffff',
              borderRadius: 4,
              fontFamily: catalog.font_family,
            }}
          >
            <div className="flex flex-col items-center w-full max-w-2xl space-y-16">
              {catalog.back_cover_logo_url && (
                <img src={catalog.back_cover_logo_url} alt="Logo Final" className="max-h-48 object-contain" />
              )}
              
              {catalog.back_cover_message && (
                <p className="text-3xl font-semibold leading-relaxed" style={{ color: catalog.primary_color }}>
                  {catalog.back_cover_message}
                </p>
              )}

              <div className="flex flex-col items-center space-y-6 pt-12 border-t w-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                {catalog.back_cover_website && (
                  <a 
                    href={catalog.back_cover_website.startsWith('http') ? catalog.back_cover_website : `https://${catalog.back_cover_website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 text-2xl hover:opacity-80 transition-opacity"
                    style={{ color: catalog.secondary_color, textDecoration: 'none' }}
                  >
                    <span className="material-icons-outlined text-4xl">language</span>
                    {catalog.back_cover_website}
                  </a>
                )}
                
                {catalog.back_cover_instagram && (
                  <a 
                    href={`https://instagram.com/${catalog.back_cover_instagram.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-4 text-2xl hover:opacity-80 transition-opacity"
                    style={{ color: catalog.secondary_color, textDecoration: 'none' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                    </svg>
                    {catalog.back_cover_instagram}
                  </a>
                )}
                
                {catalog.back_cover_phone && (
                  <a 
                    href={`https://wa.me/55${catalog.back_cover_phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-4 text-2xl hover:opacity-80 transition-opacity"
                    style={{ color: catalog.secondary_color, textDecoration: 'none' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp: {catalog.back_cover_phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogPreviewPage;
