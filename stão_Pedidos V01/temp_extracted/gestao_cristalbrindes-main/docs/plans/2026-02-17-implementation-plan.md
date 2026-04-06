# Plano de Implementação - Design System Redesign

## Visão Geral
Implementação do novo design system Corporate Blue com correções de UI e melhorias visuais em todo o sistema.

## Fases de Implementação

### Fase 1: Fundação (Base)
**Objetivo:** Estabelecer a base do novo design system

#### 1.1 Atualizar HTML Base
- [ ] Mudar background de `#F3F4F6` para `#FFFFFF` em `index.html`
- [ ] Atualizar scrollbar colors para tons de gray mais sutis
- [ ] Adicionar CSS custom properties para cores principais

**Arquivos:** `index.html`

#### 1.2 Redesign do Header
- [ ] Background: slate-900
- [ ] Logo com ícone diamond em blue-400
- [ ] Menu items com hover states
- [ ] Active state com border-bottom blue-500
- [ ] Dropdown de usuário redesenhado
- [ ] Submenu Financeiro redesenhado

**Arquivos:** `App.tsx`

---

### Fase 2: Componentes Core

#### 2.1 Botões Globais
- [ ] Criar variantes: primary, secondary, danger, ghost
- [ ] Aplicar em todos os componentes
- [ ] Garantir consistência de tamanho (px-4 py-2.5)
- [ ] Adicionar transições suaves

**Padrões:**
```tsx
// Primary
className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-sm"

// Secondary
className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
```

#### 2.2 Cards
- [ ] Background branco com border gray-200
- [ ] Shadow-sm padrão
- [ ] Rounded-xl
- [ ] Padding p-6 consistente
- [ ] Hover: shadow-md

#### 2.3 Tabelas
- [ ] Header: bg-gray-50, text-gray-700, uppercase
- [ ] Rows: hover:bg-gray-50
- [ ] Borders: border-gray-100
- [ ] Remover zebra striping

#### 2.4 Forms
- [ ] Labels: text-xs font-semibold text-gray-600 uppercase
- [ ] Inputs: border-gray-300, focus:ring-blue-500
- [ ] Selects: mesmo estilo dos inputs
- [ ] Error states: border-red-500, text-red-600

#### 2.5 Badges/Status
- [ ] Rounded-full, px-3 py-1
- [ ] Cores semânticas consistentes
- [ ] Font-semibold, text-xs

---

### Fase 3: Páginas Principais

#### 3.1 OrderList (Lista de Pedidos)
- [ ] Cards de filtros redesenhados
- [ ] Tabela com novo estilo
- [ ] Badges de status atualizados
- [ ] Botão "Novo Pedido" primary
- [ ] Stats cards no topo

**Arquivo:** `pages/OrderList.tsx`

#### 3.2 OrderForm (Formulário de Pedido)
- [ ] Header com breadcrumb
- [ ] Seções com cards brancos
- [ ] Forms com labels uppercase
- [ ] Botões de ação redesenhados
- [ ] Tabela de itens atualizada

**Arquivo:** `pages/OrderForm.tsx`

#### 3.3 ReceivablesPage (Contas a Receber)
- [ ] Header com ícone e título
- [ ] Filtros em card branco
- [ ] Stats cards redesenhados
- [ ] Tabela atualizada
- [ ] Badges de status

**Arquivo:** `pages/ReceivablesPage.tsx`

#### 3.4 PayablesPage (Contas a Pagar)
- [ ] Similar ao Receivables
- [ ] **CORREÇÃO TC028**: Mudar "VISUALIZAR PEDIDO" para "Detalhes"
- [ ] Tabs redesenhadas
- [ ] Modal de nova despesa atualizado

**Arquivo:** `pages/PayablesPage.tsx`

#### 3.5 ManagementPage (CRM & Gestão)
- [ ] Tabs redesenhadas
- [ ] Kanban cards atualizados
- [ ] Stats cards de performance
- [ ] Gráficos com cores novas
- [ ] Filtros de data redesenhados

**Arquivo:** `pages/ManagementPage.tsx`

#### 3.6 BudgetList e BudgetForm
- [ ] Lista com cards
- [ ] Formulário redesenhado
- [ ] Tabela de itens atualizada

