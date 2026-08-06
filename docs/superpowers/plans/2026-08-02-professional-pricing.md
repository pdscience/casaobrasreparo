# Professional Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 2-tier subscription system (Essencial R$29/mês, Completo R$59/mês) with Stripe Checkout for payment processing.

**Architecture:** Add plan fields to the `professionals` table, integrate Stripe Checkout + Webhooks for subscription management, and implement feature gating in the frontend based on plan tier.

**Tech Stack:** Stripe SDK (Node.js), Express.js server, Vue 3, InsForge database

## Global Constraints

- Database: InsForge (PostgreSQL)
- Frontend: Vue 3 + TailwindCSS + Vite
- Backend: Express.js (server/index.ts)
- Payment: Stripe (international)
- Billing: Monthly recurring subscriptions
- Plan limits: Essencial = 10 requests/month, Completo = unlimited

---

## File Structure

| File | Purpose |
|------|---------|
| `migrations/20260802_professional_plans.sql` | Database migration for plan fields |
| `src/types.ts` | Add plan-related fields to Professional interface |
| `server/index.ts` | Add Stripe routes (checkout, webhook, status) |
| `src/api/insforgeService.ts` | Add plan-related API functions |
| `src/App.vue` | Feature gating, plan UI, upgrade flow |
| `.env` | Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/20260802_professional_plans.sql`

**Interfaces:**
- Produces: `professionals` table with plan fields

**Steps:**

- [ ] **Step 1: Create migration file**

```sql
-- migrations/20260802_professional_plans.sql

-- Add plan fields to professionals table
ALTER TABLE public.professionals ADD COLUMN plan TEXT NOT NULL DEFAULT 'essencial';
ALTER TABLE public.professionals ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.professionals ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE public.professionals ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE public.professionals ADD COLUMN plan_expires_at TIMESTAMPTZ;
ALTER TABLE public.professionals ADD COLUMN requests_this_month INTEGER DEFAULT 0;
ALTER TABLE public.professionals ADD COLUMN requests_reset_at TIMESTAMPTZ;

-- Create index for plan queries
CREATE INDEX IF NOT EXISTS idx_professionals_plan ON public.professionals(plan);
CREATE INDEX IF NOT EXISTS idx_professionals_stripe_customer ON public.professionals(stripe_customer_id);
```

- [ ] **Step 2: Apply migration via InsForge CLI**

```bash
npx @insforge/cli db push migrations/20260802_professional_plans.sql
```

- [ ] **Step 3: Verify schema**

```bash
npx @insforge/cli metadata
```

Expected: `professionals` table shows new columns

- [ ] **Step 4: Commit**

```bash
git add migrations/20260802_professional_plans.sql
git commit -m "feat: add plan fields to professionals table"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types.ts:14-24`

**Interfaces:**
- Consumes: migration from Task 1
- Produces: Updated `Professional` interface with plan fields

**Steps:**

- [ ] **Step 1: Update Professional interface in src/types.ts**

```typescript
export interface Professional {
  id: string
  name: string
  category: string
  phone: string
  rating: number
  reviews_count: number
  avatar: string
  pix_key: string
  bio: string
  // Plan fields
  plan: 'essencial' | 'completo'
  plan_status: 'active' | 'past_due' | 'canceled'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_expires_at: string | null
  requests_this_month: number
  requests_reset_at: string | null
}
```

- [ ] **Step 2: Update proProfile default in src/App.vue**

Find the `proProfile` ref initialization (around line 55) and add plan defaults:

```typescript
const proProfile = ref<Professional>({
  id: '',
  name: '',
  category: '',
  phone: '',
  rating: 0,
  reviews_count: 0,
  avatar: '',
  pix_key: '',
  bio: '',
  // Plan defaults
  plan: 'essencial',
  plan_status: 'active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan_expires_at: null,
  requests_this_month: 0,
  requests_reset_at: null,
})
```

- [ ] **Step 3: Run build to verify types**

```bash
npm run build
```

Expected: Build passes with no type errors

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/App.vue
git commit -m "feat: add plan fields to Professional type"
```

---

## Task 3: Install Stripe SDK

**Files:**
- Modify: `package.json`
- Modify: `.env`

**Interfaces:**
- Produces: Stripe SDK available for server routes

**Steps:**

