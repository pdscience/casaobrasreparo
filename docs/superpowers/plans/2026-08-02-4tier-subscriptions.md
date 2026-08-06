# 4-Tier Subscriptions (Stripe) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the migration of the plan system to 4 tiers (gratuito, bronze, prata, ouro), aligning the UI, server routes and webhook with the Stripe best-practices advice.

**Architecture:** Stripe Checkout is the entry point for new subscribers (webhook `checkout.session.completed` activates the plan in the DB); the Customer Portal and `/api/change-plan` handle self-service and plan switches for existing subscribers; the frontend gates existing features (WhatsApp button, reports tab, verified badge, request limits) by tier.

**Tech Stack:** Stripe SDK (Node.js), Express.js (`server/index.ts`), Vue 3 + TailwindCSS (Vite), InsForge (PostgreSQL) via `server/index.ts` `insforgeQuery` helper and `src/lib/insforge.ts`.

## Global Constraints

- Database: InsForge (PostgreSQL). Tables already have `plan`, `plan_status`, `stripe_customer_id`, `stripe_subscription_id`, `plan_expires_at`, `requests_this_month`, `requests_reset_at`.
- Plan values (verbatim from spec): `'gratuito' | 'bronze' | 'prata' | 'ouro'`. Status values: `'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'`.
- Prices: Gratuito R$0, Bronze R$34,90, Prata R$54,90, Ouro R$79,90.
- Request limits: **gratuito=0, bronze=10, prata=30, ouro=∞**.
- Price IDs (env, already in `.env.example`): `STRIPE_BRONZE_PRICE_ID`, `STRIPE_PRATA_PRICE_ID`, `STRIPE_OURO_PRICE_ID`. `STRIPE_GRATUITO_PRICE_ID` is reserved and never used for checkout.
- **Checkout is `mode: 'subscription'`, so `payment_method_types` must remain `['card']`. PIX/boleto do NOT support recurring subscriptions in Stripe; Google Pay/Apple Pay are offered automatically as card wallets.**
- Gratuito is NOT subscribable (rejected by checkout with 400).
- Feature gating (verbatim from spec):
  - `whatsappVisible`: prata/ouro
  - `prioritySearch`: prata/ouro
  - `verifiedBadge`: ouro
  - `advancedReports` (aba faturamento): ouro
