# Planos sinceros + Fotos + Categorias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar os planos verdadeiros (limites aplicados), com galeria de fotos 0/1/3/5 e múltiplas categorias 1/1/3/∞.

**Architecture:** Novas colunas-fonte no banco (`max_photos`, `max_categories`, `categories[]`, `portfolio_photos[]`); `category` texto mantida como primária para não quebrar leitores; lógica pura em `lib/`; UI segue os padrões existentes (avatar upload, checkbox de bairro, selects do diretório).

**Tech Stack:** Vue 3 + TypeScript + Vitest (TDD nas libs) + InsForge (migration, storage `service-photos`).

**Spec:** `docs/superpowers/specs/2026-10-01-planos-fotos-categorias-design.md`

## Global Constraints

- UI, comentários, testes e commits em **pt-BR**; commits convencionais (`feat:`/`fix:`/`chore:`).
- Cada task termina com `npm run typecheck && npm run lint && npm test && npm run build` verdes e um commit (exceto a Task 9, verificação sem commit se verde).
- Extrações/mudanças **preservando comportamento**, exceto o previsto aqui.
- Números de linha referem-se ao commit `0f14cce`; localizar por identificadores se deslocados.
- Nenhum segredo em código; `.env` nunca é commitado.
- Sem testes de componente (Vitest em modo node); views cobertas por gates + smoke da Task 9.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `migrations/*_planos-fotos-categorias.sql` (criar) | Colunas, backfills, valores e flag dos planos |
| `src/types.ts` (modificar) | `Professional.categories/portfolio_photos`, `Plan.max_photos/max_categories` |
| `src/lib/planLimits.ts` (criar) + `src/lib/planLimits.test.ts` (criar) | Semântica dos limites (0 default, NULL=∞, trava de contagem) |
| `src/composables/usePlans.ts` (modificar) | `planFeatures.maxPhotos/maxCategories` + copy dos PLANS |
| `src/lib/directoryFilters.ts` (modificar) + `src/lib/directoryFilters.test.ts` (modificar) | Match ANY em categorias (+ fallback legado) |
| `src/composables/useProfessionals.ts` (modificar) | `availableCategories` unindo `category` + `categories[]` |
| `src/api/insforgeService.ts` (modificar) | `uploadPortfolioPhoto` espelhando o avatar |
| `src/components/ProfileEditModal.vue` (modificar) | Multiselect de categorias + galeria com travas + save |
| `src/composables/useAuth.ts` (modificar) | Registro pro inicializa `categories`/`portfolio_photos` |
| `src/components/ProfessionalCard.vue` (modificar) | Categoria primária +N + faixa de fotos (máx 3) |

---

### Task 1: Migration + dados dos planos

**Files:**
- Create: `migrations/<timestamp>_planos-fotos-categorias.sql` (via `npx -y @insforge/cli db migrations new planos-fotos-categorias`)
- Modify: nenhum código.

**Interfaces:**
- Produces: colunas `professionals.categories TEXT[] NOT NULL DEFAULT '{}'`, `professionals.portfolio_photos TEXT[] NOT NULL DEFAULT '{}'`, `plans.max_photos INTEGER NOT NULL DEFAULT 0`, `plans.max_categories INTEGER NULL`; backfills; valores abaixo. Consumido pelas Tasks 2–8.

- [ ] **Step 1: Criar a migration**

```bash
npx -y @insforge/cli db migrations new planos-fotos-categorias
```

- [ ] **Step 2: Escrever o SQL exato no arquivo criado**

```sql
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS portfolio_photos TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.professionals SET categories = ARRAY[category]
WHERE category IS NOT NULL AND category <> '' AND categories = '{}';

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_photos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_categories INTEGER NULL;
UPDATE public.plans SET max_photos = CASE id WHEN 'gratuito' THEN 0 WHEN 'bronze' THEN 1 WHEN 'prata' THEN 3 WHEN 'ouro' THEN 5 ELSE 0 END;
UPDATE public.plans SET max_categories = CASE id WHEN 'gratuito' THEN 1 WHEN 'bronze' THEN 1 WHEN 'prata' THEN 3 WHEN 'ouro' THEN NULL ELSE 1 END;
UPDATE public.plans SET client_visible = true WHERE id = 'gratuito';
```

