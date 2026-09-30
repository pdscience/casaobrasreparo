# Fundação (Refatoração App.vue) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o monolito `src/App.vue` (4.979 linhas) em shell + vue-router com guards por role + composables/views/componentes extraídos, deletando código morto e corrigindo os bugs expostos pela duplicação.

**Architecture:** Migração incremental (Abordagem A): cada task deixa o app funcional e commitado. Ordem: deletar morto → tooling (vue-tsc/Vitest) → composables + libs puras testáveis → componentes de layout → extração de views → router/guards → bugs → verificação final. Estado compartilhado em composables singletons (refs em módulo), preservando o comportamento "tudo junto" do App.vue.

**Tech Stack:** Vue 3.5 `<script setup lang="ts">`, Vite 7, Tailwind 4, InsForge SDK, Vitest, vue-tsc, vue-router (hash history). Novas dependências permitidas: `vue-tsc`, `vitest`, `vue-router` — **nenhuma outra**.

**Spec:** `docs/superpowers/specs/2026-09-29-fundacao-refatoracao-design.md` (o plano argumenta a partir do spec; executores leem ambos).

**Ponto de retorno:** commit `3535565`. Spec commitada em `0e4b920`.

## Global Constraints

- UI, comentários e mensagens em **pt-BR**; commits convencionais (`feat:`/`fix:`/`refactor:`/`chore:`/`test:`/`docs:`).
- **Nenhuma mudança visual** além das correções listadas neste plano (sem redesign).
- Cada task termina com **`npm run typecheck && npm run lint && npm run test && npm run build` verdes** (a partir da Task 2) e um commit.
- Extrações movem código **preservando comportamento**, exceto as correções explicitamente previstas.
- Números de linha referem-se ao estado no commit `3535565` e **deslocam após remoções** — sempre localizar blocos pelos **marcadores de comentário** citados.
- Nenhum segredo em código; `.env` nunca é commitado.

## Deviations from spec (justificadas)

