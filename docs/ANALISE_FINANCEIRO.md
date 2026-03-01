# 📊 Análise Completa do Módulo Financeiro — Cristal Brindes

> **Data da análise:** 28/02/2026  
> **Versão:** V01  
> **Analista:** Antigravity AI  

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral)
2. [Bugs Críticos Identificados](#2-bugs-críticos)
3. [Problemas de Consistência de Dados](#3-consistência)
4. [Melhorias de UX Propostas](#4-melhorias-ux)
5. [Melhorias de Lógica de Negócio](#5-lógica-negócio)
6. [Consolidação de Páginas](#6-consolidação)
7. [Segurança e Performance](#7-segurança)
8. [Roadmap de Implementação](#8-roadmap)

---

## 1. Visão Geral da Arquitetura Atual

### Páginas Financeiras (4 páginas + 1 dashboard)

| Página | Rota | Função Principal |
|---|---|---|
| **Painel Financeiro** | `/painel-financeiro` | Dashboard com Fluxo de Caixa, DRE e Aging Report |
| **Saldo Pedidos** | `/saldo-pedidos` | Visão detalhada de cada pedido com custos estimados vs reais |
| **Contas a Receber** | `/receivables` | Listagem de pagamentos a receber dos clientes |
| **Contas a Pagar** | `/payables` | Custos de pedidos + Despesas da empresa |

### Fluxo de Dados Financeiro

```
ORÇAMENTO → PEDIDO → ITENS DO PEDIDO
    ↓                      ↓
  (custos estimados)   (custos reais + pagamentos)
    ↓                      ↓
  RECEBER              PAGAR
  (entrada + restante)  (fornecedores + despesas)
    ↓                      ↓
  DASHBOARD FINANCEIRO (consolidação)
```

---

## 2. 🔴 Bugs Críticos Identificados

### BUG-01: Inconsistência de Categorias — DRE vs Cadastro de Despesas

**Gravidade: ALTA**

O formulário de cadastro de despesas usa categorias no singular (`FIXO`, `VARIAVEL`, `IMPOSTO`, `OUTRO`), mas os dados reais no banco estão no plural (`FIXOS`, `IMPOSTOS`, `VARIÁVEIS`, `OUTROS`).

O DRE filtra por `FIXO`, `PESSOAL`, `IMPOSTO`, `VARIAVEL`, `OUTRO` — **nenhuma combina** com as categorias reais do banco.

**Impacto:** O DRE mostra R$ 0,00 em todas as categorias de despesas operacionais.

**Correção:** Padronizar categorias entre formulário, banco e cálculos do DRE.

### BUG-02: Fluxo de Caixa Incompleto — Custos de Pedidos Não Calculados

**Gravidade: ALTA**

No `FinancialDashboardPage.tsx`, o cálculo de `outflow` no fluxo de caixa **coleta os `orderDueDates` mas nunca os utiliza** para calcular as saídas de custos de pedido. As linhas 158-160 criam o mapeamento mas ele é descartado.

**Impacto:** O fluxo de caixa mostra apenas despesas da empresa como saídas, ignorando os pagamentos a fornecedores de pedidos — que são a maior parte das saídas.

**Correção:** Incluir os custos de `order_items` não pagos no cálculo de outflow, usando as novas colunas `supplier_payment_date`, etc.

### BUG-03: Agendamento de Pagamentos em localStorage

**Gravidade: MÉDIA**

Os agendamentos de pagamento de custos de pedidos (tab "Custos por Pedido") são salvos em `localStorage` ao invés do banco de dados. Isso significa que:
- Agendamentos são perdidos ao trocar de navegador/máquina
- Outros usuários não veem os agendamentos
- Dados não estão disponíveis para relatórios

**Correção:** Migrar para a coluna `scheduled_payment_date` que já existe na tabela `order_items` (adicionada na migração anterior).

### BUG-04: Saldo do Pedido Calcula Errado quando Não Há Custo Real

**Gravidade: MÉDIA**

Na `OrderBalancePage.tsx`, `getOrderBalance` calcula:
```
getOrderReceivedAmount - getOrderRealCost
```
Mas `getOrderRealCost` faz fallback do custo real para o estimado. Se nenhum custo real foi preenchido, o "saldo" mostra como se todos os custos já tivessem sido pagos, quando na verdade eles simplesmente não foram registrados.

**Correção:** Diferenciar "custo real confirmado" de "custo estimado como fallback" nas métricas.

---

## 3. ⚠️ Problemas de Consistência de Dados

### CONSIST-01: Falta Nome do Fornecedor nas Páginas de Custos

A `PayablesPage` mostra custos por pedido mas **não mostra o nome do fornecedor** associado ao custo. As colunas `supplier_id`, `customization_supplier_id`, etc. existem no banco, mas a query na PayablesPage não as utiliza.

**Impacto:** O gestor financeiro não sabe para qual fornecedor pagar cada custo.

### CONSIST-02: Duplicação de Código entre ReceivablesPage e FinancialDashboard

A mesma lógica de "coletar entradas e restantes dos pedidos" é reimplementada em:
- `ReceivablesPage.fetchReceivables()` (linhas 37-124)
- `FinancialDashboardPage.cashFlowData` (linhas 122-170)
- `FinancialDashboardPage.overdueData` (linhas 172-196)
- `FinancialDashboardPage.agingData` (linhas 300-380)

**Solução:** Criar um hook `useReceivables()` reutilizável.

### CONSIST-03: Falta Rastreio de Data de Pagamento Efetivo

Quando o Contas a Receber confirma um pagamento (`confirmPayment`), apenas atualiza `entry_confirmed: true` sem registrar a **data real do recebimento**. Ou seja, não sabemos *quando* o pagamento foi efetivamente recebido, apenas que foi.

### CONSIST-04: Sem Campo para Valor Parcial Pago

Atualmente o sistema só suporta pagamento total (pago/não pago). Na realidade, clientes podem pagar parcialmente. O campo `amount_paid` existe na interface `CompanyExpense` mas não é utilizado.

---

## 4. 💡 Melhorias de UX Propostas

### UX-01: KPIs Visuais no Topo do Dashboard

Adicionar cards de KPI no topo do Painel Financeiro:
- **Faturamento do Mês** (total_amount dos pedidos do mês)
- **Margem Média** (margem bruta média dos pedidos)
- **Inadimplência** (total vencido / total a receber)
- **Dias Médios de Recebimento** (média de dias entre criação e confirmação de pagamento)

### UX-02: Gráfico de Barras no Fluxo de Caixa

Substituir a tabela de fluxo de caixa por um gráfico de barras empilhadas (entradas vs saídas) para visualização mais intuitiva. Manter a tabela como alternativa.

### UX-03: Alertas de Vencimento Contextual

Na listagem de Contas a Receber:
- Itens vencendo **hoje**: borda amarela pulsante
- Itens **vencidos**: fundo vermelho claro com ícone de alerta
- Itens **pagos**: fundo verde claro com checkmark

### UX-04: Filtro por Período Pré-definido

Adicionar botões de atalho: "Este Mês", "Próximo Mês", "Últimos 30 dias", "Próximos 7 dias" nos filtros de data.

### UX-05: Resumo por Fornecedor no Contas a Pagar

Adicionar uma view "agrupado por fornecedor" que mostra:
- Total a pagar por fornecedor
- Próximo vencimento por fornecedor
- Status de pagamento consolidado

---

## 5. 🧠 Melhorias de Lógica de Negócio

### NEG-01: DRE por Regime de Competência vs Regime de Caixa

Atualmente, o DRE considera a receita pela data do pedido (regime de competência). Porém, os custos deveriam também ser classificados por competência.

**Sugestão:** Adicionar toggle entre "Regime de Competência" e "Regime de Caixa" no DRE:
- **Competência:** Receita e custos alocados pela data do pedido
- **Caixa:** Receita quando efetivamente recebida, custos quando efetivamente pagos

### NEG-02: Controle de Comissões

A tabela `commissions` é referenciada no DRE, mas:
- Não existe uma página para gerenciar comissões
- Não há cálculo automático de comissão baseado em vendas
- O percentual de comissão por vendedor não é configurável

**Sugestão:** Criar uma tabela `commission_rules` com o percentual por vendedor e calcular automaticamente.

### NEG-03: Previsão de Fluxo de Caixa Inteligente

Usar os dados de `entry_forecast_date` e `remaining_forecast_date` para projetar entradas, e as colunas `supplier_payment_date`, etc. para projetar saídas. Atualmente esses campos existem no banco mas não são usados pelo Dashboard.

### NEG-04: Controle de Inadimplência

Criar um indicador de inadimplência por cliente:
- Clientes com pagamentos atrasados > 30 dias
- Score de risco baseado no histórico de pagamentos
- Bloqueio automático de novos pedidos para clientes com pagamento atrasado > X dias

### NEG-05: Conciliação Bancária Simplificada

Adicionar campo para registrar o comprovante/referência bancária ao confirmar pagamentos, facilitando a conciliação.

---

## 6. 🔄 Consolidação de Páginas — Proposta

### Situação Atual (4 + 1 = 5 páginas)

```
├── Painel Financeiro (Dashboard com tabs)
│   ├── Tab: Fluxo de Caixa
│   ├── Tab: DRE
│   └── Tab: Aging Report
├── Saldo Pedidos (listagem detalhada)
├── Contas a Receber (pagamentos dos clientes)
└── Contas a Pagar (custos + despesas empresa)
```

### Proposta de Consolidação (3 páginas)

```
├── Painel Financeiro (EXPANDIDO)
│   ├── Tab: Visão Geral (KPIs + mini gráficos)
│   ├── Tab: Fluxo de Caixa (melhorado com custos)
│   ├── Tab: DRE (com toggle competência/caixa)
│   └── Tab: Aging / Inadimplência
│
├── Contas a Receber + Saldo Pedidos (UNIFICAR)
│   ├── View: Lista de Recebíveis
│   ├── View: Detalhes do Pedido (expandível)
│   └── Ações: Confirmar pagamento, Exportar
│
└── Contas a Pagar (MANTER com melhorias)
    ├── Tab: Custos por Pedido (COM nome do fornecedor)
    ├── Tab: Despesas da Empresa
    └── View: Agrupado por Fornecedor (NOVO)
```

### Justificativa:
1. **Saldo Pedidos + Contas a Receber** se sobrepõem — ambos mostram pedidos com valores a receber. Unificar evita confusão.
2. **Painel Financeiro** pode absorver os KPIs de outras páginas com uma tab de "Visão Geral".
3. **Contas a Pagar** deve manter suas 2 tabs mas ganhar uma view agrupada por fornecedor.

---

## 7. 🔒 Segurança e Performance

### SEC-01: Permissão Granular Insuficiente

Atualmente:
- `financeiro.receber` → Acessa Painel, Saldo e Recebíveis
- `financeiro.pagar` → Acessa Contas a Pagar

Mas não há separação entre **visualizar** e **operar** (confirmar pagamento, editar despesa).

**Sugestão:** Adicionar `financeiro.operar` para ações que alteram dados financeiros.

### SEC-02: Queries Sem Paginação

Todas as queries financeiras carregam TODOS os registros. Com crescimento do sistema, isso degradará performance.

**Sugestão:** Implementar paginação server-side ou filtro obrigatório por período.

### PERF-01: Re-fetches Desnecessários

A `PayablesPage` re-fetches todos os dados após cada ação de confirmar pagamento, ao invés de atualizar localmente.

**Sugestão:** Atualizar estado local após operações de atualização, como já é feito parcialmente no `ReceivablesPage.confirmPayment`.

---

## 8. 🗓️ Roadmap de Implementação (Prioridade)

### 🔴 Fase 1 — Correções Críticas (Imediato)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | BUG-01: Padronizar categorias de despesas | Baixo | Alto |
| 2 | BUG-02: Incluir custos de pedidos no fluxo de caixa | Médio | Alto |
| 3 | CONSIST-01: Mostrar fornecedor nos custos a pagar | Baixo | Alto |
| 4 | BUG-03: Migrar agendamentos do localStorage → banco | Médio | Médio |

### 🟡 Fase 2 — Melhorias de UX (Curto Prazo)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 5 | UX-01: KPIs visuais no Dashboard | Médio | Alto |
| 6 | UX-04: Filtros de período pré-definidos | Baixo | Médio |
| 7 | UX-05: View agrupada por fornecedor | Médio | Alto |
| 8 | NEG-03: Usar forecast dates no fluxo de caixa | Médio | Alto |

### 🟢 Fase 3 — Evolução do Negócio (Médio Prazo)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 9 | NEG-01: Toggle Competência vs Caixa no DRE | Alto | Alto |
| 10 | Consolidação de páginas (Saldo + Receber) | Alto | Médio |
| 11 | NEG-02: Controle de comissões automático | Alto | Médio |
| 12 | NEG-04: Score de inadimplência por cliente | Alto | Médio |

### 🔵 Fase 4 — Futuro

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 13 | UX-02: Gráficos de barras (chart library) | Alto | Médio |
| 14 | NEG-05: Conciliação bancária | Alto | Alto |
| 15 | SEC-02: Paginação server-side | Médio | Baixo (por ora) |

---

## Resumo Executivo

O módulo financeiro está **funcional** mas tem **4 bugs críticos** que comprometem a precisão dos dados:

1. **Categorias de despesas inconsistentes** → DRE incorreto
2. **Custos de pedidos ausentes no fluxo de caixa** → Visão distorcida
3. **Fornecedor não visível nos custos a pagar** → Gestão operacional prejudicada
4. **Agendamentos em localStorage** → Dados perdidos entre sessões

A recomendação é implementar a **Fase 1** imediatamente para corrigir a confiabilidade dos dados, seguida da **Fase 2** para melhorar a experiência do gestor financeiro.

As maiores oportunidades de valor estão na:
- **Unificação Saldo + Receber** (eliminar confusão)
- **View por fornecedor** (facilitar pagamentos)
- **Forecast dates no fluxo de caixa** (os campos já existem no banco!)