**Arquivos:** `pages/BudgetList.tsx`, `pages/BudgetForm.tsx`

#### 3.7 CommissionPage
- [ ] Stats cards
- [ ] Tabela redesenhada
- [ ] Filtros atualizados

**Arquivo:** `pages/CommissionPage.tsx`

#### 3.8 RegistrationList e RegistrationForm
- [ ] Lista de parceiros
- [ ] Formulário de cadastro
- [ ] Validações visuais

**Arquivos:** `pages/RegistrationList.tsx`, `pages/RegistrationForm.tsx`

---

### Fase 4: Correções de UI (TestSprite)

#### 4.1 TC041 - Adicionar Menu "Produtos"
- [ ] Criar rota `/produtos` em `App.tsx`
- [ ] Adicionar item no menu principal
- [ ] Criar página `ProductsPage.tsx`
- [ ] Listar produtos do catálogo
- [ ] CRUD básico de produtos

**Novos Arquivos:** `pages/ProductsPage.tsx`

#### 4.2 TC028 - Corrigir Label "Detalhes"
- [ ] Localizar todos os "VISUALIZAR PEDIDO"
- [ ] Substituir por "Detalhes"
- [ ] Manter funcionalidade

**Arquivos:** `pages/PayablesPage.tsx`, outros

#### 4.3 TC008 - Verificar Dropdown Vendedor
- [ ] Confirmar que existe na aba FINANCEIRO
- [ ] Adicionar aria-label se necessário
- [ ] Garantir visibilidade

**Arquivo:** `pages/ManagementPage.tsx`

---

### Fase 5: Polimento e Refinamento

#### 5.1 Animações e Transições
- [ ] Hover states suaves (transition-colors)
- [ ] Modal fade-in
- [ ] Dropdown slide-in
- [ ] Loading states

#### 5.2 Estados Vazios
- [ ] Mensagens amigáveis em listas vazias
- [ ] Ícones ilustrativos
- [ ] Call-to-action claro

#### 5.3 Estados de Loading
- [ ] Spinners consistentes
- [ ] Skeleton screens onde apropriado
- [ ] Feedback visual de ações

#### 5.4 Mensagens de Erro
- [ ] Toast notifications redesenhados
- [ ] Cores de erro consistentes
- [ ] Mensagens claras e acionáveis

---

## Ordem de Execução

1. **Dia 1**: Fase 1 (Fundação) + Fase 2 (Componentes Core)
2. **Dia 2**: Fase 3.1-3.4 (Páginas principais - Parte 1)
3. **Dia 3**: Fase 3.5-3.8 (Páginas principais - Parte 2)
4. **Dia 4**: Fase 4 (Correções UI) + Fase 5 (Polimento)

## Checklist de Qualidade

Antes de considerar completo, verificar:

- [ ] Todas as cores seguem a paleta Corporate Blue
- [ ] Todos os botões usam classes padronizadas
- [ ] Todos os cards têm shadow-sm e border-gray-200
- [ ] Todas as tabelas têm hover:bg-gray-50
- [ ] Todos os forms têm labels uppercase
- [ ] Todos os status usam badges coloridos consistentes
- [ ] Header é slate-900 com texto branco
- [ ] Background principal é branco (#FFFFFF)
- [ ] Espaçamento consistente (p-6, gap-6, mb-8)
- [ ] Tipografia hierárquica clara
- [ ] Transições suaves em todas as interações
- [ ] Estados de hover visíveis
- [ ] Acessibilidade mantida (aria-labels, contraste)
- [ ] Responsividade preservada
- [ ] Testes UI passando (TC008, TC028, TC041)

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Quebra de funcionalidade | Alto | Testar cada página após mudanças |
| Inconsistência visual | Médio | Seguir design system rigorosamente |
| Problemas de acessibilidade | Médio | Manter contraste adequado, aria-labels |
| Regressão em testes | Alto | Re-executar TestSprite após mudanças |

## Métricas de Sucesso

- [ ] 100% das páginas seguem o design system
- [ ] 0 cores fora da paleta definida
- [ ] TC008, TC028, TC041 passando
- [ ] Feedback positivo do usuário
- [ ] Tempo de carregamento mantido ou melhorado
