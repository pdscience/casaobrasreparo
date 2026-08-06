# Design: Tabela `plans` + Visibilidade do Cliente por Plano (Fase 1)

## Resumo

Criar tabela `plans` no banco (dados reais, não mais hardcoded),funções de consulta e um diretório de profissionais visível ao cliente, com ranking e diferenciação visual por plano:

- **Ouro (topo)**: badge "Premium" dourado + botão WhatsApp direto + recebe licitação
- **Prata (segundo)**: badge "Prioridade" azul + botão WhatsApp direto + recebe licitação
- **Bronze (terceiro)**: badge "Concorrência" cinza + recebe licitação (sem WhatsApp direto)
- **Gratuito**: oculto do diretório (não aparece ao cliente)

O envio de orçamentos (licitação: "enviar para todos vs selecionar") entra na Fase 2. Esta Fase 1 prepara o diretório e a tabela.

---

## 1. Tabela `plans`

### Schema

```sql
CREATE TABLE public.plans (
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

- `id` é a chave primária textual (gratuito/bronze/prata/ouro) — não é serial, pois o `professional.plan` já referencia essas strings.
- `rank`: 1=Ouro, 2=Prata, 3=Bronze, 4=Gratuito (menor = melhor).
- `request_limit`: integer; NULL = ilimitado (ouro).
- `receives_broadcasts`: true para bronze, prata, ouro; false para gratuito.
- `show_whatsapp_to_client`: true para ouro e prata; false para bronze e gratuito.
- `client_visible`: false para gratuito; true para bronze/prata/ouro.

### Seed

```sql
INSERT INTO public.plans (id, display_name, rank, monthly_price, request_limit, receives_broadcasts, show_whatsapp_to_client, client_visible, badge_label, badge_bg, badge_text, badge_border) VALUES
('gratuito', 'Gratuito', 4, 0, 0, false, false, false, NULL, NULL, NULL, NULL),
('bronze', 'Bronze', 3, 3490, 10, true, false, true, 'Concorrência', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20'),
('prata', 'Prata', 2, 5490, 30, true, true, true, 'Prioridade', 'bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20'),
('ouro', 'Ouro', 1, 7990, NULL, true, true, true, 'Premium', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20');
```

> **Nota:** valores de preço em centavos (3490 = R$34,90). `monthly_price` armazenado como integer para consistência com o restante (não é necessário exibir ao cliente, apenas referência).

---

## 2. Fix do caminho do servidor (InsForge)

**Problema:** `server/index.ts:22` usa `/rest/v1/${table}` — caminho que retorna 404 nesta InsForge. O correto é `/api/database/records/${table}` (padrão InsForge).

**Mudança:** alterar a linha de:
```ts
const url = `${INSFORGE_URL}/rest/v1/${table}${params ? `?${params}` : ''}`
```
para:
```ts
const url = `${INSFORGE_URL}/api/database/records/${table}${params ? `?${params}` : ''}`
```

Corrige o webhook Stripe (que gravava `plan` no InsForge via `insforgeQuery` e silenciosamente falhava) e qualquer futura query de `plans`.

---

## 3. Tipos e helpers no frontend

### `src/types.ts`

Adicionar interface `Plan`:
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

### `src/api/insforgeService.ts`

Adicionar funções:
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

> **Nota:** o `in('plan', ...)` garante que só profissionais com plan client-visible são retornados (gratuito não aparece).

---

## 4. App.vue — carregamento e enriquecimento

### Estado

```ts
const plans = ref<Plan[]>([])
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

### `loadData()` — extensão

Adicionar `getPlans()` junto com `getProfessionals()`:
```ts
const [serviceRequests, professionalsData, plansData] = await Promise.all([
  getServiceRequests(),
  getProfessionals(),
  getPlans(),
])
plans.value = plansData
```

> **Nota:** `visibleProfessionals` depende de `plans` e `professionals` — ambos carregados em `loadData()`. A diretiva `v-for` no template renderiza `visibleProfessionals` já filtrado e ordenado.

---

## 5. UI — Diretório de profissionais

### Onde aparece

Nova seção na visão do cliente, **acima do formulário de solicitação** (aba "Boas-vindas"), com título "Profissionais disponíveis" e subtítulo mostrando a categoria atual.

### Componente `ProfessionalCard.vue` (~60 linhas)

Props: `professional: Professional`, `planInfo: Plan | null`

Layout:
- Avatar (10×10 rounded-full) + nome + categoria + rating (★) + badge do plano à direita
- **Badge**: `<span class="badge">`
  - Cor: `badge_bg` + `badge_text` + `badge_border` vindos da tabela `plans`
  - Ex: Ouro → "Premium" (bg-amber-500/10, text-amber-400, border-amber-500/20)
- **WhatsApp**: se `planInfo.show_whatsapp_to_client === true` → botão verde "Falar no WhatsApp" com ícone `MessageCircle`
  - `href`: `https://wa.me/${phone}?text=${encodeURIComponent('Olá! Gostaria de um orçamento.')}`
  - Prata E ouro mostram o botão; bronze e gratuito não.

### Ordem de exibição

O `visibleProfessionals` (computed) já ordena: ouro → prata → bronze; dentro do mesmo plano, rating desc → reviews_count desc.

---

## 6. Verificação

### Aplicação da migration

```bash
npx @insforge/cli db query --file migrations/20260805_plans_table.sql
```

### Seed (se não aplicada com a migration)

```bash
npx @insforge/cli db query --file migrations/20260805_plans_seed.sql
```

### Validação

1. `npm run build` — sem erros de tipo.
2. `npm run lint` — sem erros de lint.
3. Verificar tabela: `GET /api/database/records/plans?select=id,display_name,rank` → 4 rows.
4. Verificar ranking: criar profissionais de teste (ouro, prata, bronze, gratuito) na mesma categoria → cliente vê ouro primeiro, depois prata, depois bronze; gratuito não aparece.
5. Verificar WhatsApp: ouro e prata têm botão; bronze não.
6. Verificar webhook Stripe: simular evento `checkout.session.completed` → plan atualizado no InsForge (confirma fix do caminho `/api/database/records/`).

### Critérios de aceite (Fase 1)

- [ ] Tabela `plans` existe e tem 4 rows (gratuito, bronze, prata, ouro) com os badges corretos.
- [ ] Diretório visível ao cliente, ordenado por plano (ouro > prata > bronze).
- [ ] WhatsApp aparece para ouro e prata; não para bronze.
- [ ] Gratuito não aparece no diretório.
- [ ] Build (`npm run build`) sem erros.
- [ ] Lint (`npm run lint`) sem erros.

---

## Arquivos a modificar/criar

- `migrations/20260805_plans_table.sql` (novo)
- `migrations/20260805_plans_seed.sql` (novo)
- `server/index.ts:22` — fix do caminho InsForge (`/rest/v1/` → `/api/database/records/`)
- `src/types.ts` — adicionar interface `Plan`
- `src/api/insforgeService.ts` — adicionar `getPlans()`, `getProfessionalsForClient()`
- `src/App.vue` — carregar plans, renderizar diretório com `visibleProfessionals`
- `src/components/ProfessionalCard.vue` (novo) — card com badge + WhatsApp

## Ordem de implementação

1. Migration da tabela + seed (banco).
2. Fix do caminho do servidor (InsForge path).
3. `types.ts` + `insforgeService.ts` (tipos + helpers).
4. `ProfessionalCard.vue` (componente novo).
5. `App.vue` (estado, carregamento, diretório).
6. `npm run build` + `npm run lint`.
7. Teste manual end-to-end.
