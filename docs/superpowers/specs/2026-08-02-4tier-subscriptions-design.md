# Design: Assinaturas em 4 Níveis com Stripe

## Resumo

Completar a migração do sistema de planos para 4 níveis (**gratuito**, **bronze**, **prata**, **ouro**), alinhado às boas práticas de integração Stripe:

- Stripe como única fonte da verdade sobre quem pagou (Webhook).
- Checkout Session como porta de entrada para novos assinantes.
- Portal do Cliente para self-service (trocar plano, cancelar, atualizar cartão).
- Upgrade/downgrade com prorata via API.
- Gating de recursos no frontend conforme o plano.

O app já possui Stripe integrado (checkout, webhook, portal, rotas de status), mas está inconsistente: tipos e lógica usam 4 níveis enquanto a UI e as rotas do servidor ainda usam os planos antigos **essencial/completo**. Este design alinha tudo aos 4 níveis.

## Planos e preços

| Plano | Preço/mês | Pedidos/mês | Destaques no card |
|---|---|---|---|
| Gratuito | R$0 | 0 | Apenas cadastro do perfil |
| Bronze | R$34,90 | 10 | Até 5 fotos, 1 categoria |
| Prata | R$54,90 | 30 | Perfil completo, WhatsApp, avaliações, prioridade nas buscas |
| Ouro | R$79,90 | Ilimitado | Destaque nas pesquisas, selo verificado, estatísticas, múltiplas categorias, anúncios patrocinados |

- **Gratuito** não tem Checkout (não é assinável).
- Recursos que ainda não existem no app (fotos múltiplas, portfólio, múltiplas categorias, anúncios patrocinados) aparecem **somente na descrição dos cards** — não serão implementados nesta etapa.

### Price IDs (env)

Já configurados em `.env.example`:

- `STRIPE_GRATUITO_PRICE_ID` (reservado; não usado no checkout)
- `STRIPE_BRONZE_PRICE_ID`
- `STRIPE_PRATA_PRICE_ID`
- `STRIPE_OURO_PRICE_ID`

## Banco de dados

### Migration `migrations/20260802_4tier_subscriptions.sql`

```sql
ALTER TABLE public.professionals ADD COLUMN email TEXT;

UPDATE public.professionals SET plan = 'bronze' WHERE plan = 'essencial';
UPDATE public.professionals SET plan = 'ouro'   WHERE plan = 'completo';
```

- Coluna `email` usada como `customer_email` no Checkout.
- Dados legados `essencial`/`completo` migrados para `bronze`/`ouro`.

## Backend (`server/index.ts`)

### `POST /api/create-checkout-session`

- Entrada: `{ professionalId, plan, email }`.
- Valida `plan` ∈ `{ bronze, prata, ouro }` (gratuito rejeitado com 400).
- Mapeia `plan → priceId` via env (sem fallback antigo para essencial/completo).
- Cria sessão `mode: 'subscription'`, `payment_method_types: ['card', 'pix']`, `customer_email` real, `metadata: { professional_id, plan }`.
- Retorna `{ sessionId, url }`.

### `POST /api/change-plan`

- Entrada: `{ professionalId, targetPlan }`.
- Valida `targetPlan` ∈ `{ bronze, prata, ouro }` e que existe `stripe_subscription_id`.
- Mapeia `targetPlan → priceId` via env.
- `stripe.subscriptions.update(subId, { items: [{ price: priceId }], proration_behavior: 'create_prorations' })`.
- Atualiza `plan` na tabela após sucesso.

### `POST /api/webhook/stripe` (melhorias)

- `checkout.session.completed`: mantém — ativa plano, salva `stripe_customer_id`, `stripe_subscription_id`, `plan_expires_at`.
- `customer.subscription.created`: passa a localizar o profissional por `stripe_customer_id=eq.<customer>` (mais confiável que `stripe_subscription_id`, que ainda não existe na criação).
- `customer.subscription.updated`: além do status, **deriva o `plan` do `price.id`** da assinatura (`items.data[0].price.id`) comparando com os env IDs — assim trocas de plano feitas pelo Portal refletem no banco.
- `customer.subscription.deleted`: mantém — `plan='gratuito'`, `plan_status='canceled'`.
- `invoice.paid`: mantém — atualiza `plan_expires_at`, `plan_status='active'`.
- `invoice.payment_failed`: mantém — `plan_status='past_due'`.

### `GET /api/subscription-status/:professionalId`

- Limite por plano: **gratuito=0, bronze=10, prata=30, ouro=null (ilimitado)**.

## Frontend

### `src/types.ts`

- Adiciona `email: string` à interface `Professional`.

### `src/api/insforgeService.ts`

- Novo helper `createCheckoutSession(professionalId, plan, email): Promise<{ url: string }>` (POST em `/api/create-checkout-session`).
- `canCreateRequest`: limite passa a ser **gratuito=0, bronze=10, prata=30, ouro=∞**.

### `src/App.vue`

- **Objeto `proProfile`**: adiciona `email: ''`.
- **Formulário de perfil**: novo campo de e-mail (cadastro/edição) incluído no payload.
- **`planFeatures`**:
  - `maxRequests`: gratuito 0, bronze 10, prata 30, ouro ∞.
  - `whatsappVisible`: prata/ouro.
  - Mantém `prioritySearch` (prata/ouro), `verifiedBadge` (ouro), `advancedReports` (ouro).
- **Cards de planos** (4): Gratuito R$0, Bronze R$34,90, Prata R$54,90, Ouro R$79,90 com os destaques da tabela acima. Card vigente mostra "Plano Atual".
- **Lógica de assinatura** (`subscribePlan(plan)`):
  - Sem `proProfile.id` → alerta.
  - Plano vigente → sem ação.
  - Sem assinatura ativa (`stripe_subscription_id` ausente ou `plan_status` ≠ active) → `createCheckoutSession` + redireciona para `url`.
  - Com assinatura ativa → `changePlan` (prorata).
- **Botão "Gerenciar Assinatura"**: no card "Seu Plano Atual" quando há assinatura ativa; abre o Portal (`createPortalSession`).
- **Gating de recursos existentes**:
  - Botão "Enviar no WhatsApp" (visão do cliente) visível apenas para prata/ouro.
  - Aba "Relatório de Faturamento" apenas para ouro; para os demais, painel bloqueado com CTA de upgrade.
  - Selo verificado já gated a ouro.
  - `handleConfirmOrder`: para planos com limite finito, se atingiu o limite abre o modal de upgrade; gratuito (limite 0) abre o modal imediatamente.
- **Modal de upgrade**: generalizado — recomenda o próximo nível (gratuito→bronze, bronze→prata, prata→ouro) e usa `subscribePlan`.
- **Uso de pedidos**: barra de progresso para bronze/prata; "Pedidos ilimitados" para ouro; para gratuito, CTA de assinatura no lugar da barra.

## Arquivos a modificar

- `migrations/20260802_4tier_subscriptions.sql` (novo)
- `server/index.ts`
- `src/types.ts`
- `src/api/insforgeService.ts`
- `src/App.vue`

## Verificação

1. `npm run build` — sem erros de tipo.
2. `npm run lint` — sem erros de lint.

## Ordem de implementação

1. Migration do banco (coluna `email` + migração de dados).
2. Rotas do servidor (checkout, change-plan, webhook, status).
3. `types.ts` + `insforgeService.ts`.
4. `App.vue` (e-mail, cards, lógica de assinatura, gating, modal).
5. `npm run build` e `npm run lint`.