- [ ] **Step 1: Install Stripe SDK**

```bash
npm install stripe
```

- [ ] **Step 2: Add Stripe env vars to .env**

```bash
# Add to .env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
STRIPE_ESSENTIAL_PRICE_ID=price_essential_monthly
STRIPE_COMPLETO_PRICE_ID=price_completo_monthly
```

- [ ] **Step 3: Verify installation**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env
git commit -m "feat: install Stripe SDK and configure env vars"
```

---

## Task 4: Add Stripe Routes to Server

**Files:**
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: Stripe SDK from Task 3, plan fields from Task 1
- Produces: 3 new API endpoints

**Steps:**

- [ ] **Step 1: Add Stripe import and config at top of server/index.ts**

```typescript
import 'dotenv/config'
import { GoogleGenAI, Type } from '@google/genai'
import express from 'express'
import Stripe from 'stripe'

const app = express()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as never,
})
```

- [ ] **Step 2: Add checkout session route before the analyze-service route**

```typescript
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { professionalId, plan, email } = req.body

    if (!professionalId || !plan || !email) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const priceId = plan === 'completo'
      ? process.env.STRIPE_COMPLETO_PRICE_ID
      : process.env.STRIPE_ESSENTIAL_PRICE_ID

    if (!priceId) {
      return res.status(500).json({ error: 'Price ID not configured' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        professional_id: professionalId,
        plan: plan,
      },
      success_url: `${req.headers.origin || 'http://localhost:5173'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/?canceled=true`,
    })

    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error)
    res.status(500).json({ error: 'Erro ao criar sessão de checkout' })
  }
})
```

- [ ] **Step 3: Add webhook route (BEFORE json middleware)**

Move the webhook route BEFORE `app.use(express.json())` to receive raw body:

```typescript
// Move webhook route before JSON middleware
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${err}`)
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const professionalId = session.metadata?.professional_id
    const plan = session.metadata?.plan

    console.log('Checkout completed:', { professionalId, plan })

    // TODO: Update professional plan in database via InsForge
    // This will be implemented when we connect to InsForge
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    console.log('Subscription canceled:', subscription.id)
    // TODO: Update professional plan_status to 'canceled'
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    console.log('Payment failed:', invoice.subscription)
    // TODO: Update professional plan_status to 'past_due'
  }

  res.json({ received: true })
})
```

- [ ] **Step 4: Add subscription status route after webhook**

```typescript
app.get('/api/subscription-status/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params

    // TODO: Fetch professional from InsForge database
    // For now, return mock status
    res.json({
      plan: 'essencial',
      status: 'active',
      requestsThisMonth: 0,
      requestLimit: 10,
    })
  } catch (error) {
    console.error('Erro ao buscar status:', error)
    res.status(500).json({ error: 'Erro ao buscar status' })
  }
})
```

- [ ] **Step 5: Move existing JSON middleware after webhook route**

Ensure the order is:
1. CORS middleware
2. Webhook route (with raw body)
3. `app.use(express.json())`
4. Other routes

- [ ] **Step 6: Test server starts**

```bash
npx tsx server/index.ts
```

Expected: Server starts without errors

- [ ] **Step 7: Commit**

```bash
git add server/index.ts
git commit -m "feat: add Stripe checkout, webhook, and status routes"
```

---

## Task 5: Add Plan API Functions

**Files:**
- Modify: `src/api/insforgeService.ts`

**Interfaces:**
- Consumes: Professional type from Task 2
- Produces: Plan-related API functions

**Steps:**

- [ ] **Step 1: Add plan-related functions to insforgeService.ts**

