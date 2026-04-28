'use client';

import React, { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useCatalog } from '@/hooks/useCatalog';
import { useCatalogPages } from '@/hooks/useCatalogPages';
import PageCanvas, { A4_WIDTH, A4_HEIGHT } from '@/components/catalog/PageCanvas';

export default function CatalogPreviewPage() {
  const { id } = useParams();
  const { catalog, loading: catalogLoading } = useCatalog(id as string);
  const { pages, fetchPages, loading: pagesLoading } = useCatalogPages(id as string);
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
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0F6CBD] rounded-full animate-spin"></div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Preparando Catálogo...</p>
        </div>
      </div>
    );
  }

  const noop = () => {};

  return (
    <div className="flex flex-col min-h-screen bg-[#D1D5DB]">
      {/* Public Toolbar (Optional, maybe for exporting) */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#E3E3E4] px-8 py-4 flex items-center justify-between shadow-none">
        <div className="flex items-center gap-4">
           {catalog.logo_url && (
             <img src={catalog.logo_url} alt="Logo" className="h-8 w-auto object-contain" />
           )}
           <div>
             <h1 className="text-sm font-medium text-[#111827] uppercase tracking-tight">{catalog.title}</h1>
             <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{pages.length} Páginas</p>
           </div>
        </div>

        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#0F6CBD] text-white rounded-md text-[10px] font-medium uppercase tracking-widest hover:bg-[#115EA3] transition-all shadow-none shadow-none-[#0F6CBD]/10"
        >
          <span className="material-icons-outlined text-sm">picture_as_pdf</span>
          Baixar Catálogo (PDF)
        </button>
      </div>

      {/* Pages Container */}
      <div ref={printRef} className="flex flex-col items-center py-12 gap-12 sm:gap-16">
        
        {/* Cover */}
        {catalog.cover_image && (
          <div className="pdf-page relative shadow-none overflow-hidden rounded-md" style={{ width: A4_WIDTH, minHeight: A4_HEIGHT, background: '#111827' }}>
            <img src={catalog.cover_image} alt="Capa" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        )}

        {/* Content Pages */}
        {pages.map(page => (
          <div key={page.id} className="pdf-page bg-white shadow-none rounded-md">
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

        {/* Back Cover */}
        {(catalog.back_cover_logo_url || catalog.back_cover_message || catalog.back_cover_website || catalog.back_cover_instagram || catalog.back_cover_phone) && (
          <div
            className="pdf-page relative shadow-none flex flex-col items-center justify-center p-20 text-center rounded-md"
            style={{
              width: A4_WIDTH,
              minHeight: A4_HEIGHT,
              background: catalog.back_cover_color || '#ffffff',
              fontFamily: catalog.font_family,
            }}
          >
             <div className="flex flex-col items-center w-full max-w-2xl space-y-16">
                {catalog.back_cover_logo_url && (
                    <img src={catalog.back_cover_logo_url} alt="Logo Final" className="max-h-56 object-contain" />
                )}
                
                {catalog.back_cover_message && (
                    <p className="text-4xl font-medium leading-tight tracking-tight px-12" style={{ color: catalog.primary_color }}>
                    {catalog.back_cover_message}
                    </p>
                )}

                <div className="flex flex-col items-center space-y-6 pt-12 border-t w-full" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    {catalog.back_cover_website && (
                    <div className="flex items-center gap-4 text-2xl font-medium" style={{ color: catalog.secondary_color }}>
                        <span className="material-icons-outlined text-4xl opacity-50">language</span>
                        {catalog.back_cover_website}
                    </div>
                    )}
                    
                    {catalog.back_cover_instagram && (
                    <div className="flex items-center gap-4 text-2xl font-medium" style={{ color: catalog.secondary_color }}>
                        <span className="material-icons-outlined text-4xl opacity-50">brand_instagram</span>
                        {catalog.back_cover_instagram}
                    </div>
                    )}
                    
                    {catalog.back_cover_phone && (
                    <div className="flex items-center gap-4 text-2xl font-medium" style={{ color: catalog.secondary_color }}>
                        <span className="material-icons-outlined text-4xl opacity-50">whatsapp</span>
                        {catalog.back_cover_phone}
                    </div>
                    )}
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
