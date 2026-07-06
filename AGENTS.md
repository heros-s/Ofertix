# AGENTS.md — Projeto Ofertix

> Este arquivo é o contexto operacional para o agente de IA (Gemini) atuar no desenvolvimento do e-commerce Ofertix. Deve ser lido integralmente antes de qualquer geração de código.

---

## 1. Visão Geral

**Nome do projeto:** Ofertix
**Tipo:** Marketplace multi-vendedor (e-commerce com split de pagamento)
**Objetivo:** MVP funcional para demonstração a um investidor/parceiro comercial (amigo do tio do responsável pelo projeto).
**Prazo:** 7 dias corridos.
**Modelo de negócio:** Ofertix cobra comissão de **5%** sobre o valor de cada venda. O restante (95%) é repassado automaticamente ao vendedor via split de pagamento no gateway.

### Contexto de negócio
Existe um grupo de vendedores independentes, cada um com estoque próprio e variado. A Ofertix é a vitrine unificada onde o consumidor final compra. Quando o carrinho contém produtos de vendedores diferentes, o pagamento deve ser dividido automaticamente entre os donos dos produtos (menos a comissão da plataforma), mas o consumidor faz **um único checkout e recebe um único envio**.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript | Já é o stack de portfólio do dev, produtividade alta, SSR bom para SEO de vitrine |
| Backend | NestJS (Node.js) + TypeScript | Definido pelo usuário. Arquitetura modular facilita separar módulos: auth, produtos, pedidos, pagamentos |
| Banco de dados | PostgreSQL via **Supabase** | Gerenciado, sem DevOps de infra em 1 semana; Auth e Storage nativos |
| Autenticação | **Supabase Auth** (email/senha + Google OAuth + verificação de e-mail) | Elimina a necessidade de construir fluxo de auth do zero no NestJS; o backend valida o JWT do Supabase |
| Pagamentos / Split | **Mercado Pago — Marketplace (Split de Pagamentos)** | Split nativo por vendedor, documentação em PT-BR, checkout transparente e Checkout Pro disponíveis |
| Armazenamento de imagens | **Cloudinary** | Upload direto do frontend, transformação de imagem (thumbnails) sem esforço de backend |
| Deploy Frontend | Vercel | Deploy automático via Git, zero config para Next.js |
| Deploy Backend | Railway | Deploy automático via Git, Postgres/env vars simples (mesmo usando Supabase como DB principal) |
| Estilização | Tailwind CSS | Velocidade de construção de UI |

**Diretriz para o agente:** ao gerar código, sempre usar TypeScript com tipagem estrita (`strict: true`). Preferir Server Components no Next.js quando não houver necessidade de interatividade client-side.

---

## 3. Modelo de Dados (Entidades Principais)

```
User (Supabase Auth)
 ├─ id, email, nome, tipo (CONSUMIDOR | VENDEDOR), avatar_url, criado_em

Vendedor (extensão de User quando tipo = VENDEDOR)
 ├─ user_id (FK), nome_loja, cnpj/cpf, mp_account_id (conta Mercado Pago vinculada para split), status (ativo/pendente)

Produto
 ├─ id, vendedor_id (FK), nome, descricao, categoria_id (FK), preco, estoque, fotos[] (Cloudinary URLs), ativo, criado_em

Categoria
 ├─ id, nome, slug, categoria_pai_id (nullable, para subcategorias)

Kit
 ├─ id, vendedor_id (FK), nome, descricao, desconto_percentual, ativo
KitProduto (tabela pivô)
 ├─ kit_id (FK), produto_id (FK), quantidade

Avaliacao
 ├─ id, produto_id (FK), user_id (FK), nota (1-5), comentario, criado_em

Pedido (pedido "pai" do consumidor)
 ├─ id, consumidor_id (FK), status_geral, valor_total, endereco_entrega, frete_valor, criado_em

SubPedido (um por vendedor dentro do Pedido)
 ├─ id, pedido_id (FK), vendedor_id (FK), valor_bruto, valor_comissao (5%), valor_liquido_vendedor, status (pendente/pago/enviado/entregue/cancelado)

ItemPedido
 ├─ id, sub_pedido_id (FK), produto_id (FK), quantidade, preco_unitario

Promocao
 ├─ id, produto_id (FK) ou kit_id (FK), desconto_percentual, data_inicio, data_fim
```

**Diretriz para o agente:** o `Pedido` nunca contém itens diretamente — sempre passa por `SubPedido`, que é a unidade de faturamento/split por vendedor. Isso é o núcleo da arquitetura e não deve ser simplificado.

---

## 4. Fluxo de Checkout Multi-Vendedor (crítico)