1. **Ordem das etapas:** composables/componentes/views vêm **antes** do router (spec tinha router na etapa 3). Motivo: o router precisa de view files reais para apontar — criar router antes exigiria uma camada de indireção descartável.
2. **Arquivos adicionados além da árvore do spec:** `src/composables/useNavigation.ts` (estado de navegação com adapter para o router), `src/composables/useQuoteForm.ts` (formulário de solicitação compartilhado entre o CTA da landing e a view Solicitar), `src/lib/categories.ts`, `src/lib/directoryFilters.ts`, `src/lib/requestStatus.ts`, `src/lib/revenue.ts`, `src/router/guards.ts` — lógica pura vive em `lib/` para ser testável pelo Vitest **sem importar o SDK InsForge**.
3. **Badges das sub-tabs** são corrigidos na Task 4 (unificação), não na Task 9 — a correção acontece junto com a deduplicação.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/categories.ts` (criar) | `CATEGORIES`, `CATEGORY_UNLISTED` |
| `src/lib/directoryFilters.ts` (criar) | Filtros/paginação puros do diretório |
| `src/lib/requestStatus.ts` (criar) | `statusSteps`, `clientStatusGroup`, `formatRequestDate` |
| `src/lib/whatsapp.ts` (criar) | `formatWhatsAppPhone`, `buildWhatsAppLink(phone, text)` — impl. única |
| `src/lib/revenue.ts` (criar, Task 9) | `computeMonthlySummary` (faturamento real) |
| `src/router/guards.ts` (criar, Task 8) | `evaluateRouteGuard` puro (testável) |
| `src/router/index.ts` (criar, Task 8) | Rotas + `beforeEach` + adapter do useNavigation |
| `src/composables/useNavigation.ts` (criar) | `activeTab`, `goToTab`, `goToModule`, `openProfessionalsPage`, `scrollToId`, `trackCta`, scroll da landing |
| `src/composables/useUi.ts` (criar) | Modais globais, menu mobile, toasts |
| `src/composables/useAuth.ts` (criar) | Sessão, registro/login/logout, `proProfile`, modal de perfil |
| `src/composables/usePlans.ts` (criar) | `plans`, features, preços, checkout/portal |
| `src/composables/useProfessionals.ts` (criar) | Profissionais, filtros do diretório |
| `src/composables/useRequests.ts` (criar) | Pedidos, ciclo de status, `loadData`, receita (até Task 9) |
| `src/composables/useQuoteForm.ts` (criar) | Formulário de solicitação + criar pedido + IA |
| `src/components/layout/AppHeader.vue` (criar) | Header + drawer mobile |
| `src/components/layout/AppFooter.vue` (criar) | Footer |
| `src/components/layout/ClientSubTabs.vue` (criar) | Sub-tabs do cliente (1 impl., badges corretos) |
| `src/components/layout/ProSubTabs.vue` (criar) | Sub-tabs do pro (1 impl.) |
| `src/components/layout/ToastHost.vue` (criar) | Host de toasts |
| `src/components/auth/AuthModal.vue` (criar) | Modal login/cadastro + redirect pós-login |
| `src/components/modals/*.vue` (criar) | UpgradeModal, OnboardingPlansModal, ScheduleModal, RateModal, ReceiptModal |
| `src/views/**` (criar, Tasks 5–7) | 10 views conforme árvore do spec |
| `src/App.vue` (modify) | Shell: header, router-view, modais globais, footer (<400 linhas) |

---

### Task 1: Deletar código morto

**Files:**
- Modify: `src/App.vue` (blocos `v-if="false"` 2014–2786; `isLanding` 166–168)
- Modify: `src/api/insforgeService.ts` (7 exports mortos)
- Modify: `src/lib/quoteFlow.ts` (2 exports mortos)

**Interfaces:**
- Produces: nenhuma API nova. `App.vue` sem `v-if="false"`; `isLanding` simplificado.

- [ ] **Step 1: Verificar que os exports a remover são mesmo mortos**

```bash
grep -rn "getServiceRequest\b\|deleteServiceRequest\|getAnalysisResult\|updateProfessionalPlan\|incrementRequestCount\|canCreateRequest\|getSubscriptionStatus\|isQuoteFormValid\|filterProfessionalsByCategory" src/ --include=*.ts --include=*.vue | grep -v "insforgeService.ts:\|quoteFlow.ts:"
```
Expected: nenhuma ocorrência fora dos próprios arquivos de definição. Se houver ocorrência, **não deletar** aquele export e registrar no commit.

- [ ] **Step 2: Deletar as 4 páginas mortas do template**

No `src/App.vue`, deletar do marcador `<!-- LEGADO (mantido fora da landing single-page) -->` (linha 2014) até a linha imediatamente antes de `<!-- ROTA PÚBLICA #/profissionais: CATÁLOGO POR PROFISSÃO -->` (linha 2787) — inclui os 4 blocos `<div v-if="false">` (contato legado, `como_funciona`, `para_profissionais`, `blog`; ~773 linhas).

- [ ] **Step 3: Simplificar `isLanding`**

`src/App.vue:166-168` — as abas mortas saíram do vocabulário:

```ts
const isLanding = computed(() => !authUser.value && activeTab.value === 'boas_vindas')
```

- [ ] **Step 4: Deletar exports mortos de `src/api/insforgeService.ts`**

Remover: `getServiceRequest` (14–23), `deleteServiceRequest` (48–55), `getAnalysisResult` (224–233), `updateProfessionalPlan` (235–258), `incrementRequestCount` (260–284), `canCreateRequest` (286–303), `getSubscriptionStatus` (324–359) — intervalos descritos pelos próprios `export async function` vizinhos.

- [ ] **Step 5: Deletar exports mortos de `src/lib/quoteFlow.ts`**

Remover `isQuoteFormValid` (31–33) e `filterProfessionalsByCategory` (35–42).

- [ ] **Step 6: Verificar**

```bash
grep -c 'v-if="false"' src/App.vue          # Expected: 0
grep -n "como_funciona\|para_profissionais" src/App.vue   # Expected: nada
npx tsc --noEmit && npm run lint && npm run build         # Expected: exit 0
wc -l src/App.vue                                          # Expected: ~4206
```

- [ ] **Step 7: Smoke manual**

`npm run dev` → landing renderiza; navega para `#/profissionais`; login modal abre.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "refactor: remove paginas mortas e exports sem uso (App.vue -773 linhas)"
```

---

### Task 2: Tooling — vue-tsc + Vitest

**Files:**
- Modify: `package.json` (scripts + devDeps), `vite.config.ts` (bloco `test`)
- Create: `src/lib/quoteFlow.test.ts`

**Interfaces:**
- Produces: scripts `typecheck`, `test`, `test:watch`; `build` passa a rodar typecheck antes.

- [ ] **Step 1: Instalar dependências**

```bash
npm i -D vue-tsc vitest
```

- [ ] **Step 2: Scripts no `package.json`**

```json
"typecheck": "vue-tsc --noEmit",
"test": "vitest run",
"test:watch": "vitest",
"build": "npm run typecheck && vite build"
```

- [ ] **Step 3: Bloco `test` no `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } },
  },
})
```

- [ ] **Step 4: Escrever teste de caracterização de `quoteFlow`**

Criar `src/lib/quoteFlow.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validateQuoteForm, buildQuotePayload } from './quoteFlow'

describe('validateQuoteForm', () => {
  it('aceita dados válidos', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria Silva', clientPhone: '11987654321', clientAddress: 'Rua A, 100' }),
    ).toEqual({})
  })
  it('erro quando nome vazio', () => {
    expect(
      validateQuoteForm({ clientName: '  ', clientPhone: '11987654321', clientAddress: 'Rua A' }).clientName,
    ).toBe('Informe seu nome completo.')
  })
  it('erro quando telefone tem menos de 10 dígitos', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '98765', clientAddress: 'Rua A' }).clientPhone,
    ).toContain('WhatsApp válido')
  })
  it('erro quando endereço vazio', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '11987654321', clientAddress: '' }).clientAddress,
    ).toBe('Informe o endereço do atendimento.')
  })
})

describe('buildQuotePayload', () => {
  const base = {
    clientId: 'c1',
    form: { clientName: ' Maria ', clientPhone: '11987654321', clientAddress: 'Rua A, 100' },
    category: 'Eletricista',
    photoUrl: 'x.png',
    notes: 'n',
    aiAnalysis: { summary: 's' },
    finalPrice: 150,
    professionalId: 'p1',
    sendMode: 'direct' as const,
  }
  it('envio direto: professional_id preenchido, broadcast false, status Pendente', () => {
    const p = buildQuotePayload(base)
    expect(p.professional_id).toBe('p1')
    expect(p.broadcast).toBe(false)
    expect(p.status).toBe('Pendente')
    expect(p.client_name).toBe('Maria')
  })
  it('broadcast: professional_id null e broadcast true', () => {
    const p = buildQuotePayload({ ...base, sendMode: 'broadcast' })
    expect(p.professional_id).toBeNull()
    expect(p.broadcast).toBe(true)
  })
})
```

- [ ] **Step 5: Rodar teste**

Run: `npm test`
Expected: PASS (todos). Falha = parar e investigar.

- [ ] **Step 6: Rodar typecheck e corrigir**

Run: `npm run typecheck`
Expected: exit 0. Se reportar erros, corrigi-los **mantendo o runtime idêntico** (tipagem apenas). Suspeito conhecido: `hasFeature` (`src/App.vue:1256`):

```ts
function hasFeature(feature: keyof typeof planFeatures.value): boolean {
  return typeof planFeatures.value[feature] === 'boolean'
    ? (planFeatures.value[feature] as boolean)
    : false
}
```
Os usos em template (`hasFeature('whatsappVisible'|'advancedReports'|'verifiedBadge')`) são booleanos e continuam válidos. Qualquer outro erro: corrigir no mínimo; se indicar bug real de comportamento, **parar e reportar** em vez de "consertar".

- [ ] **Step 7: Build completo**

Run: `npm run lint && npm run build`
Expected: exit 0 (build agora inclui typecheck).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: adiciona vue-tsc ao build e Vitest com testes de quoteFlow"
```

---

### Task 3: Composables + libs puras (+ WhatsApp unificado)

Ordem interna: libs puras testadas → `useUi` → `useNavigation` → `useAuth` → `usePlans` → `useProfessionals` → `useRequests` → `useQuoteForm` → WhatsApp unificado. Ao final, o `App.vue` não declara mais estado de negócio — só importa composables.

**Files:**
- Create: `src/lib/categories.ts`, `src/lib/directoryFilters.ts`, `src/lib/directoryFilters.test.ts`, `src/lib/requestStatus.ts`, `src/lib/requestStatus.test.ts`, `src/lib/whatsapp.ts`
- Create: `src/composables/useUi.ts`, `useNavigation.ts`, `useAuth.ts`, `usePlans.ts`, `useProfessionals.ts`, `useRequests.ts`, `useQuoteForm.ts`
- Modify: `src/App.vue`, `src/lib/analytics.ts`, `src/components/ProfessionalCard.vue`

**Interfaces (APIs produzidas — Tasks 4–8 dependem exatamente disso):**

```ts
// src/lib/categories.ts
export const CATEGORIES: { name: string; icon?: string }[]   // mover de App.vue:86 (forma original preservada)
export const CATEGORY_UNLISTED: string                        // mover de App.vue:118

// src/lib/directoryFilters.ts
export function normalizeFilter(value: string): string
export interface DirectoryFilters { category: string; plan: string; uf: string; cidade: string; bairro: string }
export function filterProfessionals<T extends { category: string; plan: string; uf?: string; cidade?: string; coverage_bairros?: string[] }>(list: T[], f: DirectoryFilters): T[]
export function paginate<T>(list: T[], page: number, perPage: number): T[]

// src/lib/requestStatus.ts
export const statusSteps: string[]                                   // mover de App.vue:113
export type StatusGroup = 'pendentes' | 'andamento' | 'concluidas'
export function clientStatusGroup(status: 'Pendente' | 'Visita Agendada' | 'Em Execução' | 'Concluído' | 'Cancelado'): StatusGroup
export function formatRequestDate(iso: string | undefined): string

// src/lib/whatsapp.ts
export function formatWhatsAppPhone(phone: string): string
export function buildWhatsAppLink(phone: string, text: string): string   // canônico: (phone, text)

// src/composables/useUi.ts
export function useUi(): {
  viewReceiptModal: Ref<ServiceRequest | null>
  rateOrderModal: Ref<ServiceRequest | null>
  scheduleModal: Ref<ServiceRequest | null>
  showUpgradeModal: Ref<boolean>
  showOnboardingPlans: Ref<boolean>
  isMobileMenuOpen: Ref<boolean>
  ratingStars: Ref<number>; ratingComment: Ref<string>
  scheduleDate: Ref<string>; scheduleTime: Ref<string>; schedulePrice: Ref<string>; scheduleObs: Ref<string>
  toasts: Ref<{ id: number; kind: 'success' | 'error' | 'info' | 'warning'; message: string }[]>
  pushToast(kind, message, ttlMs?): void
  dismissToast(id: number): void
}

// src/composables/useNavigation.ts
export type TabId = 'boas_vindas' | 'profissionais' | 'solicitar' | 'meus_pedidos' | 'recibos_cliente'
  | 'historico_cliente' | 'pedidos_pro' | 'faturamento' | 'perfil_pro' | 'historico_pro'
export function useNavigation(): {
  activeTab: Ref<TabId>
  goToTab(tab: TabId): void
  setTab(tab: TabId): void                    // usado pelo router.afterEach (Task 8)
  goToModule(role: 'client' | 'pro', view?: 'login' | 'register'): void
  openProfessionalsPage(): void
  scrollToId(id: string): void
  trackCta(label: string): void
  isScrolled: Ref<boolean>; activeSection: Ref<string>
  teslaSections: { id: string; label: string }[]
  onPageScroll(): void
}
// exports de módulo (fora do retorno): registerNavigator(fn: (path: string) => void),
//   tabToPath(tab: TabId): string, pathToTab(path: string): TabId | null

// src/composables/useAuth.ts
export function useAuth(): {
  authUser; userProfile; userMode: ComputedRef<'client'|'pro'|null>; authLoading; authError
  showAuth: Ref<boolean>; authView: Ref<'login'|'register'>; authRole: Ref<'client'|'pro'>
  loginEmail; loginPassword; registerForm; isRegistering
  proProfile: Ref<Professional>
  showProfileModal: Ref<boolean>
  isLanding: ComputedRef<boolean>          // !authUser && activeTab === 'boas_vindas'
  hydrateAuth(): Promise<void>
  handleLogin(): Promise<void>; handleRegister(): Promise<void>; handleLogout(): Promise<void>
  loadProfessionalProfile(authId: string): Promise<void>
  handleHeaderProfileClick(): void          // showProfileModal = true
  handleProfileModalSaved(payload): void    // atualiza proProfile/userProfile
}

// src/composables/usePlans.ts
export function usePlans(): {
  plans: Ref<Plan[]>; planMap: ComputedRef<Map<string, Plan>>
  PLANS; PLAN_LABELS; displayPlans; PLAN_PRICES
  planFeatures; requestUsage; canReceiveRequests; currentPlanRow; upgradeRecommendation
  hasFeature(feature): boolean
  formatBRL(cents, fallback): string; dbPlanPrice(id, fallback): string; planLimitText(id, fallback): string
  subscribePlan(targetPlan: string): Promise<void>
  handleOpenPortal(): Promise<void>
}

// src/composables/useProfessionals.ts
export function useProfessionals(): {
  professionals: Ref<Professional[]>
  visibleProfessionals: ComputedRef<Professional[]>   // sort por rank do plano → rating → reviews_count
  findProfessional(id: string | null): Professional | undefined
  filterCategory; filterPlan; filterUf; filterCidade; filterBairro: Ref<string>
  directoryPage: Ref<number>
  availableCategories; availableUfs; availableCidades; availableBairros: ComputedRef<string[]>
  filteredProfessionals; totalPages; paginatedProfessionals: ComputedRef
  prataBronzeCount: ComputedRef<number>
  resetDirectoryFilters(): void
}

// src/composables/useRequests.ts
export function useRequests(): {
  requests: Ref<ServiceRequest[]>
  myRequests; filteredClientRequests; historicClientRequests; historicProRequests; proRequests: ComputedRef<ServiceRequest[]>
  clientStatusFilter: Ref<'todas'|'pendentes'|'andamento'|'concluidas'>
  revenueChartData; totalRevenueMonth; completedCount; avgTicket: ComputedRef   // corrigidos na Task 9
  loadData(): Promise<void>              // carrega requests + professionals + plans (via composables irmãs)
  handleSaveSchedule(): Promise<void>
  handleUpdateStatus(orderId, newStatus): Promise<void>
  handleSaveRating(): Promise<void>
}

// src/composables/useQuoteForm.ts
export function useQuoteForm(): {
  selectedCategory; clientName; clientPhone; clientAddress; notes: Ref<string>
  imagePreview: Ref<string|null>; photoFile: Ref<File|null>
  isAnalyzing: Ref<boolean>; latestAiResult: Ref<AIAnalysis|null>
  createdOrderSuccess: Ref<ServiceRequest|null>
  sendMode: Ref<SendMode|null>; formError: Ref<string>
  selectedProfessional: Ref<Professional|null>
  aiReadyToast: Ref<boolean>; aiFallback: Ref<boolean>     // aiFallback: novo, ativo desde já (banner na Task 9)
  directCandidates: ComputedRef<Professional[]>
  handlePhotoUpload(e: Event): void
  handleAnalyzeWithAI(): Promise<void>
  handleConfirmOrder(): Promise<void>
  handleChooseProfessional(pro: Professional): void
  clearProfessionalSelection(): void
  resetForm(): void
}
```

- [ ] **Step 1: Escrever teste falho de `directoryFilters`**

Criar `src/lib/directoryFilters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { filterProfessionals, paginate } from './directoryFilters'

const pro = (o: Record<string, unknown>) => ({
  id: 'id', name: 'P', email: '', phone: '', rating: 0, reviews_count: 0, avatar: '',
  pix_key: '', bio: '', plan: 'gratuito', plan_status: 'active',
  category: 'Eletricista', uf: 'SP', cidade: 'São Paulo', coverage_bairros: [],
  ...o,
})

describe('filterProfessionals', () => {
  const list = [
    pro({ id: '1', category: 'Eletricista', plan: 'ouro', uf: 'SP', cidade: 'São Paulo', coverage_bairros: ['Centro'] }),
    pro({ id: '2', category: 'Pintor', plan: 'bronze', uf: 'RJ', cidade: 'Niterói', coverage_bairros: [] }),
    pro({ id: '3', category: 'Pintor', plan: 'ouro', uf: 'SP', cidade: 'São Paulo', coverage_bairros: ['Batom'] }),
  ]
  it('sem filtros ativos retorna tudo', () => {
    expect(filterProfessionals(list, { category: 'Todas', plan: 'Todos', uf: 'Todas', cidade: 'Todas', bairro: 'Todos' })).toHaveLength(3)
  })
  it('filtra por categoria', () => {
    const r = filterProfessionals(list, { category: 'Pintor', plan: 'Todos', uf: 'Todas', cidade: 'Todas', bairro: 'Todos' })
    expect(r.map((p) => p.id)).toEqual(['2', '3'])
  })
  it('filtra por UF ignorando caixa', () => {
    const r = filterProfessionals(list, { category: 'Todas', plan: 'Todos', uf: 'sp', cidade: 'Todas', bairro: 'Todos' })
    expect(r).toHaveLength(2)
  })
  it('profissional sem bairros declarados atende qualquer bairro', () => {
    const r = filterProfessionals(list, { category: 'Todas', plan: 'Todos', uf: 'Todas', cidade: 'Todas', bairro: 'Qualquer' })
    expect(r.map((p) => p.id)).toEqual(['2'])
  })
  it('filtra por bairro da cobertura', () => {
    const r = filterProfessionals(list, { category: 'Todas', plan: 'Todos', uf: 'Todas', cidade: 'Todas', bairro: 'centro' })
    expect(r.map((p) => p.id)).toEqual(['1'])
  })
  it('filtra por plano', () => {
    const r = filterProfessionals(list, { category: 'Todas', plan: 'ouro', uf: 'Todas', cidade: 'Todas', bairro: 'Todos' })
    expect(r.map((p) => p.id)).toEqual(['1', '3'])
  })
})

describe('paginate', () => {
  const list = Array.from({ length: 30 }, (_, i) => i)
  it('primeira página com 12 por página', () => {
    expect(paginate(list, 1, 12)).toHaveLength(12)
    expect(paginate(list, 3, 12)).toHaveLength(6)
    expect(paginate(list, 99, 12)).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar para verificar falha**

Run: `npm test`
Expected: FAIL — `Cannot find module './directoryFilters'`

- [ ] **Step 3: Implementar `src/lib/directoryFilters.ts`**

Mover a lógica de `src/App.vue` (`normalizeFilter` 670, corpo de `filteredProfessionals` 702–726, fatia de `paginatedProfessionals` 730–733):

```ts
export function normalizeFilter(value: string): string {
  return value.trim().toLowerCase()
}

export interface DirectoryFilters {
  category: string
  plan: string
  uf: string
  cidade: string
  bairro: string
}

export function filterProfessionals<
  T extends { category: string; plan: string; uf?: string; cidade?: string; coverage_bairros?: string[] },
>(list: T[], f: DirectoryFilters): T[] {
  let out = list
  if (f.category !== 'Todas') out = out.filter((p) => p.category === f.category)
  if (f.plan !== 'Todos') out = out.filter((p) => p.plan === f.plan)
  if (f.uf !== 'Todas') out = out.filter((p) => (p.uf || '').trim().toUpperCase() === f.uf)
  if (f.cidade !== 'Todas') out = out.filter((p) => normalizeFilter(p.cidade || '') === normalizeFilter(f.cidade))
  if (f.bairro !== 'Todos') {
    const target = normalizeFilter(f.bairro)
    out = out.filter((p) => {
      const coverage = (p.coverage_bairros ?? []).map((b) => b.trim()).filter(Boolean)
      if (coverage.length === 0) return true
      return coverage.some((b) => normalizeFilter(b) === target)
    })
  }
  return out
}

export function paginate<T>(list: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage
  return list.slice(start, start + perPage)
}
```

- [ ] **Step 4: Rodar teste**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Escrever e implementar `src/lib/requestStatus.ts` (ciclo completo)**

Teste `src/lib/requestStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { clientStatusGroup, formatRequestDate, statusSteps } from './requestStatus'

describe('clientStatusGroup', () => {
  it('agrupa os status do pipeline', () => {
    expect(clientStatusGroup('Pendente')).toBe('pendentes')
    expect(clientStatusGroup('Visita Agendada')).toBe('andamento')
    expect(clientStatusGroup('Em Execução')).toBe('andamento')
    expect(clientStatusGroup('Concluído')).toBe('concluidas')
    expect(clientStatusGroup('Cancelado')).toBe('concluidas')
  })
})

describe('formatRequestDate', () => {
  it('formata ISO dd/mm', () => {
    expect(formatRequestDate('2026-09-15T12:00:00Z')).toMatch(/\d{2}\/\d{2}/)
  })
  it('retorna traço sem data', () => {
    expect(formatRequestDate(undefined)).toBe('-')
  })
})

describe('statusSteps', () => {
  it('tem os 4 passos do pipeline', () => {
    expect(statusSteps).toEqual(['Pendente', 'Visita Agendada', 'Em Execução', 'Concluído'])
  })
})
```
Run `npm test` → FAIL (módulo ausente). Implementar movendo de `src/App.vue:113` (`statusSteps`), `:314-317` (`clientStatusGroup`), `:336-339` (`formatRequestDate`) — corpo **verbatim**. Run `npm test` → PASS.

- [ ] **Step 6: Criar `src/lib/categories.ts` e `src/lib/whatsapp.ts`**

```ts
// src/lib/categories.ts — mover de src/App.vue:86 e :118 (forma do array preservada)
export const CATEGORIES = [ /* ...array original completo... */ ]
export const CATEGORY_UNLISTED = 'Serviço que não está na lista'
```

```ts
// src/lib/whatsapp.ts — canônico
export function formatWhatsAppPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  return clean.length <= 11 ? `55${clean}` : clean
}

