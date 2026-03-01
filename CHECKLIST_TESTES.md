# ✅ CHECKLIST DE TESTES — Sistema Cristal Brindes
> **Data:** 21/02/2026  
> **Versão:** Gestão_Pedidos V01  
> **Instruções:** Marque `[x]` para cada item **aprovado** e `[FALHA]` para cada item com problema. Anote observações ao lado.

---

## 📋 LEGENDA

| Símbolo | Significado |
|---------|-------------|
| `[ ]`   | Ainda não testado |
| `[x]`   | ✅ Passou no teste |
| `[FALHA]` | ❌ Falhou — precisa de correção |
| `[N/A]` | Não se aplica |

---

## 1. 🔐 AUTENTICAÇÃO & LOGIN

### 1.1 Tela de Login
- [ ] A tela de login carrega corretamente com o logo "Cristal Brindes"
- [ ] Os campos de e-mail e senha estão visíveis
- [ ] O botão "Mostrar/Ocultar Senha" (ícone do olho) funciona
- [ ] O botão "ENTRAR" está visível e habilitado

### 1.2 Login com Credenciais Válidas
- [ ] Login com `cristalbrindes@cristalbrindes.com.br` funciona (perfil **Gestão - Acesso Total**)
- [ ] Login com `adm01@cristalbrindes.com.br` funciona (perfil **Administrativo**)
- [ ] Login com `vendas01@cristalbrindes.com.br` funciona (perfil **Vendas 01**)
- [ ] Login com `vendas02@cristalbrindes.com.br` funciona (perfil **Vendas 02**)
- [ ] Login com `vendas03@cristalbrindes.com.br` funciona (perfil **Vendas 03**)
- [ ] Login com `vendas04@cristalbrindes.com.br` funciona (perfil **Vendas 04**)
- [ ] Login com `vendas05@cristalbrindes.com.br` funciona (perfil **Vendas 05**)

### 1.3 Login com Credenciais Inválidas
- [ ] E-mail inválido mostra mensagem de erro
- [ ] Senha incorreta mostra mensagem de erro
- [ ] E-mail autenticado no Supabase mas NÃO cadastrado no sistema mostra mensagem de bloqueio

### 1.4 Sessão & Logout
- [ ] Ao recarregar a página com sessão ativa, o usuário continua logado
- [ ] O menu do perfil (canto superior direito) exibe o nome e e-mail corretos
- [ ] O botão "Sair" faz logout e redireciona para a tela de login
- [ ] Após logout, acessar qualquer rota redireciona para `/login`

### 1.5 Permissões — Perfil GESTÃO (cristalbrindes@)
- [ ] Vê **todos** os itens do menu lateral (CRM, Orçamentos, Pedidos, Receber, Pagar, Comissões, Parceiros, Produtos, Fatores)
- [ ] Consegue acessar todas as abas do CRM (Atendimentos, Performance, Financeiro)
- [ ] Vê pedidos de **todos os vendedores**
- [ ] Pode **excluir** parceiros, fatores e leads

### 1.6 Permissões — Perfil VENDAS (vendas01@, etc.)
- [ ] O menu lateral mostra apenas: CRM, Orçamentos, Pedidos, Parceiros, Produtos
- [ ] **NÃO** vê os itens: Receber, Pagar, Comissões, Fatores
- [ ] No CRM, **NÃO** vê as abas Performance e Financeiro
- [ ] Na lista de pedidos, vê **somente** seus próprios pedidos
- [ ] Na lista de orçamentos, vê **somente** seus próprios orçamentos
- [ ] No CRM, vê **somente** seus próprios atendimentos/leads
- [ ] **NÃO** pode excluir parceiros (botão de exclusão não aparece)
- [ ] O filtro de "Vendedor" está bloqueado (select desabilitado) mostrando seu nome

