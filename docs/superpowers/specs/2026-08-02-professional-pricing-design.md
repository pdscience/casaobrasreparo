# Design: Sistema de Planos para Profissionais

## Resumo

Implementar sistema de assinatura mensal com 2 planos (Essencial R$29/mês e Completo R$59/mês) usando Stripe Checkout + Webhook para pagamento recorrente.

## Planos

| Feature | Essencial (R$29/mês) | Completo (R$59/mês) |
|---|---|---|
| Análise IA + Foto | ✅ | ✅ |
| Agendamento + WhatsApp | ✅ | ✅ |
| Recibo Digital | ✅ | ✅ |
| Destaque no perfil | ✅ | ✅ |
| Relatórios básicos | ✅ | ✅ |
| Pedidos por mês | 10 | Ilimitado |
| Prioridade na busca | ❌ | ✅ |
| Selo verificado | ❌ | ✅ |
| Relatórios avançados | ❌ | ✅ |

## Database Schema

Adicionar à tabela `professionals`:

```sql
ALTER TABLE public.professionals ADD COLUMN plan TEXT NOT NULL DEFAULT 'essencial';
ALTER TABLE public.professionals ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.professionals ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE public.professionals ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE public.professionals ADD COLUMN plan_expires_at TIMESTAMPTZ;
ALTER TABLE public.professionals ADD COLUMN requests_this_month INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN requests_reset_at TIMESTAMPTZ;
```

- `plan`: `'essencial'` | `'completo'`
- `plan_status`: `'active'` | `'past_due'` | `'canceled'`
- `stripe_customer_id`: ID do cliente no Stripe
- `stripe_subscription_id`: ID da assinatura no Stripe
- `plan_expires_at`: Data de expiração (controle local)
- `requests_this_month`: Contador de pedidos no mês atual
- `requests_reset_at`: Data do último reset do contador

## Stripe Integration

### Produtos e Preços

- Criar 2 produtos no Stripe Dashboard: "Plano Essencial" e "Plano Completo"
- Criar preço recorrente mensal para cada:
  - Essencial: R$29/mês (price_essential_monthly)
  - Completo: R$59/mês (price_completo_monthly)

### Fluxo de Checkout

1. Profissional clica "Assinar Plano" → frontend chama `POST /api/create-checkout-session`
2. Backend cria sessão Stripe com `mode: 'subscription'`
3. Redireciona para Stripe Checkout
4. Após pagamento, Stripe redireciona para `success_url`
5. Webhook `checkout.session.completed` confirma e ativa plano

### Webhook Events

- `checkout.session.completed` → ativa plano, salva `stripe_customer_id` e `stripe_subscription_id`
- `customer.subscription.updated` → atualiza `plan_status`
- `customer.subscription.deleted` → cancela plano, marca `plan_status = 'canceled'`
- `invoice.payment_failed` → marca `plan_status = 'past_due'`

### Rotas do Servidor

- `POST /api/create-checkout-session` → cria sessão Stripe Checkout
- `POST /api/webhook/stripe` → recebe eventos do Stripe (raw body)
- `GET /api/subscription-status/:professionalId` → retorna status atual da assinatura

## Feature Gating

### Limite de Pedidos (Essencial)

- Quando profissional cria pedido, verificar `requests_this_month < 10`
- Se atingiu limite, mostrar modal "Limite atingido, faça upgrade"
- Reset automático: quando `requests_reset_at` é de mês anterior, resetar contador

### Recursos do Plano Completo

- `badge_verified`: Mostrar selo azul no perfil se `plan === 'completo'`
- `priority_search`: Na listagem de profissionais, ordenar por `plan` (completo primeiro)
- `advanced_reports`: Mostrar relatórios detalhados no dashboard se `plan === 'completo'`

### Funções de Verificação

```typescript
function canCreateRequest(): boolean
function hasFeature(feature: string): boolean
function getRequestLimit(): number | null // null = ilimitado
```

## UI/UX

### Tela de Seleção de Plano

- Localização: aba "Meu Perfil & Avaliações" (perfil_pro)
- Se profissional não tem plano ativo ou cancelado, mostrar cards comparativos
- Cards com features, preço, e botão "Assinar"
- Botão redireciona para Stripe Checkout

### Dashboard do Profissional

- Badge do plano atual no topo
- Se Essencial: barra de progresso "X/10 pedidos este mês"
- Se Completo: badge "Ilimitado" + selo verificado

### Perfil Público

- Selo verificado (✓ azul) ao lado do nome se plano Completo
- Indicador de prioridade na busca

### Modal de Upgrade

- Quando limite atingido, modal com comparação e botão "Fazer Upgrade"

## Arquivos a Modificar

- `migrations/` → nova migration com ALTER TABLE
- `src/types.ts` → adicionar campos de plano à interface Professional
- `server/index.ts` → novas rotas Stripe
- `src/api/insforgeService.ts` → funções de plano
- `src/App.vue` → feature gating, UI de planos
- `.env` → adicionar `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Dependências

- `stripe` (npm) → SDK do Stripe para Node.js

## Ordem de Implementação

1. Migration do banco de dados
2. Instalar SDK Stripe e configurar .env
3. Criar rotas no servidor (checkout, webhook, status)
4. Atualizar types.ts
5. Implementar feature gating no frontend
6. Criar UI de seleção de plano
7. Testar fluxo completo
