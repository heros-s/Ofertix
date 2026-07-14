---
status: accepted
date: 2026-07-12
decision-makers: Heros Dinão
---

# Implementar módulos Orders e Payments com split Asaas para checkout multi-vendedor

## Context and Problem Statement

O Ofertix é um marketplace multi-vendedor: um consumidor pode montar um carrinho com produtos de N vendedores diferentes, mas faz **um único checkout** e recebe **um único envio**. O modelo de negócio já está fechado em `AGENTS.md`: a plataforma cobra 5% de comissão sobre cada venda, e o repasse aos vendedores é feito via **Asaas Split de Pagamentos** (split nativo por `walletId` de subconta).

Hoje isso não está implementado:
- Não existe módulo `orders` nem `payments` no backend NestJS (`apps/api/src/modules/` só tem `supabase`, `vendors`, `categories`, `products`).
- O checkout do frontend (`apps/web/src/app/checkout/page.tsx`, função `handlePlaceOrder`) é **inteiramente simulado**: um `setTimeout` gera um código PIX fake e limpa o carrinho — nenhuma chamada de API é feita, nenhum pedido é persistido.
- As tabelas `orders`, `sub_orders` e `order_items` **já existem no banco Supabase real** (confirmado via `schema.md`, que reflete o schema já provisionado), com colunas prontas para o fluxo de pagamento: `orders.asaas_payment_id`, `sub_orders.commission_value`/`net_value`, e enums já criados no Postgres:
  - `order_status`: `PENDING`, `PAID`, `CANCELLED`, `REFUNDED`
  - `sub_order_status`: `PENDING`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- Existe um único precedente de integração com gateway externo: `VendorsService.onboard()` (`apps/api/src/modules/vendors/vendors.service.ts`), que chama `POST {ASAAS_BASE_URL}/accounts` via `fetch()` cru, com uma flag `SIMULATE_ASAAS=true` para permitir dev/sandbox sem conta PJ real.
- `vendors.asaas_wallet_id` só é preenchido depois desse onboarding; `ProductsService.create()` já bloqueia cadastro de produto para vendedor sem `asaas_wallet_id` ativo — ou seja, a pré-condição "vendedor precisa ter wallet antes de vender" já é reforçada a montante.

Esta ADR fecha as decisões de arquitetura necessárias para implementar o fluxo descrito na seção 4 do `AGENTS.md` ("Fluxo de Checkout Multi-Vendedor") de ponta a ponta: carrinho → criação de Pedido/SubPedidos → cobrança Asaas com split → webhook de confirmação → atualização de status.

## Decision

Implementar dois módulos NestJS isolados — `orders` e `payments` — mais um módulo de infraestrutura `asaas`, seguindo o padrão já estabelecido em `products`/`categories`/`vendors` (`*.module.ts` + `*.controller.ts` com `AuthGuard`/`RolesGuard`/`@CurrentUser()` + `*.service.ts` via `SupabaseService`, sem ORM).

### 1. Limite dos módulos: `orders` separado de `payments`

- `OrdersModule` (`apps/api/src/modules/orders/`): recebe o carrinho do consumidor autenticado, agrupa por `vendor_id`, calcula subtotal/comissão(5%)/valor líquido por vendedor, monta o payload de `split[]` e delega ao `PaymentsService` a criação da cobrança. Só grava `orders`/`sub_orders`/`order_items` no banco.
- `PaymentsModule` (`apps/api/src/modules/payments/`): expõe `POST /orders` (fachada única de checkout — ver "Contrato de API" abaixo) e `POST /payments/webhook` (recebe eventos da Asaas). Não conhece regra de comissão; só sabe criar/consultar cobranças na Asaas e traduzir eventos de webhook em atualizações de status, delegando a persistência ao `OrdersService`.
- Módulo `asaas` (`apps/api/src/modules/asaas/`): cliente HTTP compartilhado (ver item 2), sem regra de negócio.

Isso segue a diretriz explícita do `AGENTS.md` (seção 9: "cada módulo — produtos, kits, pedidos, pagamentos, auth — deve ser um módulo NestJS isolado") e mantém o cálculo de comissão/split (que precisa de teste unitário dedicado) livre de lógica HTTP/webhook.

### 2. Integração com a Asaas via `AsaasService` compartilhado

Extrair um `AsaasService` (`apps/api/src/modules/asaas/asaas.service.ts`) que centraliza:
- Base URL (`ASAAS_BASE_URL`) e header de autenticação (`access_token: ASAAS_API_KEY`).
- A flag `SIMULATE_ASAAS` (mock determinístico quando `=== 'true'`).
- Normalização de erro: qualquer resposta não-OK vira uma `AsaasApiError` (`BadRequestException` com a mensagem de `responseData.errors?.[0]?.description`).
- Métodos tipados: `createSubaccount(payload)` (reaproveitado pelo onboarding de vendedor), `createPaymentWithSplit(payload)` (`POST /v3/payments`), `getPayment(id)`.

