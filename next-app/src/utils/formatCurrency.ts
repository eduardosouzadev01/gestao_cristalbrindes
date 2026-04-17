export const formatCurrency = (value: number | string): string => {
    const numberValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numberValue)) {
        return 'R$ 0,00';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(numberValue);
};

export const parseCurrencyToNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const digits = value.toString().replace(/\D/g, '');
    return parseFloat(digits) / 100 || 0;
};
