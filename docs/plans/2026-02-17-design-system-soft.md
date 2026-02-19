# Design System - Soft & Comfortable
**Atualizado:** 2026-02-17  
**Foco:** Redução de fadiga visual e conforto prolongado

## Filosofia do Design

Este design system foi otimizado para:
- ✅ Reduzir fadiga visual em uso prolongado
- ✅ Manter profissionalismo e clareza
- ✅ Usar cores suaves mas distintas
- ✅ Evitar contrastes extremos

## Paleta de Cores Suaves

### Background & Neutrals
```css
--bg-primary: #FAFAFA        /* Cinza muito claro - fundo principal */
--bg-secondary: #F5F5F5      /* Cinza claro - cards secundários */
--bg-card: #FFFFFF           /* Branco - cards principais */

--text-primary: #374151      /* Gray-700 - texto principal */
--text-secondary: #6B7280    /* Gray-500 - texto secundário */
--text-tertiary: #9CA3AF     /* Gray-400 - texto terciário */
```

### Accent Colors (Suaves)
```css
/* Primary - Azul suave */
--primary-600: #3B82F6       /* Botões e links */
--primary-500: #60A5FA       /* Hover states */
--primary-50: #EFF6FF        /* Backgrounds */

/* Success - Verde suave */
--success-600: #10B981       /* Emerald-600 */
--success-500: #34D399       /* Emerald-500 */
--success-50: #ECFDF5        /* Emerald-50 */

/* Warning - Âmbar suave */
--warning-600: #F59E0B       /* Amber-600 */
--warning-500: #FBBF24       /* Amber-500 */
--warning-50: #FFFBEB        /* Amber-50 */

/* Danger - Vermelho suave */
--danger-600: #EF4444        /* Red-600 */
--danger-500: #F87171        /* Red-500 */
--danger-50: #FEF2F2         /* Red-50 */

/* Info - Azul claro */
--info-600: #0EA5E9          /* Sky-600 */
--info-500: #38BDF8          /* Sky-500 */
--info-50: #F0F9FF           /* Sky-50 */
```

## Componentes

### Header
```tsx
className="bg-white shadow-sm border-b border-gray-200"
// Logo: text-blue-600
// Menu ativo: border-blue-600 text-blue-600
// Menu inativo: text-gray-600 hover:text-gray-900
```

### Cards
```tsx
// Card principal
className="bg-white rounded-xl border border-gray-200 shadow-sm"

// Card hover
className="hover:shadow-md transition-shadow"

// Card secundário
className="bg-gray-50 rounded-lg border border-gray-100"
```

### Botões (Cores Suaves)
```tsx
// Primary
className="bg-blue-600 hover:bg-blue-700 text-white"

// Secondary
className="bg-gray-100 hover:bg-gray-200 text-gray-700"

// Success
className="bg-emerald-600 hover:bg-emerald-700 text-white"

// Danger (suave)
className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
```

### Badges/Status (Cores Pastéis)
```tsx
// Success
className="bg-emerald-50 text-emerald-700 border border-emerald-100"

// Warning
className="bg-amber-50 text-amber-700 border border-amber-100"

// Danger
className="bg-red-50 text-red-700 border border-red-100"

// Info
className="bg-sky-50 text-sky-700 border border-sky-100"

// Neutral
className="bg-gray-50 text-gray-700 border border-gray-200"
```

### Tables
```tsx
// Header
className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase"

// Row
className="hover:bg-gray-50/50 transition-colors"

// Border
className="border-gray-100"
```

### Forms
```tsx
// Label
className="text-xs font-semibold text-gray-600 uppercase"

// Input
className="border-gray-300 focus:border-blue-500 focus:ring-blue-500/20"

// Input disabled
className="bg-gray-50 text-gray-500 cursor-not-allowed"
```

## Status Colors (Suaves)

### Order Status
- **EM ABERTO**: `bg-sky-50 text-sky-700 border-sky-100`
- **EM PRODUÇÃO**: `bg-amber-50 text-amber-700 border-amber-100`
- **AGUARDANDO**: `bg-yellow-50 text-yellow-700 border-yellow-100`
- **FINALIZADO**: `bg-emerald-50 text-emerald-700 border-emerald-100`
- **CANCELADO**: `bg-gray-100 text-gray-600 border-gray-200`

### Payment Status
- **PAGO**: `bg-emerald-50 text-emerald-700 border-emerald-100`
- **PENDENTE**: `bg-amber-50 text-amber-700 border-amber-100`
- **VENCIDO**: `bg-red-50 text-red-700 border-red-100`

### Priority
- **ALTA**: `bg-red-50 text-red-700 border-red-100`
- **NORMAL**: `bg-blue-50 text-blue-700 border-blue-100`
- **BAIXA**: `bg-gray-50 text-gray-600 border-gray-200`

## Shadows (Suaves)
```css
/* Sombras muito sutis */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.08)
```

## Typography

### Headings (Tons de Cinza)
```tsx
h1: text-2xl font-bold text-gray-800
h2: text-xl font-semibold text-gray-700
h3: text-lg font-semibold text-gray-700
```

### Body
```tsx
text-sm text-gray-700      // Texto principal
text-xs text-gray-600      // Texto secundário
text-xs text-gray-500      // Texto terciário
```

## Princípios de Conforto Visual

1. **Evitar Branco Puro**: Usar gray-50 (#FAFAFA) como fundo principal
2. **Evitar Preto Puro**: Usar gray-800 (#1F2937) no máximo
3. **Bordas Suaves**: Sempre usar gray-100 ou gray-200
4. **Sombras Leves**: Opacidade máxima de 0.08
5. **Badges com Bordas**: Adicionar border sutil para definição
6. **Espaçamento Generoso**: Padding mínimo de 16px (p-4)
7. **Transições Suaves**: 200-300ms para todas as animações

## Contraste Adequado

Todos os pares de cores mantêm:
- **WCAG AA**: Mínimo 4.5:1 para texto normal
- **WCAG AAA**: Mínimo 7:1 para texto grande

## Exemplos de Uso

### Stat Card
```tsx
<div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
  <p className="text-xs font-semibold text-gray-500 uppercase">Label</p>
  <p className="text-3xl font-bold text-gray-800 mt-2">Value</p>
  <div className="mt-4 flex items-center gap-2">
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
      +12%
    </span>
  </div>
</div>
```

### Button Group
```tsx
<div className="flex gap-3">
  <button className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors">
    Salvar
  </button>
  <button className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors">
    Cancelar
  </button>
</div>
```

### Status Badge
```tsx
<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
  Ativo
</span>
```