### 1.7 Permissões — Perfil ADMINISTRATIVO (adm01@)
- [ ] Vê pedidos de todos os vendedores
- [ ] Acessa a aba "Performance" do CRM
- [ ] **NÃO** acessa a aba "Financeiro" do CRM
- [ ] Acessa Contas a Receber mas **NÃO** Contas a Pagar
- [ ] Pode excluir parceiros (tem permissão `canDelete`)

---

## 2. 📊 CRM & VENDAS (ManagementPage)

### 2.1 Kanban de Atendimentos (aba LEADS)
- [ ] O quadro Kanban carrega com todas as colunas: Novo Atendimento, Criando Orçamento, Orçamento Enviado, Acompanhamento, Pedido Aberto, Pedido Entregue, Pós-venda
- [ ] Os cards dos leads aparecem na coluna correta conforme o status
- [ ] O número de cards por coluna está correto (badge no cabeçalho)
- [ ] Os cards mostram: Nome do Cliente, Vendedor, Telefone, E-mail, Descrição, Prioridade, Data de criação, Dias na fila
- [ ] A **prioridade** é exibida com as cores corretas (ALTA = vermelho, NORMAL = azul, BAIXA = cinza)
- [ ] Os cards são ordenados por prioridade (ALTA primeiro) e depois por data

### 2.2 Drag & Drop
- [ ] Arrastar um card de uma coluna para outra **altera o status** do lead
- [ ] A animação de drag está suave (card semi-transparente ao arrastar)
- [ ] A coluna de destino fica **destacada** ao arrastar sobre ela
- [ ] O scroll horizontal do kanban funciona (arrastar com o mouse para a esquerda/direita)

### 2.3 Criar Novo Atendimento
- [ ] Clicar em "Novo Atendimento" abre o modal de verificação de cliente
- [ ] Buscar por **telefone** encontra cliente existente e preenche os dados
- [ ] Buscar por **e-mail** encontra cliente existente e preenche os dados
- [ ] Buscar por **documento (CPF/CNPJ)** encontra cliente existente e preenche os dados
- [ ] Se cliente não encontrado, abre o formulário de cadastro em branco
- [ ] O formulário de novo lead tem os campos: Nome, Telefone, E-mail, CPF/CNPJ, Vendedor, Prioridade, Descrição, Data da Próxima Ação
- [ ] A busca de clientes existentes dentro do formulário funciona (campo de busca)
- [ ] Salvar um novo lead cria o registro na tabela `crm_leads`
- [ ] Salvar um novo lead também cria/atualiza o **parceiro** (tabela `partners`)
- [ ] A mensagem de sucesso (toast) aparece após salvar

### 2.4 Editar Atendimento
- [ ] Clicar em um card abre o formulário com os dados preenchidos
- [ ] Alterar campos e salvar atualiza os dados corretamente
- [ ] O status do lead é mantido ao editar (não reseta para "NOVO")

### 2.5 Ações nos Cards (hover)
- [ ] Ao passar o mouse sobre um card, os botões de ação aparecem
- [ ] Botão **"Orçamentos"** navega para a lista de orçamentos filtrada pelo cliente
- [ ] Botão **"Pedidos"** navega para a lista de pedidos filtrada pelo cliente
- [ ] Botão **"Criar Orçamento"** navega para o formulário de novo orçamento com os dados do lead pré-preenchidos

### 2.6 Finalizar Atendimento
- [ ] Mover um lead para status "FINALIZADO" abre o modal de finalização
- [ ] O modal permite selecionar se foi sucesso ou não
- [ ] O modal permite informar valor final e observações
- [ ] Após confirmar, o lead é atualizado com os metadados de fechamento

### 2.7 Marcar como "Não Aprovado"
- [ ] Mover um lead para "NÃO_APROVADO" abre o modal do motivo
- [ ] O modal tem as categorias: PREÇO, PRAZO, QUALIDADE, etc.
- [ ] O campo de motivo é **obrigatório** (erro se vazio)
- [ ] Após confirmar, o lead é atualizado com `lost_reason`
- [ ] O card exibe o motivo da recusa no campo "Motivo Recusa"

