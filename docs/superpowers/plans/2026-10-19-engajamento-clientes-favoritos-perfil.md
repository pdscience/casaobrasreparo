# Engajamento de clientes — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao cliente um ciclo de retorno e boca a boca: favoritar profissionais, compartilhar um perfil por link e ver avaliações reais num perfil público.

**Architecture:** Favoritos vivem em `localStorage` via composable singleton; o compartilhamento é uma função pura com fallbacks (`navigator.share` → clipboard → WhatsApp); o perfil é um modal global controlado por `useUi`, aberto pelo card ou por `#/profissionais?pro=<id>`. Avaliações são lidas por uma RPC `SECURITY DEFINER` que devolve somente nota/comentário/data.

**Tech Stack:** Vue 3.5 (`<script setup>`, `defineEmits`), TypeScript 5.9, Tailwind 4, Vitest 5 (env `node`), InsForge SDK, Playwright para E2E.

**Spec:** `docs/superpowers/specs/2026-10-19-engajamento-clientes-favoritos-perfil-design.md`

## Global Constraints

- Sem mudanças de schema nas tabelas existentes; só a função SQL nova.
- Favoritos são por dispositivo (localStorage), nunca bloqueiam o clique do card.
- Nenhum dado de cliente (nome, telefone, endereço) pode sair da RPC de reviews.
- Todas as chaves de i18n devem existir em `pt.ts`, `en.ts` e `es.ts` (o teste de paridade falha se faltar).
- Sem comentários no código além dos já existentes no estilo do arquivo.
- Testes: `npx vitest run <arquivo>`; typecheck: `npx vue-tsc --noEmit`; lint: `npm run lint`.
- Commits em português, prefixo `feat:`/`fix:`/`test:`/`docs:`.

---

### Task 1: Utilitários de review + RPC + serviço

**Files:**
- Create: `src/lib/reviews.ts`
- Test: `src/lib/reviews.test.ts`
- Create: `migrations/20261019140000_add-professional-reviews-rpc.sql`
- Modify: `src/api/insforgeService.ts` (adicionar função após `getProfessionalByAuthId`, por volta da linha 68)

**Interfaces:**
- Produces:
  - `clampStars(value: unknown): number`
  - `formatReviewDate(value: string | null | undefined, lang: string): string`
  - `interface ProfessionalReview { stars: number; comment: string; review_date: string | null }`
  - `getProfessionalReviews(professionalId: string): Promise<ProfessionalReview[]>`
  - RPC SQL `public.get_professional_reviews(p_id uuid)`.

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/reviews.test.ts
import { describe, it, expect } from 'vitest'
import { clampStars, formatReviewDate } from './reviews'