1. Consumidor monta carrinho com produtos de N vendedores diferentes.
2. No checkout, o sistema agrupa os itens por `vendedor_id` e calcula, para cada grupo: subtotal, comissão Ofertix (5%), valor líquido do vendedor.
3. Frete é único, calculado sobre o pedido consolidado (não por vendedor) e definido no `Pedido` pai — a lógica de rateio do frete entre vendedores (se necessário para o split) deve ser documentada, mas não exibida ao consumidor.
4. É criada uma preferência de pagamento no Mercado Pago usando a API de **Split de Pagamentos (Marketplace)**, com um `application_fee` correspondente aos 5% por vendedor e o valor líquido direcionado à conta Mercado Pago de cada vendedor (`collector_id`/`marketplace` conforme doc oficial).
5. Após confirmação do pagamento (webhook do Mercado Pago), o sistema:
   - Atualiza `Pedido.status_geral` para "pago"
   - Cria/atualiza os `SubPedido` correspondentes com status "pago"
   - Notifica cada vendedor sobre o(s) seu(s) sub-pedido(s)
6. Cada vendedor só visualiza e gerencia seus próprios `SubPedido` (nunca o pedido completo de outro vendedor).

**Diretriz para o agente:** implementar o webhook do Mercado Pago como endpoint idempotente (evitar duplicar split em caso de reenvio de notificação).

---

## 5. Visão do Vendedor

### 5.1 Módulo de Resumo Executivo
- Indicadores: faturamento bruto, faturamento líquido (pós-comissão), número de pedidos, ticket médio, produtos mais vendidos
- Filtro por período (dia/semana/mês)

### 5.2 Módulo de Cadastro de Produtos
- CRUD de produtos: nome, descrição, categoria, preço, estoque, upload de múltiplas fotos (Cloudinary)
- Ativar/desativar produto (sem remover histórico)

### 5.3 Módulo de Criação de Kits
- Seleção de produtos já cadastrados (do próprio vendedor)
- Definição de quantidade de cada item no kit
- Definição de desconto percentual sobre a soma dos itens
- Preview do preço final do kit

---

## 6. Visão do Consumidor

### 6.1 Vitrine por Categoria
- Grid de produtos segmentado por categoria/subcategoria

### 6.2 Página de Produto
- Galeria de fotos, descrição completa, avaliações (nota + comentários), vendedor responsável

### 6.3 Seção de Kits
- Listagem de kits ativos com preço com desconto destacado vs. preço somado

### 6.4 Aba de Promoções
- Produtos/kits com `Promocao` ativa (dentro do período de vigência)

### 6.5 Mais Vendidos
- Ranking calculado por quantidade vendida (via `ItemPedido`) em destaque na home

### 6.6 Acompanhamento de Pedidos
- Consumidor visualiza `Pedido` com detalhamento por `SubPedido` e status de cada um (um pedido pode ter partes entregues e outras não, já que vem de vendedores diferentes)

### 6.7 Página Detalhada de Categoria
- Listagem com filtros (preço, avaliação, vendedor) e ordenação (relevância, menor/maior preço, mais vendidos)

---

## 7. Autenticação

- Dois tipos de conta: `CONSUMIDOR` e `VENDEDOR`, definidos no cadastro
- Login via e-mail/senha ou Google OAuth (Supabase Auth)
- Verificação de e-mail obrigatória antes de liberar compra (consumidor) ou publicação de produtos (vendedor)
- Vendedor precisa adicionalmente vincular uma conta Mercado Pago válida (`mp_account_id`) antes de poder publicar produtos — sem isso, não é possível receber split

---

## 8. Fora do Escopo do MVP (Fase 2)

Para caber no prazo de 1 semana, os itens abaixo ficam documentados mas **não** entram na primeira entrega:
- Chat entre consumidor e vendedor
- Painel administrativo da Ofertix (aprovação manual de vendedores, disputas)
- Cálculo de frete real via API de transportadora (usar valor fixo/simulado no MVP)
- Sistema de cupons de desconto
- App mobile
- Múltiplos métodos de pagamento além do Mercado Pago

---

## 9. Diretrizes Gerais para o Agente (Gemini)

- Sempre perguntar antes de assumir decisões de arquitetura não cobertas neste documento.
- Não remover funcionalidades descritas aqui, exceto por erro lógico ou risco de segurança comprovado — nesse caso, explicar antes de alterar.
- Priorizar entregar o fluxo de checkout multi-vendedor com split funcionando de ponta a ponta (é o diferencial técnico a ser demonstrado), mesmo que outras telas fiquem com UI mais simples.
- Código em inglês (nomes de variáveis, funções, tabelas), comentários e documentação em português.
- Cada módulo (produtos, kits, pedidos, pagamentos, auth) deve ser um módulo NestJS isolado, com testes básicos de unidade nos serviços críticos (cálculo de comissão/split).