export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${formatWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`
}
```

- [ ] **Step 7: Unificar usos de WhatsApp**

1. `src/lib/analytics.ts`: **deletar** `buildWhatsAppLink` (45–49); manter `getWhatsAppNumber`.
2. `src/App.vue:5`: import passa a ser `import { trackEvent, getWhatsAppNumber } from './lib/analytics'` + `import { buildWhatsAppLink } from './lib/whatsapp'`.
3. `src/App.vue:154`: `window.open(buildWhatsAppLink(getWhatsAppNumber(), waMessage), '_blank', 'noopener')` (ordem trocada: phone primeiro).
4. `src/components/ProfessionalCard.vue:25-29`: deletar `getWhatsAppLink` local; `import { buildWhatsAppLink } from '../lib/whatsapp'` e no template `:href="buildWhatsAppLink(professional.phone, 'Olá! Gostaria de um orçamento.')"`.
5. `src/App.vue` `getWhatsAppLink(phone, text)` (1119): será removido junto com as views (Task 5) — **não** reimplementar; quem extrair view usa `buildWhatsAppLink`.

Run: `npm run typecheck && npm run lint && npm run build` → exit 0.

- [ ] **Step 8: Criar `src/composables/useUi.ts`**

Mover de `src/App.vue`: refs de modais (378–390), `isMobileMenuOpen` (1062), estado do schedule/rating (381–387). Adicionar toasts (novo):

```ts
import { ref } from 'vue'
import type { ServiceRequest } from '../types'

const viewReceiptModal = ref<ServiceRequest | null>(null)
const rateOrderModal = ref<ServiceRequest | null>(null)
const scheduleModal = ref<ServiceRequest | null>(null)
const showUpgradeModal = ref(false)
const showOnboardingPlans = ref(false)
const isMobileMenuOpen = ref(false)
const ratingStars = ref(5)
const ratingComment = ref('')
const scheduleDate = ref('')
const scheduleTime = ref('14:00')
const schedulePrice = ref('')
const scheduleObs = ref('')

const toasts = ref<{ id: number; kind: 'success' | 'error' | 'info' | 'warning'; message: string }[]>([])
let toastSeq = 0
export function pushToast(kind: 'success' | 'error' | 'info' | 'warning', message: string, ttlMs = 5000): void {
  const id = ++toastSeq
  toasts.value.push({ id, kind, message })
  if (ttlMs > 0) setTimeout(() => dismissToast(id), ttlMs)
}
export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useUi() {
  return { viewReceiptModal, rateOrderModal, scheduleModal, showUpgradeModal, showOnboardingPlans,
    isMobileMenuOpen, ratingStars, ratingComment, scheduleDate, scheduleTime, schedulePrice, scheduleObs,
    toasts, pushToast, dismissToast }
}
```

- [ ] **Step 9: Criar `src/composables/useNavigation.ts`**

Mover de `src/App.vue`: `activeTab` (116), `isScrolled`/`activeSection`/`teslaSections`/`onPageScroll` (186–203), `trackCta` (241), `openProfessionalsPage` (214, **sem** o `pushState` — vira `goToTab('profissionais')`), `scrollToId` (207), `goToModule` (437–446).

```ts
import { ref, computed } from 'vue'
import { trackEvent } from '../lib/analytics'

export type TabId = 'boas_vindas' | 'profissionais' | 'solicitar' | 'meus_pedidos' | 'recibos_cliente'
  | 'historico_cliente' | 'pedidos_pro' | 'faturamento' | 'perfil_pro' | 'historico_pro'

const activeTab = ref<TabId>('boas_vindas')
const isScrolled = ref(false)
const activeSection = ref('inicio')
const teslaSections = [ /* original de App.vue:188-193 */ ]

// Mapa único tab ↔ path (consumido pelo router na Task 8)
const TAB_PATHS: Record<TabId, string> = {
  boas_vindas: '/', profissionais: '/profissionais',
  solicitar: '/cliente/solicitar', meus_pedidos: '/cliente/pedidos',
  recibos_cliente: '/cliente/recibos', historico_cliente: '/cliente/historico',
  pedidos_pro: '/pro/pedidos', faturamento: '/pro/faturamento',
  perfil_pro: '/pro/perfil', historico_pro: '/pro/historico',
}
export function tabToPath(tab: TabId): string { return TAB_PATHS[tab] }
export function pathToTab(path: string): TabId | null {
  return (Object.entries(TAB_PATHS).find(([, p]) => p === path)?.[0] as TabId) ?? null
}
export function setTab(tab: TabId): void { activeTab.value = tab }

// Adapter: preenchido pelo router (Task 8); null = modo tab-based
let navigator: ((path: string) => void) | null = null
export function registerNavigator(fn: (path: string) => void): void { navigator = fn }

export function goToTab(tab: TabId): void {
  activeTab.value = tab
  navigator?.(TAB_PATHS[tab])
}
export function openProfessionalsPage(): void { goToTab('profissionais') }
export function trackCta(label: string): void { trackEvent('cta_click', { label }) }
export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
export function onPageScroll(): void {
  isScrolled.value = window.scrollY > 40
  // preservar lógica original de activeSection (App.vue:194-202) verbatim
}
export function goToModule(role: 'client' | 'pro', view: 'login' | 'register' = 'login'): void {
  // preservar lógica original de App.vue:437-446 verbatim (auth gate + goToTab)
}
export function useNavigation() {
  return { activeTab, isScrolled, activeSection, teslaSections, goToTab, setTab, goToModule,
    openProfessionalsPage, scrollToId, trackCta, onPageScroll }
}
```

**Obs.:** `navigator?.(tab)` ainda é no-op na Task 3 (nenhum adapter registrado) — `activeTab` continua mandando, como hoje. O módulo mantém `goToTab` como **única** forma de navegar; todos os `activeTab.value = ...` do App.vue passam a chamar `goToTab(...)`.

- [ ] **Step 10: Criar `src/composables/useAuth.ts`**

Mover de `src/App.vue`: refs (396–417, `proProfile` 343–364, `showProfileModal` 394), `hydrateAuth` (419–435), `loadProfessionalProfile` (448–455), `handleLogin` (457–482), `handleRegister` (484–553), `handleLogout` (555–588), `handleHeaderProfileClick` (785–797 — simplificado abaixo), `handleProfileModalSaved` (799–805).

Ajustes obrigatórios:
1. Trocar todos os `activeTab.value = X` internos por `goToTab(X)` (via `useNavigation()`).
2. `isLanding`: `const isLanding = computed(() => !authUser.value && activeTab.value === 'boas_vindas')`.
3. `handleHeaderProfileClick`: simplificar para `showProfileModal.value = true` (o `ProfileEditModal` popula os campos do objeto `professional` recebido; o form inline duplicado morre na Task 4).
4. `handleRegister` continua setando `showOnboardingPlans.value = true` via `useUi()`.
5. Imports do topo: API (`signInAuth`, `signUpAuth`, `signOutAuth`, `getCurrentAuthUser`, `getUserByAuthId`, `createUserRecord`, `createProfessional`), `useNavigation`, `useUi`.

- [ ] **Step 11: Criar `src/composables/usePlans.ts`**

Mover de `src/App.vue`: `plans` (748), `planMap` (590–594), `planLimitText` (171–174), `PLANS` (1260–1265), `PLAN_LABELS` (1267–1272), `formatBRL` (1275–1279), `dbPlanPrice` (1280–1283), `PLAN_PRICES` (1284–1289), `withDbLimit` (1292–1302), `displayPlans` (1305–1311), `currentPlanRow` (1212), `planFeatures` (1214–1230), `requestUsage` (1232–1242), `canReceiveRequests` (1244), `hasFeature` (1256–1258 com o fix da Task 2), `upgradeRecommendation` (1313–1319), `subscribePlan` (1025–1049), `handleOpenPortal` (1051–1061). Depende de `useAuth().proProfile`.

- [ ] **Step 12: Criar `src/composables/useProfessionals.ts`**

Mover de `src/App.vue`: `professionals` (342), `visibleProfessionals` (596–607), filtros (662–668), `resetDirectoryFilters` (672–678), `available*` (680–700), `filteredProfessionals` (702–726 — agora delegando para `filterProfessionals(...)` de `directoryFilters.ts` com `{ category: filterCategory.value, plan: filterPlan.value, uf: filterUf.value, cidade: filterCidade.value, bairro: filterBairro.value }`), `totalPages` (728), `paginatedProfessionals` (730–733 — `paginate(...)`), watch de reset de página (735–737), `prataBronzeCount` (619–624), `findProfessional` (1125–1128). Depende de `usePlans()` (`plans`, `planMap`).

- [ ] **Step 13: Criar `src/composables/useRequests.ts`**

Mover de `src/App.vue`: `requests` (306), `myRequests` (307–311), `clientStatusFilter` (313), `filteredClientRequests` (319–323), `historicClientRequests` (325–326), `historicProRequests` (328–334), `proRequests` (1246–1254), computeds de receita (1130–1164 — **verbatim, bug mantido até a Task 9**), `revenueChartOption` (1166–1210), `loadData` (755–771), `handleSaveSchedule` (957–981), `handleUpdateStatus` (983–1002), `handleSaveRating` (1004–1023).

- `loadData` preenche `requests`, `professionals` (via `useProfessionals`) e `plans` (via `usePlans`) — as refs são singletons de módulo, então escrever direto é seguro.
- Os 4 pontos que chamavam `await loadData()` (975, 997, 1015, 1035) continuam funcionando porque `loadData` é exportado do composable.
- `handleSaveSchedule`/`handleSaveRating` usam `useUi()` (modais) e `useAuth()` (`authUser`).

- [ ] **Step 14: Criar `src/composables/useQuoteForm.ts`**

Mover de `src/App.vue`: refs do form (367–376), `selectedProfessional` (609), `sendMode`/`formError` (617–618), `directCandidates` (611–616), `aiReadyToast` (1077), `handleChooseProfessional` (634–655), `clearProfessionalSelection` (657–660), `handlePhotoUpload` (1064–1077), `handleAnalyzeWithAI` (1079–1117), `handleConfirmOrder` (872–940), `resetForm` (942–955). Adicionar `aiFallback = ref(false)` (setado na Task 9; inicial `false`).

Ajustes obrigatórios:
1. `handleConfirmOrder` final: `activeTab.value = 'meus_pedidos'` → `goToTab('meus_pedidos')`.
2. `getWhatsAppLink` local: **não mover** — no `window.open` (linha 931) usar `buildWhatsAppLink(pro.phone, msg)` de `src/lib/whatsapp.ts`.
3. `handleChooseProfessional`: usa `useAuth()` (gate de login), `useProfessionals().filterCategory`, `goToTab('solicitar')`.
4. `CATEGORIES`/`CATEGORY_UNLISTED` vêm de `src/lib/categories.ts`.

- [ ] **Step 15: Rearmar `src/App.vue`**

O script do App passa a ser (aprox.):

```ts
import { onMounted, nextTick, watch } from 'vue'
import { useAuth } from './composables/useAuth'
import { useNavigation, ... } from './composables/useNavigation'
import { useRequests } from './composables/useRequests'
import { useProfessionals } from './composables/useProfessionals'
import { usePlans } from './composables/usePlans'
import { useQuoteForm } from './composables/useQuoteForm'
import { useUi } from './composables/useUi'
// ...desestruturar o que o template ainda usa diretamente
```

`onMounted` mantém: `loadData()`, `hydrateAuth()`, listeners de scroll/pointermove, `trackEvent('page_view_landing', ...)`. Remover `syncTabFromRoute`/`onRoutePopstate`/`popstate` listener (229–240, 1328, 1340) e o `pushState` de `openProfessionalsPage` — **navegação agora é só `goToTab`** (deep-link roteável chega na Task 8; o `PROFESSIONALS_ROUTE`/`syncTabFromRoute` migra para o router).

- [ ] **Step 16: Verificar**

```bash
grep -n "activeTab.value =" src/App.vue        # Expected: 0 ocorrências (só dentro de useNavigation)
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```
Smoke: login/cliente/pro, solicitar, diretório — tudo funcional (modo tab ainda).

- [ ] **Step 17: Commit**

```bash
git add -A && git commit -m "refactor: extrai estado para composables e libs puras testadas"
```

---

### Task 4: Componentes de layout + editor de perfil único

**Files:**
- Create: `src/components/layout/AppHeader.vue`, `AppFooter.vue`, `ClientSubTabs.vue`, `ProSubTabs.vue`, `ToastHost.vue`
- Create: `src/components/auth/AuthModal.vue`
- Create: `src/components/modals/UpgradeModal.vue`, `OnboardingPlansModal.vue`, `ScheduleModal.vue`, `RateModal.vue`, `ReceiptModal.vue`
- Modify: `src/App.vue`, `src/components/ProfileEditModal.vue`
- Delete (via remoção no App.vue): form inline de perfil (template 4437–4522 + `openProfileEditor`/`handleSaveProfile`/`handleAvatarUpload`/refs `editPro*`/`avatarFile`/`avatarPreview`/`isEditingProfile`/`isRegistering`)

**Interfaces:**
- Consumes: todas as composables da Task 3.
- Produces: `ClientSubTabs`/`ProSubTabs` — `props: { active: TabId }`, navega via `goToTab`; `ProfileEditModal` ganha modo **create** (`props.authId`, cria linha quando `professional === null`).

- [ ] **Step 1: `AuthModal.vue`**

Mover o bloco `<!-- AUTH MODAL (LOGIN / REGISTER) -->` (`src/App.vue:1457-1694`) para `src/components/auth/AuthModal.vue`. O componente usa `useAuth()` diretamente (refs são singletons); `v-if="showAuth"` fica no shell App. Ícones lucide e classes **verbatim**.

- [ ] **Step 2: `AppHeader.vue`**

Mover `<!-- HEADER TESLA -->` (1348–1424) + `<!-- MOBILE NAVIGATION DRAWER -->` (1425–1456). Usa `useAuth()` (`userMode`, `userProfile`, `proProfile`, `authUser`, `isLanding`, `handleLogout`, `handleHeaderProfileClick`), `useNavigation()` (`activeTab`, `isScrolled`, `teslaSections`, `scrollToId`, `openProfessionalsPage`, `goToModule`), `useUi()` (`isMobileMenuOpen`). Nomes de classes e `v-if` **verbatim**.

- [ ] **Step 3: `AppFooter.vue`**

Mover o bloco `<!-- FOOTER -->` (4959–4966) preservando exatamente o `v-if`/`v-show` que ele já tem no shell.

- [ ] **Step 4: `ClientSubTabs.vue` e `ProSubTabs.vue` (elimina as 8 duplicatas)**

Criar a partir das **boas cópias**: cliente → bloco original em `<!-- CLIENT SUB-TABS -->` de `meus_pedidos` (3481–3527, tem o badge correto); pro → `<!-- PRO SUB-TABS -->` de `pedidos_pro` (3899–3947).

```vue
<!-- src/components/layout/ClientSubTabs.vue -->
<script setup lang="ts">
import { useNavigation, type TabId } from '../../composables/useNavigation'
import { useRequests } from '../../composables/useRequests'
defineProps<{ active: TabId }>()
const { goToTab } = useNavigation()
const { myRequests } = useRequests()
</script>
<template>
  <!-- barra de 4 botões, classes da cópias original; clicks → goToTab('solicitar'|'meus_pedidos'|'recibos_cliente'|'historico_cliente') -->
  <!-- badge do botão "Meus Pedidos": myRequests.length (correção do bug de badges) -->
</template>
```

`ProSubTabs.vue` análogo (`pedidos_pro`, `faturamento`, `perfil_pro`, `historico_pro`; sem badge ou com o mesmo padrão das boas cópias pro).

Substituir as **8** ocorrências de `<!-- CLIENT SUB-TABS -->`/`<!-- PRO SUB-TABS -->` no App.vue por `<ClientSubTabs :active="activeTab" />` / `<ProSubTabs :active="activeTab" />`.

Verificar: `grep -c "CLIENT SUB-TABS\|PRO SUB-TABS" src/App.vue` → 0 (os comentários saíram junto).

- [ ] **Step 5: `ToastHost.vue` + montagem**

```vue
<script setup lang="ts">
import { useUi } from '../../composables/useUi'
const { toasts, dismissToast } = useUi()
</script>
<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px]">
    <div v-for="t in toasts" :key="t.id"
      class="rounded-xl border p-3 text-sm shadow-lg backdrop-blur-sm"
      :class="{
        'bg-emerald-500/10 border-emerald-500/30 text-emerald-200': t.kind === 'success',
        'bg-red-500/10 border-red-500/30 text-red-200': t.kind === 'error',
        'bg-amber-500/10 border-amber-500/30 text-amber-200': t.kind === 'warning',
        'bg-slate-800/90 border-slate-700 text-slate-200': t.kind === 'info',
      }" role="status">
      <div class="flex items-start justify-between gap-2">
        <span>{{ t.message }}</span>
        <button class="shrink-0 opacity-60 hover:opacity-100" @click="dismissToast(t.id)">×</button>
      </div>
    </div>
  </div>
</template>
```
Montar `<ToastHost />` no shell do App (junto ao footer).

- [ ] **Step 6: Modais globais**

Mover cada bloco (marcadores abaixo) para `src/components/modals/`, com `v-if` do estado `useUi()` **dentro** do próprio componente (`v-if` externo no shell removido — o componente se auto-gerencia):

| Arquivo | Marcador em `src/App.vue` |
|---|---|
| `UpgradeModal.vue` | `<!-- UPGRADE MODAL -->` (4625) |
| `OnboardingPlansModal.vue` | `<!-- ONBOARDING PLANS (after pro registration) -->` (4626) |
| `ScheduleModal.vue` | `<!-- MODAL 1: SCHEDULE VISIT / SET COST -->` (4745) |
| `RateModal.vue` | `<!-- MODAL 2: RATE SERVICE -->` (4819) |
| `ReceiptModal.vue` | `<!-- MODAL 3: VIEW & PRINT DIGITAL RECEIPT -->` (4882) |

Cada um importa o que usa: `UpgradeModal`/`OnboardingPlansModal` → `usePlans` (`displayPlans`, `subscribePlan`, `formatBRL`) + `useUi`; `ScheduleModal` → `useUi` + `useRequests.handleSaveSchedule`; `RateModal` → `useUi` + `useRequests.handleSaveRating`; `ReceiptModal` → `useUi` + `useRequests.requests` + `useProfessionals.findProfessional` + `buildWhatsAppLink` (se o botão de WhatsApp existir lá). Markup **verbatim**.

- [ ] **Step 7: `ProfileEditModal` ganha modo create + deletar editor inline**

1. Em `src/components/ProfileEditModal.vue`:
   - Adicionar prop `authId: string | null`.
   - `title`: `props.role === 'pro' && !props.professional ? 'Cadastrar Perfil Profissional' : (props.role === 'pro' ? 'Editar Perfil Profissional' : 'Editar Meus Dados')`.
   - Em `handleSave` (linha 113), quando `role === 'pro'` **e** `!props.professional`: em vez de `if (!professional) return`, chamar `createProfessional({ ...payload, auth_id: props.authId })` com os mesmos campos do payload do `updateProfessional` (linhas 131–140) + defaults `rating: 0, reviews_count: 0, plan: 'gratuito', plan_status: 'active', stripe_customer_id: null, stripe_subscription_id: null, plan_expires_at: null, requests_this_month: 0, requests_reset_at: null` — copiando os defaults de `handleRegister` (`src/App.vue:530-541`). Guard: `if (!props.authId) { fail('Faça login novamente para cadastrar o perfil.'); return }`. Emitir `saved` com a linha criada.
   - Importar `createProfessional` de `../../api/insforgeService`.
2. No shell `App.vue`, passar `:auth-id="authUser?.id ?? null"` ao `ProfileEditModal`.
3. **Deletar** do App.vue: template `<!-- EDIT PROFILE FORM -->` (4437–4522) e script `openProfileEditor` (773–783), `handleAvatarUpload` (807–818), `handleSaveProfile` (820–870), refs `editProName..editProBio` (739–744), `avatarFile`/`avatarPreview` (745–746), `isEditingProfile` (392), `isRegistering` (393).
4. Condições de template que somem: `v-if="proProfile.id && !isEditingProfile"` → `v-if="proProfile.id"` (4265, 4334); bloco `v-if="!proProfile.id && !isRegistering"` (4251) → `v-if="!proProfile.id"`; botão (4256) → `@click="showProfileModal = true"`.
5. `handleProfileModalSaved` permanece (atualiza `proProfile`/`userProfile`).

- [ ] **Step 8: Verificar**

```bash
grep -c "alert(" src/App.vue            # ainda 12 (Task 9); não é gate aqui
grep -c "EDIT PROFILE FORM" src/App.vue # 0
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```
Smoke: header/drawer navegam; login/register modal ok; sub-tabs navegam com badge correto; abrir/agendar/avaliar/recibo/plano funcionam; perfil pro edita via modal **e** profissional novo cadastra via modal (fluxo `!proProfile.id`).

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "refactor: extrai header, auth modal, sub-tabs unificadas, modais e ToastHost; unifica editor de perfil"
```

---

### Task 5: Views — landing + diretório

**Files:**
- Create: `src/views/landing/LandingView.vue`, `src/views/professionals/DirectoryView.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: composables da Task 3; componentes da Task 4.
- Produces: `<LandingView v-if="activeTab === 'boas_vindas'" />`, `<DirectoryView v-if="activeTab === 'profissionais'" />` no shell.

- [ ] **Step 1: `LandingView.vue`**

Mover o bloco `<!-- LANDING TESLA STACK -->` (1697–2013, após Task 1 — inicia no comentário da landing e termina antes de `<!-- ROTA PÚBLICA #/profissionais`) para a view. Mover do script: `contactForm`/`contactSubmitting`/`contactSuccess`/`handleContactSubmit` (120–163), `heroVideoUrl` (169), `openFaq`/`faqs` (170–181), `partnerLogos` (183), `handleLandingCategory` (626–632), motion local: `handleTilt`/`resetTilt`/`cursorGlow`/`onCursorMove`/`initPremiumMotion`/`gsapCtx` (244–304) — com `onMounted` (listeners + `initPremiumMotion`) e `onUnmounted` (remover listeners + `gsapCtx.revert()`) **na view**.

- `handleLandingCategory` usa `useNavigation().trackCta/goToTab`, `useProfessionals().filterCategory/directoryPage`, `useQuoteForm().selectedCategory`.
- `faqs` usa `usePlans().dbPlanPrice/planLimitText`.
- `scrollToId`, `teslaSections`, `isScrolled`, `onPageScroll` vêm de `useNavigation()` (escutados no `onMounted` da view; remover os listeners globais correspondentes do App).
- Template do App: `<LandingView v-if="activeTab === 'boas_vindas'" />`.

- [ ] **Step 2: `DirectoryView.vue`**

Mover `<!-- ROTA PÚBLICA #/profissionais: CATÁLOGO POR PROFISSÃO -->` (2787–2876). A view usa `useProfessionals()` (filtros, `paginatedProfessionals`, `totalPages`, `prataBronzeCount`, `available*`, `resetDirectoryFilters`) e `useQuoteForm().handleChooseProfessional`. Nenhum estado novo.

- [ ] **Step 3: Verificar e commitar**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```
Smoke: landing (FAQ, categorias, contato→WhatsApp), diretório (filtros, paginação, "Escolher e solicitar" → login gate).

```bash
git add -A && git commit -m "refactor: extrai LandingView e DirectoryView"
```

---

### Task 6: Views — cliente (4)

**Files:**
- Create: `src/views/client/SolicitarView.vue`, `MeusPedidosView.vue`, `RecibosView.vue`, `HistoricoView.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Produces: 4 blocos `v-if` no shell (`solicitar`, `meus_pedidos`, `recibos_cliente`, `historico_cliente`).

- [ ] **Step 1: `SolicitarView.vue`**

Mover `<!-- MODE CLIENT: TAB 1 - SOLICITAR COM IA -->` (2877–3478). Substituir as 4 cópias inline da sub-tab pelo `<ClientSubTabs :active="activeTab" />`. A view monta todo o `useQuoteForm()`; `CATEGORIES` de `lib/categories`; banner `aiReadyToast` mantido.

- [ ] **Step 2: `MeusPedidosView.vue`**

Mover `<!-- MODE CLIENT: TAB 2 - MEUS PEDIDOS & STATUS -->` (3479–3697). Usa `useRequests()` (`myRequests`, `filteredClientRequests`, `clientStatusFilter`, `statusSteps` de `lib/requestStatus`, `findProfessional` de `useProfessionals`, `handleUpdateStatus`), `useUi()` (modais de agendar/avaliar/recibo), `buildWhatsAppLink` de `lib/whatsapp` (substitui o `getWhatsAppLink` local), `usePlans().hasFeature('whatsappVisible')`.

- [ ] **Step 3: `RecibosView.vue`**

Mover `<!-- MODE CLIENT: TAB 3 - MEUS RECIBOS DIGITAIS -->` (3698–3780). Lista pedidos com `receipt_issued`; abrir recibo → `useUi().viewReceiptModal` (modal global da Task 4).

- [ ] **Step 4: `HistoricoView.vue` (cliente)**

Mover `<!-- MODE CLIENT: HISTÓRICO DE PEDIDOS -->` (3781–3896). Usa `useRequests().historicClientRequests` + sub-tab.

- [ ] **Step 5: Verificar e commitar**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```
Smoke do cliente: solicitar (foto→IA→envio direto/broadcast→confirmação), meus pedidos (filtro, timeline, agendar/avaliar via modal, WhatsApp), recibos (ver/imprimir), histórico.

```bash
git add -A && git commit -m "refactor: extrai views do cliente (solicitar, pedidos, recibos, historico)"
```

---

### Task 7: Views — profissional (4) + shell final do App.vue

**Files:**
- Create: `src/views/pro/PedidosProView.vue`, `FaturamentoView.vue`, `PerfilProView.vue`, `HistoricoView.vue` (pro)
- Modify: `src/App.vue` (deve ficar <400 linhas ao final)

**Interfaces:**
- Produces: 4 blocos `v-if` pro no shell; `wc -l src/App.vue < 400`.

- [ ] **Step 1: `PedidosProView.vue`**

Mover `<!-- MODE PRO: TAB 1 - PAINEL DE ATENDIMENTOS -->` (3897–4098). Usa `useRequests().proRequests/handleUpdateStatus`, gate `canReceiveRequests`/`planFeatures` de `usePlans`, `useUi` (schedule modal), `buildWhatsAppLink`.

- [ ] **Step 2: `FaturamentoView.vue`**

Mover `<!-- MODE PRO: TAB 2 - RELATÓRIO DE FATURAMENTO -->` (4099–4216). Computeds de receita (`revenueChartData`, `totalRevenueMonth`, `completedCount`, `avgTicket`, `revenueChartOption`) saem de `useRequests` para **dentro desta view** (não são usados por mais ninguém; a Task 9 os refatora aqui). Gating `hasFeature('advancedReports')` via `usePlans`. **Não corrigir as métricas aqui** — Task 9.

- [ ] **Step 3: `PerfilProView.vue`**

Mover `<!-- MODE PRO: TAB 3 - PERFIL PROFISSIONAL -->` (4216–4523), **incluindo** os remanescentes do editor inline já deletados na Task 4. Usa `useAuth()` (`proProfile`, `showProfileModal`, `handleProfileModalSaved`), `usePlans()` (`displayPlans`, `PLAN_LABELS`, `requestUsage`, `upgradeRecommendation`, `subscribePlan`, `handleOpenPortal`), `<ProfileEditModal>` **não** é montado aqui (fica no shell — é aberto também pelo header do cliente).

- [ ] **Step 4: `HistoricoView.vue` (pro)**

Mover `<!-- MODE PRO: HISTÓRICO DE ATENDIMENTOS -->` (4524–4624). Usa `useRequests().historicProRequests` + sub-tab.

- [ ] **Step 5: Shell final do App.vue**

O App.vue deve conter apenas: imports de composables/componentes, `onMounted` de bootstrap (`loadData`, `hydrateAuth`), template com `<AppHeader />`, blocos `v-if` das 10 views, `<AuthModal v-if="showAuth" />`, `<ProfileEditModal v-if="showProfileModal" ... />`, `<ToastHost />`, `<AppFooter />` (com a condição atual) — e nada mais.

```bash
wc -l src/App.vue                     # Expected: < 400
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```
Smoke: painel pro (gate de plano, agendar, WhatsApp), faturamento (gráfico renderiza — valores ainda "errados", ok), perfil (card + planos + portal), histórico pro.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: extrai views do profissional; App.vue vira shell (<400 linhas)"
```

---

### Task 8: Router + guards por role

**Files:**
- Create: `src/router/guards.ts`, `src/router/guards.test.ts`, `src/router/index.ts`
- Modify: `src/main.ts`, `src/App.vue`, `src/composables/useNavigation.ts`, `src/composables/useAuth.ts` (login/register navegam via `goToTab` — já feito), `src/components/auth/AuthModal.vue` (redirect pós-login)

**Interfaces:**
- Consumes: `useNavigation.registerNavigator/tabToPath/pathToTab/setTab` (Task 3), `useAuth` (guard).
- Produces: rotas conforme tabela do spec; `evaluateRouteGuard(input): GuardResult`.

- [ ] **Step 1: Instalar vue-router**

```bash
npm i vue-router
```

- [ ] **Step 2: Teste falho do guard**

Criar `src/router/guards.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { evaluateRouteGuard } from './guards'

describe('evaluateRouteGuard', () => {
  it('rota pública passa', () => {
    expect(evaluateRouteGuard({ isAuthenticated: false, currentRole: null })).toEqual({ action: 'allow' })
  })
  it('visitante em rota protegida redireciona para / com openAuth e fullPath salvo', () => {
    const r = evaluateRouteGuard({
      requiresAuth: true, role: 'client', isAuthenticated: false, currentRole: null,
      fullPath: '/cliente/recibos',
    })
    expect(r).toEqual({ action: 'redirect', to: '/', openAuth: 'login', redirect: '/cliente/recibos' })
  })
  it('logado com role errada vai para a home da própria role (pro)', () => {
    const r = evaluateRouteGuard({ requiresAuth: true, role: 'client', isAuthenticated: true, currentRole: 'pro' })
    expect(r).toEqual({ action: 'redirect', to: '/pro/pedidos' })
  })
  it('logado com role certa passa', () => {
    expect(
      evaluateRouteGuard({ requiresAuth: true, role: 'client', isAuthenticated: true, currentRole: 'client' }),
    ).toEqual({ action: 'allow' })
  })
})
```

Run: `npm test` → FAIL (`Cannot find module './guards'`).

- [ ] **Step 3: Implementar `src/router/guards.ts`**

```ts
export interface GuardInput {
  requiresAuth?: boolean
  role?: 'client' | 'pro'
  isAuthenticated: boolean
  currentRole: 'client' | 'pro' | null
  fullPath?: string
}
export type GuardResult =
  | { action: 'allow' }
  | { action: 'redirect'; to: string; openAuth?: 'login'; redirect?: string }

export function evaluateRouteGuard(input: GuardInput): GuardResult {
  if (!input.requiresAuth) return { action: 'allow' }
  if (!input.isAuthenticated) {
    return { action: 'redirect', to: '/', openAuth: 'login', redirect: input.fullPath }
  }
  if (input.role && input.currentRole !== input.role) {
    return { action: 'redirect', to: input.currentRole === 'pro' ? '/pro/pedidos' : '/cliente/solicitar' }
  }
  return { action: 'allow' }
}
```

Run: `npm test` → PASS (4 testes).

- [ ] **Step 4: `src/router/index.ts`**

```ts
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { evaluateRouteGuard } from './guards'
import { useAuth } from '../composables/useAuth'
import { registerNavigator, pathToTab, setTab } from '../composables/useNavigation'
import LandingView from '../views/landing/LandingView.vue'
import DirectoryView from '../views/professionals/DirectoryView.vue'
import SolicitarView from '../views/client/SolicitarView.vue'
import MeusPedidosView from '../views/client/MeusPedidosView.vue'
import RecibosView from '../views/client/RecibosView.vue'
import ClienteHistoricoView from '../views/client/HistoricoView.vue'
import PedidosProView from '../views/pro/PedidosProView.vue'
import FaturamentoView from '../views/pro/FaturamentoView.vue'
import PerfilProView from '../views/pro/PerfilProView.vue'
import ProHistoricoView from '../views/pro/HistoricoView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const client = (name: string, component: RouteRecordRaw['component'], path: string): RouteRecordRaw => ({
  path, name, component, meta: { requiresAuth: true, role: 'client' },
})
const pro = (name: string, component: RouteRecordRaw['component'], path: string): RouteRecordRaw => ({
  path, name, component, meta: { requiresAuth: true, role: 'pro' },
})

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'landing', component: LandingView },
    { path: '/profissionais', name: 'profissionais', component: DirectoryView },
    client('cliente-solicitar', SolicitarView, '/cliente/solicitar'),
    client('cliente-pedidos', MeusPedidosView, '/cliente/pedidos'),
    client('cliente-recibos', RecibosView, '/cliente/recibos'),
    client('cliente-historico', ClienteHistoricoView, '/cliente/historico'),
    pro('pro-pedidos', PedidosProView, '/pro/pedidos'),
    pro('pro-faturamento', FaturamentoView, '/pro/faturamento'),
    pro('pro-perfil', PerfilProView, '/pro/perfil'),
    pro('pro-historico', ProHistoricoView, '/pro/historico'),
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

router.beforeEach(async (to) => {
  const { authUser, userProfile, hydrateAuth, showAuth, authView } = useAuth()
  if (!authUser.value) await hydrateAuth()
  const result = evaluateRouteGuard({
    requiresAuth: !!to.meta.requiresAuth,
    role: to.meta.role as 'client' | 'pro' | undefined,
    isAuthenticated: !!authUser.value,
    currentRole: userProfile.value?.role ?? null,
    fullPath: to.fullPath,
  })
  if (result.action === 'allow') return true
  if (result.openAuth) { authView.value = result.openAuth; showAuth.value = true }
  return result.redirect ? { path: '/', query: { redirect: result.redirect } } : result.to
})

registerNavigator((path) => { void router.push(path) })
router.afterEach((to) => {
  const tab = pathToTab(to.path)
  if (tab) setTab(tab)
})
```

`hydrateAuth()` é idempotente (checa cookie de sessão antes de consultar) — chamá-lo no guard não duplica efeitos colaterais.

- [ ] **Step 5: Criar `src/views/NotFoundView.vue`**

Página simples pt-BR no estilo do app (logo `src/style.css` + classes `slate/amber`): "Página não encontrada" + botões "Voltar ao início" (`router.push('/')`) e "Ver profissionais" (`router.push('/profissionais')`).

- [ ] **Step 6: `main.ts` — registrar router**

```ts
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import VueECharts from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { router } from './router'

use([CanvasRenderer, BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent])

const app = createApp(App)
app.component('v-chart', VueECharts)
app.use(router)
app.mount('#app')
```

- [ ] **Step 7: App.vue — trocar v-if por router-view**

1. No shell, substituir os **10** blocos `<XView v-if="activeTab === '...'" />` por `<router-view />` (o guard já controla acesso por role; as views continuam recebendo o que precisam das composables).
2. Remover qualquer `activeTab` condicional residual no template do shell (header/footer ficam com `isLanding`/route).
3. `useNavigation`: remover `syncTabFromRoute`/`PROFESSIONALS_ROUTE`/watcher de `pushState` que ainda existirem; `openProfessionalsPage = () => goToTab('profissionais')`.

- [ ] **Step 8: Pós-login/registro/logout navegam por rota**

Em `src/components/auth/AuthModal.vue` (após os awaits de `handleLogin`/`handleRegister` com sucesso — o handler já chama `goToTab` via useAuth; aqui entra o redirect salvo):

```ts
import { useRouter, useRoute } from 'vue-router'
const router = useRouter()
const route = useRoute()
// dentro do submit, após confirmar que handleLogin/handleRegister não setou authError:
const redirect = route.query.redirect
if (typeof redirect === 'string' && redirect.startsWith('/')) await router.push(redirect)
```

`handleLogout` (useAuth): após logout, `goToTab('boas_vindas')` (já deve fazer isso — verificar).

- [ ] **Step 9: Verificar**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```
Smoke de rotas:
1. `#/profissionais` direto (deep-link) renderiza o diretório.
2. Visitante abre `#/cliente/pedidos` → redireciona `#/` + modal de login aberto; login → cai em `#/cliente/pedidos` (redirect preservado).
3. Cliente logado abre `#/pro/perfil` → redireciona `#/cliente/solicitar`.
4. Pro logado em `#/pro/faturamento` → ok; logout → `#/`.
5. URL inválida → NotFound.
6. Header/sub-tabs navegam; voltar/avançar do navegador funciona (router), `popstate` antigo removido.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: adiciona vue-router com guards por role, deep-links e NotFound"
```

---

### Task 9: Bugs — faturamento real, toasts, IA/upload

**Files:**
- Create: `src/lib/revenue.ts`, `src/lib/revenue.test.ts`
- Modify: `src/views/pro/FaturamentoView.vue`, `src/composables/useRequests.ts` (remover computeds de receita), `src/composables/useQuoteForm.ts`, `src/App.vue`/views (alerts → toasts)

**Interfaces:**
- Produces: `computeMonthlySummary(requests, now?): MonthlySummary`.

- [ ] **Step 1: Teste falho de `src/lib/revenue.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { computeMonthlySummary } from './revenue'

const req = (status: string, final_price: number | null, created_at: string) => ({ status, final_price, created_at })

describe('computeMonthlySummary', () => {
  const now = new Date(2026, 8, 20) // 20/09/2026
  const requests = [
    req('Concluído', 100, '2026-09-10T10:00:00Z'),
    req('Concluído', 200, '2026-09-15T10:00:00Z'),
    req('Concluído', 50, '2026-08-20T10:00:00Z'),   // mês anterior
    req('Concluído', 999, '2026-07-01T10:00:00Z'),  // fora da janela
    req('Em Execução', 500, '2026-09-12T10:00:00Z'), // não concluído
    req('Concluído', null, '2026-09-11T10:00:00Z'),  // sem preço
  ]
  it('calcula mês corrente, anterior, delta e médias', () => {
    const s = computeMonthlySummary(requests, now)
    expect(s.total).toBe(300)
    expect(s.previousTotal).toBe(50)
    expect(s.deltaPercent).toBe(500)
    expect(s.completedCount).toBe(2)
    expect(s.avgTicket).toBe(150)
    expect(s.avgPerDay).toBe(15)      // 300 / dia 20
    expect(s.monthLabel).toBe('setembro')
  })
  it('delta null quando mês anterior zerado', () => {
    const s = computeMonthlySummary([req('Concluído', 100, '2026-09-01T10:00:00Z')], now)
    expect(s.deltaPercent).toBeNull()
    expect(s.previousTotal).toBe(0)
  })
  it('tudo zerado sem pedidos', () => {
    const s = computeMonthlySummary([], now)
    expect(s.total).toBe(0)
    expect(s.avgTicket).toBe(0)
    expect(s.completedCount).toBe(0)
  })
})
```

Run: `npm test` → FAIL (módulo ausente).

- [ ] **Step 2: Implementar `src/lib/revenue.ts`**

```ts
export interface MonthlySummary {
  monthLabel: string
  total: number
  previousTotal: number
  deltaPercent: number | null
  completedCount: number
  avgTicket: number
  avgPerDay: number
}

export function computeMonthlySummary(
  requests: Array<{ status: string; final_price?: number | null; created_at: string }>,
  now: Date = new Date(),
): MonthlySummary {
  const month = now.getMonth()
  const year = now.getFullYear()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const done = requests.filter((r) => r.status === 'Concluído' && r.final_price)
  const ofMonth = done.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === month && d.getFullYear() === year
  })
  const ofPrev = done.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  })

  const total = ofMonth.reduce((acc, r) => acc + (r.final_price || 0), 0)
  const previousTotal = ofPrev.reduce((acc, r) => acc + (r.final_price || 0), 0)
  const completedCount = ofMonth.length

  return {
    monthLabel: now.toLocaleDateString('pt-BR', { month: 'long' }),
    total,
    previousTotal,
    deltaPercent: previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : null,
    completedCount,
    avgTicket: completedCount ? total / completedCount : 0,
    avgPerDay: total / now.getDate(),
  }
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: `FaturamentoView.vue` usa a síntese real**