describe('reviews', () => {
  it('clampa estrelas para 1..5 e zera valores invalidos', () => {
    expect(clampStars(3)).toBe(3)
    expect(clampStars(0)).toBe(0)
    expect(clampStars(-2)).toBe(0)
    expect(clampStars(9)).toBe(5)
    expect(clampStars('4')).toBe(4)
    expect(clampStars(null)).toBe(0)
    expect(clampStars(Number.NaN)).toBe(0)
  })

  it('formata data de review no idioma pedido', () => {
    expect(formatReviewDate(null, 'pt-BR')).toBe('')
    expect(formatReviewDate('nao-e-data', 'pt-BR')).toBe('')
    const pt = formatReviewDate('2026-10-01', 'pt-BR')
    const en = formatReviewDate('2026-10-01', 'en')
    expect(pt).toContain('2026')
    expect(en).toContain('2026')
    expect(pt).not.toBe(en)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/reviews.test.ts`
Expected: FAIL — `Failed to resolve import "./reviews"`.

- [ ] **Step 3: Implementar `src/lib/reviews.ts`**

```ts
export interface ProfessionalReview {
  stars: number
  comment: string
  review_date: string | null
}

export function clampStars(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(5, Math.max(1, Math.round(n)))
}

export function formatReviewDate(value: string | null | undefined, lang: string): string {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(date)
  } catch {
    return value
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/reviews.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Criar a migration**

```sql
-- Avaliacoes publicas de um profissional sem expor dados do cliente.
-- `service_requests` tem SELECT publico (inclui nome/telefone/endereco do
-- cliente); esta funcao expoe somente nota, comentario e data.
create or replace function public.get_professional_reviews(p_id uuid)
returns table (stars int, comment text, review_date date)
language sql
security definer
set search_path = public
as $$
  select
    coalesce((rating->>'stars')::int, 0) as stars,
    coalesce(rating->>'comment', '') as comment,
    nullif(rating->>'date', '')::date as review_date
  from public.service_requests
  where professional_id = p_id
    and rating is not null
    and (rating->>'stars') is not null
  order by nullif(rating->>'date', '')::date desc nulls last
  limit 10;
$$;

grant execute on function public.get_professional_reviews(uuid) to anon, authenticated;
```

- [ ] **Step 6: Adicionar o serviço**

Em `src/api/insforgeService.ts`, após `getProfessionalByAuthId`:

```ts
export async function getProfessionalReviews(professionalId: string): Promise<ProfessionalReview[]> {
  const { data, error } = await insforge.database
    .rpc('get_professional_reviews', { p_id: professionalId })
  if (error) throw error
  return (data as ProfessionalReview[]) || []
}
```

Adicionar ao import do topo:

```ts
import type { ProfessionalReview } from '../lib/reviews'
```

- [ ] **Step 7: Aplicar a migration e verificar**

Run: `npx -y @insforge/cli db migrations up --all`
Expected: `Applied 1 migration file(s)` com `20261019140000_add-professional-reviews-rpc.sql`.

Run:
```bash
npx -y @insforge/cli db query "select * from get_professional_reviews((select id from professionals limit 1))"
```
Expected: 1 linha com `stars = 5` e o comentário existente, ou 0 linhas para outro profissional.

- [ ] **Step 8: Commit**

```bash
git add src/lib/reviews.ts src/lib/reviews.test.ts migrations/20261019140000_add-professional-reviews-rpc.sql src/api/insforgeService.ts
git commit -m "feat: reviews publicas via rpc sem expor dados do cliente"
```

---

### Task 2: Composable de favoritos

**Files:**
- Create: `src/composables/useFavorites.ts`
- Test: `src/lib/favorites.test.ts`

**Interfaces:**
- Produces:
  - `FAVORITES_KEY = 'casaobra_favorites'`
  - `parseFavorites(raw: string | null): string[]`
  - `toggleFavoriteId(ids: string[], id: string): string[]`
  - `readFavorites(storage?: StorageLike | null): string[]`
  - `writeFavorites(ids: string[], storage?: StorageLike | null): void`
  - `useFavorites(): { favoriteIds, favoriteSet, favoritesCount, isFavorite, toggleFavorite }`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/favorites.test.ts
import { describe, it, expect } from 'vitest'
import {
  FAVORITES_KEY,
  parseFavorites,
  readFavorites,
  toggleFavoriteId,
  writeFavorites,
} from '../composables/useFavorites'

function fakeStorage(initial?: string) {
  const map = new Map<string, string>()
  if (initial !== undefined) map.set(FAVORITES_KEY, initial)
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v) },
    map,
  }
}

describe('favorites', () => {
  it('faz parse tolerante a storage corrompido', () => {
    expect(parseFavorites(null)).toEqual([])
    expect(parseFavorites('{oops')).toEqual([])
    expect(parseFavorites('{"a":1}')).toEqual([])
    expect(parseFavorites('["a",2,"b"]')).toEqual(['a', 'b'])
  })

  it('alterna um id sem mutar a lista original', () => {
    const base = ['a']
    const added = toggleFavoriteId(base, 'b')
    expect(added).toEqual(['a', 'b'])
    expect(base).toEqual(['a'])
    expect(toggleFavoriteId(added, 'a')).toEqual(['b'])
  })

  it('le e grava no storage injetado', () => {
    const storage = fakeStorage()
    writeFavorites(['a', 'b'], storage)
    expect(readFavorites(storage)).toEqual(['a', 'b'])
    expect(storage.map.get(FAVORITES_KEY)).toBe('["a","b"]')
  })

  it('nao lanca quando o storage falha', () => {
    const broken = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    }
    expect(readFavorites(broken)).toEqual([])
    expect(() => writeFavorites(['a'], broken)).not.toThrow()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/favorites.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/composables/useFavorites.ts`**

```ts
import { computed, ref } from 'vue'

export const FAVORITES_KEY = 'casaobra_favorites'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function parseFavorites(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function toggleFavoriteId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readFavorites(storage: StorageLike | null = safeStorage()): string[] {
  if (!storage) return []
  try {
    return parseFavorites(storage.getItem(FAVORITES_KEY))
  } catch {
    return []
  }
}

export function writeFavorites(ids: string[], storage: StorageLike | null = safeStorage()): void {
  if (!storage) return
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify(ids))
  } catch {
    /* modo privado: mantem apenas em memoria */
  }
}

const favoriteIds = ref<string[]>(readFavorites())
const favoriteSet = computed(() => new Set(favoriteIds.value))
const favoritesCount = computed(() => favoriteIds.value.length)

export function useFavorites() {
  function isFavorite(id: string): boolean {
    return favoriteSet.value.has(id)
  }

  function toggleFavorite(id: string): void {
    if (!id) return
    favoriteIds.value = toggleFavoriteId(favoriteIds.value, id)
    writeFavorites(favoriteIds.value)
  }

  return { favoriteIds, favoriteSet, favoritesCount, isFavorite, toggleFavorite }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/favorites.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/composables/useFavorites.ts src/lib/favorites.test.ts
git commit -m "feat: favoritos de profissionais no localStorage"
```

---

### Task 3: Compartilhamento com fallbacks

**Files:**
- Create: `src/lib/share.ts`
- Test: `src/lib/share.test.ts`

**Interfaces:**
- Consumes: `Professional` de `src/types.ts`.
- Produces:
  - `professionalShareUrl(id: string, origin?: string): string`
  - `shareSummary(pro: Professional): string`
  - `type ShareMode = 'shared' | 'clipboard' | 'whatsapp' | 'cancelled'`
  - `shareProfessional(pro, options?): Promise<ShareMode>`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/share.test.ts
import { describe, it, expect, vi } from 'vitest'
import { professionalShareUrl, shareSummary, shareProfessional } from './share'
import type { Professional } from '../types'

const pro = {
  id: 'abc-123',
  name: 'Ana Souza',
  category: 'Eletricista',
  categories: ['Eletricista', 'Encanador'],
  cidade: 'Dourados',
  uf: 'MS',
} as unknown as Professional

describe('share', () => {
  it('monta a url do diretorio com o id codificado', () => {
    expect(professionalShareUrl('abc-123', 'https://site.test')).toBe(
      'https://site.test/#/profissionais?pro=abc-123',
    )
    expect(professionalShareUrl('a b', 'https://site.test')).toBe(
      'https://site.test/#/profissionais?pro=a%20b',
    )
  })

  it('resume nome, categoria e localidade', () => {
    expect(shareSummary(pro)).toBe('Ana Souza · Eletricista · Dourados - MS')
  })

  it('usa o share nativo quando disponivel', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const clipboard = { writeText: vi.fn() }
    await expect(shareProfessional(pro, { origin: 'https://x', share, clipboard }))
      .resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://x/#/profissionais?pro=abc-123',
    }))
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })

  it('trata cancelamento do share nativo sem cair no clipboard', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }))
    const clipboard = { writeText: vi.fn() }
    await expect(shareProfessional(pro, { origin: 'https://x', share, clipboard }))
      .resolves.toBe('cancelled')
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })

  it('cai no clipboard quando o share falha ou nao existe', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    await expect(shareProfessional(pro, { origin: 'https://x', clipboard }))
      .resolves.toBe('clipboard')
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(
      'https://x/#/profissionais?pro=abc-123',
    ))
  })

  it('cai no whatsapp quando nao ha share nem clipboard', async () => {
    const open = vi.fn()
    await expect(shareProfessional(pro, { origin: 'https://x', open }))
      .resolves.toBe('whatsapp')
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/?text='))
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/share.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `src/lib/share.ts`**

```ts
import type { Professional } from '../types'

export type ShareMode = 'shared' | 'clipboard' | 'whatsapp' | 'cancelled'

export interface ShareOptions {
  origin?: string
  share?: (data: { title: string; text: string; url: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
  open?: (url: string) => void
}

function currentOrigin(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
}

export function professionalShareUrl(id: string, origin = currentOrigin()): string {
  return `${origin}/#/profissionais?pro=${encodeURIComponent(id)}`
}

export function shareSummary(pro: Professional): string {
  const category = pro.categories?.[0] || pro.category || ''
  const place = [pro.cidade?.trim(), pro.uf?.trim().toUpperCase()].filter(Boolean).join(' - ')
  return [pro.name, category, place].filter(Boolean).join(' · ')
}

export async function shareProfessional(
  pro: Professional,
  options: ShareOptions = {},
): Promise<ShareMode> {
  const url = professionalShareUrl(pro.id, options.origin)
  const text = shareSummary(pro)
  const payload = `${text}\n${url}`

  if (options.share) {
    try {
      await options.share({ title: pro.name, text, url })
      return 'shared'
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'cancelled'
    }
  }

  if (options.clipboard) {
    try {
      await options.clipboard.writeText(payload)
      return 'clipboard'
    } catch {
      /* segue para o WhatsApp */
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(payload)}`
  if (options.open) {
    options.open(waUrl)
    return 'whatsapp'
  }
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener')
  }
  return 'whatsapp'
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/share.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/share.ts src/lib/share.test.ts
git commit -m "feat: compartilhamento de perfil com fallbacks"
```

---

### Task 4: Chaves de i18n

**Files:**
- Modify: `src/i18n/pt.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`

**Interfaces:**
- Produces chaves consumidas pelas Tasks 5–8: `profile.*`, `card.viewProfile/favorite/unfavorite/share`, `directory.favorites/favoritesOnly/noFavoritesTitle/noFavoritesDesc`.

- [ ] **Step 1: Adicionar em `pt.ts`**

No objeto `card:`, adicionar:

```ts
    viewProfile: 'Ver perfil',
    favorite: 'Favoritar',
    unfavorite: 'Remover dos favoritos',
    share: 'Compartilhar',
```

No objeto `directory:`, adicionar:

```ts
    favorites: 'Favoritos',
    favoritesOnly: 'Só favoritos',
    noFavoritesTitle: 'Nenhum favorito ainda',
    noFavoritesDesc: 'Toque no coração dos profissionais que você quer guardar.',
```

Antes de `modals:`, adicionar:

```ts
  profile: {
    title: 'Perfil do profissional',
    reviews: 'Avaliações',
    noReviews: 'Ainda não há avaliações.',
    reviewsUnavailable: 'Não foi possível carregar as avaliações.',
    share: 'Compartilhar',
    favorite: 'Favoritar',
    unfavorite: 'Remover dos favoritos',
    shareCopied: 'Link copiado!',
    shareError: 'Não foi possível compartilhar.',
    chooseAndRequest: 'Pedir orçamento',
    viewPortfolio: 'Trabalhos',
    ratingSummary: '{rating} de 5 · {count} avaliações',
  },
```

- [ ] **Step 2: Adicionar em `en.ts`**

```ts
    viewProfile: 'View profile',
    favorite: 'Save',
    unfavorite: 'Remove from saved',
    share: 'Share',
```

```ts
    favorites: 'Saved',
    favoritesOnly: 'Saved only',
    noFavoritesTitle: 'No saved professionals yet',
    noFavoritesDesc: 'Tap the heart on the professionals you want to keep.',
```

```ts
  profile: {
    title: 'Professional profile',
    reviews: 'Reviews',
    noReviews: 'No reviews yet.',
    reviewsUnavailable: 'Could not load reviews.',
    share: 'Share',
    favorite: 'Save',
    unfavorite: 'Remove from saved',
    shareCopied: 'Link copied!',
    shareError: 'Could not share.',
    chooseAndRequest: 'Request a quote',
    viewPortfolio: 'Work',
    ratingSummary: '{rating} out of 5 · {count} reviews',
  },
```

- [ ] **Step 3: Adicionar em `es.ts`**

```ts
    viewProfile: 'Ver perfil',
    favorite: 'Guardar',
    unfavorite: 'Quitar de guardados',
    share: 'Compartir',
```

```ts
    favorites: 'Guardados',
    favoritesOnly: 'Solo guardados',
    noFavoritesTitle: 'Aún no hay guardados',
    noFavoritesDesc: 'Toca el corazón en los profesionales que quieras guardar.',
```

```ts
  profile: {
    title: 'Perfil del profesional',
    reviews: 'Reseñas',
    noReviews: 'Todavía no hay reseñas.',
    reviewsUnavailable: 'No se pudieron cargar las reseñas.',
    share: 'Compartir',
    favorite: 'Guardar',
    unfavorite: 'Quitar de guardados',
    shareCopied: '¡Enlace copiado!',
    shareError: 'No se pudo compartir.',
    chooseAndRequest: 'Pedir presupuesto',
    viewPortfolio: 'Trabajos',
    ratingSummary: '{rating} de 5 · {count} reseñas',
  },
```

- [ ] **Step 4: Rodar o teste de paridade**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS (chaves idênticas nos três idiomas).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/pt.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat: i18n de favoritos, perfil e compartilhamento"
```

---

### Task 5: Botões no ProfessionalCard

**Files:**
- Modify: `src/components/ProfessionalCard.vue`
- Test: verificação visual na Task 9

**Interfaces:**
- Consumes: `useFavorites()` (Task 2), `shareProfessional()` (Task 3), `pushToast` de `useUi`.
- Produces: emit `(e: 'view', professional: Professional): void`.

- [ ] **Step 1: Atualizar imports, emits e estado**

No topo do `<script setup>`:

```ts
import { computed } from 'vue'
import type { Professional, Plan } from '../types'
import { Star, MessageCircle, X, MapPin, FileText, User, Wrench, Heart, Share2 } from 'lucide-vue-next'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { countryName } from '../lib/geo'
import { shareProfessional } from '../lib/share'
import { useAuth } from '../composables/useAuth'
import { useFavorites } from '../composables/useFavorites'
import { useUi } from '../composables/useUi'
import { useI18n } from '../composables/useI18n'
```

No bloco de emits, adicionar:

```ts
  (e: 'view', professional: Professional): void
```

Após `const { authUser } = useAuth()`:

```ts
const { isFavorite, toggleFavorite } = useFavorites()
const { pushToast } = useUi()

async function handleShare(): Promise<void> {
  const mode = await shareProfessional(props.professional, {
    share: typeof navigator !== 'undefined' && navigator.share
      ? (data) => navigator.share(data)
      : undefined,
    clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : undefined,
    open: (url) => window.open(url, '_blank', 'noopener'),
  })
  if (mode === 'clipboard') pushToast('success', t('profile.shareCopied'))
  if (mode === 'whatsapp') pushToast('info', t('profile.share'))
}
```

- [ ] **Step 2: Adicionar os botões de favorito e compartilhar**

Na `<div>` raiz do template, adicionar `relative` à classe:

```html
    class="relative bg-slate-900 rounded-2xl border flex flex-col transition-all overflow-hidden"
```

Logo após a abertura da div raiz, antes da faixa do plano:

```html
    <div class="absolute top-2 right-2 z-10 flex items-center gap-1">
      <button
        type="button"
        @click.stop="toggleFavorite(professional.id)"
        :aria-label="isFavorite(professional.id) ? t('card.unfavorite') : t('card.favorite')"
        :aria-pressed="isFavorite(professional.id)"
        class="p-1.5 rounded-full bg-slate-950/70 border border-slate-700 text-slate-300 hover:text-white hover:border-rose-500/60 transition-colors"
      >
        <Heart
          class="w-3.5 h-3.5"
          :class="isFavorite(professional.id) ? 'fill-rose-500 text-rose-500' : ''"
        />
      </button>
      <button
        type="button"
        @click.stop="handleShare"
        :aria-label="t('card.share')"
        class="p-1.5 rounded-full bg-slate-950/70 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/60 transition-colors"
      >
        <Share2 class="w-3.5 h-3.5" />
      </button>
    </div>
```

- [ ] **Step 3: Adicionar o botão "Ver perfil" nas ações**

Antes do botão `selectable && !selected` (e antes do `selectable && selected`):

```html
      <button
        type="button"
        @click="emit('view', professional)"
        class="px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500"
      >
        {{ t('card.viewProfile') }}
      </button>
```

- [ ] **Step 4: Typecheck e lint**

Run: `npx vue-tsc --noEmit && npm run lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfessionalCard.vue
git commit -m "feat: favoritar, compartilhar e ver perfil no card"
```

---

### Task 6: Modal de perfil público

**Files:**
- Create: `src/components/ProfessionalProfileModal.vue`
- Modify: `src/composables/useUi.ts`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `getProfessionalReviews` (Task 1), `useFavorites` (Task 2), `shareProfessional` (Task 3), `useUi.profileModalPro`, `useQuoteForm().handleChooseProfessional`.
- Produces: `profileModalPro: Ref<Professional | null>`.

- [ ] **Step 1: Adicionar estado em `useUi.ts`**

Trocar o import de tipos:

```ts
import type { Professional, ServiceRequest } from '../types'
```

Adicionar após `const landingCategory = ref('')`:

```ts
const profileModalPro = ref<Professional | null>(null)
```

Incluir no retorno de `useUi()` (junto de `landingCategory`):

```ts
    profileModalPro,
```

- [ ] **Step 2: Criar `ProfessionalProfileModal.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Professional } from '../types'
import { Heart, MapPin, Share2, Star, User, Wrench, X } from 'lucide-vue-next'
import { useUi } from '../composables/useUi'
import { useFavorites } from '../composables/useFavorites'
import { usePlans } from '../composables/usePlans'
import { useQuoteForm } from '../composables/useQuoteForm'
import { useI18n } from '../composables/useI18n'
import { getProfessionalReviews } from '../api/insforgeService'
import { clampStars, formatReviewDate, type ProfessionalReview } from '../lib/reviews'
import { shareProfessional } from '../lib/share'
import { countryName } from '../lib/geo'

const { profileModalPro, pushToast } = useUi()
const { isFavorite, toggleFavorite } = useFavorites()
const { planMap } = usePlans()
const { handleChooseProfessional } = useQuoteForm()
const { t, categoryText, planText, lang } = useI18n()

const reviews = ref<ProfessionalReview[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref(false)
let requestSeq = 0

const pro = computed(() => profileModalPro.value)
const primaryCategory = computed(() => pro.value?.categories?.[0] || pro.value?.category || '')
const extraCategories = computed(() => {
  if (!pro.value) return 0
  return Math.max(0, (pro.value.categories?.length || 1) - 1)
})
const cityLine = computed(() => {
  if (!pro.value) return ''
  const place = [pro.value.cidade?.trim(), pro.value.uf?.trim().toUpperCase()].filter(Boolean).join(' - ')
  const country = pro.value.country_code ? countryName(pro.value.country_code, lang.value) : ''
  return [place, country].filter(Boolean).join(' · ')
})

watch(pro, async (current) => {
  const seq = ++requestSeq
  reviews.value = []
  reviewsError.value = false
  if (!current) return
  reviewsLoading.value = true
  try {
    const data = await getProfessionalReviews(current.id)
    if (seq === requestSeq) reviews.value = data
  } catch {
    if (seq === requestSeq) reviewsError.value = true
  } finally {
    if (seq === requestSeq) reviewsLoading.value = false
  }
}, { immediate: true })

function close(): void {
  profileModalPro.value = null
}

async function handleShare(): Promise<void> {
  if (!pro.value) return
  const mode = await shareProfessional(pro.value, {
    share: typeof navigator !== 'undefined' && navigator.share
      ? (data) => navigator.share(data)
      : undefined,
    clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : undefined,
    open: (url) => window.open(url, '_blank', 'noopener'),
  })
  if (mode === 'clipboard') pushToast('success', t('profile.shareCopied'))
  if (mode === 'shared') pushToast('success', t('profile.shareCopied'))
  if (mode === 'whatsapp') pushToast('info', t('profile.share'))
}

function requestQuote(): void {
  if (!pro.value) return
  const target = pro.value
  close()
  handleChooseProfessional(target)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
<div
  v-if="pro"
  class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
  role="dialog"
  aria-modal="true"
  :aria-label="t('profile.title')"
  @click.self="close"
>
  <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
    <div class="flex items-start gap-3 p-5 border-b border-slate-800">
      <img
        v-if="pro.avatar"
        :src="pro.avatar"
        :alt="pro.name"
        class="w-16 h-16 rounded-2xl object-cover border-2 border-slate-950 ring-2 ring-amber-500/40 shrink-0"
      />
      <div v-else class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-950 ring-2 ring-amber-500/40 flex items-center justify-center shrink-0">
        <User class="w-7 h-7 text-slate-500" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-bold text-white text-base leading-tight truncate">{{ pro.name }}</h3>
          <button type="button" @click="close" :aria-label="t('common.close')" class="text-slate-400 hover:text-white shrink-0">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-500/40 text-[11px] font-extrabold uppercase tracking-wide text-amber-300">
          <Wrench class="w-3 h-3 shrink-0" />
          <span class="truncate">{{ extraCategories > 0 ? `${categoryText(primaryCategory)} +${extraCategories}` : categoryText(primaryCategory) }}</span>
        </p>
        <p v-if="cityLine" class="flex items-center gap-1 text-[12px] text-slate-300 mt-1">
          <MapPin class="w-3 h-3 shrink-0 text-slate-500" />
          <span class="truncate">{{ cityLine }}</span>
        </p>
      </div>
    </div>

    <div class="p-5 space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-full px-2.5 py-1">
          <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span class="text-[12px] font-bold text-slate-200">{{ pro.rating ?? 0 }}</span>
          <span class="text-[11px] text-slate-500">({{ pro.reviews_count ?? 0 }})</span>
        </span>
        <span v-if="planMap.get(pro.plan)" class="text-[10px] font-bold px-2 py-1 rounded-full border" :class="[planMap.get(pro.plan)?.badge_bg, planMap.get(pro.plan)?.badge_text, planMap.get(pro.plan)?.badge_border]">
          {{ planText(pro.plan) }}
        </span>
      </div>

      <p class="text-[13px] text-slate-200 leading-relaxed">
        {{ pro.bio?.trim() || t('card.noDescription') }}
      </p>

      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{{ t('card.neighborhoodsServed') }}</p>
        <div v-if="pro.coverage_bairros?.length" class="flex flex-wrap gap-1 mt-1.5">
          <span v-for="bairro in pro.coverage_bairros" :key="bairro" class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300">
            {{ bairro }}
          </span>
        </div>
        <p v-else class="text-[11px] text-slate-400 mt-0.5">{{ t('card.wholeRegion') }}</p>
      </div>

      <div v-if="pro.portfolio_photos?.length" class="space-y-1.5">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{{ t('profile.viewPortfolio') }}</p>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <img
            v-for="(url, i) in pro.portfolio_photos"
            :key="i"
            :src="url"
            :alt="t('card.workPhoto')"
            class="w-24 h-24 rounded-xl object-cover border border-slate-800 shrink-0"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white">{{ t('profile.reviews') }}</h4>
          <span v-if="pro.reviews_count" class="text-[11px] text-slate-400">
            {{ t('profile.ratingSummary', { rating: pro.rating ?? 0, count: pro.reviews_count ?? 0 }) }}
          </span>
        </div>
        <p v-if="reviewsLoading" class="text-[12px] text-slate-400">{{ t('common.loading') }}</p>
        <p v-else-if="reviewsError" class="text-[12px] text-slate-400">{{ t('profile.reviewsUnavailable') }}</p>
        <p v-else-if="reviews.length === 0" class="text-[12px] text-slate-400">{{ t('profile.noReviews') }}</p>
        <div v-else class="space-y-2">
          <div v-for="(review, i) in reviews" :key="i" class="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-0.5">
                <Star
                  v-for="n in 5"
                  :key="n"
                  class="w-3 h-3"
                  :class="n <= clampStars(review.stars) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'"
                />
              </div>
              <span v-if="review.review_date" class="text-[10px] text-slate-500">{{ formatReviewDate(review.review_date, lang) }}</span>
            </div>
            <p class="text-[12px] text-slate-300 mt-1.5">{{ review.comment || t('profile.noReviews') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 p-5 pt-0">
      <button
        type="button"
        @click="requestQuote"
        class="flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all"
      >
        {{ t('profile.chooseAndRequest') }}
      </button>
      <button
        type="button"
        @click="toggleFavorite(pro.id)"
        :aria-pressed="isFavorite(pro.id)"
        class="px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
        :class="isFavorite(pro.id) ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'"
      >
        <Heart class="w-4 h-4" :class="isFavorite(pro.id) ? 'fill-rose-500 text-rose-500' : ''" />
        {{ isFavorite(pro.id) ? t('profile.unfavorite') : t('profile.favorite') }}
      </button>
      <button
        type="button"
        @click="handleShare"
        class="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-all flex items-center gap-1.5"
      >
        <Share2 class="w-4 h-4" />
        {{ t('profile.share') }}
      </button>
    </div>
  </div>
</div>
</template>
```

- [ ] **Step 3: Montar o modal no `App.vue`**

Adicionar o import junto dos outros modais:

```ts
import ProfessionalProfileModal from './components/ProfessionalProfileModal.vue'
```

No template, junto de `<ReceiptModal />`:

```html
    <ProfessionalProfileModal />
```

- [ ] **Step 4: Typecheck e lint**

Run: `npx vue-tsc --noEmit && npm run lint`
Expected: sem erros (corrigir o que aparecer, mantendo os nomes das interfaces).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProfessionalProfileModal.vue src/composables/useUi.ts src/App.vue
git commit -m "feat: modal de perfil publico com avaliacoes"
```

---

### Task 7: Filtro de favoritos e deep link no diretório

**Files:**
- Modify: `src/composables/useProfessionals.ts`
- Modify: `src/views/professionals/DirectoryView.vue`

**Interfaces:**
- Consumes: `useFavorites` (Task 2), `useUi.profileModalPro` (Task 6).
- Produces: `favoritesOnly: Ref<boolean>` exportado por `useProfessionals`.

- [ ] **Step 1: Adicionar o filtro em `useProfessionals.ts`**

Importar:

```ts
import { useFavorites } from './useFavorites'
```

Após `const directoryPage = ref<number>(1)`:

```ts
const favoritesOnly = ref<boolean>(false)
const { favoriteSet } = useFavorites()
```

Em `resetDirectoryFilters`, adicionar:

```ts
  favoritesOnly.value = false
```

Substituir `filteredProfessionals` por:

```ts
const filteredProfessionals = computed(() => {
  const base = filterProfessionals(visibleProfessionals.value, {
    category: filterCategory.value,
    plan: filterPlan.value,
    uf: filterUf.value,
    cidade: filterCidade.value,
    bairro: filterBairro.value,
  })
  return favoritesOnly.value ? base.filter((p) => favoriteSet.value.has(p.id)) : base
})
```

No `watch` que reseta a página, incluir `favoritesOnly`:

```ts
watch([filterCategory, filterPlan, filterUf, filterCidade, filterBairro, favoritesOnly], () => {
  directoryPage.value = 1
})
```

No retorno de `useProfessionals()`, adicionar `favoritesOnly` junto de `directoryPage`.

- [ ] **Step 2: Atualizar o `<script>` do `DirectoryView.vue`**

Substituir os imports e o bloco de composables iniciais:

```ts
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATEGORIES } from '../../lib/categories'
import { useNavigation } from '../../composables/useNavigation'
import { useProfessionals } from '../../composables/useProfessionals'
import { useQuoteForm } from '../../composables/useQuoteForm'
import { useRequests } from '../../composables/useRequests'
import { usePlans } from '../../composables/usePlans'
import { useUi } from '../../composables/useUi'
import { useFavorites } from '../../composables/useFavorites'
import { useI18n } from '../../composables/useI18n'
import ProfessionalCard from '../../components/ProfessionalCard.vue'
import { HardHat } from 'lucide-vue-next'
import type { Professional } from '../../types'

const { t, categoryText } = useI18n()
const route = useRoute()
const router = useRouter()

const { activeTab, scrollToId, trackCta, goToTab } = useNavigation()
const {
  professionals,
  filterCategory, filterUf, filterCidade, filterBairro,
  directoryPage, favoritesOnly,
  availableUfs, availableCidades, availableBairros,
  filteredProfessionals, paginatedProfessionals,
  resetDirectoryFilters,
} = useProfessionals()
const {
  selectedCategory, selectedProfessional,
  handleChooseProfessional, clearProfessionalSelection,
} = useQuoteForm()
const { isLoading } = useRequests()
const { planMap } = usePlans()
const { profileModalPro } = useUi()
const { favoritesCount } = useFavorites()

function openProfile(pro: Professional): void {
  profileModalPro.value = pro
}

function cleanProQuery(): void {
  if (!route.query.pro) return
  const query = { ...route.query }
  delete query.pro
  void router.replace({ query })
}

watch(
  [() => route.query.pro, () => professionals.value, isLoading],
  ([rawId, list, loading]) => {
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    if (!id) return
    const found = (list as Professional[]).find((p) => p.id === id)
    if (found) {
      profileModalPro.value = found
      return
    }
    if (!loading && (list as Professional[]).length > 0) cleanProQuery()
  },
  { immediate: true },
)

watch(profileModalPro, (current) => {
  if (!current) cleanProQuery()
})
```

Manter `handleLandingCategory` como está.

- [ ] **Step 3: Atualizar o template**

Após os selects de UF/cidade/bairro e antes do botão "Limpar filtros", adicionar o chip:

```html
      <button
        type="button"
        @click="favoritesOnly = !favoritesOnly"
        :aria-pressed="favoritesOnly"
        class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
        :class="favoritesOnly ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' : 'border-slate-700 text-slate-300 hover:border-rose-500/50 hover:text-rose-300'"
      >
        <Heart class="w-3.5 h-3.5" :class="favoritesOnly ? 'fill-rose-500 text-rose-500' : ''" />
        {{ t('directory.favorites') }} ({{ favoritesCount }})
      </button>
```

Adicionar `Heart` ao import de lucide:

```ts
import { HardHat, Heart } from 'lucide-vue-next'
```

Atualizar o bloco de estados vazios para contemplar favoritos:

```html
    <div v-if="isLoading" class="text-center text-xs text-slate-400 py-8">{{ t('directory.loading') }}</div>
    <div v-else-if="favoritesOnly && favoritesCount === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
      <p class="text-sm text-slate-300 font-bold">{{ t('directory.noFavoritesTitle') }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ t('directory.noFavoritesDesc') }}</p>
    </div>
    <div v-else-if="paginatedProfessionals.length === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
      <p class="text-sm text-slate-300 font-bold">{{ t('directory.emptyTitle') }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ t('directory.emptyDesc') }}</p>
    </div>
```

No `<ProfessionalCard>`, adicionar o listener:

```html
        @view="openProfile"
```

- [ ] **Step 4: Typecheck, lint e testes**

Run: `npx vue-tsc --noEmit && npm run lint && npx vitest run`
Expected: tudo verde.

- [ ] **Step 5: Commit**

```bash
git add src/composables/useProfessionals.ts src/views/professionals/DirectoryView.vue
git commit -m "feat: filtro de favoritos e deep link do perfil no diretorio"
```

---

### Task 8: Abrir o perfil a partir da aba Solicitar

**Files:**
- Modify: `src/views/client/SolicitarView.vue`

**Interfaces:**
- Consumes: `useUi.profileModalPro` (Task 6), emit `view` do card (Task 5).

- [ ] **Step 1: Importar `useUi` e criar o handler**

No `<script setup>`, adicionar ao import existente de composables:

```ts
import { useUi } from '../../composables/useUi'
import type { Professional } from '../../types'
```

Após os outros composables:

```ts
const { profileModalPro } = useUi()

function openProfile(pro: Professional): void {
  profileModalPro.value = pro
}
```

- [ ] **Step 2: Ligar o evento no card**

No `<ProfessionalCard>` da grade, adicionar:

```html
        @view="openProfile"
```

- [ ] **Step 3: Typecheck, lint e testes**

Run: `npx vue-tsc --noEmit && npm run lint && npx vitest run`
Expected: tudo verde.

- [ ] **Step 4: Commit**

```bash
git add src/views/client/SolicitarView.vue
git commit -m "feat: abrir perfil publico na aba solicitar"
```

---

### Task 9: Verificação final, build e deploy

**Files:**
- Nenhum arquivo novo; validação de tudo.

- [ ] **Step 1: Suíte completa**

Run: `npx vitest run && npx vue-tsc --noEmit && npm run lint && npm run build`
Expected: 10+ arquivos de teste passando, typecheck/lint limpos, build OK.

- [ ] **Step 2: Publicar o front**

Run: `npx -y @insforge/cli deployments deploy .`
Expected: `Deployment complete` + URL.

- [ ] **Step 3: E2E com Playwright (usar `/tmp/opencode`, Chrome em `/usr/bin/google-chrome`)**

```js
import { chromium } from 'playwright'
const SITE = process.env.SITE || 'https://7ed2c635.insforge.site'
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
const page = await ctx.newPage()
await page.goto(`${SITE}/#/profissionais`, { waitUntil: 'networkidle' })

// 1. perfil pelo card
await page.getByRole('button', { name: /Ver perfil/i }).first().click()
await page.waitForTimeout(400)
console.log('modal:', await page.getByRole('dialog').isVisible())

// 2. favoritar
await page.getByRole('dialog').getByRole('button', { name: /Favoritar|Remover dos favoritos/i }).click()
await page.waitForTimeout(200)

// 3. fechar e recarregar
await page.keyboard.press('Escape')
await page.reload({ waitUntil: 'networkidle' })
console.log('favorito persiste:', await page.locator('button[aria-pressed="true"]').count() > 0)

// 4. filtro
await page.getByRole('button', { name: /Favoritos/i }).click()
await page.waitForTimeout(200)
console.log('cards no filtro:', await page.locator('button:has-text("Ver perfil")').count())

// 5. deep link
await page.goto(`${SITE}/#/profissionais?pro=508dfcd0-bc94-427c-ad10-bbd4c90f7bf6`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
console.log('deep link abriu modal:', await page.getByRole('dialog').isVisible())
await page.keyboard.press('Escape')
await page.waitForTimeout(200)
console.log('query limpa:', !page.url().includes('pro='))

await browser.close()
```

Expected: `modal: true`, `favorito persiste: true`, filtro com >= 1 card, `deep link abriu modal: true`, `query limpa: true`.

- [ ] **Step 4: Limpar o favorito de teste**

No mesmo navegador E2E, desfavoritar pelo modal ou rodar:

```js
await page.evaluate(() => localStorage.removeItem('casaobra_favorites'))
```

- [ ] **Step 5: Atualizar a documentação de verificação**

Se o projeto mantiver um registro de deploy em `docs/`, acrescentar a data e o deployment id; caso contrário, pular.

- [ ] **Step 6: Commit final (se houver ajustes do E2E)**

```bash
git add -A
git commit -m "chore: ajustes da verificacao e2e de engajamento"
```

- [ ] **Step 7: Push**

```bash
git push origin main
```