### 2.8 Filtros do CRM
- [ ] Filtro por **data início** funciona (mostra leads criados a partir da data)
- [ ] Filtro por **data fim** funciona (mostra leads criados até a data)
- [ ] Ambos os filtros juntos delimitam um período corretamente
- [ ] Botão "X" (limpar filtros de data) funciona
- [ ] Validação: data final anterior à inicial mostra erro

### 2.9 Aba Performance (somente Gestão/Admin)
- [ ] A aba Performance carrega com os dados de orçamentos
- [ ] Mostra total de orçamentos, aprovados e valor total
- [ ] Mostra tabela agrupada por **vendedor** com: Total, Aprovados, Pendentes, Recusados, Valor
- [ ] Mostra os 5 orçamentos mais recentes

### 2.10 Aba Financeiro (somente Gestão)
- [ ] A aba Financeiro carrega com dados filtráveis por **mês/ano**
- [ ] Filtro de **vendedor** funciona (Todos ou vendedor específico)
- [ ] Mostra: Total de Vendas, Lucro Líquido, Total de Comissões, Despesas Fixas, Número de Pedidos, Ticket Médio
- [ ] Mostra top 5 produtos mais vendidos
- [ ] Mostra vendas por status

---

## 3. 📝 ORÇAMENTOS (Budgets)

### 3.1 Lista de Orçamentos
- [ ] A lista carrega e exibe os orçamentos existentes
- [ ] As colunas mostram: Nr, Empresa/Cliente, Vendedor, Status, Total, Ações
- [ ] O filtro de **busca** funciona (por número ou nome do cliente)
- [ ] O filtro de **vendedor** funciona
- [ ] O filtro de **status** funciona (EM ABERTO, PROPOSTA ENVIADA, PROPOSTA ACEITA, PROPOSTA RECUSADA, CANCELADO)
- [ ] O filtro de **data início e data fim** funciona
- [ ] A **paginação** funciona (navegar entre páginas)
- [ ] O vendedor vê **somente** seus orçamentos (filtro travado)
- [ ] O gestor vê orçamentos de **todos** os vendedores
- [ ] Clicar em um orçamento navega para a edição
- [ ] Botão de **excluir** funciona (com confirmação)
- [ ] Botão "Novo Orçamento" navega para o formulário de criação

### 3.2 Formulário de Orçamento — Cabeçalho
- [ ] O campo "Vendedor" está preenchido automaticamente
- [ ] Selecionar um **cliente** existente funciona (dropdown com busca)
- [ ] A busca de produtos funciona no servidor (tipo de busca "server-side")
- [ ] O campo "Emissor" permite selecionar entre opções
- [ ] O campo "Status" mostra: EM ABERTO, PROPOSTA ENVIADA, PROPOSTA ACEITA, PROPOSTA RECUSADA, CANCELADO

### 3.3 Formulário de Orçamento — Itens
- [ ] Adicionar um item ao orçamento funciona (selecionar produto + quantidade)
- [ ] Os campos de custo estão visíveis: Preço Unitário, Custo de Personalização, Frete Fornecedor, Frete Cliente, Despesa Extra, Layout
- [ ] O **total do item** é calculado automaticamente
- [ ] O **total geral** do orçamento é calculado (soma de todos os itens)
- [ ] Remover um item do orçamento funciona
- [ ] Editar a quantidade de um item recalcula o total

### 3.4 Salvar Orçamento
- [ ] Salvar um novo orçamento cria o registro com número sequencial
- [ ] Salvar um orçamento existente atualiza os dados
- [ ] A mensagem de sucesso aparece após salvar
- [ ] Os itens são salvos corretamente na tabela `budget_items`
- [ ] Voltar para a lista mostra o orçamento recém-criado

