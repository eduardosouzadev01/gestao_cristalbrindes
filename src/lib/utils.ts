export function formatDate(dateString: string | null | undefined) {
    if (!dateString) return '---';
    try {
        const date = new Date(dateString + 'T12:00:00');
        return new Intl.DateTimeFormat('pt-BR').format(date);
    } catch (e) {
        return '---';
    }
}

export function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}

export function formatMonthYear(month: number, year: number) {
    const date = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date).toUpperCase();
}