- New features described only in plan-card UI, not implemented: fotos múltiplas, portfólio, múltiplas categorias, anúncios patrocinados.
- Do NOT add code comments.
- Commit after every task.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `migrations/20260802_4tier_subscriptions.sql` (new) | Add `email` column + migrate legacy plan values |
| `server/index.ts` | Price-ID map, checkout, change-plan, webhook, subscription-status |
| `src/types.ts` | Add `email` to `Professional` |
| `src/api/insforgeService.ts` | `createCheckoutSession` helper, request-limit update |
| `src/App.vue` | Email field, plan cards, subscribe logic, gating, upgrade modal |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/20260802_4tier_subscriptions.sql`

**Interfaces:**
- Consumes: existing `professionals` table with `plan` column (default `'gratuito'`)
- Produces: `email TEXT` column on `professionals`; legacy `essencial`/`completo` rows remapped to `bronze`/`ouro`

- [ ] **Step 1: Create the migration file**

`migrations/20260802_4tier_subscriptions.sql`:

```sql
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.professionals SET plan = 'bronze' WHERE plan = 'essencial';
UPDATE public.professionals SET plan = 'ouro'   WHERE plan = 'completo';
```

- [ ] **Step 2: Apply the migration**

Run: `npx @insforge/cli db push migrations/20260802_4tier_subscriptions.sql`
Expected: command reports success. If the CLI is not authenticated in this environment, apply the same SQL manually in the InsForge dashboard SQL editor and note it in the task report.

- [ ] **Step 3: Commit**

```bash
git add migrations/20260802_4tier_subscriptions.sql
git commit -m "feat: add email column and migrate legacy plan values to 4 tiers"
```

---

## Task 2: Server Stripe Routes (`server/index.ts`)

**Files:**
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: env vars `STRIPE_BRONZE_PRICE_ID`, `STRIPE_PRATA_PRICE_ID`, `STRIPE_OURO_PRICE_ID`; existing `insforgeQuery` helper (lines 15-34)
- Produces:
  - `POST /api/create-checkout-session` — body `{ professionalId, plan, email }` → `{ sessionId, url }`
  - `POST /api/change-plan` — body `{ professionalId, targetPlan }` → `{ subscriptionId, status }`
  - `POST /api/webhook/stripe` — event-driven DB updates
  - `GET /api/subscription-status/:professionalId` → `{ plan, status, requestsThisMonth, requestLimit, planExpiresAt, stripeCustomerId }`

- [ ] **Step 1: Add the price map constants after the Stripe client (after line 11)**

```typescript
const PAID_PLANS = ['bronze', 'prata', 'ouro'] as const
const PRICE_IDS: Record<string, string | undefined> = {
  bronze: process.env.STRIPE_BRONZE_PRICE_ID,
  prata: process.env.STRIPE_PRATA_PRICE_ID,
  ouro: process.env.STRIPE_OURO_PRICE_ID,
}
```

- [ ] **Step 2: Update `POST /api/create-checkout-session` (currently lines 174-194)**

Replace the body of the route with:

```typescript
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { professionalId, plan, email } = req.body
    if (!professionalId || !plan || !email) return res.status(400).json({ error: 'Missing required fields' })
    if (!(PAID_PLANS as readonly string[]).includes(plan)) return res.status(400).json({ error: 'Invalid plan' })
    const priceId = PRICE_IDS[plan]
    if (!priceId) return res.status(500).json({ error: 'Price ID not configured' })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { professional_id: professionalId, plan },
      success_url: `${req.headers.origin || 'http://localhost:5173'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/?canceled=true`,
    })
    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Erro ao criar sessao de checkout:', error)
    res.status(500).json({ error: 'Erro ao criar sessao de checkout' })
  }
})
```

- [ ] **Step 3: Update `POST /api/change-plan` (currently lines 238-258)**

Replace the route body with:

```typescript
app.post('/api/change-plan', async (req, res) => {
  try {
    const { professionalId, targetPlan } = req.body
    if (!professionalId || !targetPlan) return res.status(400).json({ error: 'Missing required fields' })
    if (!(PAID_PLANS as readonly string[]).includes(targetPlan)) return res.status(400).json({ error: 'Invalid plan' })
    const data = await insforgeQuery('professionals', 'GET', undefined, `id=eq.${professionalId}&select=stripe_subscription_id,plan`)
    if (!data || data.length === 0) return res.status(404).json({ error: 'Professional not found' })
    const pro = data[0]
    if (!pro.stripe_subscription_id) return res.status(400).json({ error: 'No active subscription found' })
    const priceId = PRICE_IDS[targetPlan]
    if (!priceId) return res.status(500).json({ error: 'Price ID not configured' })
    const subscription = await stripe.subscriptions.update(pro.stripe_subscription_id, {
      items: [{ price: priceId }],
      proration_behavior: 'create_prorations',
    })
    await insforgeQuery('professionals', 'PATCH', { plan: targetPlan }, `id=eq.${professionalId}`)
    res.json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (error) {
    console.error('Erro ao alterar plano:', error)
    res.status(500).json({ error: 'Erro ao alterar plano' })
  }
})
```

- [ ] **Step 4: Update `customer.subscription.created` webhook handler (currently lines 64-75)**

Change the PATCH filter from `stripe_subscription_id=eq.${subscription.id}` to `stripe_customer_id=eq.${subscription.customer}` so it matches professionals whose checkout session has not been processed yet:

```typescript
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription
    try {
      await insforgeQuery('professionals', 'PATCH', {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      }, `stripe_customer_id=eq.${subscription.customer}`)
    } catch (error) {
      console.error('Erro ao atualizar plano na criacao:', error)
    }
  }
```

- [ ] **Step 5: Update `customer.subscription.updated` webhook handler (currently lines 76-86)**

Derive the `plan` from the subscription's price ID so plan switches made in the Customer Portal propagate to the DB:

```typescript
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    try {
      const priceId = subscription.items.data[0]?.price?.id
      let plan: string | undefined
      if (priceId === process.env.STRIPE_OURO_PRICE_ID) plan = 'ouro'
      else if (priceId === process.env.STRIPE_PRATA_PRICE_ID) plan = 'prata'
      else if (priceId === process.env.STRIPE_BRONZE_PRICE_ID) plan = 'bronze'
      const updates: Record<string, unknown> = {
        plan_status: subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'canceled',
        plan_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
      }
      if (plan) updates.plan = plan
      await insforgeQuery('professionals', 'PATCH', updates, `stripe_subscription_id=eq.${subscription.id}`)
    } catch (error) {
      console.error('Erro ao atualizar plano na atualizacao:', error)
    }
  }