1. No componente: `const summary = computed(() => computeMonthlySummary(requests.value, new Date()))`.
2. Os computeds de receita já estão **dentro da view** (movidos na Task 7, com o bug ainda intacto): substituir `totalRevenueMonth`, `completedCount` e `avgTicket` pelos campos de `summary`; manter `revenueChartData`/`revenueChartOption` locais, mas o ponto do mês corrente passa a usar `summary.total` (meses anteriores mantêm o filtro mensal já existente). `grep -rn "totalRevenueMonth\|avgTicket" src/` ao final deve retornar **só** a view (nenhuma composable).
3. Copy (localizar por `grep -n "Acumulado\|em relação ao mês\|serviços por dia" src/views/pro/FaturamentoView.vue`):
   - Título: `Faturamento de {{ capitalize(summary.monthLabel) }}` (sem "(Acumulado)").
   - Chip de variação: só renderizar se `summary.deltaPercent !== null`; texto `{{ summary.deltaPercent > 0 ? '+' : '' }}{{ summary.deltaPercent }}% vs mês anterior`; classe verde se `> 0`, vermelha se `< 0`, slate se `0`. **Remover o `+18.4%` hardcoded.**
   - Média: `Média de {{ (summary.completedCount / new Date().getDate()).toFixed(1) }} serviços por dia` — ou seja, `summary.completedCount / hoje` (decimal com vírgula via helper `formatDecimal`). **Remover "1.1" fixo.**