`VendorsService.onboard()` é refatorado para usar `AsaasService.createSubaccount()` em vez do `fetch()` cru que tem hoje — isso é um refactor necessário desta ADR, não opcional, porque garante que onboarding e cobrança respeitem exatamente a mesma semântica de sandbox/mock.

### 3. Idempotência do webhook via tabela de log de eventos

Nova tabela `payment_webhook_events`:

| Coluna | Tipo | Constraint |
|---|---|---|
| `id` | `uuid` | Primary, default `gen_random_uuid()` |
| `asaas_payment_id` | `varchar` | |
| `event` | `varchar` | (ex: `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`) |
| `payload` | `jsonb` | corpo bruto recebido |
| `processed_at` | `timestamptz` | Nullable |
| `created_at` | `timestamptz` | default `now()` |

Constraint única em `(asaas_payment_id, event)`. O handler do webhook tenta inserir o evento **antes** de processar; em caso de violação de unicidade (código Postgres `23505`), retorna 200 imediatamente sem reprocessar. Isso dá trilha de auditoria (essencial para disputas de pagamento) e resolve idempotência mesmo sob reentrega concorrente da Asaas.

### 4. Criação de pedido: falha síncrona (sem pedido órfão sem cobrança)

O fluxo de `POST /orders` é uma única operação síncrona:
1. Carrega os itens do carrinho (enviados pelo frontend) e valida estoque/preço atual no servidor.
2. Agrupa por `vendor_id`, calcula `gross_value`, `commission_value` (5%, arredondado a 2 casas), `net_value` por vendedor.
3. Monta `split[]` da Asaas com `percentualValue` por `walletId` (vendedor) — **a wallet da Ofertix nunca entra no array**; o que não é distribuído (comissão + frete) fica automaticamente com a conta Ofertix.
4. Chama `AsaasService.createPaymentWithSplit()`. Só se a resposta for OK, persiste `orders` (status `PENDING`) + `sub_orders` (status `PENDING`) + `order_items` numa sequência de inserts, gravando `orders.asaas_payment_id`.
5. Se a Asaas falhar, nada é persistido; a API retorna erro 4xx/5xx e o frontend exibe mensagem para tentar novamente.

**Assunção documentada sobre frete** (AGENTS.md pede que a lógica de rateio seja documentada mesmo que não exista divisão real): o `shipping_value` do `Pedido` **não entra no split** — fica implicitamente com a conta Ofertix, igual à comissão. Não há rateio de frete entre vendedores nesta versão; isso é consistente com "o que não é destinado a nenhum walletId fica com a Ofertix" (AGENTS.md §4.4).

### 5. Autenticação do webhook via token estático

`POST /payments/webhook` é uma rota pública (Asaas não envia um JWT Supabase), mas exige o header `asaas-access-token` igual ao valor configurado em `ASAAS_WEBHOOK_TOKEN`. Requisição sem o header ou com valor divergente recebe `401` antes de qualquer leitura do payload. Esse token é configurado manualmente no painel da Asaas (Configurações → Webhooks) e não é gerado por código.

### 6. Introduzir Supabase CLI e `supabase/migrations/`

Não existe hoje controle de migração de schema no repositório (`schema.md` é gerado a partir do banco real, não o contrário). Esta ADR introduz `supabase/migrations/` como convenção de versionamento de schema daqui em diante:
- `supabase` adicionado como `devDependency` em `apps/api/package.json`.
- Primeira migration: `supabase/migrations/20260712120000_create_payment_webhook_events.sql`, criando a tabela do item 3.
- `supabase/config.toml` mínimo, com `project_id` deixado como placeholder (preenchido no `supabase link` local de cada dev/CI — ver Implementation Plan).

## Non-Goals

Herdados de `AGENTS.md` §8 (Fora do Escopo do MVP) e confirmados nesta ADR:
- Suporte a gateways de pagamento além da Asaas.
- Reembolso parcial automático — a Asaas não reverte split parcial sozinha, e o tratamento manual desse caso fica fora desta entrega (apenas estorno total, que a Asaas já reverte automaticamente, é coberto).
- Antecipação de recebíveis para vendedores.
- Cupons de desconto.
- Rateio real de frete entre vendedores no split (ver item 4 — frete fica implicitamente com a Ofertix).
- Fila/job assíncrono de reconciliação de pagamento — a criação é síncrona (item 4); não há retry automático em background nesta versão.