### 3.5 Gerar Pedido a partir do Orçamento
- [ ] O botão "Gerar Pedido" está disponível (para orçamentos com status PROPOSTA ACEITA ou conforme regra)
- [ ] Ao gerar pedido, os dados do cliente são transferidos
- [ ] Os itens são transferidos com todos os valores (preço, frete, personalização, etc.)
- [ ] Um novo pedido é criado na tabela `orders` com os dados corretos
- [ ] Os itens são criados na tabela `order_items`
- [ ] A mensagem de sucesso aparece e redireciona para o pedido

### 3.6 Duplicar Orçamento
- [ ] O botão "Duplicar Orçamento" funciona
- [ ] Cria uma cópia exata do orçamento com novo número
- [ ] Todos os itens são copiados também
- [ ] A mensagem de sucesso aparece

### 3.7 Regras de Negócio
- [ ] Orçamento com status "PROPOSTA ACEITA" **NÃO** pode ser editado (campos desabilitados)
- [ ] Orçamento com status "CANCELADO" **NÃO** pode ser editado

---

## 4. 📦 PEDIDOS (Orders)

### 4.1 Lista de Pedidos
- [ ] A lista carrega e exibe os pedidos existentes
- [ ] As colunas mostram: ID, Status, Cliente, Vendedor, Data, Valor Total, Ações
- [ ] O filtro de **busca** funciona (ID, cliente, CNPJ, valor total, parcelas)
- [ ] A busca por **valor numérico** funciona (busca em total, entrada e restante)
- [ ] O filtro de **vendedor** funciona
- [ ] O filtro de **status** funciona (EM ABERTO, EM PRODUÇÃO, AGUARDANDO APROVAÇÃO, AGUARDANDO NF, AGUARDANDO PAGAMENTO, AGUARDANDO PERSONALIZAÇÃO, FINALIZADO)
- [ ] O filtro de **Data Limite Recebimento** funciona
- [ ] O filtro de **Data Saída Fornecedor** funciona
- [ ] A **paginação** funciona
- [ ] Clicar em um pedido navega para a visualização

### 4.2 Formulário de Pedido — Cabeçalho
- [ ] Criar novo pedido: o campo **Número do Pedido** é preenchido automaticamente (sequencial)
- [ ] O campo **Vendedor** é preenchido automaticamente
- [ ] O campo **Data do Pedido** é preenchido com a data atual
- [ ] Selecionar **cliente** funciona (dropdown com busca)
- [ ] O botão "+ Cadastrar Cliente" abre o modal para novo cliente inline
- [ ] O modal de novo cliente salva na tabela `partners` com tipo CLIENTE
- [ ] Os campos: Emissor, Tipo de Faturamento, Forma de Pagamento, Data de Vencimento, Número da NF

### 4.3 Formulário de Pedido — Itens
- [ ] Adicionar um item funciona (selecionar produto e fornecedor)
- [ ] A busca de produtos funciona (busca server-side)
- [ ] Selecionar **fornecedor** para cada item funciona
- [ ] Os campos de **custos previstos** estão visíveis: Preço Unitário, Personalização, Frete Fornecedor, Frete Cliente, Despesa Extra, Layout
- [ ] O **fator de cálculo** pode ser alterado (dropdown com fatores cadastrados)
- [ ] O cálculo do **total do item** usa a fórmula: (Preço × Qtd + Custos) × Fator
- [ ] Remover um item funciona
- [ ] Editar campos de um item recalcula o total automaticamente

### 4.4 Formulário de Pedido — Custos Reais (Gestão)
- [ ] Os campos de **custo real** estão visíveis: Preço Real, Personalização Real, Frete Fornecedor Real, Frete Cliente Real, Despesa Extra Real, Layout Real
- [ ] Os checkboxes de **"Pago"** funcionam para cada tipo de custo
- [ ] Ao marcar um custo como "Pago", uma confirmação é solicitada
- [ ] O status de pagamento é salvo corretamente no banco de dados
- [ ] As datas de pagamento de custos são atualizadas