```

- [ ] **Step 6: Update request limits in `GET /api/subscription-status/:professionalId` (currently line 209)**

Change the `requestLimit` expression from the `completo/prata/bronze` ternary to:

```typescript
      requestLimit: pro.plan === 'ouro' ? null : pro.plan === 'prata' ? 30 : pro.plan === 'bronze' ? 10 : 0,
```

- [ ] **Step 7: Verify the server boots**

Run: `timeout 6 npx tsx server/index.ts`
Expected: logs `Servidor de analise rodando na porta 3001` before being killed by the timeout (exit code 124 is expected).

- [ ] **Step 8: Commit**

```bash
git add server/index.ts
git commit -m "feat: align Stripe routes and webhook with 4-tier plans"
```

---

## Task 3: Types and API Helper

**Files:**
- Modify: `src/types.ts:14-31`
- Modify: `src/api/insforgeService.ts`

**Interfaces:**
- Consumes: `Professional` interface (Task 3 modifies it), existing `insforge` client
- Produces:
  - `Professional.email: string`
  - `createCheckoutSession(professionalId: string, plan: string, email: string): Promise<{ url: string }>`
  - `canCreateRequest` now returns `limit` of `0` for gratuito, `10` for bronze, `30` for prata, `Infinity` for ouro

- [ ] **Step 1: Add `email` to the `Professional` interface in `src/types.ts`**

Insert `email: string` between `phone` and `category` (line 18 area):

```typescript
export interface Professional {
  id: string
  name: string
  category: string
  email: string
  phone: string
  // ...rest unchanged
}
```

- [ ] **Step 2: Update `canCreateRequest` in `src/api/insforgeService.ts` (currently line 190)**

Replace the limit expression with:

```typescript
  const limit = pro.plan === 'ouro' ? Infinity : pro.plan === 'prata' ? 30 : pro.plan === 'bronze' ? 10 : 0
```

- [ ] **Step 3: Add `createCheckoutSession` at the end of `src/api/insforgeService.ts` (after `getSubscriptionStatus`, line 227)**

```typescript
export async function createCheckoutSession(professionalId: string, plan: string, email: string): Promise<{ url: string }> {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professionalId, plan, email }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Erro ao criar sessao de checkout')
  }
  return response.json()
}
```

- [ ] **Step 4: Run build to verify types**

Run: `npm run build`
Expected: build succeeds (vite does not typecheck server, only `src`).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/api/insforgeService.ts
git commit -m "feat: add email to professional and 4-tier checkout helper"
```

---

## Task 4: App.vue Script Changes

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `createCheckoutSession`, `changePlan`, `createPortalSession`, `canCreateRequest` from `src/api/insforgeService`
- Produces: `PLANS`, `PLAN_LABELS`, `PLAN_PRICES`, `subscribePlan`, `handleOpenPortal`, `upgradeRecommendation`, email profile state — all consumed by Task 5's template

- [ ] **Step 1: Add `createCheckoutSession` to the import on line 37**

```typescript
import { analyzeWithAI, getServiceRequests, createServiceRequest, updateServiceRequest, getProfessionals, createProfessional, updateProfessional, uploadProfessionalAvatar, canCreateRequest, createPortalSession, changePlan, getSubscriptionStatus, createCheckoutSession } from './api/insforgeService'
```

- [ ] **Step 2: Add `Lock` to the lucide-vue-next imports (around line 35, after `Menu`)**

```typescript
  Menu,
  Lock,
} from 'lucide-vue-next'
```

- [ ] **Step 3: Add `email` to the `proProfile` default (line 55-72 block)**

Add `email: '',` between `category: '',` and `phone: '',`.

- [ ] **Step 4: Add `editProEmail` ref next to the other edit refs (around line 101, after `editProPhone`)**

```typescript
const editProEmail = ref<string>('')
```

- [ ] **Step 5: Sync email in `openProfileEditor` (around line 135)**

Add after `editProPhone.value = proProfile.value.phone`:

```typescript
  editProEmail.value = proProfile.value.email || ''
```

- [ ] **Step 6: Add email to `handleSaveProfile` payload (around line 172)**

Add `email: editProEmail.value,` after `phone: editProPhone.value,`.

- [ ] **Step 7: Replace `handleUpgradePlan` and `handleChangePlan` (currently lines 295-320) with `subscribePlan` and `handleOpenPortal`**

Delete both functions entirely and add:

```typescript
async function subscribePlan(targetPlan: string) {
  try {
    if (!proProfile.value.id) {
      alert('Você precisa estar logado como profissional para assinar um plano.')
      return
    }
    if (proProfile.value.plan === targetPlan) return
    const hasActiveSubscription = !!proProfile.value.stripe_subscription_id && proProfile.value.plan_status === 'active'
    if (hasActiveSubscription) {
      await changePlan(proProfile.value.id, targetPlan)
      await loadData()
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proProfile.value.email)) {
      alert('Cadastre um e-mail válido no seu perfil para assinar o plano.')
      activeTab.value = 'perfil_pro'
      return
    }
    const { url } = await createCheckoutSession(proProfile.value.id, targetPlan, proProfile.value.email)
    if (url) window.location.href = url
  } catch (err) {
    console.error('Erro ao assinar plano:', err)
    alert('Erro ao assinar plano. Tente novamente.')
  }
}

async function handleOpenPortal() {
  try {
    if (!proProfile.value.id) return
    const { url } = await createPortalSession(proProfile.value.id)
    if (url) window.location.href = url
  } catch (err) {
    console.error('Erro ao abrir portal de assinatura:', err)
    alert('Erro ao abrir o portal de gerenciamento de assinatura.')
  }
}
```

- [ ] **Step 8: Update `handleConfirmOrder` request-limit gate (currently line 200)**

Replace the condition `proProfile.value.plan === 'essencial'` with:

```typescript
  if (proProfile.value.id && proProfile.value.plan !== 'ouro') {
```

- [ ] **Step 9: Update `planFeatures` computed (currently lines 459-471)**

Replace the whole computed with:

```typescript
const planFeatures = computed(() => {
  const plan = proProfile.value.plan
  return {
    maxRequests: plan === 'ouro' ? Infinity : plan === 'prata' ? 30 : plan === 'bronze' ? 10 : 0,
    prioritySearch: plan === 'ouro' || plan === 'prata',
    verifiedBadge: plan === 'ouro',
    advancedReports: plan === 'ouro',
    whatsappVisible: plan === 'prata' || plan === 'ouro',
    isGratuito: plan === 'gratuito',
    isBronze: plan === 'bronze',
    isPrata: plan === 'prata',
    isOuro: plan === 'ouro',
  }
})
```

- [ ] **Step 10: Add `PLANS`, `PLAN_LABELS`, `PLAN_PRICES` and `upgradeRecommendation` after `hasFeature` (after line 487)**

```typescript
const PLANS = [
  { id: 'gratuito', name: 'Gratuito', price: 'R$0', icon: User, tagline: 'Apenas cadastro do perfil', features: ['Cadastro profissional gratuito', 'Perfil público básico'], cta: 'Começar Grátis' },
  { id: 'bronze', name: 'Bronze', price: 'R$34,90', icon: ShieldCheck, tagline: 'Para começar a atender', features: ['10 pedidos por mês', 'Até 5 fotos', '1 categoria de serviço'], cta: 'Assinar Bronze' },
  { id: 'prata', name: 'Prata', price: 'R$54,90', icon: Zap, tagline: 'Para crescer com visibilidade', features: ['30 pedidos por mês', 'Perfil completo', 'WhatsApp no perfil', 'Avaliações', 'Prioridade nas buscas'], cta: 'Assinar Prata' },
  { id: 'ouro', name: 'Ouro', price: 'R$79,90', icon: Sparkles, tagline: 'O máximo para dominar a região', features: ['Pedidos ilimitados', 'Destaque nas pesquisas', 'Selo verificado', 'Estatísticas avançadas', 'Múltiplas categorias', 'Anúncios patrocinados'], cta: 'Assinar Ouro' },
]

const PLAN_LABELS: Record<string, string> = {
  gratuito: 'Gratuito',
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
}

const PLAN_PRICES: Record<string, string> = {
  gratuito: 'R$0',
  bronze: 'R$34,90',
  prata: 'R$54,90',
  ouro: 'R$79,90',
}

const upgradeRecommendation = computed(() => {
  const current = proProfile.value.plan
  const order: Record<string, number> = { gratuito: 0, bronze: 1, prata: 2, ouro: 3 }
  const next = PLANS.find((p) => order[p.id] === order[current] + 1)
  if (!next) return null
  return { plan: next.id, label: next.name, price: next.price, features: next.features }
})
```

- [ ] **Step 11: Commit**

```bash
git add src/App.vue
git commit -m "feat: add 4-tier subscribe logic and email profile state"
```

---

