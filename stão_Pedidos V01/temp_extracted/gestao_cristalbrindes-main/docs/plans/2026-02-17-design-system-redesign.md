# Design System Redesign - Corporate Blue
**Data:** 2026-02-17  
**Objetivo:** Implementar design system profissional e corrigir elementos UI identificados nos testes

## 1. Visão Geral

Redesign completo do sistema de gestão de pedidos com foco em:
- Aparência profissional e corporativa
- Cores neutras e sóbrias
- Consistência visual em todos os componentes
- Melhor hierarquia de informação
- Correção de elementos UI problemáticos

## 2. Paleta de Cores

### Primary Colors (Slate)
- **slate-900** (#0F172A): Headers, navegação principal
- **slate-800** (#1E293B): Elementos de destaque
- **slate-700** (#334155): Texto importante
- **slate-500** (#64748B): Texto secundário

### Accent Color (Blue)
- **blue-600** (#2563EB): Botões primários, links principais
- **blue-500** (#3B82F6): Hover states, badges
- **blue-50** (#EFF6FF): Backgrounds sutis

### Semantic Colors
- **Success (Emerald)**: emerald-500 (#10B981), emerald-50 (#ECFDF5)
- **Warning (Amber)**: amber-500 (#F59E0B), amber-50 (#FFFBEB)
- **Danger (Red)**: red-500 (#EF4444), red-50 (#FEF2F2)

### Neutrals (Gray)
- **gray-50** (#F8FAFC): Card backgrounds
- **gray-100** (#F1F5F9): Subtle borders
- **gray-200** (#E2E8F0): Dividers
- **gray-500** (#64748B): Secondary text
- **gray-700** (#334155): Primary text

### Backgrounds
- **Primary**: #FFFFFF (Branco puro)
- **Secondary**: #F8FAFC (Cinza muito claro)

## 3. Componentes

### Cards
```tsx
className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
```

### Botões
**Primary:**
```tsx
className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"
```

**Secondary:**
```tsx
className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
```

**Danger:**
```tsx
className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-sm transition-colors"
```

### Badges/Status
```tsx
className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
// Success: bg-emerald-50 text-emerald-700
// Warning: bg-amber-50 text-amber-700
// Danger: bg-red-50 text-red-700
// Info: bg-blue-50 text-blue-700
```

### Tables
**Header:**
```tsx
className="bg-gray-50 px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
```

**Row:**
```tsx
className="hover:bg-gray-50 transition-colors border-b border-gray-100"
```

**Cell:**
```tsx
className="px-6 py-4 text-sm text-gray-700"
```

### Forms
**Label:**
```tsx
className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2"
```

**Input:**
```tsx
className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
```

**Select:**
```tsx
className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
```

## 4. Tipografia

### Headings
- **h1**: `text-2xl font-bold text-gray-900 tracking-tight`
- **h2**: `text-xl font-semibold text-gray-800`
- **h3**: `text-lg font-semibold text-gray-700`

### Body
- **Normal**: `text-sm text-gray-700`
- **Small**: `text-xs text-gray-500`
- **Bold**: `font-semibold text-gray-900`

### Labels
- **Form labels**: `text-xs font-semibold text-gray-600 uppercase tracking-wide`
- **Table headers**: `text-xs font-semibold text-gray-700 uppercase tracking-wider`

## 5. Layout e Espaçamento

### Container
- Max-width: `max-w-7xl` (1280px)
- Padding: `px-6` (desktop), `px-4` (mobile)

### Spacing
- Gap entre cards: `gap-6`
- Padding interno cards: `p-6`
- Margin entre seções: `mb-8`
- Padding de botões: `px-4 py-2.5`

### Border Radius
- Cards: `rounded-xl` (12px)
- Botões: `rounded-lg` (8px)
- Badges: `rounded-full`
- Inputs: `rounded-lg` (8px)

## 6. Correções de UI Específicas

### TC028 - Botão "Detalhes"
**Problema:** Teste busca "Detalhes" mas sistema usa "VISUALIZAR PEDIDO"

**Solução:**
- Mudar label de "VISUALIZAR PEDIDO" para "Detalhes"
- Localização: `PayablesPage.tsx` (link para pedido)
- Estilo: `text-blue-600 hover:text-blue-700 font-semibold text-sm`

### TC041 - Menu "Produtos"
**Problema:** Menu "Products" não existe

**Solução:**
- Adicionar item "Produtos" no menu principal
- Rota: `/produtos`
- Ícone: `inventory_2`
- Permissão: `produtos` (nova)
- Página: Lista de produtos do catálogo

### TC008 - Dropdown Vendedor
**Problema:** Teste não encontra dropdown de vendedor

**Solução:**
- Verificar que o `<select>` existe na aba FINANCEIRO
- Label: "Filtrar por Vendedor"
- Garantir acessibilidade (id, name, aria-label)

## 7. Header/Navegação

### Design
- Background: `bg-slate-900`
- Texto: `text-white`
- Active state: `border-b-2 border-blue-500`
- Shadow: `shadow-md`
- Height: `h-16`

### Logo
- Ícone: Material Icons `diamond`
- Cor: `text-blue-400`
- Texto: `font-bold text-lg text-white`

### Menu Items
- Normal: `text-gray-300 hover:text-white`
- Active: `text-white border-b-2 border-blue-500`
- Font: `text-sm font-medium`

## 8. Dashboard Cards

### Stat Cards
```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Label</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">Value</p>
    </div>
    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
      <span className="material-icons-outlined text-blue-600 text-2xl">icon</span>
    </div>
  </div>
</div>
```

## 9. Status Colors

### Order Status
- **EM ABERTO**: `bg-blue-50 text-blue-700`
- **EM PRODUÇÃO**: `bg-amber-50 text-amber-700`
- **AGUARDANDO**: `bg-yellow-50 text-yellow-700`
- **FINALIZADO**: `bg-emerald-50 text-emerald-700`
- **CANCELADO**: `bg-red-50 text-red-700`

### Payment Status
- **PAGO**: `bg-emerald-50 text-emerald-700`
- **PENDENTE**: `bg-amber-50 text-amber-700`
- **VENCIDO**: `bg-red-50 text-red-700`

### CRM Status
- **NOVO**: `bg-blue-50 text-blue-700`
- **EM ANDAMENTO**: `bg-indigo-50 text-indigo-700`
- **APROVADO**: `bg-emerald-50 text-emerald-700`
- **NÃO APROVADO**: `bg-red-50 text-red-700`

## 10. Implementação

### Fase 1: Fundação
1. Atualizar `index.html` com background branco
2. Criar componente Header com novo design
3. Atualizar paleta de cores global

### Fase 2: Componentes Core
1. Atualizar todos os botões
2. Atualizar todos os cards
3. Atualizar todas as tabelas
4. Atualizar todos os forms

### Fase 3: Páginas
1. OrderList e OrderForm
2. ReceivablesPage e PayablesPage
3. ManagementPage (CRM)
4. BudgetList e BudgetForm
5. CommissionPage
6. RegistrationList e RegistrationForm

### Fase 4: Correções UI
1. Adicionar página de Produtos
2. Corrigir label "Detalhes"
3. Verificar dropdown vendedor

### Fase 5: Polimento
1. Animações e transições
2. Estados de loading
3. Estados vazios
4. Mensagens de erro

## 11. Checklist de Qualidade

- [ ] Todas as cores seguem a paleta definida
- [ ] Todos os botões usam os estilos padrão
- [ ] Todos os cards têm shadow-sm e border
- [ ] Todas as tabelas têm hover states
- [ ] Todos os forms têm labels uppercase
- [ ] Todos os status usam badges coloridos
- [ ] Header é slate-900 com texto branco
- [ ] Background principal é branco
- [ ] Espaçamento consistente (p-6, gap-6, mb-8)
- [ ] Tipografia hierárquica clara
- [ ] Transições suaves em interações
- [ ] Estados de hover visíveis
- [ ] Acessibilidade mantida

## 12. Benefícios Esperados

1. **Profissionalismo**: Aparência corporativa e confiável
2. **Legibilidade**: Contraste adequado e hierarquia clara
3. **Consistência**: Padrões visuais uniformes
4. **Usabilidade**: Interações claras e previsíveis
5. **Manutenibilidade**: Design system documentado
6. **Testes**: Correção de elementos UI problemáticos