### 4.5 Formulário de Pedido — Pagamentos
- [ ] O campo **Valor de Entrada** pode ser preenchido
- [ ] O campo **Data da Entrada** pode ser preenchido
- [ ] O checkbox **"Entrada Confirmada"** funciona (com confirmação)
- [ ] O campo **Valor Restante** é calculado automaticamente (Total - Entrada)
- [ ] O campo **Data do Restante** pode ser preenchido
- [ ] O checkbox **"Restante Confirmado"** funciona (com confirmação)
- [ ] Confirmar pagamento de entrada gera uma **comissão** na tabela `commissions`
- [ ] Confirmar pagamento restante gera outra comissão
- [ ] A comissão é de **1%** sobre o valor confirmado

### 4.6 Formulário de Pedido — Status
- [ ] Alterar o status do pedido funciona (dropdown)
- [ ] Os status disponíveis são: EM ABERTO, EM PRODUÇÃO, AGUARDANDO APROVAÇÃO, AGUARDANDO NF, AGUARDANDO PAGAMENTO, AGUARDANDO PERSONALIZAÇÃO, FINALIZADO, ENTRE FINALIZADO
- [ ] A mudança de status é persistida imediatamente

### 4.7 Formulário de Pedido — Ajuste de Preço
- [ ] O botão de "Ajuste de Preço" funciona em cada item
- [ ] Pode ajustar preço unitário ou total
- [ ] O recalculação dos valores é correta após o ajuste

### 4.8 Formulário de Pedido — Log de Alterações
- [ ] O log de alterações é exibido no final do pedido
- [ ] Cada ação (salvar, alterar status, confirmar pagamento) gera um registro de log
- [ ] O log mostra: Usuário, Mensagem, Data/Hora

### 4.9 Salvar Pedido
- [ ] Salvar um novo pedido funciona (chama a função `save_order` do Supabase)
- [ ] A validação obrigatória funciona: Cliente, Vendedor, pelo menos 1 item
- [ ] Salvar pedido existente atualiza os dados e itens
- [ ] Mensagem de sucesso aparece após salvar
- [ ] Navegar de volta para a lista mostra o pedido atualizado

---

## 5. 💰 CONTAS A RECEBER (ReceivablesPage)

### 5.1 Visualização
- [ ] A página carrega e lista os recebíveis baseados nos pedidos
- [ ] As colunas mostram: Pedido, Cliente, Descrição, Valor, Vencimento, Status, Ações
- [ ] Os itens mostram se estão **pagos** ou **pendentes**
- [ ] Itens **vencidos** (data passada e não pagos) são destacados
- [ ] Os cards de resumo no topo mostram: Total a Receber (7/30/60/90 dias)

### 5.2 Ações
- [ ] O botão "Confirmar Pagamento" funciona (muda status para pago e registra data)
- [ ] Após confirmar o recebimento, o valor é atualizado na listagem
- [ ] O **fluxo de caixa** (resumo por período) é calculado corretamente

---

## 6. 💸 CONTAS A PAGAR (PayablesPage)

### 6.1 Custos de Pedidos
- [ ] A aba de "Custos de Pedidos" lista os custos reais dos itens dos pedidos
- [ ] Mostra: Pedido, Produto, Tipo de Custo, Valor Estimado, Valor Real, Status, Ações
- [ ] Os filtros de mês/ano funcionam

### 6.2 Despesas da Empresa
- [ ] A aba de "Despesas Fixas/Variáveis" lista despesas da tabela `company_expenses`
- [ ] O botão "Nova Despesa" abre o formulário
- [ ] O formulário tem os campos: Descrição, Valor, Data de Vencimento, Categoria, Recorrência, Observação
- [ ] Salvar uma nova despesa funciona
- [ ] O botão "Marcar como Pago" funciona (com data de pagamento)
- [ ] Despesas vencidas são destacadas