- [ ] **Step 3: Aplicar**

```bash
npx -y @insforge/cli db migrations up --all
```
Expected: `✓ Applied 1 migration file(s).`

- [ ] **Step 4: Verificar no banco (uma query por vez)**

```bash
npx -y @insforge/cli db query "SELECT id, max_photos, max_categories, client_visible FROM plans ORDER BY id" --json
```
Expected: gratuito (0, 1, true), bronze (1, 1, true), prata (3, 3, true), ouro (5, NULL, true).

```bash
npx -y @insforge/cli db query "SELECT COUNT(*) AS sem_categoria FROM professionals WHERE categories = '{}' AND (category IS NULL OR category = '')" --json
```
Expected: apenas profissionais realmente sem categoria (número pequeno ou zero); linhas com `category` preenchida devem ter `categories = '{<categoria>}'`. Conferir amostra:
```bash
npx -y @insforge/cli db query "SELECT name, category, categories FROM professionals LIMIT 5" --json
```

- [ ] **Step 5: Commit**

```bash
git add migrations/ && git commit -m "feat: regras de fotos/categorias por plano no banco"
```

---

### Task 2: Tipos

**Files:**
- Modify: `src/types.ts` (`Professional`, `Plan`).

**Interfaces:**
- Consumes: colunas da Task 1.
- Produces: `Professional.categories: string[]`, `Professional.portfolio_photos: string[]`, `Plan.max_photos: number`, `Plan.max_categories: number | null`. Consumido pelas Tasks 3–8.

- [ ] **Step 1: `Professional` — adicionar após `coverage_bairros: string[]` (linha 26)**

```ts
  coverage_bairros: string[]
  categories: string[]
  portfolio_photos: string[]
```

- [ ] **Step 2: `Plan` — adicionar após `request_limit: number | null` (linha 71)**

```ts
  request_limit: number | null
  max_photos: number
  max_categories: number | null
```

- [ ] **Step 3: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/types.ts && git commit -m "feat: tipos para categorias e fotos do portfolio"
```

---

### Task 3: Limites puros + fiação no `planFeatures`

**Files:**
- Create: `src/lib/planLimits.ts`, `src/lib/planLimits.test.ts`
- Modify: `src/composables/usePlans.ts` (bloco `planFeatures`, linhas 26–43).

**Interfaces:**
- Consumes: tipos da Task 2.
- Produces: `maxPhotosForPlan`, `maxCategoriesForPlan`, `canAddPhoto`, `canAddCategory` + `planFeatures.maxPhotos: number`, `planFeatures.maxCategories: number | null` (NULL = ilimitado). Consumido pela Task 6.

- [ ] **Step 1: Teste falho `src/lib/planLimits.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { maxPhotosForPlan, maxCategoriesForPlan, canAddPhoto, canAddCategory } from './planLimits'

describe('limites por plano', () => {
  it('fotos: null/undefined viram 0', () => {
    expect(maxPhotosForPlan(null)).toBe(0)
    expect(maxPhotosForPlan(undefined)).toBe(0)
    expect(maxPhotosForPlan(3)).toBe(3)
  })
  it('categorias: null é ilimitado, undefined vira 1', () => {
    expect(maxCategoriesForPlan(null)).toBeNull()
    expect(maxCategoriesForPlan(undefined)).toBe(1)
    expect(maxCategoriesForPlan(3)).toBe(3)
  })
  it('trava de contagem', () => {
    expect(canAddPhoto(0, 1)).toBe(true)
    expect(canAddPhoto(1, 1)).toBe(false)
    expect(canAddCategory(['A'], 1)).toBe(false)
    expect(canAddCategory(['A', 'B'], 3)).toBe(true)
    expect(canAddCategory(['A', 'B', 'C'], null)).toBe(true)
  })
})
```
Run: `npx vitest run src/lib/planLimits.test.ts` → FAIL (`Cannot find module './planLimits'`).

- [ ] **Step 2: Implementar `src/lib/planLimits.ts`**

```ts
export function maxPhotosForPlan(maxPhotos: number | null | undefined): number {
  return maxPhotos ?? 0
}

export function maxCategoriesForPlan(maxCategories: number | null | undefined): number | null {
  return maxCategories === undefined ? 1 : maxCategories
}

