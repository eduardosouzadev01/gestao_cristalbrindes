#!/usr/bin/env node

/**
 * Script para aplicar o design system suave em todas as páginas
 * Executa substituições de padrões de cores e estilos
 */

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../pages');

// Padrões de substituição
const replacements = [
    // Backgrounds
    { from: /className="([^"]*?)bg-\[#F3F4F6\]([^"]*?)"/g, to: 'className="$1bg-gray-50$2"' },

    // Botões primários
    { from: /bg-blue-500(\s+hover:bg-blue-600)/g, to: 'bg-blue-600 hover:bg-blue-700' },
    { from: /bg-blue-500/g, to: 'bg-blue-600' },

    // Cards - adicionar border
    { from: /bg-white rounded-lg shadow(?!-)/g, to: 'bg-white rounded-xl border border-gray-200 shadow-sm' },
    { from: /bg-white rounded-xl shadow(?!-)/g, to: 'bg-white rounded-xl border border-gray-200 shadow-sm' },

    // Table headers
    { from: /bg-gray-50([^"]*?)text-gray-700([^"]*?)uppercase/g, to: 'bg-gray-50$1text-gray-600$2uppercase' },

    // Borders em tabelas
    { from: /border-gray-200(?=([^"]*?table|[^"]*?thead|[^"]*?tbody|[^"]*?tr|[^"]*?td|[^"]*?th))/g, to: 'border-gray-100' },

    // Badges - adicionar border
    { from: /bg-emerald-50 text-emerald-700(?! border)/g, to: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    { from: /bg-red-50 text-red-700(?! border)/g, to: 'bg-red-50 text-red-700 border border-red-100' },
    { from: /bg-amber-50 text-amber-700(?! border)/g, to: 'bg-amber-50 text-amber-700 border border-amber-100' },
    { from: /bg-blue-50 text-blue-700(?! border)/g, to: 'bg-blue-50 text-blue-700 border border-blue-100' },
    { from: /bg-yellow-50 text-yellow-700(?! border)/g, to: 'bg-yellow-50 text-yellow-700 border border-yellow-100' },
    { from: /bg-green-50 text-green-700(?! border)/g, to: 'bg-green-50 text-green-700 border border-green-100' },

    // Sombras mais suaves
    { from: /shadow-md(?! )/g, to: 'shadow-sm' },
];

// Arquivos a processar
const filesToProcess = [
    'OrderList.tsx',
    'OrderForm.tsx',
    'BudgetList.tsx',
    'BudgetForm.tsx',
    'CommissionPage.tsx',
    'RegistrationList.tsx',
    'RegistrationForm.tsx',
    'CalculationFactors.tsx',
    'CalculationFactorForm.tsx',
    'LoginPage.tsx',
];

console.log('🎨 Aplicando Design System Suave...\n');

let totalChanges = 0;

filesToProcess.forEach(filename => {
    const filePath = path.join(pagesDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  ${filename} - Arquivo não encontrado`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let fileChanges = 0;

    // Aplicar todas as substituições
    replacements.forEach(({ from, to }) => {
        const matches = content.match(from);
        if (matches) {
            fileChanges += matches.length;
            content = content.replace(from, to);
        }
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${filename} - ${fileChanges} mudanças aplicadas`);
        totalChanges += fileChanges;
    } else {
        console.log(`⏭️  ${filename} - Nenhuma mudança necessária`);
    }
});

console.log(`\n🎉 Concluído! Total de ${totalChanges} mudanças aplicadas em ${filesToProcess.length} arquivos.`);
console.log('\n📝 Próximos passos:');
console.log('1. Verifique as mudanças no navegador');
console.log('2. Teste a funcionalidade das páginas');
console.log('3. Commit as mudanças se estiver satisfeito');