### 6.3 Resumo Financeiro
- [ ] Os cards de resumo mostram: Total a Pagar (7/30/60/90 dias)
- [ ] O total de vencidos é exibido
- [ ] Os valores estão coerentes (soma de custos de pedidos + despesas)

---

## 7. 🏆 COMISSÕES (CommissionPage)

### 7.1 Visualização
- [ ] A página lista todas as comissões geradas
- [ ] Mostra: Vendedor, Pedido, Tipo (ENTRADA/RESTANTE), Valor, Percentual, Status, Mês/Ano
- [ ] Filtros por vendedor e mês/ano funcionam

### 7.2 Ações
- [ ] O botão "Marcar como Pago" funciona individualmente
- [ ] O botão "Pagar Todas" (por vendedor) funciona
- [ ] A comissão alterna entre PENDING e PAID corretamente

### 7.3 Editar Comissão
- [ ] O modal de edição abre e permite alterar o valor da comissão
- [ ] Salvar a edição atualiza o valor no banco

### 7.4 Dividir Comissão (Split)
- [ ] O modal de divisão abre e permite dividir a comissão
- [ ] Pode dividir por **percentual** ou **valor fixo**
- [ ] Ao confirmar, a comissão original é excluída e duas novas são criadas
- [ ] A soma das partes é igual ao original

---

## 8. 👥 PARCEIROS — Clientes & Fornecedores (RegistrationList/Form)

### 8.1 Lista de Parceiros
- [ ] A lista carrega e exibe parceiros
- [ ] As abas "Clientes" e "Fornecedores" separam os registros corretamente
- [ ] O badge de contagem está correto em cada aba
- [ ] O campo de filtro (buscar por nome, CNPJ) está presente
- [ ] As colunas mostram: Nome, CNPJ, Telefone, E-mail, Ações

### 8.2 Novo Parceiro
- [ ] Botão "Adicionar Novo" navega para o formulário
- [ ] O formulário tem seleção de tipo: CLIENTE ou FORNECEDOR
- [ ] Os campos: Nome, CNPJ/CPF, Telefone, E-mail, E-mail Financeiro
- [ ] A máscara de **CPF/CNPJ** é aplicada automaticamente
- [ ] A máscara de **telefone** é aplicada automaticamente
- [ ] Salvar com sucesso redireciona para a lista

### 8.3 Editar Parceiro
- [ ] O botão de edição funciona (ícone de lápis)
- [ ] O formulário carrega com os dados preenchidos
- [ ] Salvar atualiza o registro corretamente

### 8.4 Excluir Parceiro
- [ ] O botão de exclusão aparece **somente** para usuários com permissão `canDelete`
- [ ] Vendedores **NÃO** veem o botão de exclusão
- [ ] Gestor e Administrativo veem o botão
- [ ] A exclusão pede confirmação antes de executar

---

## 9. 🎁 PRODUTOS (ProductsPage)

### 9.1 Lista de Produtos
- [ ] A lista carrega e exibe os produtos do catálogo
- [ ] A paginação funciona (navegação entre páginas)
- [ ] O campo de busca funciona (por nome, código)
- [ ] As informações mostradas: Nome, Código, Fonte (XBZ/Asia/Spot), Preço, Imagem

### 9.2 Sincronização de Produtos
- [ ] O botão "Sincronizar Produtos" está visível
- [ ] Clicar no botão inicia a sincronização
- [ ] O progresso é exibido (mensagens como "Buscando XBZ...", "Buscando Asia...", "Buscando Spot...")
- [ ] Após a sincronização, a lista é atualizada com os produtos novos/atualizados
- [ ] Produtos de todas as fontes são importados: **XBZ**, **Asia Import**, **Spot Gifts**

### 9.3 Imagens dos Produtos
- [ ] As imagens dos produtos são exibidas corretamente
- [ ] Produtos sem imagem mostram um placeholder
- [ ] As imagens XBZ são carregadas via proxy (sem erro CORS/403)