export function canAddPhoto(currentCount: number, maxPhotos: number | null | undefined): boolean {
  return currentCount < maxPhotosForPlan(maxPhotos)
}

export function canAddCategory(current: string[], maxCategories: number | null | undefined): boolean {
  const max = maxCategoriesForPlan(maxCategories)
  return max === null ? true : current.length < max
}
```
Run: `npx vitest run src/lib/planLimits.test.ts` → 3/3 PASS.

- [ ] **Step 3: Fiar no `planFeatures` (`src/composables/usePlans.ts`, dentro do `return` das linhas 32–42)**

Adicionar imports no topo:
```ts
import { maxPhotosForPlan, maxCategoriesForPlan } from '../lib/planLimits'
```
Adicionar ao objeto retornado (após `maxRequests,` da linha 33):
```ts
    maxPhotos: maxPhotosForPlan(row?.max_photos),
    maxCategories: maxCategoriesForPlan(row?.max_categories),
```
Nota: `maxRequests` existente permanece inline (pré-existente, fora do escopo).

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/lib/planLimits.ts src/lib/planLimits.test.ts src/composables/usePlans.ts && git commit -m "feat: limites de fotos/categorias por plano"
```

---

### Task 4: Filtro casa QUALQUER categoria

**Files:**
- Modify: `src/lib/directoryFilters.ts` (`filterProfessionals`, linha 17), `src/composables/useProfessionals.ts` (`availableCategories`, linhas 38–41).
- Test: `src/lib/directoryFilters.test.ts` (adicionar casos).

**Interfaces:**
- Consumes: `Professional.categories` (Task 2).
- Produces: match ANY + fallback legado. Consumido pela Task 9 (smoke do diretório).

- [ ] **Step 1: Testes falhos (anexar ao `describe` existente em `src/lib/directoryFilters.test.ts`)**

```ts
it('casa profissional com a categoria em qualquer posição da lista', () => {
  const list = [
    { category: 'Encanador', categories: ['Encanador', 'Eletricista'], plan: 'ouro', uf: '', cidade: '' },
    { category: 'Pintor', categories: ['Pintor'], plan: 'prata', uf: '', cidade: '' },
  ]
  const out = filterProfessionals(list, { category: 'Eletricista', plan: 'Todos', uf: 'Todas', cidade: 'Todas', bairro: 'Todos' })
  expect(out.map((p) => p.category)).toEqual(['Encanador'])
})
it('fallback legado quando categories está vazio', () => {
  const list = [{ category: 'Encanador', categories: [], plan: 'bronze', uf: '', cidade: '' }]
  const out = filterProfessionals(list, { category: 'Encanador', plan: 'Todos', uf: 'Todas', cidade: 'Todas', bairro: 'Todos' })
  expect(out).toHaveLength(1)
})
```
Run: `npx vitest run src/lib/directoryFilters.test.ts` → FAIL (2 falhas; objetos de teste existentes continuam passando).

- [ ] **Step 2: Implementar em `src/lib/directoryFilters.ts`**

Substituir a constraint do generics (linha 13–14):
```ts
export function filterProfessionals<
  T extends { category: string; categories?: string[]; plan: string; uf?: string; cidade?: string; coverage_bairros?: string[] },
>(list: T[], f: DirectoryFilters): T[] {
```
Adicionar helper antes de `filterProfessionals`:
```ts
export function categoriesOf(p: { category: string; categories?: string[] }): string[] {
  const list = [...(p.categories ?? []), p.category].map((c) => c.trim()).filter(Boolean)
  return [...new Set(list)]
}
```
Trocar a linha 17 por:
```ts
  if (f.category !== 'Todas') out = out.filter((p) => categoriesOf(p).includes(f.category))
```
Run: `npx vitest run src/lib/directoryFilters.test.ts` → todos PASS (novos + existentes).

- [ ] **Step 3: `availableCategories` em `src/composables/useProfessionals.ts` (linhas 38–41)**