4. Tooltip do gráfico: `formatter: (params) => 'R$ ' + Number(params.value).toFixed(2).replace('.', ',')` (centavos).

- [ ] **Step 4: 12 `alert()` → `pushToast`**

```bash
grep -n "alert(" src/App.vue src/views/**/*.vue src/composables/*.ts src/components/**/*.vue
```
Para cada um, substituir `alert(msg)` por `pushToast('error', msg)` (importar `useUi` onde necessário). Os 12 originais: `src/App.vue:823,832,856,868,979,1000,1021,1028,1039,1047,1058,1081` (linhas podem ter se movido com as extrações — confiar no grep). Os de validação de telefone (823) e "foto antes da análise" (1081) viram `pushToast('warning', ...)`.
Gate: `grep -rn "alert(" src/ --include=*.vue --include=*.ts` → **0 resultados** (testes excluídos por não usarem).

- [ ] **Step 5: Aviso de fallback de IA (useQuoteForm)**

Em `handleAnalyzeWithAI`:
```ts
aiFallback.value = false
// no try:
latestAiResult.value = res.analysis
aiFallback.value = res.status !== 'ready' || !(res.analysis.suggestedMinPrice > 0 || res.analysis.suggestedMaxPrice > 0)
// no catch (após montar o fallback):
aiFallback.value = true
pushToast('warning', 'A IA está indisponível no momento. Mostrando uma estimativa preliminar.')
```
No `SolicitarView.vue`, banner persistente (abaixo do card de resultado, condicional):