---

## 10. ⚙️ FATORES DE CÁLCULO (CalculationFactors)

### 10.1 Lista de Fatores
- [ ] A lista carrega e exibe os fatores cadastrados
- [ ] Mostra: Nome, Descrição, Multiplicador resultante
- [ ] O multiplicador é calculado corretamente (1 + imposto% + imprevisto% + margem%)
- [ ] O filtro de busca funciona

### 10.2 Novo Fator
- [ ] Botão "Adicionar Fator" navega para o formulário
- [ ] Os campos: Nome, Descrição, Imposto (%), Imprevisto (%), Margem (%)
- [ ] O **fator resultante** é calculado em tempo real conforme os valores são digitados
- [ ] Salvar com sucesso redireciona para a lista

### 10.3 Editar Fator
- [ ] O botão de edição funciona
- [ ] O formulário carrega com os dados preenchidos
- [ ] A edição do fator resultante atualiza em tempo real
- [ ] Salvar atualiza o registro corretamente

### 10.4 Excluir Fator
- [ ] O botão de exclusão funciona
- [ ] Pede confirmação antes de excluir
- [ ] Após exclusão, o fator é removido da lista

---

## 11. 🔔 NOTIFICAÇÕES (NotificationCenter)

### 11.1 Centro de Notificações
- [ ] O ícone de sino está visível no cabeçalho
- [ ] O badge de contagem mostra o número de notificações não lidas
- [ ] Clicar no sino abre o dropdown de notificações
- [ ] As notificações mostram: Título, Mensagem, Hora

### 11.2 Ações nas Notificações
- [ ] Clicar em uma notificação marca como **lida**
- [ ] Notificações com link navegam para a rota correta
- [ ] O botão "Marcar todas como lidas" funciona
- [ ] Notificações sem leitura têm destaque visual (bolinha azul)

### 11.3 Notificações em Tempo Real
- [ ] Quando uma nova notificação é inserida no banco, ela aparece automaticamente (Realtime)
- [ ] Um toast (alerta) aparece para novas notificações

---

## 12. 🧭 NAVEGAÇÃO & UI GERAL

### 12.1 Menu Lateral (Sidebar)
- [ ] Todos os itens do menu estão visíveis conforme as permissões do usuário
- [ ] O item ativo está **destacado** (fundo azul, barra lateral)
- [ ] A sidebar é responsiva (ícones apenas em tela pequena, ícones + texto em tela grande)
- [ ] Clicar em cada item navega para a página correta

### 12.2 Header Superior
- [ ] O header azul está visível com a barra de pesquisa
- [ ] O avatar do usuário mostra as iniciais corretas
- [ ] O dropdown do perfil mostra nome, e-mail e botão de sair

### 12.3 Responsividade
- [ ] O layout se adapta em **desktop** (tela cheia)
- [ ] O layout se adapta em **tablet** (tela média)
- [ ] O layout se adapta em **mobile** (tela pequena)
- [ ] As tabelas têm scroll horizontal em telas pequenas

### 12.4 Toasts & Feedback
- [ ] Mensagens de **sucesso** aparecem em verde
- [ ] Mensagens de **erro** aparecem em vermelho
- [ ] As mensagens desaparecem automaticamente após alguns segundos

---

## 13. 🔄 FLUXOS COMPLETOS (End-to-End)

### Fluxo 1: Do Atendimento ao Pedido
- [ ] **Passo 1:** Criar novo atendimento no CRM com dados do cliente
- [ ] **Passo 2:** Mover o lead para "Criando Orçamento"
- [ ] **Passo 3:** Criar um orçamento a partir do lead
- [ ] **Passo 4:** Adicionar itens ao orçamento e salvar
- [ ] **Passo 5:** Alterar status para "PROPOSTA ENVIADA"
- [ ] **Passo 6:** Alterar status para "PROPOSTA ACEITA"
- [ ] **Passo 7:** Gerar pedido a partir do orçamento
- [ ] **Passo 8:** Verificar que o pedido foi criado com todos os dados e itens corretos
- [ ] **Passo 9:** Mover o lead no CRM para "Pedido Aberto"

