# Sistema de Catálogos - Especificação e Prompt Base

Este documento reúne todas as informações, arquitetura e instruções necessárias para iniciar o desenvolvimento do **novo Sistema de Catálogos** isolado, que compartilha dados de produtos com o sistema de Gestão de Pedidos.

Ao final deste arquivo, há um **Prompt Otimizado** que você pode simplesmente copiar e colar para o seu assistente de IA (Cursor, Gemini, ChatGPT) para que ele construa a base do sistema quase que automaticamente.

---

## 1. Visão Geral do Projeto

**Objetivo:** Criar um sistema focado exclusivamente na visualização, filtro e organização de produtos (Brindes) alimentados pelos fornecedores XBZ, Asia e Spot.
**Banco de Dados:** Compartilhado com o sistema de Gestão existente (Supabase), focando fundamentalmente na tabela `products`.
**Escopo Principal:**
1. Listagem unificada de produtos.
2. Filtros avançados (Cor, Fornecedor, Faixa de Preço, Estoque).
3. Seleção de itens para montar e compartilhar "catálogos eletrônicos" ou gerar orçamentos/PDFs.
4. Sincronização e integração com API de fornecedores via Supabase Edge Functions.

## 2. Stack Tecnológica Recomendada

Para manter a harmonia com o ecossistema existente, recomenda-se a mesma stack:
* **Frontend:** React + Vite (Typecript).
* **Estilos:** TailwindCSS (com o mesmo design system padrão, estilo pastel refinado e maduro).
* **Roteamento:** React Router DOM.
* **Estado/Fetch:** React Query ou SWR (ideal para buscas e paginação complexa) & Zustand (para o carrinho do catálogo).
* **Backend as a Service:** Supabase.

## 3. Arquitetura de Dados (A tabela `products`)

O sistema de Gestão já consolidou a tabela `products`, então você **NÃO precisa criar uma tabela nova**. A IA apenas deve puxar os dados existentes usando o Supabase JS client.

A estrutura atual que o sistema de catálogo vai consumir:

```typescript
export interface Product {
  id: string; // ex: uuid primário no supabase
  external_id: string | null; // ID Original do Fornecedor
  source: 'XBZ' | 'Asia' | 'Spot';
  code: string | null; // Código amigável (SKU/Ref)
  name: string;
  description: string | null;
  unit_price: number | null; // Preço base
  image_url: string | null; // Imagem principal
  images: string[] | null; // Array de URLs das fotos da galeria
  stock: number | null;
  color: string | null; // Cor principal extraída
  variations: Json | null; // Objeto JSON contendo sub-variações de cor/estoque
  updated_at: string | null;
}
```

## 4. Integração com Fornecedores (XBZ, Asia, Spot)

O sistema herdará a mecânica de sincronismo existente. Detalhes importantes:

### O Problema do CORS via Edge Function (Muito Importante)
Como as APIs de fornecedores (como a API da XBZ) costumam dar erro de CORS em requisições diretas feitas do navegador do cliente, você deve invocar a rota da Edge Function (já criada no banco atual) para realizar o "proxy" das chamadas ou agendar automações no Node:

```url
{SUPABASE_URL}/functions/v1/proxy-api?url={URL_DO_FORNECEDOR}
```

### Endpoints Base dos Fornecedores
As informações sensíveis (Tokens, Chaves) você alimentará apenas no arquivo `.env`, mas o formato das APIs é:
* **XBZ:** `https://api.minhaxbz.com.br:5001/api/clientes/GetListaDeProdutos?cnpj=X&token=Y`
* **Asia Import:** `https://api.asiaimport.com.br/` (Via POST usando form-urlencoded com `api_key`, `secret_key` e `por_pagina`).
* **Spot Gifts:** API baseada em requisição de arquivos CSV temporários pelas URLs `https://ws.spotgifts.com.br/downloads/v1SSL/file`. Requer parse de CSV.

---

## 5. PROMPT PARA O DESENVOLVIMENTO (Copie e Cole)

*Copie rigorosamente o conteúdo abaixo, alterando apenas o que achar necessário, e envie para a IA quando for criar o novo projeto.*

====== INÍCIO DO PROMPT ======

**Contexto:**
Desejo criar do zero um sistema web chamado "Sistema de Catálogos", usando React 19, Vite, TypeScript e TailwindCSS. Ele servirá como uma vitrine de produtos integrando 3 fornecedores de brindes promocionais (XBZ, Asia Import e Spot Gifts).
Este sistema deverá se conectar a um banco Supabase existente onde a tabela `products` já encontra-se criada e populada.

**Regras de Estilo e UI/UX:**
* Quero um design premium, "Wow effect", utilizando uma paleta de cores elegantes e tons pastéis (evite azuis e vermelhos genéricos).
* Use bordas arredondadas suaves (`rounded-2xl`, `rounded-xl`), efeitoss 'glassmorphism' (ex: `backdrop-blur-md bg-white/70`), shadows subjacentes leves.
* O design não pode parecer um layout template cru; exijo extrema atenção à harmonia tipográfica (Google Fonts inter ou Outfit) e uso de padding generoso para respiro.

**Tarefas Principais para Você (Assistente / IA):**

1. **Configuração Base:**
   * Crie/configure as rotas do Vite para ter uma página Splash Inicial de entrada e um Dashboard/Catálogo Principal (`/catalog`).
2. **Setup do Supabase:**
   * Implemente o client em `src/lib/supabase.ts`. Assuma as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. **Construção do Componente de Grid de Produtos (`ProductGrid`):**
   * Deve realizar uma consulta a tabela `products` do Supabase e renderizar Cards dos produtos.
   * Paginação ou Infinite Scroll é mandatório para suportar os milhares de produtos.
   * O Card do produto deve mostrar a Imagem em alta resolução ocupando bom espaço, Nome truncado, Título da marca fornecedora (XBZ, Asia ou Spot), Cor e Quantidade em Estoque, bem como o valor unitiário.
4. **Sistema de Filtros Lateral (Sidebar):**
   * Crie uma sidebar fluida contendo a capacidade de pesquisa textual rápida.
   * Capacidade de filtrar por checkbox entre Fornecedores (XBZ, Asia, Spot).
   * Capacidade de agrupar/filtrar por cores (renderize bolinhas da cor HEX associadas ao filtro de string. ex: Rosa -> `#ec4899`).
5. **Carrinho de Catálogo (State Management):**
   * Usando Zustand (ou context nativo), permita adicionar produtos clicando no icone de (+).
   * Adicione um painel lateral retrátil (Drawer/Slideover) chamado "Meu Catálogo Selecionado" onde mostra as seleções atuais.
6. **Integração Real-Time com Fornecedores (Camada de Service):**
   * Monte arquivos mock/esboço de serviços `productSync.ts` e `api.ts` baseados na premissa de contornar CORS usando a URL: `${supabaseUrl}/functions/v1/proxy-api?url={targetUrl}`.

**Instrução de Execução:** Crie a estrutura de diretórios, escreva o `package.json`, o setup do Tailwind (`tailwind.config.ts`) de forma requintada, instale o necessário (`lucide-react` pros ícones) e implemente as views fundamentais.

====== FIM DO PROMPT ======
