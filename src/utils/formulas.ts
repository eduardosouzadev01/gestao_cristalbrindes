
export const calculateItemTotal = (item: any) => {
    const custoProduto = (item.quantity || 0) * (item.priceUnit || 0);
    const somaCustos = custoProduto + (item.custoPersonalizacao || 0) + (item.transpFornecedor || 0) + (item.transpCliente || 0) + (item.despesaExtra || 0) + (item.layoutCost || 0);

    // Formula: Preço de venda = Custo de cálculo / (2 - fator)
    const divisor = 2 - (item.fator || 1.35);
    let baseSale = divisor <= 0 ? somaCustos * 2 : somaCustos / divisor;

    // Apply BV (Agency Fee)
    if (item.bvPct && item.bvPct > 0) {
        const bvDivisor = 1 - (item.bvPct / 100);
        return bvDivisor > 0 ? baseSale / bvDivisor : baseSale;
    }

    return baseSale;
};

export const calculateItemRealTotal = (item: any) => {
    const custoProduto = (item.quantity || 0) * (item.realPriceUnit || item.priceUnit || 0);
    const somaCustos = custoProduto + (item.realCustoPersonalizacao || item.custoPersonalizacao || 0) + (item.realTranspFornecedor || item.transpFornecedor || 0) + (item.realTranspCliente || item.transpCliente || 0) + (item.realDespesaExtra || item.despesaExtra || 0) + (item.realLayoutCost || item.layoutCost || 0);

    // Add BV as a cost
    const totalVenda = calculateItemTotal(item);
    const bvCost = totalVenda * ((item.bvPct || 0) / 100);

    // Add Taxes
    const taxCost = totalVenda * ((item.taxPct || 0) / 100);

    return somaCustos + bvCost + taxCost;
};