### Fluxo 2: Do Pedido ao Financeiro
- [ ] **Passo 1:** No pedido, preencher valor de entrada e confirmar pagamento
- [ ] **Passo 2:** Verificar que uma comissão foi gerada (Comissões)
- [ ] **Passo 3:** Verificar que o valor aparece em Contas a Receber
- [ ] **Passo 4:** Preencher custos reais dos itens
- [ ] **Passo 5:** Marcar custos como pagos
- [ ] **Passo 6:** Verificar que os valores aparecem em Contas a Pagar
- [ ] **Passo 7:** Confirmar pagamento restante
- [ ] **Passo 8:** Verificar segunda comissão gerada
- [ ] **Passo 9:** Alterar status do pedido para "FINALIZADO"

### Fluxo 3: Vendedor Restrito
- [ ] **Passo 1:** Fazer login como Vendas 01
- [ ] **Passo 2:** Verificar que vê **somente** seus leads/orçamentos/pedidos
- [ ] **Passo 3:** Tentar acessar URL de Comissões → deve mostrar "Acesso Restrito"
- [ ] **Passo 4:** Tentar acessar Contas a Pagar → deve ser bloqueado
- [ ] **Passo 5:** Criar um novo lead e verificar que está atribuído a "VENDAS 01"
- [ ] **Passo 6:** Verificar que o parceiro não pode ser excluído (botão inexistente)

### Fluxo 4: Despesa Fixa Completa
- [ ] **Passo 1:** Ir para Contas a Pagar
- [ ] **Passo 2:** Criar uma nova despesa com todos os campos preenchidos
- [ ] **Passo 3:** Verificar que a despesa aparece na lista
- [ ] **Passo 4:** Marcar a despesa como paga
- [ ] **Passo 5:** Verificar que o status mudou e a data de pagamento foi registrada

---

## 14. 🗄️ INTEGRIDADE DE DADOS

### 14.1 Dados do Orçamento → Pedido
- [ ] Ao gerar pedido a partir do orçamento, o **nome do cliente** é transferido
- [ ] O **vendedor** é transferido
- [ ] Todos os **itens** são transferidos com os valores corretos
- [ ] Os valores de **frete** e **personalização** são mantidos
- [ ] O **fator de cálculo** é mantido nos itens

### 14.2 Dados do Lead → Parceiro
- [ ] Ao criar um lead, se o cliente não existe, um novo **partner** é criado
- [ ] Se o cliente já existe (por CPF/CNPJ), os dados são **atualizados**
- [ ] O `salesperson` do parceiro é atribuído

### 14.3 Comissões Automáticas
- [ ] A comissão é criada **somente uma vez** para cada tipo (ENTRADA/RESTANTE) por pedido
- [ ] O valor é **1%** do pagamento confirmado
- [ ] O vendedor da comissão é o vendedor do pedido
- [ ] A comissão não é duplicada ao re-salvar o pedido

---

## 📝 OBSERVAÇÕES GERAIS
> Espaço para anotar bugs, comportamentos inesperados ou melhorias:

| # | Módulo | Descrição do Problema | Severidade |
|---|--------|----------------------|------------|
| 1 |        |                      |            |
| 2 |        |                      |            |
| 3 |        |                      |            |
| 4 |        |                      |            |
| 5 |        |                      |            |
| 6 |        |                      |            |
| 7 |        |                      |            |
| 8 |        |                      |            |
| 9 |        |                      |            |
| 10|        |                      |            |

---

> ✅ **Total de itens de teste:** ~170  
> 📅 **Data prevista para conclusão:** ___/___/2026  
> 👤 **Testador:** ____________________  
> 📊 **Resultado Final:** ______ de ______ aprovados  