```ts
const availableCategories = computed(() => {
  const cats = new Set(
    professionals.value.flatMap(p => [p.category, ...(p.categories ?? [])].map(c => (c || '').trim()).filter(Boolean)),
  )
  return ['Todas', ...Array.from(cats).sort()]
})
```

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/lib/directoryFilters.ts src/lib/directoryFilters.test.ts src/composables/useProfessionals.ts && git commit -m "feat: filtro casa qualquer categoria do profissional"
```

---

### Task 5: Upload das fotos do portfólio

**Files:**
- Modify: `src/api/insforgeService.ts` (após `uploadProfessionalAvatar`, ~linha 105–125).

**Interfaces:**
- Consumes: bucket `service-photos` (público, existente).
- Produces: `uploadPortfolioPhoto(file: File, ownerId: string): Promise<string>`. Consumido pela Task 6.

- [ ] **Step 1: Implementar (espelho do avatar, chave em `portfolio/`)**

```ts
export async function uploadPortfolioPhoto(file: File, ownerId: string): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60) || 'foto'
  const key = `portfolio/${ownerId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`
  const delays = [500, 1200, 2500]
  let lastErr: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const { data, error } = await insforge.storage
        .from('service-photos')
        .upload(key, file)
      if (!error && data?.url) return data.url
      lastErr = error
      if (!isTransientUploadError(error) || attempt === delays.length) {
        throw error ?? new Error('Upload failed')
      }
    } catch (err) {
      lastErr = err
      if (!isTransientUploadError(err) || attempt === delays.length) throw err
    }
    await new Promise((r) => setTimeout(r, delays[Math.min(attempt, delays.length - 1)]))
  }
  throw lastErr ?? new Error('Upload failed')
}
```
Nota: copiar o padrão exato de retry/`isTransientUploadError` de `uploadProfessionalAvatar` (linhas 105–125); se a estrutura diferir, adaptar nomes mantendo a semântica (3 retries 500/1200/2500 + throw final).

- [ ] **Step 2: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/api/insforgeService.ts && git commit -m "feat: upload de fotos do portfolio"
```
Verificação extra: se o upload retornar 403/RLS no smoke da Task 9, reportar (não silenciar).

---

### Task 6: Modal — multiselect + galeria com travas

**Files:**
- Modify: `src/components/ProfileEditModal.vue` (script + template, regiões: refs 24–35, watch 59–70, save 110–201, categoria 282–292).

**Interfaces:**
- Consumes: `planFeatures.maxPhotos/maxCategories` (Task 3), `uploadPortfolioPhoto` (Task 5), `canAddPhoto/canAddCategory` (Task 3), prop `categories` (24 nomes, inalterada), `useNavigation().goToTab` (novo import para o nudge).
- Produces: salvamento escreve `categories`, `category` (primária) e `portfolio_photos`. Consumido pela Task 9 (smoke).

- [ ] **Step 1: Script — novos imports e estado**

Adicionar ao import do `useAuth`? Não — adicionar:
```ts
import { useNavigation } from '../composables/useNavigation'
import { usePlans } from '../composables/usePlans'
import { uploadPortfolioPhoto } from '../api/insforgeService'
import { canAddPhoto, canAddCategory } from '../lib/planLimits'
```
Após `const category = ref('')` (linha 25), adicionar:
```ts
const selectedCategories = ref<string[]>([])
const photoFiles = ref<File[]>([])
const photoPreviews = ref<string[]>([])
const portfolioPhotos = ref<string[]>([])
```
Após as destruturações existentes no script (onde for coerente), adicionar:
```ts
const { goToTab } = useNavigation()
const { planFeatures } = usePlans()
const maxPhotos = computed(() => planFeatures.value.maxPhotos)
const maxCategories = computed(() => planFeatures.value.maxCategories)
const categoriesLabel = computed(() =>
  maxCategories.value === null ? 'Ilimitadas' : `${selectedCategories.value.length} de ${maxCategories.value}`,
)
```

- [ ] **Step 2: Script — hidratação no `watch` (bloco pro, após linha 61)**

Após `category.value = props.professional?.category ?? ''`:
```ts
      const initialCats = [...(props.professional?.categories ?? [])]
      if (initialCats.length === 0 && props.professional?.category) initialCats.push(props.professional.category)
      selectedCategories.value = initialCats
      portfolioPhotos.value = [...(props.professional?.portfolio_photos ?? [])]
      photoFiles.value = []
      photoPreviews.value = []
```

- [ ] **Step 3: Script — toggle + fotos (após `removeBairro`, linhas 102–104)**

