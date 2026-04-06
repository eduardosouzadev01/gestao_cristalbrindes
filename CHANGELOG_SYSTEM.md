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

## 4. Melhorias de Fluxo e CRM (Semana 4 - Fev 2026)
- **Redirecionamento Inteligente:** Vendedores agora são redirecionados automaticamente para o **Kanban (CRM)** ao abrir o sistema ou fazer login, agilizando o início do atendimento.
- **Busca de Orçamentos:** Filtro de busca expandido para identificar clientes por **E-mail, CPF/CNPJ ou Telefone**, além do Nome.
- **Fluxo de Atendimento Facilitado:**
  - Novos atendimentos agora iniciam com status **"NOVO"** por padrão (primeira coluna do Kanban).
  - Campos de "Vendedor" e "Status" ocultos na criação de novos leads para simplificar o formulário inicial.
- **Cadastro de Fornecedores:** Adicionada máscara de entrada para **CNPJ / CPF** e **Telefone** no formulário de "Novo Fornecedor Rápido" do orçamento.

## 5. Melhorias de Atendimento e CRM (Abril 2026)
- **Planilha de Atendimentos:** Adicionada a aba **"Planilha"** no CRM, que exibe uma visualização em formato de tabela (grid) de todos os atendimentos feitos pelo vendedor, incluindo aqueles já finalizados ou não aprovados que saíram do Kanban.
- **Identificação de Itens no Kanban:** Agora o vendedor pode identificar qual **item (produto)** o cliente está orçando diretamente no card do Kanban.
  - Novo campo **"Item em Orçamento"** no formulário de atendimento.
  - Exibição visual do item com ícone nos cards das colunas.
- **Múltiplos Atendimentos por Cliente:** O sistema agora permite criar e gerenciar múltiplos atendimentos simultâneos para o mesmo cliente (mesmo e-mail/contato), desde que os itens orçados sejam diferentes. Isso facilita o acompanhamento de pedidos independentes de um mesmo parceiro.

## 6. Sincronização e Catálogo (Abril 2026)
- **Sincronização de Cores (Spot):** Corrigida a falha na captura de variações de cores para produtos da **Spot Gifts**. O sistema agora extrai corretamente as referências de cor a partir dos SKUs e dados de estoque, garantindo que o seletor de cores apareça no formulário de orçamento.
- **Resolução de Produtos Faltantes (XBZ 09280):** Investigada e corrigida a ausência de itens no catálogo. O produto **XBZ 09280** (Power Bank Indução) e outros que estavam omitidos foram restaurados através de uma sincronização completa e melhoria no parser de dados da XBZ.
- **Robustez nas APIs de Fornecedores:** Implementado tratamento de erros e suporte a múltiplos formatos de resposta para as APIs da XBZ, Asia Import e Spot, garantindo que mudanças estruturais nos fornecedores não quebrem a atualização do banco de dados.

## Notas Técnicas (Banco de Dados)
Foi criada uma sequence para gerenciar a numeração dos orçamentos. Caso seja necessário reiniciar a contagem, use o comando SQL:
```sql
ALTER SEQUENCE global_budget_seq RESTART WITH 1;
```
A função `get_next_budget_number` garante o formato com zeros à esquerda (4 dígitos).
Se houver problemas com a coluna `supplier_category` (mesmo após migração), recarregue o as definições da API no painel do Supabase (**Schema Cache -> Reload**).
Para atualizar o catálogo manualmente via terminal, utilize: `npx tsx scripts/sync_remote_products.ts`.