```vue
<div v-if="aiFallback && latestAiResult"
  class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
  <AlertTriangle :size="14" class="mt-0.5 shrink-0" />
  <span>IA indisponível — análise preliminar. Os valores sugeridos podem não refletir a realidade; confirme com o profissional.</span>
</div>
```
(`AlertTriangle` de `lucide-vue-next` — já é dependência.)

- [ ] **Step 6: Falha de upload aborta o pedido (useQuoteForm)**

Em `handleConfirmOrder`, o catch do upload (hoje só `console.error`) passa a:

```ts
try {
  photoUrl = await uploadServicePhoto(photoFile.value, authUser.value.id)
} catch (err) {
  console.error('Erro ao enviar foto:', err)
  pushToast('error', 'Não foi possível enviar a foto do serviço. Tente novamente.')
  formError.value = 'Falha no envio da foto. Tente novamente.'
  return
}
```
(Não criar o pedido sem foto quando o arquivo existia.)

- [ ] **Step 7: Verificar + commit**

```bash
grep -rn "alert(" src/ --include=*.vue --include=*.ts | grep -v test   # 0
grep -rn "+18.4%\|1.1 serviços" src/                                   # 0
npm run typecheck && npm run lint && npm test && npm run build          # exit 0
```
Smoke: faturamento mostra mês atual/delta real (ou chip oculto sem dado); um erro de rede vira toast; sem chave NVIDIA a análise mostra aviso âmbar.