```ts
function toggleCategory(cat: string) {
  const idx = selectedCategories.value.indexOf(cat)
  if (idx >= 0) {
    selectedCategories.value.splice(idx, 1)
    return
  }
  if (!canAddCategory(selectedCategories.value, maxCategories.value)) {
    fail(`Seu plano permite até ${maxCategories.value === null ? 'categorias ilimitadas' : maxCategories.value + ' categoria(s)'}.`)
    return
  }
  selectedCategories.value.push(cat)
}

function handlePortfolioSelect(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  for (const file of files) {
    if (!canAddPhoto(portfolioPhotos.value.length + photoFiles.value.length, maxPhotos.value)) {
      fail(`Seu plano permite até ${maxPhotos.value} foto(s) no portfólio.`)
      break
    }
    photoFiles.value.push(file)
    const reader = new FileReader()
    reader.onloadend = () => { photoPreviews.value.push(reader.result as string) }
    reader.readAsDataURL(file)
  }
  ;(e.target as HTMLInputElement).value = ''
}

function removeStagedPhoto(index: number) {
  photoFiles.value.splice(index, 1)
  photoPreviews.value.splice(index, 1)
}

function removeSavedPhoto(index: number) {
  portfolioPhotos.value.splice(index, 1)
}
```

- [ ] **Step 4: Script — save (create linha 135–156 e update 181–192)**

No create, trocar `category: category.value,` por:
```ts
          category: selectedCategories.value[0] ?? category.value,
          categories: [...selectedCategories.value],
          portfolio_photos: [],
```
No update, trocar `category: category.value,` por:
```ts
        category: selectedCategories.value[0] ?? category.value,
        categories: [...selectedCategories.value],
```
Validação de trava antes de `saving.value = true` em AMBOS os caminhos (após a validação de telefone existente):
```ts
      if (!canAddCategory(selectedCategories.value, maxCategories.value)) {
        fail('Número de categorias acima do limite do seu plano.')
        return
      }
```
Upload no update (após `avatarUrl`, antes de `updateProfessional`):
```ts
      const uploaded: string[] = []
      for (const file of photoFiles.value) {
        if (!ownerId) { fail('Faça login novamente para enviar as fotos.'); return }
        uploaded.push(await uploadPortfolioPhoto(file, ownerId))
      }
      const finalPhotos = [...portfolioPhotos.value, ...uploaded].slice(0, maxPhotos.value === 0 ? portfolioPhotos.value.length + uploaded.length : undefined)
```
Atenção: `maxPhotos 0` (gratuito) — a seção nem renderiza (Step 5), então este caminho só roda com max ≥ 1; manter o slice simples:
```ts
      const finalPhotos = [...portfolioPhotos.value, ...uploaded]
```
e incluir `portfolio_photos: finalPhotos` no objeto do `updateProfessional`. No create, a galeria não existe (seção oculta); manter `portfolio_photos: []`.

- [ ] **Step 5: Template — trocar o select único (linhas 283–292) por checklist**

```vue
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Categorias ({{ categoriesLabel }})</label>
                <div class="max-h-40 overflow-y-auto space-y-1 bg-slate-950 border border-slate-800 rounded-xl p-2">
                  <label
                    v-for="cat in categories"
                    :key="cat"
                    class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-slate-800/60 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      :checked="selectedCategories.includes(cat)"
                      :disabled="!selectedCategories.includes(cat) && !canAddCategory(selectedCategories, maxCategories)"
                      class="accent-amber-500"
                      @change="toggleCategory(cat)"
                    />
                    {{ cat }}
                  </label>
                </div>
                <p v-if="maxCategories !== null && !canAddCategory(selectedCategories, maxCategories)" class="text-[10px] text-amber-300 mt-1.5">
                  Limite do seu plano atingido.
                  <button type="button" class="font-bold underline" @click="emit('close'); goToTab('perfil_pro')">Ver planos</button>
                </p>
              </div>
```

- [ ] **Step 6: Template — galeria após o bloco de bairros (após linha 388, dentro do `<template v-if="role === 'pro'">`)**

