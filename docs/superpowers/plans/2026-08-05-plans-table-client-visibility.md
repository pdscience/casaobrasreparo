# Plans Table + Client Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `plans` table in InsForge, seed it with 4 tiers (gratuito/bronze/prata/ouro), fix the server's InsForge path, add a client-facing professional directory ranked by plan with badges and WhatsApp buttons for ouro+prata.

**Architecture:** Single-phase plan. Migration → Server fix → Types → Helpers → Component → App.vue integration. All changes are additive except the server path fix.

**Tech Stack:** SQL (InsForge Postgres), TypeScript (Vue 3 + Vite), Tailwind CSS, Lucide icons, InsForge SDK (`@insforge/sdk`).

## Global Constraints

- Follow existing code conventions (Tailwind, Lucide, Vue Composition API).
- Do NOT add comments unless asked.
- Do NOT add new dependencies.
- All SQL applied via `npx @insforge/cli db query` (not `db push`).
- Build must pass: `npm run build` + `npm run lint`.

---

### Task 1: Migration — Plans Table + Seed

**Files:**
- Create: `migrations/20260805_plans_table.sql`
- Create: `migrations/20260805_plans_seed.sql`

**Interfaces:**
- Consumes: InsForge Postgres via `npx @insforge/cli db query`
- Produces: `public.plans` table with 4 rows

- [ ] **Step 1: Create migration file**