```bash
git add -A && git commit -m "fix: faturamento real por mes, toasts no lugar de alert, aviso de fallback de IA e upload aborta pedido"
```

---

### Task 10: Verificação final + README

**Files:**
- Modify: `README.md`
- (nenhum código, salvo correções de gate)

- [ ] **Step 1: Gates automatizados**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```
Expected: exit 0.

- [ ] **Step 2: Gates de estrutura**

```bash
wc -l src/App.vue                                          # < 400
grep -c 'v-if="false"' src/App.vue                          # 0
grep -rn "alert(" src/ --include=*.vue --include=*.ts | grep -v test  # 0
grep -c "CLIENT SUB-TABS" src/App.vue                       # 0 (só existe o componente)
grep -rn "syncTabFromRoute\|pushState" src/                 # 0
ls src/router/index.ts src/composables/useAuth.ts src/views/client/SolicitarView.vue   # existem
```

- [ ] **Step 3: Smoke completo (checklist)**

Com `npm run dev`:
1. Visitante: landing → FAQ/categorias/contato → `#/profissionais` deep-link → filtros → "Escolher e solicitar" → modal de login com `redirect`.
2. Cadastro cliente → cai em `#/cliente/solicitar` → foto → análise (fallback com aviso se sem chave) → broadcast e envio direto → `#/cliente/pedidos` com badge.
3. Cliente: filtros de status, timeline, agendar (modal), avaliar (estrelas), recibos, histórico, WhatsApp deep-link.
4. Cadastro profissional → onboarding de planos → `#/pro/pedidos` (gate gratuito), perfil (criar/editar via modal único), faturamento (mês real), histórico.
5. Assinatura Stripe: `subscribePlan` abre checkout (modo teste) — apenas verificar que a URL abre.
6. Role errada redireciona; logout volta à landing; URL inválida → NotFound; voltar/avançar do browser ok.