```vue
            <div v-if="maxPhotos > 0">
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Fotos do portfólio ({{ portfolioPhotos.length + photoFiles.length }} de {{ maxPhotos }})</label>
              <div v-if="portfolioPhotos.length + photoFiles.length > 0" class="flex flex-wrap gap-2 mb-2">
                <div v-for="(url, idx) in portfolioPhotos" :key="'saved-' + idx" class="relative w-16 h-16">
                  <img :src="url" alt="Foto do portfólio" class="w-16 h-16 rounded-xl object-cover border border-slate-700" />
                  <button type="button" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-950 border border-slate-700 text-slate-300 text-[10px] leading-none" :title="`Remover foto ${idx + 1}`" @click="removeSavedPhoto(idx)">×</button>
                </div>
                <div v-for="(url, idx) in photoPreviews" :key="'staged-' + idx" class="relative w-16 h-16">
                  <img :src="url" alt="Prévia da foto" class="w-16 h-16 rounded-xl object-cover border border-amber-500/40" />
                  <button type="button" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-950 border border-slate-700 text-slate-300 text-[10px] leading-none" :title="`Remover prévia ${idx + 1}`" @click="removeStagedPhoto(idx)">×</button>
                </div>
              </div>
              <label class="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 transition-all inline-flex items-center gap-1.5">
                <Camera class="w-3.5 h-3.5" />
                Adicionar fotos
                <input type="file" accept="image/*" multiple class="hidden" @change="handlePortfolioSelect" />
              </label>
              <p v-if="!canAddPhoto(portfolioPhotos.length + photoFiles.length, maxPhotos)" class="text-[10px] text-amber-300 mt-1.5">
                Limite do seu plano atingido.
                <button type="button" class="font-bold underline" @click="emit('close'); goToTab('perfil_pro')">Ver planos</button>
              </p>
            </div>
```

- [ ] **Step 7: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/components/ProfileEditModal.vue && git commit -m "feat: multiselect de categorias e galeria com travas no perfil"
```

---

### Task 7: Card — primária +N e faixa de fotos

**Files:**
- Modify: `src/components/ProfessionalCard.vue` (chip de categoria ~linha 62–67, seção descrição+bairros).

**Interfaces:**
- Consumes: `Professional.categories/portfolio_photos` (Task 2).
- Produces: exibição sem mudar props. Consumido pela Task 9 (smoke visual).

- [ ] **Step 1: Computeds (após `cityLine`, linhas 19–24)**

```ts
const primaryCategory = computed(() => props.professional.categories?.[0] || props.professional.category)
const extraCategories = computed(() => {
  const n = props.professional.categories?.length || (props.professional.category ? 1 : 0)
  return Math.max(0, n - 1)
})
```

- [ ] **Step 2: Chip (trocar o conteúdo do `<span class="truncate">` da categoria)**

De:
```vue
          <span class="truncate">{{ professional.category }}</span>
```
Para:
```vue
          <span class="truncate">{{ extraCategories > 0 ? `${primaryCategory} +${extraCategories}` : primaryCategory }}</span>
```

- [ ] **Step 3: Faixa de fotos (após a caixa de bairros, dentro da seção descrição+bairros)**

```vue
      <div v-if="professional.portfolio_photos?.length" class="flex gap-2 mt-2">
        <img
          v-for="(url, i) in professional.portfolio_photos.slice(0, 3)"
          :key="i"
          :src="url"
          alt="Foto do trabalho"
          class="w-16 h-16 rounded-xl object-cover border border-slate-800"
        />
      </div>
```

- [ ] **Step 4: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/components/ProfessionalCard.vue && git commit -m "feat: card exibe categoria principal e fotos"
```

---

### Task 8: Copy dos planos + init no registro

**Files:**
- Modify: `src/composables/usePlans.ts` (PLANS, linhas 65–70), `src/composables/useAuth.ts` (create pro, linhas 159–180).

**Interfaces:**
- Consumes: limites da Task 3.
- Produces: copy sincera em todos os consumidores de `displayPlans` (Onboarding, Perfil, Upgrade automáticos). Consumido pela Task 9.

- [ ] **Step 1: PLANS (substituir as 4 linhas 66–69)**