## Task 5: App.vue Template Changes

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `PLANS`, `PLAN_LABELS`, `PLAN_PRICES`, `upgradeRecommendation`, `subscribePlan`, `handleOpenPortal`, `hasFeature`, `requestUsage`, `editProEmail` from Task 4

- [ ] **Step 1: Add email field to the profile edit form (inside the grid at line 1931)**

Insert this block after the "Categoria" select (closing `</select>` around line 1949) and before the "WhatsApp de Atendimento" div:

```html
            <div>
              <label class="text-slate-400">E-mail para Assinatura:</label>
              <input
                type="email"
                v-model="editProEmail"
                placeholder="voce@email.com"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
            </div>
```

- [ ] **Step 2: Gate the client-facing WhatsApp button (around line 1393)**

Add `v-if="hasFeature('whatsappVisible')"` to the WhatsApp `<a>` element:

```html
                <a
                  v-if="hasFeature('whatsappVisible')"
                  :href="getWhatsAppLink(proProfile.phone, `Olá ${proProfile.name}! Gostaria de confirmar informações sobre o pedido #${req.id} de ${req.category}.`)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-2 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare class="w-4 h-4" />
                  Enviar no WhatsApp
                </a>
```

- [ ] **Step 3: Gate the faturamento tab content (wrap the section opened at line 1604, closed at line 1668)**

Change line 1604 to:

```html
      <div v-if="userMode === 'pro' && activeTab === 'faturamento'" class="space-y-6 animate-in fade-in duration-300">
        <!-- GATED: Relatórios avançados apenas no plano Ouro -->
        <template v-if="hasFeature('advancedReports')">
```

Add the locked fallback right before the closing `</div>` at line 1668:

```html
        </template>
        <div v-else class="bg-slate-900 rounded-2xl p-10 border border-slate-800 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
            <Lock class="w-7 h-7" />
          </div>
          <h2 class="text-xl font-bold text-white">Relatórios disponíveis no plano Ouro</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto">
            Acompanhe faturamento mensal, ticket médio e a evolução dos seus serviços com o plano Ouro.
          </p>
          <button
            @click="subscribePlan('ouro')"
            class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all"
          >
            Assinar Ouro
          </button>
        </div>
      </div>
```

- [ ] **Step 4: Replace the entire plan selection section (currently lines 1755-1914)**

Delete everything from `<!-- PLAN SELECTION SECTION -->` through the closing `</div>` of the comparison cards grid (before `<!-- EDIT PROFILE FORM ... -->` at line 1916), and replace with:

```html
        <!-- PLAN SELECTION SECTION -->
        <div v-if="proProfile.id && !isEditingProfile" class="space-y-6">
          <!-- Current Plan Badge -->
          <div class="bg-slate-900/80 rounded-2xl p-6 border border-slate-800">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-white">Seu Plano Atual</h3>
                <p class="text-sm text-slate-400 mt-1">
                  {{ PLAN_LABELS[proProfile.plan] }}
                </p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-extrabold text-amber-400">
                  {{ PLAN_PRICES[proProfile.plan] }}
                </span>
                <span class="text-slate-400 text-sm">/mês</span>
              </div>
            </div>

            <!-- Request Usage (plans with finite limits) -->
            <div v-if="proProfile.plan === 'bronze' || proProfile.plan === 'prata'" class="mt-4">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-slate-400">Pedidos este mês</span>
                <span class="text-white font-medium">
                  {{ requestUsage.current }}/{{ requestUsage.limit }}
                </span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="requestUsage.isAtLimit ? 'bg-red-500' : requestUsage.isNearLimit ? 'bg-amber-500' : 'bg-green-500'"
                  :style="{ width: Math.min(requestUsage.percentage, 100) + '%' }"
                ></div>
              </div>
            </div>

            <div v-else-if="proProfile.plan === 'ouro'" class="mt-4">
              <span class="inline-flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle2 class="w-4 h-4" />
                Pedidos ilimitados
              </span>
            </div>

            <div v-else class="mt-4">
              <span class="inline-flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Sparkles class="w-4 h-4" />
                Assine um plano para começar a receber pedidos
              </span>
            </div>

            <!-- Manage Subscription (Portal) -->
            <button
              v-if="proProfile.stripe_subscription_id && proProfile.plan_status === 'active'"
              @click="handleOpenPortal"
              class="mt-4 w-full py-3 px-4 bg-slate-800 text-amber-400 border border-amber-500/30 font-bold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <SlidersHorizontal class="w-5 h-5" />
              Gerenciar Assinatura
            </button>
          </div>

          <!-- Plan Comparison Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="p in PLANS"
              :key="p.id"
              :class="[
                'bg-slate-900/80 rounded-2xl p-6 border-2 transition-all flex flex-col',
                proProfile.plan === p.id ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-800'
              ]"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <component :is="p.icon" class="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 class="font-bold text-white">{{ p.name }}</h4>
                  <p class="text-amber-400 font-extrabold">{{ p.price }}<span class="text-xs text-slate-400 font-medium">/mês</span></p>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 mb-3">{{ p.tagline }}</p>
              <ul class="space-y-2 flex-1">
                <li v-for="feature in p.features" :key="feature" class="flex items-center gap-2">
                  <Check class="w-4 h-4 text-green-400 shrink-0" />
                  <span class="text-xs text-slate-300">{{ feature }}</span>
                </li>
              </ul>
              <div v-if="proProfile.plan === p.id" class="mt-4 w-full py-2 px-4 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-center text-sm">
                Plano Atual
              </div>
              <button
                v-else-if="p.id !== 'gratuito'"
                @click="subscribePlan(p.id)"
                class="mt-4 w-full py-2 px-4 bg-slate-800 text-amber-400 border border-amber-500/30 font-bold rounded-xl hover:bg-slate-700 transition-all"
              >
                {{ p.cta }}
              </button>
              <div v-else class="mt-4 w-full py-2 px-4 bg-slate-950 text-slate-500 border border-slate-800 rounded-xl text-center text-sm">
                Cancele pelo Portal para voltar ao Gratuito
              </div>
            </div>
          </div>
        </div>
