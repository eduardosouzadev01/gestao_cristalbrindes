# Plano de Ação: Correção do Esquema de Orders/Order Items

## Status: BLOQUEADO — Erro PostgreSQL 42703 (coluna inexistente) ao chamar `save_order`

---

## Diagnóstico Completo

### Causa raiz
O esquema das tabelas `orders` e `order_items` no banco de produção está **desatualizado** em relação aos payloads enviados pelo frontend (`useBudgetLogic.ts` e `useOrderLogic.ts`) e pela lógica interna da função `save_order`.

### Colunas faltantes detectadas

| Tabela | Coluna | Tipo | Uso |
|--------|--------|------|-----|
| `orders` | `budget_id` | UUID FK → budgets | Vincula pedido ao orçamento (fluxo aprovação → pedido) |
| `orders` | `management_approved` | BOOLEAN | Flag de aprovação de margem pela gestão (useOrderLogic) |
| `orders` | `delivery_date_expected` | TEXT | Data prevista de entrega (useOrderLogic) |
| `orders` | `delivery_date_actual` | TEXT | Data real de entrega (useOrderLogic) |
| `order_items` | `product_code` | TEXT | Código do produto (ambos os fluxos) |
| `order_items` | `product_color` | TEXT | Cor do produto (ambos os fluxos) |
| `order_items` | `product_description` | TEXT | Descrição do produto (ambos os fluxos) |
| `order_items` | `extra_pct` | NUMERIC | % de despesa extra (useBudgetLogic) |
| `order_items` | `supplier_departure_date` | TEXT | Data de saída fornecedor por item (ambos os fluxos) |
| `order_items` | `client_transport_supplier_id` | UUID FK → partners | Fornecedor transporte cliente (useOrderLogic) |

### Payloads enviados pelo frontend

**`useBudgetLogic.ts:726`** (fluxo: Aprovar Orçamento → Gerar Pedido):
- 23 campos no `orderPayload` + 26 campos no `itemsPayload`

**`useOrderLogic.ts:232`** (fluxo: Salvar/Editar Pedido manual):
- 26 campos no `orderPayload` + 40 campos no `itemsPayload`

---

## O que já foi criado

### Arquivo de migração SQL
📁 `supabase/migrations/002_fix_orders_schema.sql`

Este arquivo contém:
1. **ALTER TABLE orders**: 4 novas colunas com índices
2. **ALTER TABLE order_items**: 6 novas colunas com índices
3. **SEQUENCE `order_number_seq`**: Geração atômica de nº de pedido
4. **DROP + CREATE FUNCTION `save_order`**: Nova função com UPSERT, mapeamento correto de todos os campos e tratamento de erros com logging

---

## Instruções para a Próxima IA/Dev Executar

### Passo 1: Aplicar a migração no Supabase

Rode o SQL de migração no Supabase SQL Editor **OU** via CLI:

```bash
# Opção A: Via CLI Supabase (se configurado)
npx supabase migration up

# Opção B: Copiar colar o conteúdo do arquivo no SQL Editor do Supabase Dashboard
# Abra: https://supabase.com/dashboard/project/<seu-projeto>/sql/new
# Cole o conteúdo de: supabase/migrations/002_fix_orders_schema.sql
# Execute (Run)
```

### Passo 2: Verificar a execução

Após executar, verifique no SQL Editor:
```sql
-- Confirmar colunas em orders
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Confirmar colunas em order_items
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'order_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Confirmar que a função save_order existe
SELECT proname, prosrc FROM pg_proc WHERE proname = 'save_order';
```

### Passo 3: Regenerar tipos TypeScript

```bash
npx supabase gen types typescript > src/types/supabase.ts
```

### Passo 4: Reiniciar o Next.js

```bash
npm run dev
```

### Passo 5: Testar o fluxo

1. Abrir um orçamento com itens aprovados
2. Clicar "Gerar Pedido"
3. Verificar se o pedido é criado sem erros no console
4. Verificar se o redirecionamento para `/pedidos/<id>` funciona

---

## Estrutura de arquivos relevante

```
supabase/migrations/
├── 001_improvements.sql          # Migração original (RLS, índices)
└── 002_fix_orders_schema.sql     # NOVA: Correção do esquema

src/
├── hooks/
│   ├── useBudgetLogic.ts:726     # orderPayload (fluxo aprovação → pedido)
│   └── useOrderLogic.ts:232      # orderPayload (fluxo salvar pedido)
└── types/
    └── supabase.ts:687-784       # Tipagem (a ser regenerada)
```

---

## Notas de segurança da migração

- Todas as colunas usam `IF NOT EXISTS` — seguras para reexecutar
- A função `save_order` usa `DROP IF EXISTS ... CREATE` — sempre atualizada
- A SEQUENCE `order_number_seq` começa em 1000 ou no maior nº existente + 1
- Os `ALTER TABLE` têm índices para `budget_id` e `client_transport_supplier_id`
- A função tem bloco `EXCEPTION` com `RAISE WARNING` para debug
