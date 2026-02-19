# Plano de Implementação - Design System em Todas as Páginas

## Objetivo
Aplicar o design system suave e confortável em todas as 14 páginas do sistema.

## Padrões a Aplicar

### 1. Background
- Trocar `bg-white` ou `bg-[#F3F4F6]` por `bg-gray-50` no container principal
- Manter cards com `bg-white`

### 2. Cards
```tsx
// Antes: bg-white rounded-lg shadow
// Depois: bg-white rounded-xl border border-gray-200 shadow-sm
```

### 3. Botões
```tsx
// Primary: bg-blue-600 hover:bg-blue-700 (ao invés de bg-blue-500)
// Secondary: bg-gray-100 hover:bg-gray-200
// Danger: bg-red-50 hover:bg-red-100 text-red-700 border border-red-200
```

### 4. Badges/Status
```tsx
// Adicionar border sutil
// bg-emerald-50 text-emerald-700 border border-emerald-100
```

### 5. Tables
```tsx
// Header: bg-gray-50 text-gray-600 (ao invés de gray-700)
// Rows: hover:bg-gray-50/50
// Borders: border-gray-100 (ao invés de gray-200)
```

### 6. Forms
```tsx
// Labels: text-xs font-semibold text-gray-600 uppercase
// Inputs: border-gray-300 focus:border-blue-500 focus:ring-blue-500/20
```

## Páginas a Atualizar

### Prioridade Alta (Mais Usadas)
1. ✅ OrderList.tsx - Lista de pedidos
2. ✅ OrderForm.tsx - Formulário de pedido
3. ✅ ReceivablesPage.tsx - Já tem validação, aplicar design
4. ✅ PayablesPage.tsx - Já tem validação, aplicar design
5. ✅ ManagementPage.tsx - CRM & Gestão

### Prioridade Média
6. ✅ BudgetList.tsx - Lista de orçamentos
7. ✅ BudgetForm.tsx - Formulário de orçamento
8. ✅ CommissionPage.tsx - Comissões
9. ✅ RegistrationList.tsx - Lista de cadastros
10. ✅ RegistrationForm.tsx - Formulário de cadastro

### Prioridade Baixa
11. ✅ CalculationFactors.tsx - Fatores de cálculo
12. ✅ CalculationFactorForm.tsx - Form de fatores
13. ✅ LoginPage.tsx - Login
14. ✅ ProductsPage.tsx - Já criada com design novo

## Execução
Aplicar mudanças página por página, testando visualmente após cada grupo.
