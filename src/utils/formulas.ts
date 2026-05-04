
export const calculateItemTotal = (item: any) => {
    const qty = item.quantity || 0;
    const price = item.unit_price || item.priceUnit || 0;
    const customization = item.customization_cost || item.custoPersonalizacao || 0;
    const transpForn = item.supplier_transport_cost || item.transpFornecedor || 0;
    const transpCli = item.client_transport_cost || item.transpCliente || 0;
    const extra = item.extra_expense || item.despesaExtra || 0;
    const layout = item.layout_cost || item.layoutCost || 0;

    const custoProduto = qty * price;
    const somaCustos = custoProduto + customization + transpForn + transpCli + extra + layout;

    // Formula: Preço de venda = Custo de cálculo / (2 - fator)
    const factor = item.calculation_factor || item.fator || 1.35;
    const divisor = 2 - factor;
    let baseSale = divisor <= 0 ? somaCustos * 2 : somaCustos / divisor;

    // Apply BV (Agency Fee), Extra (%), and mandatory 1% Seller Commission
    let percentageDivisor = 1;
    const bvPct = item.bv_pct || item.bvPct || 0;
    const extraPct = item.extra_pct || item.extraPct || 0;
    
    if (bvPct > 0) percentageDivisor -= (bvPct / 100);
    if (extraPct > 0) percentageDivisor -= (extraPct / 100);
    
    // 1% Seller commission - Only for new budgets/modern rule
    if (item.useModernRounding) {
        percentageDivisor -= 0.01;
    }

    const rawTotal = percentageDivisor > 0 ? baseSale / percentageDivisor : baseSale;

    const finalQty = qty > 0 ? qty : 1;
    const roundedUnitPrice = Math.round((rawTotal / finalQty) * 100) / 100;

    return roundedUnitPrice * finalQty;
};

export const calculateItemRealTotal = (item: any) => {
    const qty = item.quantity || 0;
    const realPrice = item.real_unit_price || item.realPriceUnit || item.unit_price || item.priceUnit || 0;
    const realCustomization = item.real_customization_cost || item.realCustomizationCost || item.customization_cost || item.custoPersonalizacao || 0;
    const realTranspForn = item.real_supplier_transport_cost || item.realSupplierTransportCost || item.supplier_transport_cost || item.transpFornecedor || 0;
    const realTranspCli = item.real_client_transport_cost || item.realClientTransportCost || item.client_transport_cost || item.transpCliente || 0;
    const realExtra = item.real_extra_expense || item.realExtraExpense || item.extra_expense || item.despesaExtra || 0;
    const realLayout = item.real_layout_cost || item.realLayoutCost || item.layout_cost || item.layoutCost || 0;

    const custoProduto = item.real_total_price || item.realPriceTotal || (qty * realPrice);
    const somaCustos = custoProduto + realCustomization + realTranspForn + realTranspCli + realExtra + realLayout;

    // Add BV, Extra, and 1% Commission as costs
    const totalVenda = calculateItemTotal(item);
    const bvPct = item.bv_pct || item.bvPct || 0;
    const extraPct = item.extra_pct || item.extraPct || 0;
    
    const bvCost = totalVenda * (bvPct / 100);
    const extraCost = totalVenda * (extraPct / 100);
    
    // Commission Cost
    const commissionCost = item.useModernRounding ? (totalVenda * 0.01) : 0;

    // Add Taxes
    const taxPct = item.tax_pct || item.mockNF || 14;
    const taxCost = totalVenda * (taxPct / 100);

    return somaCustos + bvCost + extraCost + commissionCost + taxCost;
};


export const calculateFactorForMinProfit = (item: any, targetProfit: number = 100) => {
    // 1. Calculate Real Costs (without totalVenda-dependent costs)
    const custoProdutoReal = (item.quantity || 0) * (item.realPriceUnit || item.priceUnit || 0);
    const somaCustosReais = custoProdutoReal + 
                           (item.realCustomizationCost || item.custoPersonalizacao || 0) + 
                           (item.realSupplierTransportCost || item.transpFornecedor || 0) + 
                           (item.realClientTransportCost || item.transpCliente || 0) + 
                           (item.realExtraExpense || item.despesaExtra || 0) + 
                           (item.realLayoutCost || item.layoutCost || 0);

    // 2. Calculate divisor for totalVenda-dependent costs
    // These are BV, Extra, Commission, and Taxes (NF)
    let taxRate = (item.mockNF ?? 14) / 100;
    let bvRate = (item.bvPct || 0) / 100;
    let extraRate = (item.extraPct || 0) / 100;
    let commRate = item.useModernRounding ? 0.01 : 0;

    const dependentRateSum = taxRate + bvRate + extraRate + commRate;
    
    // Safety check: if dependent costs >= 100%, we can't reach the target
    if (dependentRateSum >= 1) return 1.9; 

    // TV_req = (Profit + RealCosts) / (1 - dependentRateSum)
    const requiredTotalVenda = (targetProfit + somaCustosReais) / (1 - dependentRateSum);

    // 3. Solve for 'fator'
    // TotalVenda = (somaCustosCalc / (2 - fator)) / percentageDivisor
    // percentageDivisor = 1 - bvRate - extraRate - commRate
    const percentageDivisor = 1 - bvRate - extraRate - commRate;
    const somaCustosCalc = (item.quantity || 0) * (item.priceUnit || 0) + 
                          (item.custoPersonalizacao || 0) + 
                          (item.transpFornecedor || 0) + 
                          (item.transpCliente || 0) + 
                          (item.despesaExtra || 0) + 
                          (item.layoutCost || 0);

    if (somaCustosCalc <= 0) return 1.35; // Default

    // fator = 2 - (somaCustosCalc / (TV_req * percentageDivisor))
    const calculatedFator = 2 - (somaCustosCalc / (requiredTotalVenda * percentageDivisor));

    // Clamp between reasonable limits (e.g., 1.05 and 1.95)
    return Math.max(1.05, Math.min(1.95, calculatedFator));
};