## Consequences

* Good, porque `orders` e `payments` isolados permitem testar cálculo de comissão/split sem mockar HTTP nem banco de pagamento.
* Good, porque a tabela `payment_webhook_events` dá auditoria real de todo evento recebido da Asaas — necessário no dia em que um vendedor ou consumidor disputar o status de um pagamento.
* Good, porque extrair `AsaasService` elimina divergência de comportamento de sandbox (`SIMULATE_ASAAS`) entre onboarding de vendedor e criação de cobrança.
* Good, porque a criação síncrona garante que todo `order` persistido tem uma cobrança Asaas real associada (nunca existe Pedido "fantasma" no banco do Ofertix).
* Bad, porque refatorar `VendorsService.onboard()` para usar o `AsaasService` é escopo adicional sobre código já funcionando — risco de regressão no onboarding de vendedor, mitigado por manter os testes/fluxo de `SIMULATE_ASAAS` intactos.
* Bad, porque introduzir Supabase CLI é uma ferramenta nova no projeto (não instalada hoje) — exige que cada dev rode `supabase login`/`supabase link` localmente antes de aplicar migrations; documentado no Implementation Plan e na seção de configuração externa.
* Bad, porque a criação síncrona pode deixar o consumidor esperando alguns segundos a mais na tela de checkout (chamada à Asaas é bloqueante) — aceitável no MVP porque o volume de pedidos simultâneos é baixo.
* Bad, porque ainda existe uma janela residual (não eliminável sem um padrão saga/outbox): se a Asaas confirmar a cobrança mas a gravação subsequente no Supabase falhar, sobra uma cobrança na Asaas sem `order` correspondente no Ofertix. Mitigação: logar como erro crítico (`Logger.error` com o `asaas_payment_id` retornado) para reconciliação manual — mesmo padrão que o MVP já aceita para estorno parcial.

## Implementation Plan

* **Affected paths**:
  - `apps/api/src/modules/asaas/asaas.module.ts`, `asaas.service.ts`, `asaas.service.spec.ts` — novo.
  - `apps/api/src/modules/orders/orders.module.ts`, `orders.controller.ts`, `orders.service.ts`, `orders.service.spec.ts`, `dto/create-order.dto.ts` — novo.
  - `apps/api/src/modules/payments/payments.module.ts`, `payments.controller.ts`, `payments.service.ts`, `payments.service.spec.ts`, `dto/asaas-webhook.dto.ts` — novo.
  - `apps/api/src/modules/vendors/vendors.service.ts` — refatorado para injetar e utilizar `AsaasService`.
  - `apps/api/src/app.module.ts` — registrar `AsaasModule`, `OrdersModule`, `PaymentsModule`.
  - `apps/api/package.json` — adicionar `supabase` como devDependency.
  - `supabase/config.toml`, `supabase/migrations/20260712120000_create_payment_webhook_events.sql` — novo.
  - `.env.example` — adicionar `ASAAS_WEBHOOK_TOKEN`.
  - `apps/web/src/app/checkout/page.tsx` — `handlePlaceOrder` passa a chamar `POST {NEXT_PUBLIC_API_URL}/orders` com o carrinho e o método de pagamento, em vez do `setTimeout` mockado.
* **Dependencies**: `supabase` (CLI, devDependency, `apps/api/package.json`) — nenhuma dependência de runtime nova (mantém `fetch()` nativo, sem SDK da Asaas).
* **Patterns to follow**:
  - Estrutura de módulo idêntica a `apps/api/src/modules/products/` (module/controller/service/dto).
  - Guards: `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('CONSUMER')` em `POST /orders`; webhook **sem** `AuthGuard` (usa validação de token próprio, item 5).
  - Erros de negócio como `BadRequestException`/`ForbiddenException`/`NotFoundException` com mensagem em português, `Logger` por serviço antes de lançar — igual a `ProductsService`/`VendorsService`.
  - Acesso a dados sempre via `SupabaseService.getClient()`, nunca um client novo.
* **Patterns to avoid**:
  - Não instanciar um `fetch()` para a Asaas fora do `AsaasService`.
  - Não persistir `orders`/`sub_orders` antes de confirmar sucesso da chamada à Asaas (item 4).
  - Não reimplementar validação de JWT no webhook — ele usa o token estático (item 5), não `AuthGuard`.
  - Não misturar `percentualValue` e `fixedValue` no mesmo `split[]` sem validar a soma contra o valor líquido total (regra explícita do AGENTS.md — a Asaas rejeita a requisição).
