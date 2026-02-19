# Changelog do Sistema - Melhorias de UI e Fluxo (Fevereiro 2026)

## 1. Interface e Layout
- **Padronização de Largura:** As páginas de "Management" (Kanban) e "Receivables" foram ajustadas para `max-w-7xl` (padrão do sistema), corrigindo a inconsistência visual com a página de Orçamentos.
- **Tabelas "Zebra":** Aplicado estilo intercalado (branco/cinza) nas listagens de:
  - Pedidos (`OrderList`)
  - Orçamentos (`BudgetList`)
  - Contas a Receber (`ReceivablesPage`)
  - Contas a Pagar (`PayablesPage`)

## 2. Orçamentos (`BudgetForm`)
- **Novo Layout de Itens:** Os cards de produtos foram redesenhados para serem mais compactos e organizados.
  - Grid de 2 colunas principais (Dados vs Valores).
  - Agrupamento de custos adicionais (Fretes, Personalização) em um bloco menor.
  - Destaque visual para totais e margem/fator.
- **Numeração Automática:** Implementada sequência lógica `0001` via Banco de Dados.
  - Todo novo orçamento receberá um número sequencial formatado (ex: `0001`, `0002`).
  - Função SQL: `get_next_budget_number()` baseada na sequence `global_budget_seq`.

## 3. Gestão de Pedidos e CRM
- **Kanban (CRM):** Adicionado filtro "Ocultar Finalizados" no topo da página.
  - Permite limpar o quadro visualmente escondendo leads com status `FINALIZADO`, `ENTREGUE` ou `NAO_APROVADO`, sem excluí-los do banco.
- **Fluxo Orçamento -> Pedido:** O número do pedido herdará automaticamente o número do orçamento de origem (ex: Orçamento `0005` gera Pedido `0005`), garantindo rastreabilidade.
- **Navegação Financeira:** Clicar em uma linha na tabela de "Contas a Receber" agora redireciona diretamente para o Pedido correspondente.

## Notas Técnicas (Banco de Dados)
Foi criada uma sequence para gerenciar a numeração dos orçamentos. Caso seja necessário reiniciar a contagem, use o comando SQL:
```sql
ALTER SEQUENCE global_budget_seq RESTART WITH 1;
```
A função `get_next_budget_number` garante o formato com zeros à esquerda (4 dígitos).