- [ ] **Step 4: README**

Reescrever `README.md` (o atual manda rodar `npx tsx server/index.ts`, que não existe mais):

```markdown
# Casa Obras e Reparos — Gestão, Orçamentos & Agendamento com IA

Plataforma para prestadores de serviços gerais e clientes com análise de imagem por IA, agendamento de visitas, notificações WhatsApp, recibos digitais e relatórios de faturamento.

## Rodando local

Pré-requisitos: Node.js 20+

1. `npm install`
2. Copie `.env.example` para `.env` e preencha `VITE_INSFORGE_URL` e `VITE_INSFORGE_ANON_KEY`
3. `npm run dev`

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck (vue-tsc) + build de produção
- `npm run typecheck` — verificação de tipos (inclui `.vue`)
- `npm run lint` — ESLint
- `npm test` / `npm run test:watch` — testes (Vitest)

## Backend

Sem servidor local: auth, banco, storage, pagamentos (Stripe) e functions rodam no InsForge (`functions/`), com migrations em `migrations/`.
```

- [ ] **Step 5: Commit final**

```bash
git add -A && git commit -m "docs: atualiza README (sem servidor local, comandos novos) e marca Fundacao concluida"
```

---

## Self-Review (do autor do plano)

1. **Spec coverage:** páginas mortas (T1) ✓; vue-router+guards+hash (T8) ✓; composables/views/shell<400 (T3–T7) ✓; sub-tabs unificadas (T4) ✓; 7 bugs (badges T4, faturamento/toast/IA/upload/editor T4+T9) ✓; código morto+exports (T1) ✓; WhatsApp unificado (T3) ✓; PLANS duplicados (T1 mata os R$29/R$79; T3 concentra em `usePlans`) ✓; vue-tsc+Vitest (T2) ✓; testes listados (quoteFlow, filtros, guards, faturamento, status) ✓; critérios de pronto (T10) ✓. Deviations documentadas no topo.
2. **Placeholder scan:** sem TBD/"implementar depois"; blocos de código reais em todos os passos de teste/config/cor; extrações referenciam marcadores de comentário estáveis + linha original.
3. **Type consistency:** `buildWhatsAppLink(phone, text)` em todos os call sites (T3); `goToTab`/`tabToPath`/`pathToTab` idênticos entre `useNavigation` e `router/index.ts`; `computeMonthlySummary(requests, now)` teste↔implementação; `evaluateRouteGuard` com `fullPath` no teste e no `beforeEach`.