```typescript
// Add at the end of the file

export async function updateProfessionalPlan(
  id: string,
  plan: string,
  planStatus: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Professional> {
  const updates: Record<string, unknown> = {
    plan,
    plan_status: planStatus,
  }
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId
  if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId

  const { data, error } = await insforge.database
    .from('professionals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Professional
}

export async function incrementRequestCount(professionalId: string): Promise<void> {
  const { data: pro, error: fetchError } = await insforge.database
    .from('professionals')
    .select('requests_this_month, requests_reset_at')
    .eq('id', professionalId)
    .single()

  if (fetchError) throw fetchError

  const now = new Date()
  const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
  const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

  const newCount = needsReset ? 1 : (pro.requests_this_month || 0) + 1

  const { error: updateError } = await insforge.database
    .from('professionals')
    .update({
      requests_this_month: newCount,
      requests_reset_at: needsReset ? now.toISOString() : pro.requests_reset_at,
    })
    .eq('id', professionalId)

  if (updateError) throw updateError
}

export async function canCreateRequest(professionalId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { data: pro, error } = await insforge.database
    .from('professionals')
    .select('plan, requests_this_month, requests_reset_at')
    .eq('id', professionalId)
    .single()

  if (error) throw error

  const now = new Date()
  const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
  const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

  if (pro.plan === 'completo') {
    return { allowed: true, current: needsReset ? 0 : pro.requests_this_month || 0, limit: Infinity }
  }

  const current = needsReset ? 0 : pro.requests_this_month || 0
  return { allowed: current < 10, current, limit: 10 }
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 3: Commit**

```bash
git add src/api/insforgeService.ts
git commit -m "feat: add plan-related API functions"
```

---

## Task 6: Add Feature Gating Logic

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `canCreateRequest`, `incrementRequestCount` from Task 5
- Produces: Feature gating functions and checks

**Steps:**

- [ ] **Step 1: Add feature gating functions after revenueChartData**

```typescript
// Add after revenueChartOption computed (around line 407)

const planFeatures = computed(() => {
  const plan = proProfile.value.plan
  return {
    maxRequests: plan === 'completo' ? Infinity : 10,
    prioritySearch: plan === 'completo',
    verifiedBadge: plan === 'completo',
    advancedReports: plan === 'completo',
    isEssencial: plan === 'essencial',
    isCompleto: plan === 'completo',
  }
})

const requestUsage = computed(() => {
  const current = proProfile.value.requests_this_month || 0
  const limit = planFeatures.value.maxRequests
  return {
    current,
    limit,
    percentage: limit === Infinity ? 0 : (current / limit) * 100,
    isNearLimit: limit !== Infinity && current >= limit - 2,
    isAtLimit: limit !== Infinity && current >= limit,
  }
})

function hasFeature(feature: string): boolean {
  return planFeatures.value[feature as keyof typeof planFeatures.value] as boolean
}

function getRequestLimit(): number | null {
  return planFeatures.value.maxRequests === Infinity ? null : planFeatures.value.maxRequests
}
```

- [ ] **Step 2: Add upgrade modal state**

```typescript
// Add with other modal refs (around line 78)

const showUpgradeModal = ref<boolean>(false)
const upgradeTargetPlan = ref<string>('completo')
```

- [ ] **Step 3: Add upgrade handler function**

```typescript
// Add after handleSaveRating function

async function handleUpgradePlan(targetPlan: string) {
  try {
    // Create Stripe checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        professionalId: proProfile.value.id,
        plan: targetPlan,
        email: proProfile.value.phone + '@casaobras.com.br', // Placeholder email
      }),
    })

    const data = await response.json()
    if (data.url) {
      window.location.href = data.url
    }
  } catch (err) {
    console.error('Erro ao criar sessão de checkout:', err)
  }
}
```

- [ ] **Step 4: Build to verify**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat: add feature gating logic"
```

---

## Task 7: Add Plan Selection UI

**Files:**
- Modify: `src/App.vue` (perfil_pro tab section)

**Interfaces:**
- Consumes: `planFeatures`, `hasFeature` from Task 6
- Produces: Plan selection cards in profile tab

**Steps:**

- [ ] **Step 1: Find the perfil_pro tab content in App.vue**

Look for the section that shows the professional profile form (around lines 1590-1741).

- [ ] **Step 2: Add plan selection cards BEFORE the profile form**

Insert before the profile editing form:

```html
<!-- PLAN SELECTION SECTION -->
<div v-if="proProfile.id && !isEditingProfile" class="space-y-6">
  <!-- Current Plan Badge -->
  <div class="bg-slate-900/80 rounded-2xl p-6 border border-slate-800">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold text-white">Seu Plano Atual</h3>
        <p class="text-sm text-slate-400 mt-1">
          {{ proProfile.plan === 'completo' ? 'Plano Completo' : 'Plano Essencial' }}
        </p>
      </div>
      <div class="text-right">
        <span class="text-2xl font-extrabold text-amber-400">
          R${{ proProfile.plan === 'completo' ? '59' : '29' }}
        </span>
        <span class="text-slate-400 text-sm">/mês</span>
      </div>
    </div>

    <!-- Request Usage (Essencial only) -->
    <div v-if="proProfile.plan === 'essencial'" class="mt-4">
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

    <div v-else class="mt-4">
      <span class="inline-flex items-center gap-2 text-green-400 text-sm font-medium">
        <CheckCircle2 class="w-4 h-4" />
        Pedidos ilimitados
      </span>
    </div>

    <!-- Upgrade Button -->
    <button
      v-if="proProfile.plan === 'essencial'"
      @click="showUpgradeModal = true; upgradeTargetPlan = 'completo'"
      class="mt-4 w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-2"
    >
      <Zap class="w-5 h-5" />
      Fazer Upgrade para Completo
    </button>
  </div>

  <!-- Plan Comparison Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Essencial Card -->
    <div
      :class="[
        'bg-slate-900/80 rounded-2xl p-6 border-2 transition-all',
        proProfile.plan === 'essencial' ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-800'
      ]"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Wrench class="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 class="font-bold text-white">Essencial</h4>
          <p class="text-amber-400 font-extrabold">R$29/mês</p>
        </div>
      </div>
      <ul class="space-y-2 text-sm text-slate-300">
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Análise IA + Foto
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Agendamento + WhatsApp
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Recibo Digital
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Destaque no perfil
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Relatórios básicos
        </li>
        <li class="flex items-center gap-2">
          <span class="text-slate-500">Até 10 pedidos/mês</span>
        </li>
      </ul>
    </div>

    <!-- Completo Card -->
    <div
      :class="[
        'bg-slate-900/80 rounded-2xl p-6 border-2 transition-all',
        proProfile.plan === 'completo' ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-800'
      ]"
    >
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Sparkles class="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h4 class="font-bold text-white">Completo</h4>
          <p class="text-amber-400 font-extrabold">R$59/mês</p>
        </div>
      </div>
      <ul class="space-y-2 text-sm text-slate-300">
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Tudo do Essencial
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Pedidos ilimitados
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Prioridade na busca
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Selo verificado
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Relatórios avançados
        </li>
      </ul>
      <button
        v-if="proProfile.plan !== 'completo'"
        @click="handleUpgradePlan('completo')"
        class="mt-4 w-full py-2 px-4 bg-slate-800 text-amber-400 border border-amber-500/30 font-bold rounded-xl hover:bg-slate-700 transition-all"
      >
        Assinar Completo
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: add plan selection UI cards"
```

---

## Task 8: Add Upgrade Modal

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `showUpgradeModal`, `upgradeTargetPlan` from Task 6
- Produces: Upgrade modal component

**Steps:**

- [ ] **Step 1: Add upgrade modal HTML**

Add after the closing `</main>` tag (before the footer or end of template):

```html
<!-- UPGRADE MODAL -->
<div v-if="showUpgradeModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
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
          <h4 class="font-bold text-white text-lg">Plano Completo</h4>
          <p class="text-amber-400 font-extrabold text-xl">R$59/mês</p>
        </div>
      </div>
      <ul class="space-y-2 text-sm text-slate-300">
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Pedidos ilimitados
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Prioridade na busca
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Selo verificado
        </li>
        <li class="flex items-center gap-2">
          <Check class="w-4 h-4 text-green-400" />
          Relatórios avançados
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
        @click="handleUpgradePlan('completo')"
        class="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-2"
      >
        <Zap class="w-5 h-5" />
        Assinar Agora
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: add upgrade modal"
```

---

## Task 9: Add Verified Badge to Profile

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `hasFeature('verifiedBadge')` from Task 6
- Produces: Verified badge on professional profile

**Steps:**

- [ ] **Step 1: Find where professional name is displayed in the profile section**

Look for the profile header that shows `proProfile.name` (in the perfil_pro tab).

- [ ] **Step 2: Add verified badge next to name**

```html
<div class="flex items-center gap-2">
  <h2 class="text-xl font-bold text-white">{{ proProfile.name }}</h2>
  <span
    v-if="hasFeature('verifiedBadge')"
    class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30"
  >
    <ShieldCheck class="w-3 h-3" />
    Verificado
  </span>
</div>
```