```

- [ ] **Step 5: Replace the upgrade modal (currently lines 1995-2052)**

Delete the whole `<!-- UPGRADE MODAL -->` block and replace with:

```html
    <!-- UPGRADE MODAL -->
    <div v-if="showUpgradeModal && upgradeRecommendation" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showUpgradeModal = false"></div>
      <div class="relative bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl max-w-md w-full space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-extrabold text-white">Fazer Upgrade</h3>
          <button @click="showUpgradeModal = false" class="text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="bg-gradient-to-br from-amber-500/10 to-yellow-400/10 rounded-2xl p-6 border border-amber-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Sparkles class="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 class="font-bold text-white text-lg">Plano {{ upgradeRecommendation.label }}</h4>
              <p class="text-amber-400 font-extrabold text-xl">{{ upgradeRecommendation.price }}<span class="text-sm text-slate-400 font-medium">/mês</span></p>
            </div>
          </div>
          <ul class="space-y-2 text-sm text-slate-300">
            <li v-for="feature in upgradeRecommendation.features" :key="feature" class="flex items-center gap-2">
              <Check class="w-4 h-4 text-green-400" />
              {{ feature }}
            </li>
          </ul>
        </div>

        <div class="flex gap-3">
          <button
            @click="showUpgradeModal = false"
            class="flex-1 py-3 px-4 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all"
          >
            Cancelar
          </button>
          <button
            @click="subscribePlan(upgradeRecommendation.plan); showUpgradeModal = false"
            class="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-2"
          >
            <Zap class="w-5 h-5" />
            Assinar Agora
          </button>
        </div>
      </div>
    </div>
```

- [ ] **Step 6: Commit**

```bash
git add src/App.vue
git commit -m "feat: add 4-tier plan cards, email field, and feature gating UI"
```

---

## Task 6: Final Verification

**Files:**
- All modified files

**Interfaces:**
- Consumes: Tasks 1-5

- [ ] **Step 1: Run build**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no lint errors. Fix any reported issues (unused imports, etc.) before committing.

- [ ] **Step 3: Manual smoke test**

1. `timeout 6 npx tsx server/index.ts` — server boots.
2. `npm run dev` — open http://localhost:5173.
3. Modo Prestador → "Meu Perfil & Avaliações": 4 plan cards render; current plan shows "Plano Atual"; Gratuito card shows the "Assine um plano" hint instead of a usage bar.
4. If the profile has no email, "Assinar Bronze" alerts to fill the email first and jumps to the profile tab.
5. Modo Cliente: "Enviar no WhatsApp" is hidden when the pro plan is gratuito/bronze.
6. Modo Prestador → "Relatório de Faturamento": shows the locked Ouro panel when the pro is not Ouro.

- [ ] **Step 4: Final commit (if lint fixes were applied)**

```bash
git add -A
git commit -m "chore: fix lint issues from 4-tier subscription changes"
```