```ts
  { id: 'gratuito', name: 'Gratuito', price: 'R$0', icon: User, tagline: 'Apenas cadastro do perfil', features: ['Cadastro profissional gratuito', 'Perfil público básico'], cta: 'Começar Grátis' },
  { id: 'bronze', name: 'Bronze', price: 'R$34,90', icon: ShieldCheck, tagline: 'Para começar a atender', features: ['10 pedidos por mês', 'Até 1 foto', '1 categoria de serviço'], cta: 'Assinar Bronze' },
  { id: 'prata', name: 'Prata', price: 'R$54,90', icon: Zap, tagline: 'Para crescer com visibilidade', features: ['30 pedidos por mês', 'Até 3 fotos', 'Até 3 categorias', 'Perfil completo', 'WhatsApp no perfil', 'Prioridade nas buscas'], cta: 'Assinar Prata' },
  { id: 'ouro', name: 'Ouro', price: 'R$79,90', icon: Sparkles, tagline: 'O máximo para dominar a região', features: ['Pedidos ilimitados', 'Até 5 fotos', 'Categorias ilimitadas', 'Destaque nas pesquisas', 'Selo verificado', 'Estatísticas avançadas'], cta: 'Assinar Ouro' },
```

- [ ] **Step 2: Registro (`src/composables/useAuth.ts`, no objeto de `createProfessional` linhas 159–180)**

Após `category: registerForm.value.category,` adicionar:
```ts
        categories: registerForm.value.category ? [registerForm.value.category] : [],
        portfolio_photos: [],
```

- [ ] **Step 3: Gates + commit**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
git add src/composables/usePlans.ts src/composables/useAuth.ts && git commit -m "feat: copy dos planos reflete limites reais"
```

---

### Task 9: Verificação final + smoke

**Files:**
- Modify: nenhum (só correções de gate, se houver).

**Interfaces:**
- Consumes: Tasks 1–8.

- [ ] **Step 1: Gates**

```bash
npm run typecheck && npm run lint && npm test && npm run build   # exit 0
```

- [ ] **Step 2: Dados (uma query por vez)**

```bash
npx -y @insforge/cli db query "SELECT id, max_photos, max_categories, client_visible FROM plans ORDER BY id" --json
```
Expected: gratuito (0, 1, true), bronze (1, 1, true), prata (3, 3, true), ouro (5, NULL, true).

- [ ] **Step 3: Smoke com `npm run dev` (matar o server ao final; conta pro de teste)**

1. Cadastro pro novo → categoria única salva; `categories` com 1 item no banco.
2. Perfil (gratuito): sem seção de galeria; checklist permite só 1 categoria (2ª bloqueada com aviso).
3. Upgrade p/ bronze (checkout teste ou ajuste manual): 1 foto sobe e aparece no card; 2ª foto bloqueada com nudge.
4. Prata: 3 categorias e 3 fotos OK; 4ª bloqueada.
5. Ouro: sem travas (checkboxes nunca desabilitam, sem aviso).
6. Diretório: filtro por 2ª categoria de um pro encontra o card; card mostra "Categoria +N"; faixa exibe até 3 fotos.
7. Solicitar com pro multi-categoria: categoria primária pré-selecionada (sem regressão).
8. Cards de plano (Perfil/Onboarding): copy nova visível.
9. Regressão: barra de uso, WhatsApp gate, guards, histórico — inalterados.
10. Matar o dev server (`pkill` com PID exato, nunca padrão amplo) e confirmar porta livre.

- [ ] **Step 4: Commit apenas se houve correção de gate**

Sem commit vazio. Se tudo verde, reportar DONE sem commit.

---

## Self-Review (do autor do plano)

1. **Spec coverage:** fotos 0/1/3/5 ✓ (T1 colunas/valores, T3 semântica, T5 upload, T6 UI+trava, T7 exibição, T8 copy); categorias 1/1/3/∞ ✓ (T1, T2, T3, T4 filtro, T6 multiselect+save, T7 primária, T8 registro); gratuito visível ✓ (T1 flag, consumo pré-existente em `visibleProfessionals`); copy sincera ✓ (T8); cadastro/upgrade ✓ (registro inalterado + nudges T6 + upgrade existente).
2. **Placeholder scan:** sem TBD/TODO; todos os blocos de código reais; comandos exatos; valores exatos.
3. **Type consistency:** `categories: string[]` e `portfolio_photos: string[]` obrigatórios no tipo → call sites atualizados (T6 create/update, T8 registro); `categoriesOf` aceita `categories?` para compat com objetos de teste; `maxCategories: number | null` flui lib→`planFeatures`→modal; `handleChooseProfessional` inalterado (usa `category` primária, ainda sincronizada).