- [ ] **Step 3: Build to verify**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: add verified badge to profile"
```

---

## Task 10: Add Request Limit Check

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `canCreateRequest` from Task 5
- Produces: Request limit check in handleConfirmOrder

**Steps:**

- [ ] **Step 1: Update handleConfirmOrder to check limit**

Find the `handleConfirmOrder` function (around line 186) and add limit check at the start:

```typescript
async function handleConfirmOrder() {
  if (!latestAiResult.value) return

  // Check request limit for Essencial plan
  if (proProfile.value.id && proProfile.value.plan === 'essencial') {
    try {
      const { allowed, current, limit } = await canCreateRequest(proProfile.value.id)
      if (!allowed) {
        showUpgradeModal.value = true
        return
      }
    } catch (err) {
      console.error('Erro ao verificar limite:', err)
    }
  }

  // ... rest of existing code
}
```

- [ ] **Step 2: Build to verify**

```bash
npm run build
```

Expected: Build passes

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: add request limit check before creating order"
```

---

## Task 11: Connect Webhook to Database

**Files:**
- Modify: `server/index.ts`

**Interfaces:**
- Consumes: InsForge SDK, plan fields from Task 1
- Produces: Webhook updates database

**Steps:**

- [ ] **Step 1: Add InsForge import to server/index.ts**

```typescript
import 'dotenv/config'
import { GoogleGenAI, Type } from '@google/genai'
import express from 'express'
import Stripe from 'stripe'
import { createClient } from '@insforge/sdk'

const app = express()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as never,
})

const insforge = createClient({
  baseUrl: process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL,
  anonKey: process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY,
})
```

- [ ] **Step 2: Update webhook handler to update database**

Replace the TODO comments in the webhook handler:

```typescript
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${err}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const professionalId = session.metadata?.professional_id
    const plan = session.metadata?.plan

    if (professionalId && plan) {
      const { error } = await insforge.database
        .from('professionals')
        .update({
          plan: plan,
          plan_status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        })
        .eq('id', professionalId)

      if (error) {
        console.error('Erro ao atualizar plano:', error)
      } else {
        console.log('Plano atualizado com sucesso:', { professionalId, plan })
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const { error } = await insforge.database
      .from('professionals')
      .update({ plan_status: 'canceled' })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('Erro ao cancelar plano:', error)
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    const { error } = await insforge.database
      .from('professionals')
      .update({ plan_status: 'past_due' })
      .eq('stripe_subscription_id', invoice.subscription as string)

    if (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  res.json({ received: true })
})
```

- [ ] **Step 3: Update subscription status route to fetch real data**

```typescript
app.get('/api/subscription-status/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params

    const { data: pro, error } = await insforge.database
      .from('professionals')
      .select('plan, plan_status, requests_this_month, requests_reset_at')
      .eq('id', professionalId)
      .single()

    if (error) throw error

    const now = new Date()
    const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
    const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

    res.json({
      plan: pro.plan,
      status: pro.plan_status,
      requestsThisMonth: needsReset ? 0 : pro.requests_this_month || 0,
      requestLimit: pro.plan === 'completo' ? null : 10,
    })
  } catch (error) {
    console.error('Erro ao buscar status:', error)
    res.status(500).json({ error: 'Erro ao buscar status' })
  }
})
```

- [ ] **Step 4: Test server starts**

```bash
npx tsx server/index.ts
```

Expected: Server starts without errors

- [ ] **Step 5: Commit**

```bash
git add server/index.ts
git commit -m "feat: connect Stripe webhook to InsForge database"
```

---

## Task 12: Final Testing

**Files:**
- All modified files

**Interfaces:**
- Consumes: All previous tasks
- Produces: Working feature

**Steps:**

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Build passes with no errors

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No lint errors

- [ ] **Step 3: Start servers and test**

```bash
# Terminal 1
npx tsx server/index.ts

# Terminal 2
npm run dev
```

- [ ] **Step 4: Manual test flow**

1. Open http://localhost:5173
2. Switch to "Modo Prestador"
3. Go to "Meu Perfil & Avaliações"
4. Verify plan cards are displayed
5. Click "Assinar Completo"
6. Verify redirect to Stripe Checkout (will fail without real Stripe keys, but flow should work)

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete professional pricing system"
```
