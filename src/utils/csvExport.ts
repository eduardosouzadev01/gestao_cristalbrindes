/**
 * CSV Export Utility
 * Creates and downloads CSV files with BOM for Excel compatibility with pt-BR
 */

interface ExportColumn {
    header: string;
    accessor: string | ((row: any) => string | number);
}

export const exportToCSV = (
    data: any[],
    columns: ExportColumn[],
    filename: string
) => {
    if (!data || data.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
    }

    // BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';

    // Header row
    const headerRow = columns.map(c => `"${c.header}"`).join(';');

    // Data rows
    const dataRows = data.map(row =>
        columns.map(col => {
            let value: any;
            if (typeof col.accessor === 'function') {
                value = col.accessor(row);
            } else {
                value = row[col.accessor];
            }

            // Format numbers with Brazilian locale for Excel
            if (typeof value === 'number') {
                return `"${value.toFixed(2).replace('.', ',')}"`;
            }
            if (value === null || value === undefined) return '""';
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(';')
    );

    const csvContent = BOM + [headerRow, ...dataRows].join('\r\n');

    // Create and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Simple CSV export: takes array of flat objects, auto-generates columns from keys
 */
export const exportSimpleCSV = (data: Record<string, any>[], filename: string) => {
    if (!data || data.length === 0) { alert('Nenhum dado para exportar.'); return; }
    const keys = Object.keys(data[0]);
    const columns: ExportColumn[] = keys.map(k => ({ header: k, accessor: k }));
    exportToCSV(data, columns, filename);
};

export const formatCurrencyForExport = (value: number): string => {
    return value.toFixed(2).replace('.', ',');
};

export const formatDateForExport = (date: string): string => {
    if (!date) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
    }
    return date;
};
