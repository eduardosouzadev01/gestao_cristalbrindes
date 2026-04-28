/**
 * Excel Export - "Memória de Cálculo" format
 * Generates XML SpreadsheetML (.xls) with formulas, matching the
 * vertical "MEMÓRIA DE CÁLCULO" layout used by the sales team.
 */

interface ExcelProposalData {
    proposalNumber: string;
    budgetNumber: string;
    date: string;
    salesperson: string;
    issuer: string;
    client: {
        name: string;
        doc: string;
        email: string;
        phone: string;
        contact_name: string;
    };
    validity: string;
    shipping: string;
    deliveryDeadline: string;
    paymentMethod: string;
    observation: string;
    items: ExcelItemData[];
}

interface ExcelItemData {
    productName: string;
    productCode: string;
    productColor: string;
    quantity: number;
    priceUnit: number;
    custoPersonalizacao: number;
    layoutCost: number;
    transpFornecedor: number;
    transpCliente: number;
    despesaExtra: number;
    fator: number;
    mockNF: number;
    mockMargin: number;
    mockPayment: number;
    bvPct: number;
    extraPct: number;
    totalVenda: number;
}

const esc = (str: string): string => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
};

export type { ExcelProposalData, ExcelItemData };

export const generateBudgetExcel = (data: ExcelProposalData): void => {
    const itemCount = data.items.length;

    // --- Build the columns for items ---
    // Each item = 2 columns (label + value), with a gap column between items
    // Total columns: 2 (info label+value) + gap + (2 per item with gaps)
    const colWidths: string[] = [];
    // Column A: row labels (wide)
    colWidths.push('<Column ss:Width="220"/>');
    // Column B: info values (for header section)
    colWidths.push('<Column ss:Width="180"/>');

    // For each item: gap col (10px) + label col (200) + value col (120)
    for (let i = 0; i < itemCount; i++) {
        if (i === 0) colWidths.push('<Column ss:Width="15"/>'); // thin gap
        colWidths.push('<Column ss:Width="220"/>'); // item label
        colWidths.push('<Column ss:Width="120"/>'); // item value
        if (i < itemCount - 1) colWidths.push('<Column ss:Width="15"/>');
    }

    // Helper to get column index for item i (0-based)
    // Layout: A(0)=labels, B(1)=headerVal, C(2)=gap, D(3)=item0_label, E(4)=item0_val, F(5)=gap, G(6)=item1_label, H(7)=item1_val...
    const itemLabelCol = (i: number): number => 3 + i * 3; // D, G, J...
    const itemValueCol = (i: number): number => 4 + i * 3; // E, H, K...

    // Excel R1C1 reference helper
    const rc = (row: number, col: number) => `R${row}C${col}`;

    // --- Build rows ---

    // Row 1: Title
    const row1 = `<Row ss:Height="30">
  <Cell ss:StyleID="Title" ss:MergeAcross="1"><Data ss:Type="String">INFORMAÇÕES GERAIS</Data></Cell>
</Row>`;

    // Empty spacer row
    const spacer = '<Row ss:Height="6"><Cell><Data ss:Type="String"></Data></Cell></Row>';

    // Info rows (Row 3-8)
    const infoRows = [
        ['DATA', data.date],
        ['CONSULTOR DE VENDAS', data.salesperson],
        ['CLIENTE', data.client.name],
        ['CNPJ / CPF', data.client.doc || '---'],
        ['E-MAIL', data.client.email || '---'],
        ['TELEFONE / CONTATO', data.client.phone || '---'],
    ].map(([label, value]) =>
        `<Row ss:Height="22">
  <Cell ss:StyleID="InfoLabel"><Data ss:Type="String">${esc(label)}</Data></Cell>
  <Cell ss:StyleID="InfoValue"><Data ss:Type="String">${esc(value)}</Data></Cell>
</Row>`
    ).join('\n');

    // Commercial conditions row
    const conditionsRows = [
        ['VALIDADE', data.validity],
        ['FRETE', data.shipping],
        ['PRAZO DE ENTREGA', data.deliveryDeadline],
        ['FORMA DE PAGAMENTO', data.paymentMethod],
    ].map(([label, value]) =>
        `<Row ss:Height="22">
  <Cell ss:StyleID="InfoLabel"><Data ss:Type="String">${esc(label)}</Data></Cell>
  <Cell ss:StyleID="InfoValue"><Data ss:Type="String">${esc(value)}</Data></Cell>
</Row>`
    ).join('\n');

    // Observation
    const obsRow = data.observation ? `<Row ss:Height="22">
  <Cell ss:StyleID="InfoLabel"><Data ss:Type="String">OBSERVAÇÃO</Data></Cell>
  <Cell ss:StyleID="InfoValue"><Data ss:Type="String">${esc(data.observation)}</Data></Cell>
</Row>` : '';

    // --- MEMÓRIA DE CÁLCULO header row ---
    // This row spans across all item columns
    let calcHeaderCells = '<Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell>';
    for (let i = 0; i < itemCount; i++) {
        if (i === 0) calcHeaderCells += '<Cell><Data ss:Type="String"></Data></Cell>'; // gap
        calcHeaderCells += `<Cell ss:StyleID="CalcHeader" ss:MergeAcross="1"><Data ss:Type="String">MEMÓRIA DE CÁLCULO</Data></Cell>`;
        if (i < itemCount - 1) calcHeaderCells += '<Cell><Data ss:Type="String"></Data></Cell>';
    }
    const calcHeaderRow = `<Row ss:Height="28">${calcHeaderCells}</Row>`;

    // --- Product name + unit cost row ---
    let productNameCells = '<Cell><Data ss:Type="String"></Data></Cell><Cell><Data ss:Type="String"></Data></Cell>';
    for (let i = 0; i < itemCount; i++) {
        const it = data.items[i];
        const displayName = it.productCode
            ? `${it.productName} - ${it.productCode}`
            : it.productName;
        if (i === 0) productNameCells += '<Cell><Data ss:Type="String"></Data></Cell>';
        productNameCells += `<Cell ss:StyleID="ProductName"><Data ss:Type="String">${esc(displayName)}</Data></Cell>`;
        productNameCells += `<Cell ss:StyleID="ProductPrice"><Data ss:Type="Number">${it.priceUnit}</Data></Cell>`;
        if (i < itemCount - 1) productNameCells += '<Cell><Data ss:Type="String"></Data></Cell>';
    }
    const productNameRow = `<Row ss:Height="24">${productNameCells}</Row>`;

    // --- Data rows for the calculation memory ---
    // Each row: label in col A, then for each item: label (repeated) + value
    // We track the row number for formula references

    const dataStartRow = 20; // approximate row where data starts (after header+info)
    // Actual calculation rows:

    interface CalcRow {
        label: string;
        values: (number | string)[];
        style: string;
        isFormula?: boolean;
        formula?: (itemIdx: number, currentRow: number) => string;
        isSectionHeader?: boolean;
        isPct?: boolean;
    }

    // We'll track which row each calc row ends up at
    const calcRows: CalcRow[] = [];

    // Row 0: QUANTIDADE
    calcRows.push({
        label: 'QUANTIDADE',
        values: data.items.map(it => it.quantity),
        style: 'CalcNumber',
    });

    // Row 1: CUSTO PARCIAL (qty * unit) - FORMULA
    calcRows.push({
        label: 'CUSTO PARCIAL',
        values: data.items.map(it => it.quantity * it.priceUnit),
        style: 'CalcCurrency',
        isFormula: true,
        formula: (i, row) => {
            const qtyRow = row - 1;
            const vc = itemValueCol(i) + 1;
            // product row is 2 rows before qty
            const productRow = qtyRow - 1;
            return `=${rc(qtyRow, vc)}*${rc(productRow, vc)}`;
        },
    });

    // Row 2: CUSTO PERSONALIZAÇÃO
    calcRows.push({
        label: 'CUSTO PERSONALIZAÇÃO',
        values: data.items.map(it => it.custoPersonalizacao),
        style: 'CalcCurrency',
    });

    // Row 3: CUSTO LAYOUT
    calcRows.push({
        label: 'CUSTO LAYOUT',
        values: data.items.map(it => it.layoutCost),
        style: 'CalcCurrency',
    });

    // Row 4: CUSTO TOTAL (parcial + personal + layout) - FORMULA
    calcRows.push({
        label: 'CUSTO TOTAL',
        values: data.items.map(it =>
            it.quantity * it.priceUnit + it.custoPersonalizacao + it.layoutCost
        ),
        style: 'CalcCurrencyBold',
        isFormula: true,
        formula: (i, row) => {
            const vc = itemValueCol(i) + 1;
            return `=${rc(row - 3, vc)}+${rc(row - 2, vc)}+${rc(row - 1, vc)}`;
        },
    });

    // Row 5: FRETE FORNECEDOR
    calcRows.push({
        label: 'FRETE FORNECEDOR',
        values: data.items.map(it => it.transpFornecedor),
        style: 'CalcCurrency',
    });

    // Row 6: FRETE CLIENTE
    calcRows.push({
        label: 'FRETE CLIENTE',
        values: data.items.map(it => it.transpCliente),
        style: 'CalcCurrency',
    });

    // Row 7: DESPESA EXTRA
    calcRows.push({
        label: 'DESPESA EXTRA / RESERVA',
        values: data.items.map(it => it.despesaExtra),
        style: 'CalcCurrency',
    });

    // Row 8: CUSTO TOTAL + FRETES - FORMULA
    calcRows.push({
        label: 'CUSTO TOTAL + FRETES',
        values: data.items.map(it => {
            return it.quantity * it.priceUnit + it.custoPersonalizacao + it.layoutCost +
                it.transpFornecedor + it.transpCliente + it.despesaExtra;
        }),
        style: 'CalcCurrencyHighlight',
        isFormula: true,
        formula: (i, row) => {
            const vc = itemValueCol(i) + 1;
            return `=${rc(row - 4, vc)}+${rc(row - 3, vc)}+${rc(row - 2, vc)}+${rc(row - 1, vc)}`;
        },
    });

    // Separator
    calcRows.push({ label: '', values: [], style: 'Spacer', isSectionHeader: true });

    // Row 9: MARGEM (%)
    calcRows.push({
        label: 'MARGEM (%)',
        values: data.items.map(it => it.mockMargin),
        style: 'CalcPercent',
        isPct: true,
    });

    // Row 10: IMPOSTO NF (%)
    calcRows.push({
        label: 'IMPOSTO NF (%)',
        values: data.items.map(it => it.mockNF),
        style: 'CalcPercent',
        isPct: true,
    });

    // Row 11: ACRÉSCIMO FATURAMENTO (%)
    calcRows.push({
        label: 'ACRÉSCIMO FATURAMENTO (%)',
        values: data.items.map(it => it.mockPayment),
        style: 'CalcPercent',
        isPct: true,
    });

    // Row 12: FATOR (calculated) - FORMULA
    calcRows.push({
        label: 'FATOR',
        values: data.items.map(it => it.fator),
        style: 'CalcFactor',
        isFormula: true,
        formula: (i, row) => {
            const vc = itemValueCol(i) + 1;
            return `=1+(${rc(row - 3, vc)}+${rc(row - 2, vc)}+${rc(row - 1, vc)})/100`;
        },
    });

    // Row 13: BV / AGÊNCIA (%)
    calcRows.push({
        label: 'COMISSÃO AGÊNCIA - BV (%)',
        values: data.items.map(it => it.bvPct),
        style: 'CalcPercent',
        isPct: true,
    });

    // Row 14: EXTRA (%)
    calcRows.push({
        label: 'EXTRA (%)',
        values: data.items.map(it => it.extraPct),
        style: 'CalcPercent',
        isPct: true,
    });

    // Separator
    calcRows.push({ label: '', values: [], style: 'Spacer', isSectionHeader: true });

    // Row 15: EMPRESA (issuer)
    calcRows.push({
        label: 'IMPOSTOS (EMPRESA)',
        values: data.items.map(() => data.issuer),
        style: 'CalcText',
    });

    // Separator
    calcRows.push({ label: '', values: [], style: 'Spacer', isSectionHeader: true });

    // --- RESULTS SECTION ---

    // Row: PREÇO S/ IMPOSTOS (= custos / (2 - fator) / (1 - bv - extra)) - this is pre-tax sale price
    // The system formula: totalVenda = rounded-mdUnit * qty
    // where rounded-mdUnit = ROUND(rawTotal / qty, 2)
    // and rawTotal = (sumCosts / (2 - fator)) / (1 - bv/100 - extra/100)
    // For the Excel, we replicate this exactly.

    // PREÇO TOTAL VENDA - FORMULA (the main result)
    // This matches calculateItemTotal: ROUND(raw/qty, 2) * qty
    calcRows.push({
        label: 'PREÇO TOTAL VENDA',
        values: data.items.map(it => it.totalVenda),
        style: 'ResultHighlight',
        isFormula: true,
        formula: (i, row) => {
            const vc = itemValueCol(i) + 1;
            // Need references to:
            // custoTotalFretes row: row - 11 (approximate, we'll calculate exact)
            // fator row: row - 7
            // bv row: row - 6
            // extra row: row - 5
            // qty row: row - 19

            // Actually, let's use relative row offsets based on calcRows array.
            // We'll compute these after we know the actual row indices.
            // Use a placeholder for now
            return '__TOTAL_VENDA__';
        },
    });

    // PREÇO UNITÁRIO VENDA - FORMULA
    calcRows.push({
        label: 'PREÇO UNITÁRIO VENDA',
        values: data.items.map(it => it.totalVenda / (it.quantity || 1)),
        style: 'ResultCurrency',
        isFormula: true,
        formula: (i, row) => {
            const vc = itemValueCol(i) + 1;
            return `__UNIT_VENDA__`;
        },
    });

    // Separator
    calcRows.push({ label: '', values: [], style: 'Spacer', isSectionHeader: true });

    // VALOR IMPOSTO - FORMULA
    calcRows.push({
        label: 'VALOR IMPOSTOS (R$)',
        values: data.items.map(it => it.totalVenda * (it.mockNF / 100)),
        style: 'CalcCurrencyRed',
        isFormula: true,
        formula: (i, row) => `__IMPOSTO_VAL__`,
    });

    // VALOR BV - FORMULA
    calcRows.push({
        label: 'VALOR COMISSÃO BV (R$)',
        values: data.items.map(it => it.totalVenda * (it.bvPct / 100)),
        style: 'CalcCurrencyOrange',
        isFormula: true,
        formula: (i, row) => `__BV_VAL__`,
    });

    // LUCRO ESTIMADO - FORMULA
    calcRows.push({
        label: 'LUCRO ESTIMADO',
        values: data.items.map(it => {
            const custos = it.quantity * it.priceUnit + it.custoPersonalizacao +
                it.layoutCost + it.transpFornecedor + it.transpCliente + it.despesaExtra;
            const impostoVal = it.totalVenda * (it.mockNF / 100);
            const bvVal = it.totalVenda * (it.bvPct / 100);
            return it.totalVenda - custos - impostoVal - bvVal;
        }),
        style: 'ResultGreen',
        isFormula: true,
        formula: (i, row) => `__LUCRO__`,
    });

    // Now build the XML rows and compute actual row indices for formulas
    // Count actual header rows dynamically:
    // Row 1: Title
    // Row 2: Spacer
    // Rows 3-8: 6 info rows
    // Row 9: Spacer
    // Rows 10-13: 4 condition rows
    // Row 14: Observation (if present)
    // Row 15: Spacer
    // Row 16: Spacer
    // Row 17: CalcHeader
    // Row 18: Product name row
    let headerRowCount = 1 + 1 + 6 + 1 + 4 + (data.observation ? 1 : 0) + 1 + 1 + 1 + 1;

    const productNameRowNum = headerRowCount;
    const qtyRowNum = productNameRowNum + 1; // first calcRow

    // Map calcRow index -> actual excel row number
    const rowMap: number[] = [];
    let currentRow = qtyRowNum;
    for (let ci = 0; ci < calcRows.length; ci++) {
        rowMap.push(currentRow);
        currentRow++;
    }

    // Now find the row numbers for key references
    const ROW_QTY = rowMap[0];
    const ROW_CUSTO_PARCIAL = rowMap[1];
    const ROW_CUSTO_TOTAL_FRETES = rowMap[8]; // index 8
    const ROW_MARGEM = rowMap[10]; // after spacer at 9
    const ROW_IMPOSTO_PCT = rowMap[11];
    const ROW_FATOR = rowMap[13]; // after payment at 12
    const ROW_BV_PCT = rowMap[14];
    const ROW_EXTRA_PCT = rowMap[15];

    // Results rows
    const ROW_TOTAL_VENDA = rowMap[19]; // after spacers
    const ROW_UNIT_VENDA = rowMap[20];
    const ROW_IMPOSTO_VAL = rowMap[22]; // after spacer
    const ROW_BV_VAL = rowMap[23];
    const ROW_LUCRO = rowMap[24];

    // Build the calculation data rows
    let calcDataXml = '';
    for (let ci = 0; ci < calcRows.length; ci++) {
        const cr = calcRows[ci];
        const excelRow = rowMap[ci];

        if (cr.isSectionHeader) {
            calcDataXml += '<Row ss:Height="6"><Cell><Data ss:Type="String"></Data></Cell></Row>\n';
            continue;
        }

        let cells = `<Cell ss:StyleID="RowLabel"><Data ss:Type="String">${esc(cr.label)}</Data></Cell>`;
        cells += '<Cell><Data ss:Type="String"></Data></Cell>'; // B col empty

        for (let i = 0; i < itemCount; i++) {
            const vc = itemValueCol(i) + 1; // 1-indexed col for RC refs
            const val = cr.values[i];

            // Gap column
            if (i === 0) cells += '<Cell><Data ss:Type="String"></Data></Cell>';

            // Label column (repeat the label inside item block)
            cells += `<Cell ss:StyleID="ItemLabel"><Data ss:Type="String">${esc(cr.label)}</Data></Cell>`;

            // Value column
            if (cr.isFormula) {
                let formula = '';
                // Compute the actual formula string
                if (ci === 1) {
                    // CUSTO PARCIAL = qty * unitPrice
                    formula = `=${rc(ROW_QTY, vc)}*${rc(productNameRowNum, vc)}`;
                } else if (ci === 4) {
                    // CUSTO TOTAL = parcial + personal + layout
                    formula = `=${rc(ROW_CUSTO_PARCIAL, vc)}+${rc(rowMap[2], vc)}+${rc(rowMap[3], vc)}`;
                } else if (ci === 8) {
                    // CUSTO TOTAL + FRETES = custoTotal + freteForn + freteCliente + extra
                    formula = `=${rc(rowMap[4], vc)}+${rc(rowMap[5], vc)}+${rc(rowMap[6], vc)}+${rc(rowMap[7], vc)}`;
                } else if (ci === 13) {
                    // FATOR = 1 + (margem + imposto + pagamento) / 100
                    formula = `=1+(${rc(ROW_MARGEM, vc)}+${rc(ROW_IMPOSTO_PCT, vc)}+${rc(rowMap[12], vc)})/100`;
                } else if (ci === 19) {
                    // PREÇO TOTAL VENDA = ROUND((custoTotalFretes/(2-fator))/(1-bv/100-extra/100)/qty, 2)*qty
                    formula = `=ROUND((${rc(ROW_CUSTO_TOTAL_FRETES, vc)}/(2-${rc(ROW_FATOR, vc)}))/(1-${rc(ROW_BV_PCT, vc)}/100-${rc(ROW_EXTRA_PCT, vc)}/100)/${rc(ROW_QTY, vc)},2)*${rc(ROW_QTY, vc)}`;
                } else if (ci === 20) {
                    // PREÇO UNITÁRIO = total / qty
                    formula = `=IF(${rc(ROW_QTY, vc)}>0,${rc(ROW_TOTAL_VENDA, vc)}/${rc(ROW_QTY, vc)},0)`;
                } else if (ci === 22) {
                    // IMPOSTO VALOR = totalVenda * impostoNF / 100
                    formula = `=${rc(ROW_TOTAL_VENDA, vc)}*${rc(ROW_IMPOSTO_PCT, vc)}/100`;
                } else if (ci === 23) {
                    // BV VALOR = totalVenda * bvPct / 100
                    formula = `=${rc(ROW_TOTAL_VENDA, vc)}*${rc(ROW_BV_PCT, vc)}/100`;
                } else if (ci === 24) {
                    // LUCRO = totalVenda - custoTotalFretes - impostoVal - bvVal
                    formula = `=${rc(ROW_TOTAL_VENDA, vc)}-${rc(ROW_CUSTO_TOTAL_FRETES, vc)}-${rc(ROW_IMPOSTO_VAL, vc)}-${rc(ROW_BV_VAL, vc)}`;
                }

                if (formula) {
                    cells += `<Cell ss:StyleID="${cr.style}" ss:Formula="${formula}"><Data ss:Type="Number">${typeof val === 'number' ? val : 0}</Data></Cell>`;
                } else {
                    cells += `<Cell ss:StyleID="${cr.style}"><Data ss:Type="Number">${typeof val === 'number' ? val : 0}</Data></Cell>`;
                }
            } else if (typeof val === 'number') {
                cells += `<Cell ss:StyleID="${cr.style}"><Data ss:Type="Number">${val}</Data></Cell>`;
            } else {
                cells += `<Cell ss:StyleID="${cr.style}"><Data ss:Type="String">${esc(String(val || ''))}</Data></Cell>`;
            }

            if (i < itemCount - 1) cells += '<Cell><Data ss:Type="String"></Data></Cell>';
        }

        calcDataXml += `<Row ss:Height="22">${cells}</Row>\n`;
    }

    // --- Formula explanation rows ---
    const formulaExplanation = `
<Row ss:Height="8"><Cell><Data ss:Type="String"></Data></Cell></Row>
<Row ss:Height="22">
  <Cell ss:StyleID="FormulaTitle" ss:MergeAcross="1"><Data ss:Type="String">FÓRMULAS UTILIZADAS</Data></Cell>
</Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Custo Parcial = Quantidade × Valor Unitário (Fornecedor)</Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Custo Total = Custo Parcial + Personalização + Layout</Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Custo Total + Fretes = Custo Total + Frete Fornecedor + Frete Cliente + Despesa Extra</Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Fator = 1 + (Margem% + Imposto% + Acréscimo Faturamento%) / 100</Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Preço Total Venda = ARRED( (Custo Total + Fretes) / (2 - Fator) / (1 - BV%/100 - Extra%/100) / Qtd ; 2 ) × Qtd</Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Valor Impostos = Preço Total Venda × (Imposto% / 100)</Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">Lucro Estimado = Preço Total Venda - Custo Total + Fretes - Valor Impostos - Valor BV</Data></Cell></Row>
<Row><Cell><Data ss:Type="String"></Data></Cell></Row>
<Row><Cell ss:StyleID="FormulaNote"><Data ss:Type="String">⚠ Altere qualquer valor nas células editáveis e os cálculos serão recalculados automaticamente pelo Excel.</Data></Cell></Row>`;

    // --- Full XML ---
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default">
   <Font ss:FontName="Calibri" ss:Size="10"/>
  </Style>

  <!-- HEADER STYLES -->
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#D4A017" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#B8860B"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8860B"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8860B"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8860B"/>
   </Borders>
  </Style>
  <Style ss:ID="InfoLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <Interior ss:Color="#FFF8DC" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8D88C"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8D88C"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8D88C"/>
   </Borders>
  </Style>
  <Style ss:ID="InfoValue">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#333333"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8D88C"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E8D88C"/>
   </Borders>
  </Style>

  <!-- CALC SECTION STYLES -->
  <Style ss:ID="CalcHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#D4A017" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#B8860B"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8860B"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8860B"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#B8860B"/>
   </Borders>
  </Style>
  <Style ss:ID="ProductName">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <Interior ss:Color="#FFF8DC" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A017"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A017"/>
   </Borders>
  </Style>
  <Style ss:ID="ProductPrice">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Interior ss:Color="#FFF8DC" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A017"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A017"/>
   </Borders>
  </Style>

  <!-- ROW STYLES -->
  <Style ss:ID="RowLabel">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#555555"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="ItemLabel">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Bold="1" ss:Color="#333333"/>
   <Interior ss:Color="#F5F5F0" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>

  <!-- VALUE STYLES -->
  <Style ss:ID="CalcNumber">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcCurrency">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#333333"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcCurrencyBold">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#F0EDE0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D4A017"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A017"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcCurrencyHighlight">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#8B4513"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFF0C0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D4A017"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#D4A017"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4A017"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcPercent">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <NumberFormat ss:Format="0.00&quot;%&quot;"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcFactor">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#8B4513"/>
   <NumberFormat ss:Format="0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFF8DC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcText">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#333333"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcCurrencyRed">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#CC0000"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFF0F0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>
  <Style ss:ID="CalcCurrencyOrange">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#CC6600"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#FFF8F0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E0DDD0"/>
   </Borders>
  </Style>

  <!-- RESULT STYLES -->
  <Style ss:ID="ResultHighlight">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#1A1A8B"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#E8E8FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#3333AA"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#3333AA"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3333AA"/>
   </Borders>
  </Style>
  <Style ss:ID="ResultCurrency">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#1A1A1A"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#F0F0FF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCEE"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CCCCEE"/>
   </Borders>
  </Style>
  <Style ss:ID="ResultGreen">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#006600"/>
   <NumberFormat ss:Format="&quot;R$&quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Interior ss:Color="#E0FFE0" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#006600"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#006600"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#006600"/>
   </Borders>
  </Style>

  <Style ss:ID="Spacer">
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>

  <!-- FORMULA NOTES -->
  <Style ss:ID="FormulaTitle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#666666"/>
  </Style>
  <Style ss:ID="FormulaNote">
   <Font ss:FontName="Calibri" ss:Size="8" ss:Italic="1" ss:Color="#999999"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Memória de Cálculo">
  <Table ss:DefaultColumnWidth="80">
   ${colWidths.join('\n   ')}

   <!-- ROW 1: Title -->
   ${row1}

   <!-- ROW 2: Spacer -->
   ${spacer}

   <!-- ROWS 3-8: Info -->
   ${infoRows}

   <!-- ROW 9: Spacer -->
   ${spacer}

   <!-- ROWS 10-13: Conditions -->
   ${conditionsRows}

   <!-- Observation -->
   ${obsRow}

   <!-- Spacer -->
   ${spacer}
   ${spacer}

   <!-- MEMÓRIA DE CÁLCULO header -->
   ${calcHeaderRow}

   <!-- Product names -->
   ${productNameRow}

   <!-- Calculation data rows -->
   ${calcDataXml}

   <!-- Formula explanation -->
   ${formulaExplanation}

  </Table>
 </Worksheet>
</Workbook>`;

    // Download
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = data.budgetNumber
        ? `Memoria_Calculo_ORC_${data.budgetNumber}.xls`
        : `Memoria_Calculo_Proposta_${data.proposalNumber}.xls`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
