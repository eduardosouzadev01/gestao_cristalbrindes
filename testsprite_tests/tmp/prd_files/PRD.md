# Documento de Requisitos do Produto (PRD) - Sistema de Gestão de Pedidos (Cristal Brindes)

Este documento define o escopo, funcionalidades e requisitos técnicos para o desenvolvimento do sistema de gestão de pedidos da Cristal Brindes. O objetivo é fornecer uma plataforma centralizada para controle de vendas, produção, financeiro e comissões.

## 1. Visão Geral do Produto

O **Gestão de Pedidos** é uma aplicação web focada em otimizar o fluxo de vendas de brindes corporativos, desde o orçamento inicial até a entrega final e pagamento de comissões. O sistema visa substituir controles manuais (planilhas) por um banco de dados relacional robusto e uma interface moderna.

### Público Alvo
- **Vendedores**: Criação de pedidos, acompanhamento de status e visualização de comissões.
- **Gerentes/Administradores**: Visão geral do negócio, controle financeiro (contas a pagar/receber), gerenciamento de fatores de cálculo e usuários.
- **Equipe de Produção/Expedição**: Acompanhamento de pedidos em produção e liberação.

## 2. Objetivos de Negócio
- **Centralização da Informação**: Unificar dados de clientes, fornecedores, produtos e pedidos.
- **Automação Financeira**: Calcular automaticamente custos, margens, impostos e comissões.
- **Controle de Fluxo**: Monitorar o status de cada pedido (Em Aberto -> Em Produção -> ... -> Finalizado).
- **Redução de Erros**: Validar dados na entrada e evitar inconsistências financeiras.

## 3. Requisitos Funcionais

### 3.1. Gestão de Parceiros (Partners)
- **Cadastro**: Criar, ler, atualizar e deletar (CRUD) parceiros.
- **Classificação**: Distinguir entre `CLIENTE` e `FORNECEDOR`.
- **Dados**: Nome, Documento (CPF/CNPJ), Contato (Telefone, Email), Email Financeiro.

### 3.2. Gestão de Produtos (Products)
- **Catálogo Base**: Manter um registro de produtos/brindes padrão com preço base.
- **Atributos**: Nome, Descrição, Preço Unitário Base.

### 3.3. Gestão de Pedidos (Orders)
O núcleo do sistema.
- **Criação de Pedido**:
    - Selecionar Cliente e Vendedor.
    - Definir prazos (Data do Orçamento, Data do Pedido, Prazo de Entrega/Pagamento).
    - Inserir Itens do Pedido (Produtos, Quantidade, Fornecedor).
- **Cálculo de Custos e Preços (Por Item)**:
    - Custos Previstos: Custo Unitário, Personalização, Transporte (Fornecedor/Cliente), Despesas Extras, Custo de Layout.
    - Fatores de Cálculo: Margem de Lucro, Impostos, Contingência.
    - Preço Final: Calculado com base nos custos e fatores.
- **Cálculo de Custos Reais (Pós-Venda)**:
    - Registrar os custos efetivamente realizados para apuração precisa de lucro.
- **Status do Pedido**:
    - Fluxo definidio: `EM ABERTO` -> `EM PRODUÇÃO` -> `AGUARDANDO APROVAÇÃO` -> `AGUARDANDO NF` -> `AGUARDANDO PAGAMENTO` -> `AGUARDANDO PERSONALIZAÇÃO` -> `FINALIZADO`.
- **Financeiro do Pedido**:
    - Valor de Entrada (Sinal) e Valor Restante.
    - Confirmação de pagamentos (Check de Entrada Confirmada / Restante Confirmado).

### 3.4. Sistema de Comissões
- **Geração Automática**: O sistema deve gerar registros de comissão automaticamente baseados nas regras de negócio.
- **Regra de Cálculo**:
    - 1% sobre o valor total na confirmação da **Entrada**.
    - 1% sobre o valor total na confirmação do **Pagamento Restante**.
- **Status**: Controle de `PENDING` (Pendente) e `PAID` (Pago).

### 3.5. Controle Financeiro (Company Expenses)
- Registrar despesas fixas e variáveis da empresa.
- Categorização de despesas.
- Controle de data de vencimento e status de pagamento.

### 3.6. Configurações (Calculation Factors)
- Gerenciar taxas padrão globais para o sistema (ex: Imposto Padrão, Margem Padrão) para facilitar a precificação rápida.

### 3.7. Dashboard
Visualização rápida de indicadores chave (KPIs):
- Total de Pedidos.
- Pedidos Pendentes (Em Aberto).
- Receita Total (Soma de pedidos finalizados).
- Número de Clientes Ativos.

### 3.8. Auditoria (Logs)
- Registrar automaticamente alterações críticas nos pedidos (ex: mudança de status, valores) na tabela `order_logs`.

## 4. Requisitos Não-Funcionais

- **Performance**: O dashboard e as listagens devem carregar em menos de 2 segundos.
- **Segurança**:
    - Autenticação via Supabase Auth.
    - Row Level Security (RLS) no banco de dados para garantir que apenas usuários autorizados acessem os dados.
- **Usabilidade**: Interface responsiva (Mobile e Desktop) focada na agilidade do vendedor.
- **Disponibilidade**: Sistema web acessível 24/7.

## 5. Arquitetura Técnica

### Frontend
- **Framework**: React 19 (via Vite).
- **Linguagem**: TypeScript.
- **Roteamento**: React Router v7.
- **UI/UX**: Design customizado (CSS/Tailwind ou similar), componentes modulares.
- **Estado**: Gerenciamento de estado local e via URL para filtros.

### Backend & Banco de Dados
- **Plataforma**: Supabase (BaaS).
- **Banco de Dados**: PostgreSQL.
- **Lógica de Negócio**:
    - Fortemente baseada em **Stored Procedures (PL/pgSQL)** para operações críticas (ex: `save_order`, cálculos de comissão).
    - Triggers para auditoria e atualização de timestamps.
- **API**: Cliente Supabase JS para comunicação direta com o banco (via PostgREST).

## 6. Modelo de Dados (Resumo)
Para detalhes completos, consulte o arquivo `DOCUMENTACAO_BANCO_DE_DADOS.md`.

- **Tabelas Principais**:
    - `partners` (Clientes/Fornecedores)
    - `orders` (Cabeçalho do Pedido)
    - `order_items` (Detalhes/Produtos do Pedido)
    - `commissions` (Comissões a pagar)
    - `company_expenses` (Contas a pagar)
    - `products` (Catálogo)

---
*Este documento é uma referência viva e deve ser atualizado conforme o sistema evolui.*