* **Configuration changes**:
  - `.env` (não commitado): `ASAAS_WEBHOOK_TOKEN` (novo).
  - Ver seção "More Information" abaixo para os passos fora do repositório.

### Verification

- [ ] Teste unitário de `OrdersService` cobre: split só percentual, arredondamento de comissão a 2 casas, percentual do vendedor a até 4 casas, carrinho com 1 vendedor vs. N vendedores.
- [ ] Teste unitário de `PaymentsService` cobre: primeira chegada de um evento de webhook processa e atualiza status; segunda chegada do mesmo `(asaas_payment_id, event)` é ignorada (idempotência) sem lançar erro.
- [ ] Teste manual: vendedor sem `asaas_wallet_id` não pode aparecer no `split[]` — carrinho com produto desse vendedor deve ser rejeitado no `POST /orders` com mensagem clara.
- [ ] Teste manual ponta a ponta com `SIMULATE_ASAAS=true`: carrinho multi-vendedor → `POST /orders` retorna `asaas_payment_id` mock → `POST /payments/webhook` simulando `PAYMENT_CONFIRMED` → `orders.status = PAID` e todos os `sub_orders.status = PAID`.
- [ ] `POST /payments/webhook` sem header `asaas-access-token` (ou com valor errado) retorna `401` e não altera nenhum status.
- [ ] `supabase db push` (ou execução manual do SQL da migration) cria `payment_webhook_events` sem erro em um projeto Supabase de sandbox.
- [ ] Frontend: `checkout/page.tsx` chama a API real, exibe erro de forma amigável se `POST /orders` falhar, e só mostra a tela de sucesso após resposta 2xx.

## Alternatives Considered

* **Módulo único `payments`** cuidando de pedido e pagamento juntos: rejeitado por contrariar a diretriz explícita do AGENTS.md de módulos isolados e por misturar cálculo de comissão (que precisa de teste unitário dedicado) com lógica de webhook/HTTP.
* **`fetch()` cru duplicado em cada módulo** (sem `AsaasService`): rejeitado porque duplicaria URL base, headers e a flag `SIMULATE_ASAAS` entre `vendors` e `payments`, com risco real de os dois divergirem no comportamento de sandbox — inaceitável em um fluxo que envolve dinheiro de terceiros.
* **Checar status atual antes de atualizar** (sem tabela de log de webhook): rejeitado por não deixar trilha de auditoria do que a Asaas realmente enviou, dificultando resolver disputas de pagamento.
* **Criação otimista + reconciliação assíncrona** do pedido: rejeitado para o MVP por adicionar complexidade de fila/retry que não é necessária dado o volume esperado, e por poder deixar um Pedido "visível" ao cliente sem cobrança real por trás em caso de falha.
* **SQL avulso sem Supabase CLI**: considerado mais simples, mas descartado a favor de introduzir `supabase/migrations/` agora, para que esta seja a primeira e não a última mudança de schema versionada do projeto.

## More Information

**Configuração Externa (fora do código, feita manualmente)** — necessária para a feature funcionar em qualquer ambiente:

1. **Variáveis de ambiente** (`.env`, não commitado): preencher `ASAAS_API_KEY` (chave da conta sandbox/produção Ofertix, não a do vendedor) e definir `ASAAS_WEBHOOK_TOKEN` (qualquer string aleatória forte gerada por você, ex.: `openssl rand -hex 32`).
2. **Painel da Asaas** (sandbox: https://sandbox.asaas.com): em Configurações → Integrações → Webhooks, cadastrar a URL `https://<seu-backend>/payments/webhook`, selecionar os eventos `PAYMENT_RECEIVED` e `PAYMENT_CONFIRMED`, e definir o **mesmo** valor de `ASAAS_WEBHOOK_TOKEN` no campo de token/access token do webhook.
3. **Supabase CLI**: instalar (`npm install` já traz como devDependency, ou `npx supabase --version` para confirmar), rodar `supabase login`, depois `supabase link --project-ref <ref-do-projeto>` (o ref aparece na URL do dashboard do projeto) e por fim `supabase db push` para aplicar a migration de `payment_webhook_events` no banco real.
4. **Cada vendedor** precisa concluir o onboarding (`POST /vendors/onboarding`) antes que seus produtos possam entrar num checkout — isso já existe, mas vale confirmar que `SIMULATE_ASAAS` está com o valor desejado (`true` em sandbox sem conta PJ real, `false` quando for testar com a API real da Asaas).

Relacionado: `AGENTS.md` (seção 4, "Fluxo de Checkout Multi-Vendedor"), `docs/plano_vitrine_carrinho.md` (marca checkout/pagamento como "Fase 2"), `schema.md` (schema real das tabelas envolvidas).