```sql
-- migrations/20260805_plans_table.sql
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  request_limit INTEGER,
  receives_broadcasts BOOLEAN NOT NULL DEFAULT false,
  show_whatsapp_to_client BOOLEAN NOT NULL DEFAULT false,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  badge_label TEXT,
  badge_bg TEXT,
  badge_text TEXT,
  badge_border TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- [ ] **Step 2: Create seed file**

```sql
-- migrations/20260805_plans_seed.sql
INSERT INTO public.plans (id, display_name, rank, monthly_price, request_limit, receives_broadcasts, show_whatsapp_to_client, client_visible, badge_label, badge_bg, badge_text, badge_border) VALUES
('gratuito', 'Gratuito', 4, 0, 0, false, false, false, NULL, NULL, NULL, NULL),
('bronze', 'Bronze', 3, 3490, 10, true, false, true, 'Concorrência', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20'),
('prata', 'Prata', 2, 5490, 30, true, true, true, 'Prioridade', 'bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20'),
('ouro', 'Ouro', 1, 7990, NULL, true, true, true, 'Premium', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
```

- [ ] **Step 3: Apply migration to InsForge**

```bash
cd CasaObraReparos
npx @insforge/cli db query --file migrations/20260805_plans_table.sql
npx @insforge/cli db query --file migrations/20260805_plans_seed.sql
```

Expected: no errors.

- [ ] **Step 4: Verify table exists and has 4 rows**

```bash
curl -sS "https://6bcfg7xt.us-east.insforge.app/api/database/records/plans?select=id,display_name,rank" \
  -H "apikey: anon_21d142f6c5741174263265e758066f7ba967bbdc11658c7464b280a1a02a36d0" \
  -H "Authorization: Bearer anon_21d142f6c5741174263265e758066f7ba967bbdc11658c7464b280a1a02a36d0"
```

Expected: JSON array with 4 items, sorted by rank.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260805_plans_table.sql migrations/20260805_plans_seed.sql
git commit -m "feat(plans): add plans table + seed (gratuito/bronze/prata/ouro)"
```

---

### Task 2: Fix Server InsForge Path

**Files:**
- Modify: `server/index.ts:22`

**Interfaces:**
- Consumes: existing `insforgeQuery` function
- Produces: corrected URL for all InsForge queries

- [ ] **Step 1: Fix the URL path**

In `server/index.ts`, line 22, change:

```ts
const url = `${INSFORGE_URL}/rest/v1/${table}${params ? `?${params}` : ''}`
```

to:

```ts
const url = `${INSFORGE_URL}/api/database/records/${table}${params ? `?${params}` : ''}`
```

- [ ] **Step 2: Verify server starts**

```bash
npx tsx --eval "import('./server/index.ts').then(()=>{})" &
sleep 2; kill %1 2>/dev/null; echo "OK"
```

Expected: no syntax error (EADDRINUSE is fine — port 3001 may already be in use).

- [ ] **Step 3: Commit**

```bash
git add server/index.ts
git commit -m "fix(server): correct InsForge path /rest/v1/ → /api/database/records/"
```

---

### Task 3: Add Plan Type + Service Helpers

**Files:**
- Modify: `src/types.ts`
- Modify: `src/api/insforgeService.ts`

**Interfaces:**
- Consumes: InsForge SDK (`insforge.database.from(...)`)
- Produces: `Plan` type, `getPlans()`, `getProfessionalsForClient()` functions

- [ ] **Step 1: Add Plan interface to types.ts**

At the end of `src/types.ts`, add:

```ts
export interface Plan {
  id: string
  display_name: string
  rank: number
  monthly_price: number
  request_limit: number | null
  receives_broadcasts: boolean
  show_whatsapp_to_client: boolean
  client_visible: boolean
  badge_label: string | null
  badge_bg: string | null
  badge_text: string | null
  badge_border: string | null
}
```

- [ ] **Step 2: Add getPlans to insforgeService.ts**

Add at the end of `src/api/insforgeService.ts` (before the last line):

```ts
export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await insforge.database
    .from('plans')
    .select('*')
    .order('rank', { ascending: true })
  if (error) throw error
  return (data as Plan[]) || []
}

export async function getProfessionalsForClient(category?: string): Promise<Professional[]> {
  const { data: plans, error: planErr } = await insforge.database
    .from('plans')
    .select('*')
  if (planErr) throw planErr
  const visiblePlanIds = (plans as Plan[]).filter(p => p.client_visible).map(p => p.id)

  let query = insforge.database.from('professionals').select('*')
  if (category) query = query.eq('category', category)
  query = query.in('plan', visiblePlanIds.length > 0 ? visiblePlanIds : ['__none__'])

  const { data, error } = await query
  if (error) throw error
  return (data as Professional[]) || []
}
```

Also add `Plan` to the import on line 2:

```ts
import type { AIAnalysis, Plan, Professional, ServiceRequest } from '../types'
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/api/insforgeService.ts
git commit -m "feat(types): add Plan interface + getPlans/getProfessionalsForClient helpers"
```

---

### Task 4: Create ProfessionalCard Component

**Files:**
- Create: `src/components/ProfessionalCard.vue`

**Interfaces:**
- Consumes: `Professional` and `Plan` types from `src/types.ts`
- Produces: `ProfessionalCard.vue` component used by App.vue

- [ ] **Step 1: Create the component file**

```vue
<script setup lang="ts">
import type { Professional, Plan } from '../types'
import { Star, MessageCircle } from 'lucide-vue-next'

const props = defineProps<{
  professional: Professional
  planInfo: Plan | null
}>()

function getWhatsAppLink(phone: string, text: string) {
  const clean = phone.replace(/\D/g, '')
  const formatted = clean.length <= 11 ? `55${clean}` : clean
  return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`
}
</script>

<template>
  <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <img
        v-if="professional.avatar"
        :src="professional.avatar"
        :alt="professional.name"
        class="w-10 h-10 rounded-full object-cover border border-slate-700"
      />
      <div v-else class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
        <span class="text-xs text-slate-500">{{ professional.name?.charAt(0) }}</span>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-bold text-white text-xs truncate">{{ professional.name }}</p>
          <span
            v-if="planInfo?.badge_label"
            :class="[planInfo.badge_bg, planInfo.badge_text, planInfo.badge_border]"
            class="text-[9px] font-bold px-2 py-0.5 rounded-full border"
          >
            {{ planInfo.badge_label }}
          </span>
        </div>
        <p class="text-[10px] text-slate-400">{{ professional.category }}</p>
        <div class="flex items-center gap-1 mt-0.5">
          <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
          <span class="text-[10px] text-slate-300">
            {{ professional.rating ?? 0 }}
            <span class="text-slate-500">({{ professional.reviews_count ?? 0 }})</span>
          </span>
        </div>
      </div>
    </div>

    <a
      v-if="planInfo?.show_whatsapp_to_client && professional.phone"
      :href="getWhatsAppLink(professional.phone, 'Olá! Gostaria de um orçamento.')"
      target="_blank"
      rel="noopener noreferrer"
      class="shrink-0 px-3 py-2 rounded-xl bg-green-600 text-white text-[10px] font-bold hover:bg-green-500 transition-all flex items-center gap-1"
    >
      <MessageCircle class="w-3.5 h-3.5" />
      WhatsApp
    </a>
  </div>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProfessionalCard.vue
git commit -m "feat(ui): add ProfessionalCard component with plan badge + WhatsApp button"
```

---

### Task 5: Integrate Directory into App.vue

**Files:**
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `getPlans`, `getProfessionalsForClient` from `src/api/insforgeService.ts`, `ProfessionalCard` component, `Plan` type
- Produces: visible professional directory in client view

- [ ] **Step 1: Add imports to App.vue**

Add `getPlans, getProfessionalsForClient` to the existing import on line 38:

```ts
import { analyzeWithAI, getServiceRequests, createServiceRequest, updateServiceRequest, getProfessionals, createProfessional, updateProfessional, uploadProfessionalAvatar, canCreateRequest, createPortalSession, changePlan, createCheckoutSession, getPlans, getProfessionalsForClient } from './api/insforgeService'
```

Add `ProfessionalCard` component import:

```ts
import ProfessionalCard from './components/ProfessionalCard.vue'
```

- [ ] **Step 2: Add state variables**

After `const avatarPreview = ref<string | null>(null)` (line 109), add:

```ts
const plans = ref<Plan[]>([])
```

- [ ] **Step 3: Add computed for plan map and visible professionals**

After the `isRegistering` ref (around line 101), add:

```ts
const planMap = computed(() => {
  const m = new Map<string, Plan>()
  for (const p of plans.value) m.set(p.id, p)
  return m
})

const visibleProfessionals = computed(() => {
  const visibleIds = plans.value.filter(p => p.client_visible).map(p => p.id)
  return professionals.value
    .filter(p => visibleIds.includes(p.plan))
    .sort((a, b) => {
      const ra = planMap.value.get(a.plan)?.rank ?? 99
      const rb = planMap.value.get(b.plan)?.rank ?? 99
      if (ra !== rb) return ra - rb
      if (b.rating !== a.rating) return b.rating - a.rating
      return (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
    })
})
```

Note: `professionals` ref must also be extracted from `loadData`. Currently, professionals are fetched inside `loadData` but not stored in a ref. Add:

After the existing `const requests = ref<ServiceRequest[]>([])` (line 55), add:

```ts
const professionals = ref<Professional[]>([])
```

Then in `loadData()`, store the fetched professionals:

```ts
async function loadData() {
  isLoading.value = true
  try {
    const [serviceRequests, professionalsData, plansData] = await Promise.all([
      getServiceRequests(),
      getProfessionals(),
      getPlans(),
    ])
    requests.value = serviceRequests
    professionals.value = professionalsData
    plans.value = plansData
    if (professionalsData.length > 0) {
      proProfile.value = professionalsData[0]
    }
  } catch (err) {
    console.error('Erro ao carregar dados:', err)
  } finally {
    isLoading.value = false
  }
}
```

- [ ] **Step 4: Add the directory section to the template**

Find the client view "Boas-vindas" section. After the hero block (`bg-gradient-to-r from-slate-900...`) and before the "Solicitar Serviço" form, insert:

```vue
<!-- PROFESSIONAL DIRECTORY -->
<div v-if="visibleProfessionals.length > 0" class="space-y-3">
  <div class="flex items-center justify-between">
    <div>
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <Building2 class="w-4 h-4 text-amber-400" />
        Profissionais disponíveis
      </h3>
      <p class="text-[10px] text-slate-400 mt-0.5">
        {{ visibleProfessionals.length }} profissional(is) na categoria
        <strong class="text-amber-400">{{ selectedCategory }}</strong>
      </p>
    </div>
  </div>

  <div class="space-y-2">
    <ProfessionalCard
      v-for="pro in visibleProfessionals"
      :key="pro.id"
      :professional="pro"
      :plan-info="planMap.get(pro.plan) ?? null"
    />
  </div>
</div>
```

Make sure `Building2` is imported (it's already in the icon imports on line 27).

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat(ui): add ranked professional directory to client view"
```

---

### Task 6: Build + Lint Verification

**Files:** None (verification only)

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no lint errors.

- [ ] **Step 3: If errors, fix and re-run**

- [ ] **Step 4: Commit any fixes**

---

### Task 7: Manual End-to-End Test

**Files:** None (manual test only)

- [ ] **Step 1: Ensure test data exists**

Verify at least 3 professionals exist in different plans (ouro, prata, bronze) in the same category. If not, create test records via InsForge CLI.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Open client view**

Navigate to `http://localhost:5173`, ensure `userMode` is `client`.

- [ ] **Step 4: Verify directory**

- [ ] Professionals appear ranked: ouro first, then prata, then bronze
- [ ] Gratuito professionals do NOT appear
- [ ] Each pro has a badge: "Premium" (ouro), "Prioridade" (prata), "Concorrência" (bronze)
- [ ] Ouro and prata pros have a green "WhatsApp" button
- [ ] Bronze pros do NOT have a WhatsApp button

- [ ] **Step 5: Verify category filtering**

Change the category dropdown → directory re-filters to show only pros in that category.

- [ ] **Step 6: Verify WhatsApp link**

Click the WhatsApp button on an ouro or prata pro → opens WhatsApp with pre-filled message.

- [ ] **Step 7: Clean up any test data if needed**

---

## Arquivos criados/modificados

| Arquivo | Ação |
|---------|------|
| `migrations/20260805_plans_table.sql` | Criado |
| `migrations/20260805_plans_seed.sql` | Criado |
| `server/index.ts:22` | Modificado (fix path) |
| `src/types.ts` | Modificado (adiciona Plan) |
| `src/api/insforgeService.ts` | Modificado (adiciona getPlans, getProfessionalsForClient) |
| `src/components/ProfessionalCard.vue` | Criado |
| `src/App.vue` | Modificado (diretório, estado, computed) |
