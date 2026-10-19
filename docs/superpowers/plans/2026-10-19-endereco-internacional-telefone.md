# Endereço Internacional + Telefone com DDI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar seleção de país/estado/província/município no cadastro e na edição de perfil, e um telefone com código de país, gravados de forma internacional (E.164).

**Architecture:** Um conjunto de dados geográfico estático gerado por script (países sempre no bundle; estados/municípios carregados sob demanda por país) alimenta dois componentes reutilizáveis (`AddressFields.vue` e `PhoneInput.vue`). O telefone passa a ser gravado em E.164, com o DDI em coluna própria; as colunas legadas `uf`/`cidade` continuam em sincronia para não quebrar os filtros do diretório.

**Tech Stack:** Vue 3.5 (`defineModel` múltiplo, `useId`), Vite 7 (`import.meta.glob` para carga lazy), TypeScript 5.9, Tailwind 4, Vitest 5, `libphonenumber-js` (runtime), `country-state-city` (dev, só para gerar os dados), InsForge/Postgres (migrations SQL).

**Spec:** `docs/superpowers/specs/2026-10-19-endereco-internacional-telefone-design.md`

## Global Constraints

- Telefone é gravado em **E.164** com `+` (`+5511987654321`) na coluna `phone`; o DDI (só dígitos, `55`) vai em `phone_country_code`.
- `state_code` **não é coluna** — é campo de formulário que alimenta a coluna legada `uf`.
- Colunas novas em `users` e `professionals`: `country_code` (ISO2, default `'BR'`), `state` (nome), `municipality` (nome), `phone_country_code` (default `'55'`). `users` ganha também `phone`.
- `uf` e `cidade` **permanecem** e são gravados em sincronia: `uf` = `state_code` em maiúsculas (ou `''`), `cidade` = `municipality`.
- Nome do país é localizado via `Intl.DisplayNames` — **sem dicionário próprio**.
- Estados/municípios usam o **nome nativo** da fonte (não há tradução por idioma).
- Rótulo de estado é "Estado / Província" (PT), "State / Province" (EN), "Estado / Provincia" (ES).
- Nenhum texto novo fica hard-coded: toda string vai para `src/i18n/pt.ts`, `en.ts`, `es.ts`.
- Vitest roda em `environment: 'node'` e só cobre `src/**/*.test.ts` — **sem testes de componente**.
- Commits em português, prefixo `feat:` / `fix:` / `chore:`, seguindo o estilo do repo.

---

### Task 1: Dependências e gerador de dados geográficos

**Files:**
- Modify: `package.json`
- Create: `scripts/build-geo-data.mjs`
- Create: `src/data/geo/countries.json` (gerado)
- Create: `src/data/geo/regions/<CC>.json` (gerado, 250 arquivos)

**Interfaces:**
- Produces: `src/data/geo/countries.json` → `Array<{ code: string; dial: string; flag: string }>`
- Produces: `src/data/geo/regions/<CC>.json` → `{ code: string; states: Array<{ code: string; name: string }>; cities: Record<string, string[]> }`
- Produces: `scripts/build-geo-data.mjs` (executável via `node scripts/build-geo-data.mjs`)

- [ ] **Step 1: Instalar as dependências**

```bash
npm i libphonenumber-js@1.13.15 && npm i -D country-state-city@3.2.1
```

- [ ] **Step 2: Criar `scripts/build-geo-data.mjs`**

```js
#!/usr/bin/env node
/**
 * Gera os dados geográficos estáticos do app.
 * Fonte: country-state-city (devDependency) + libphonenumber-js (DDI de fallback).
 * Rodar: node scripts/build-geo-data.mjs
 */
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Country, State, City } from 'country-state-city'
import { getCountryCallingCode } from 'libphonenumber-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src/data/geo')
const regionsDir = join(outDir, 'regions')

function dialFor(isoCode, fallback) {
  if (fallback) return String(fallback)
  try {
    return String(getCountryCallingCode(isoCode))
  } catch {
    return ''
  }
}

const countries = Country.getAllCountries()
  .map((c) => ({ code: c.isoCode, dial: dialFor(c.isoCode, c.phonecode), flag: c.flag }))
  .filter((c) => c.code && c.dial)
  .sort((a, b) => a.code.localeCompare(b.code))

const statesByCountry = new Map()
for (const s of State.getAllStates()) {
  if (!s.countryCode) continue
  if (!statesByCountry.has(s.countryCode)) statesByCountry.set(s.countryCode, [])
  statesByCountry.get(s.countryCode).push({ code: s.isoCode || '', name: s.name })
}

const citiesByCountry = new Map()
for (const c of City.getAllCities()) {
  if (!c.countryCode) continue
  if (!citiesByCountry.has(c.countryCode)) citiesByCountry.set(c.countryCode, new Map())
  const byState = citiesByCountry.get(c.countryCode)
  const key = c.stateCode || ''
  if (!byState.has(key)) byState.set(key, new Set())
  byState.get(key).add(c.name)
}

await rm(regionsDir, { recursive: true, force: true })
await mkdir(regionsDir, { recursive: true })
await writeFile(join(outDir, 'countries.json'), `${JSON.stringify(countries, null, 0)}\n`)

for (const country of countries) {
  const region = {
    code: country.code,
    states: (statesByCountry.get(country.code) || []).sort((a, b) => a.name.localeCompare(b.name)),
    cities: Object.fromEntries(
      [...(citiesByCountry.get(country.code) || new Map())].map(([stateCode, names]) => [
        stateCode,
        [...names].sort((a, b) => a.localeCompare(b)),
      ]),
    ),
  }
  await writeFile(join(regionsDir, `${country.code}.json`), `${JSON.stringify(region)}\n`)
}

console.log(`countries: ${countries.length} | regions: ${countries.length}`)
```

- [ ] **Step 3: Rodar o gerador e conferir a saída**

```bash
node scripts/build-geo-data.mjs
```

Esperado: `countries: 250 | regions: 250`. Conferir:

```bash
node -e "const c=require('./src/data/geo/countries.json');console.log(c.length,JSON.stringify(c.find(x=>x.code==='BR')))"
node -e "const r=require('./src/data/geo/regions/BR.json');console.log(r.states.length, r.states[0], (r.cities['SP']||[]).length)"
node -e "const r=require('./src/data/geo/regions/XX.json');console.log(r.states.length, Object.keys(r.cities).length)"
```

Esperado: BR tem 27 estados e ~650 municípios em SP; um país sem estados tem `states.length === 0`.

- [ ] **Step 4: Adicionar o script ao `package.json`**

```json
"build:geo": "node scripts/build-geo-data.mjs"
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json scripts/build-geo-data.mjs src/data/geo
git commit -m "feat: dados geograficos estaticos de pais, estado e municipio"
```

---

### Task 2: `src/lib/geo.ts` + testes

**Files:**
- Create: `src/lib/geo.ts`
- Create: `src/lib/geo.test.ts`

**Interfaces:**
- Consumes: `src/data/geo/countries.json`, `src/data/geo/regions/*.json` (via `import.meta.glob`)
- Produces:
  - `interface CountryMeta { code: string; dial: string; flag: string }`
  - `interface RegionState { code: string; name: string }`
  - `interface CountryRegions { code: string; states: RegionState[]; cities: Record<string, string[]> }`
  - `const COUNTRIES: CountryMeta[]`
  - `loadRegions(countryCode: string): Promise<CountryRegions>`
  - `countryName(code: string, lang: string): string`
  - `flagOf(code: string): string`
  - `dialOf(code: string): string`
  - `sortedCountries(lang: string): CountryMeta[]`

- [ ] **Step 1: Escrever o teste que falha — `src/lib/geo.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { COUNTRIES, countryName, dialOf, flagOf, loadRegions, sortedCountries } from './geo'

describe('geo', () => {
  it('lista os paises com codigo, DDI e bandeira', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200)
    const br = COUNTRIES.find((c) => c.code === 'BR')
    expect(br).toBeDefined()
    expect(br?.dial).toBe('55')
    expect(br?.flag.length).toBeGreaterThan(0)
  })

  it('localiza o nome do pais no idioma pedido', () => {
    expect(countryName('BR', 'pt-BR')).toBe('Brasil')
    expect(countryName('BR', 'en')).toBe('Brazil')
    expect(countryName('BR', 'es')).toBe('Brasil')
  })

  it('deriva a bandeira do codigo ISO', () => {
    expect(flagOf('BR')).toBe('\u{1F1E7}\u{1F1F7}')
    expect(flagOf('')).toBe('')
  })

  it('resolve o DDI do pais', () => {
    expect(dialOf('BR')).toBe('55')
    expect(dialOf('US')).toBe('1')
    expect(dialOf('ZZ')).toBe('')
  })

  it('ordena os paises pelo nome localizado', () => {
    const sorted = sortedCountries('en')
    expect(sorted[0].code).toBeDefined()
    expect(sorted.map((c) => c.code)).toContain('BR')
  })

  it('carrega estados e municipios do pais sob demanda', async () => {
    const regions = await loadRegions('BR')
    expect(regions.states.length).toBe(27)
    expect(regions.states.find((s) => s.code === 'SP')?.name).toBe('São Paulo')
    expect(regions.cities['SP'].length).toBeGreaterThan(100)
  })

  it('cacheia o carregamento do mesmo pais', async () => {
    const a = await loadRegions('BR')
    const b = await loadRegions('BR')
    expect(b).toBe(a)
  })

  it('devolve regiao vazia para pais desconhecido', async () => {
    const regions = await loadRegions('ZZ')
    expect(regions.states).toEqual([])
    expect(regions.cities).toEqual({})
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
npx vitest run src/lib/geo.test.ts
```

Esperado: FAIL — "Failed to resolve import ./geo".

- [ ] **Step 3: Criar `src/lib/geo.ts`**

```ts
import countryData from '../data/geo/countries.json'

export interface CountryMeta {
  code: string
  dial: string
  flag: string
}

export interface RegionState {
  code: string
  name: string
}

export interface CountryRegions {
  code: string
  states: RegionState[]
  cities: Record<string, string[]>
}

export const COUNTRIES = countryData as CountryMeta[]

const regionLoaders = import.meta.glob<CountryRegions>('../data/geo/regions/*.json')

const regionCache = new Map<string, CountryRegions>()

/** Carrega (e cacheia) os estados e municípios de um país. */
export async function loadRegions(countryCode: string): Promise<CountryRegions> {
  const cc = (countryCode || '').toUpperCase()
  if (!cc) return { code: '', states: [], cities: {} }
  const cached = regionCache.get(cc)
  if (cached) return cached
  const loader = regionLoaders[`../data/geo/regions/${cc}.json`]
  if (!loader) {
    const empty: CountryRegions = { code: cc, states: [], cities: {} }
    regionCache.set(cc, empty)
    return empty
  }
  const regions = await loader()
  regionCache.set(cc, regions)
  return regions
}

const displayNamesCache = new Map<string, Intl.DisplayNames>()

function displayNamesFor(lang: string): Intl.DisplayNames | null {
  const cached = displayNamesCache.get(lang)
  if (cached) return cached
  try {
    const instance = new Intl.DisplayNames([lang], { type: 'region' })
    displayNamesCache.set(lang, instance)
    return instance
  } catch {
    return null
  }
}

/** Nome do país no idioma pedido ("BR" → "Brasil" / "Brazil"). */
export function countryName(code: string, lang: string): string {
  const cc = (code || '').toUpperCase()
  if (!cc) return ''
  const names = displayNamesFor(lang)
  if (!names) return cc
  try {
    return names.of(cc) || cc
  } catch {
    return cc
  }
}

/** Bandeira derivada do código ISO (BR → 🇧🇷). */
export function flagOf(code: string): string {
  const cc = (code || '').toUpperCase()
  if (cc.length !== 2) return ''
  return String.fromCodePoint(
    ...[...cc].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  )
}

/** DDI do país em dígitos ("BR" → "55"). */
export function dialOf(code: string): string {
  const cc = (code || '').toUpperCase()
  return COUNTRIES.find((c) => c.code === cc)?.dial ?? ''
}

/** Países ordenados pelo nome localizado no idioma pedido. */
export function sortedCountries(lang: string): CountryMeta[] {
  return [...COUNTRIES].sort((a, b) =>
    countryName(a.code, lang).localeCompare(countryName(b.code, lang), lang),
  )
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npx vitest run src/lib/geo.test.ts
```

Esperado: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat: lib geo com paises localizados e regioes sob demanda"
```

---

### Task 3: `src/lib/phone.ts` + testes

**Files:**
- Create: `src/lib/phone.ts`
- Create: `src/lib/phone.test.ts`

**Interfaces:**
- Consumes: `dialOf` de `src/lib/geo.ts`, `libphonenumber-js`
- Produces:
  - `interface PhoneValidation { ok: boolean; e164: string; digits: number }`
  - `formatNational(countryCode: string, value: string): string`
  - `nationalDigits(value: string): string`
  - `toE164(countryCode: string, national: string): string`
  - `validatePhone(countryCode: string, national: string): PhoneValidation`
  - `validateE164(phone: string): PhoneValidation`
  - `countryFromE164(phone: string): string`
  - `nationalFromE164(phone: string, countryCode: string): string`
  - `legacyToE164(phone: string): string`

- [ ] **Step 1: Escrever o teste que falha — `src/lib/phone.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import {
  countryFromE164,
  formatNational,
  legacyToE164,
  nationalFromE164,
  nationalDigits,
  toE164,
  validateE164,
  validatePhone,
} from './phone'

describe('phone', () => {
  it('aplica a mascara por pais', () => {
    expect(formatNational('BR', '11987654321')).toBe('(11) 98765-4321')
    expect(formatNational('US', '2015550123')).toBe('(201) 555-0123')
  })

  it('extrai apenas digitos', () => {
    expect(nationalDigits('(11) 98765-4321')).toBe('11987654321')
  })

  it('monta o E.164 a partir do pais e do numero nacional', () => {
    expect(toE164('BR', '11987654321')).toBe('+5511987654321')
    expect(toE164('US', '2015550123')).toBe('+12015550123')
  })

  it('valida numeros possiveis do pais', () => {
    const br = validatePhone('BR', '11987654321')
    expect(br.ok).toBe(true)
    expect(br.e164).toBe('+5511987654321')
    expect(validatePhone('BR', '123').ok).toBe(false)
    expect(validatePhone('BR', '').ok).toBe(false)
  })

  it('valida um telefone ja em E.164', () => {
    const ok = validateE164('+5511987654321')
    expect(ok.ok).toBe(true)
    expect(ok.e164).toBe('+5511987654321')
    expect(validateE164('+5511').ok).toBe(false)
    expect(validateE164('').ok).toBe(false)
  })

  it('descobre o pais a partir do E.164', () => {
    expect(countryFromE164('+5511987654321')).toBe('BR')
    expect(countryFromE164('+12015550123')).toBe('US')
    expect(countryFromE164('')).toBe('')
  })

  it('volta do E.164 para o numero nacional', () => {
    expect(nationalFromE164('+5511987654321', 'BR')).toBe('11987654321')
    expect(nationalFromE164('+12015550123', 'US')).toBe('2015550123')
  })

  it('normaliza telefones legados para E.164', () => {
    expect(legacyToE164('11987654321')).toBe('+5511987654321')
    expect(legacyToE164('+5511987654321')).toBe('+5511987654321')
    expect(legacyToE164('5511987654321')).toBe('+5511987654321')
    expect(legacyToE164('')).toBe('')
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
npx vitest run src/lib/phone.test.ts
```

Esperado: FAIL — "Failed to resolve import ./phone".

- [ ] **Step 3: Criar `src/lib/phone.ts`**

```ts
import { AsYouType, parsePhoneNumberFromString } from 'libphonenumber-js'
import { dialOf } from './geo'

export interface PhoneValidation {
  ok: boolean
  e164: string
  digits: number
}

/** Formata o número nacional conforme o país (BR → "(11) 98765-4321"). */
export function formatNational(countryCode: string, value: string): string {
  const cc = (countryCode || '').toUpperCase()
  if (!cc || !value) return value
  try {
    return new AsYouType(cc).input(value)
  } catch {
    return value
  }
}

/** Só os dígitos do valor informado. */
export function nationalDigits(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/** Monta o E.164 a partir do país e do número nacional. */
export function toE164(countryCode: string, national: string): string {
  const dial = dialOf(countryCode)
  const digits = nationalDigits(national)
  if (!dial || !digits) return ''
  return `+${dial}${digits}`
}

/** Valida o número nacional contra as regras do país. */
export function validatePhone(countryCode: string, national: string): PhoneValidation {
  const digits = nationalDigits(national)
  const e164 = toE164(countryCode, digits)
  if (!e164) return { ok: false, e164: '', digits: digits.length }
  let parsed
  try {
    parsed = parsePhoneNumberFromString(e164)
  } catch {
    parsed = undefined
  }
  if (!parsed || !parsed.isPossible()) return { ok: false, e164, digits: digits.length }
  return { ok: true, e164: parsed.number, digits: digits.length }
}

/** Valida um telefone já gravado em E.164. */
export function validateE164(phone: string): PhoneValidation {
  const digits = nationalDigits(phone)
  if (!digits) return { ok: false, e164: '', digits: 0 }
  let parsed
  try {
    parsed = parsePhoneNumberFromString(`+${digits}`)
  } catch {
    parsed = undefined
  }
  if (!parsed || !parsed.isPossible()) return { ok: false, e164: `+${digits}`, digits: digits.length }
  return { ok: true, e164: parsed.number, digits: digits.length }
}

/** País (ISO2) de um telefone já em E.164. */
export function countryFromE164(phone: string): string {
  if (!phone) return ''
  try {
    return parsePhoneNumberFromString(phone)?.country ?? ''
  } catch {
    return ''
  }
}

/** Número nacional (sem DDI) a partir de um E.164. */
export function nationalFromE164(phone: string, countryCode: string): string {
  if (!phone) return ''
  try {
    const parsed = parsePhoneNumberFromString(phone)
    if (parsed) return parsed.nationalNumber
  } catch {
    // cai no fallback manual
  }
  const dial = dialOf(countryCode)
  const digits = nationalDigits(phone)
  if (dial && digits.startsWith(dial)) return digits.slice(dial.length)
  return digits
}

/**
 * Normaliza telefone legado (gravado só com o número nacional) para E.164.
 * Segue a heurística já usada em src/lib/whatsapp.ts: mais de 11 dígitos = já tem DDI.
 */
export function legacyToE164(phone: string): string {
  const raw = (phone || '').trim()
  if (!raw) return ''
  const digits = nationalDigits(raw)
  if (!digits) return ''
  if (raw.startsWith('+')) return `+${digits}`
  if (digits.length > 11) return `+${digits}`
  return `+55${digits}`
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npx vitest run src/lib/phone.test.ts
```

Esperado: PASS (7 testes). Se `formatNational('US', '2015550123')` divergir, ajustar a expectativa **para o valor real devolvido pela lib** e seguir — o comportamento da lib é a fonte da verdade.

- [ ] **Step 5: Commit**

```bash
git add src/lib/phone.ts src/lib/phone.test.ts
git commit -m "feat: lib de telefone internacional com mascara e E.164"
```

---

### Task 4: Migration do banco

**Files:**
- Create: `migrations/20261019103000_add-international-address-phone.sql`

**Interfaces:**
- Produces: colunas `users.country_code`, `users.state`, `users.municipality`, `users.phone`, `users.phone_country_code`, `professionals.country_code`, `professionals.state`, `professionals.municipality`, `professionals.phone_country_code`

- [ ] **Step 1: Criar a migration**

```sql
-- Endereco internacional (pais/estado/municipio) e telefone com DDI.
-- O telefone passa a ser gravado em E.164 (+5511987654321); o DDI fica em phone_country_code.
-- As colunas legadas uf e cidade sao mantidas e preenchidas em sincronia pelo app.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS municipality TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '55';

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS municipality TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '55';

-- Backfill dos registros existentes (tudo era brasileiro).
UPDATE public.users
SET state = upper(uf) WHERE state = '' AND uf <> '';
UPDATE public.users
SET municipality = cidade WHERE municipality = '' AND cidade <> '';
UPDATE public.users
SET phone = '+55' || phone WHERE phone <> '' AND phone NOT LIKE '+%';
UPDATE public.users
SET phone_country_code = '55' WHERE phone_country_code = '';

UPDATE public.professionals
SET state = upper(uf) WHERE state = '' AND uf <> '';
UPDATE public.professionals
SET municipality = cidade WHERE municipality = '' AND cidade <> '';
UPDATE public.professionals
SET phone = '+55' || phone WHERE phone <> '' AND phone NOT LIKE '+%';
UPDATE public.professionals
SET phone_country_code = '55' WHERE phone_country_code = '';
```

- [ ] **Step 2: Conferir o SQL antes de aplicar**

Rodar o arquivo no InsForge/Postgres de desenvolvimento e checar:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('users','professionals')
  AND column_name IN ('country_code','state','municipality','phone','phone_country_code')
ORDER BY table_name, column_name;
```

Esperado: 9 colunas no total (5 em `users`, 4 em `professionals`).

- [ ] **Step 3: Commit**

```bash
git add migrations/20261019103000_add-international-address-phone.sql
git commit -m "feat: migration de endereco internacional e telefone com DDI"
```

---

### Task 5: Tipos do domínio

**Files:**
- Modify: `src/types.ts:14-42` (`Professional`) e `src/types.ts:97-111` (`User`)

**Interfaces:**
- Produces: `Professional.country_code`, `Professional.state`, `Professional.municipality`, `Professional.phone_country_code`; `User.country_code`, `User.state`, `User.municipality`, `User.phone`, `User.phone_country_code`

- [ ] **Step 1: Adicionar os campos em `Professional`**

Dentro de `interface Professional`, logo depois de `uf: string`:

```ts
  country_code: string
  state: string
  municipality: string
  phone_country_code: string
```

- [ ] **Step 2: Adicionar os campos em `User`**

Dentro de `interface User`, logo depois de `uf: string`:

```ts
  country_code: string
  state: string
  municipality: string
  phone: string
  phone_country_code: string
```

- [ ] **Step 3: Rodar o typecheck e=listar os call sites que quebraram**

```bash
npm run typecheck
```

Esperado: erros em `src/composables/useAuth.ts` (o `proProfile` inicial e o `createProfessional` do cadastro) e em `src/components/ProfileEditModal.vue` (os dois `createProfessional`/`updateProfessional`). **Anotar a lista exata de arquivos com erro** — eles são corrigidos nas Tasks 9 e 10. Não é para corrigir aqui.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts
git commit -m "feat: tipos de dominio com pais, estado, municipio e DDI"
```

---

### Task 6: Chaves de i18n

**Files:**
- Modify: `src/i18n/pt.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`

**Interfaces:**
- Produces: chaves `common.pais`, `common.estadoProvincia`, `common.municipio`, `common.telefone`, `common.codigoPais`, `common.selecionePais`, `common.selecioneEstado`, `common.selecioneMunicipio`, `common.digiteOuSelecione`, `common.errTelefoneInvalido`, `auth.telefone`, `profile.telefone`

- [ ] **Step 1: Adicionar as chaves em `pt.ts` (dentro de `common`)**

```ts
    pais: 'País',
    estadoProvincia: 'Estado / Província',
    municipio: 'Município',
    telefone: 'Telefone',
    codigoPais: 'Código do país',
    selecionePais: 'Selecione o país',
    selecioneEstado: 'Selecione o estado',
    selecioneMunicipio: 'Digite ou selecione o município',
    digiteOuSelecione: 'Digite ou selecione',
    errTelefoneInvalido: 'Informe um telefone válido para o país selecionado.',
```

- [ ] **Step 2: Adicionar as chaves em `en.ts` (dentro de `common`)**

```ts
    pais: 'Country',
    estadoProvincia: 'State / Province',
    municipio: 'Municipality',
    telefone: 'Phone',
    codigoPais: 'Country code',
    selecionePais: 'Select the country',
    selecioneEstado: 'Select the state',
    selecioneMunicipio: 'Type or select the municipality',
    digiteOuSelecione: 'Type or select',
    errTelefoneInvalido: 'Enter a valid phone number for the selected country.',
```

- [ ] **Step 3: Adicionar as chaves em `es.ts` (dentro de `common`)**

```ts
    pais: 'País',
    estadoProvincia: 'Estado / Provincia',
    municipio: 'Municipio',
    telefone: 'Teléfono',
    codigoPais: 'Código de país',
    selecionePais: 'Selecciona el país',
    selecioneEstado: 'Selecciona el estado',
    selecioneMunicipio: 'Escribe o selecciona el municipio',
    digiteOuSelecione: 'Escribe o selecciona',
    errTelefoneInvalido: 'Introduce un número de teléfono válido para el país seleccionado.',
```

- [ ] **Step 4: Adicionar `auth.telefone` e `profile.telefone`**

Em `auth` (pt/en/es): `telefone: 'Telefone'` / `'Phone'` / `'Teléfono'`.
Em `profile` (pt/en/es): `telefone: 'Telefone (WhatsApp)'` / `'Phone (WhatsApp)'` / `'Teléfono (WhatsApp)'`.

- [ ] **Step 5: Conferir que as 3 línguas têm exatamente as mesmas chaves**

```bash
node -e "
const fs=require('fs');
const load=(f)=>eval('('+fs.readFileSync('src/i18n/'+f,'utf8').replace(/\/\/.*$/gm,'').replace(/export default/,'').replace(/^const .*=.*$/gm,'')+')');
const keys=(o,p='')=>Object.entries(o||{}).flatMap(([k,v])=>typeof v==='object'&&v?keys(v,p+k+'.'):[p+k]);
const pt=keys(load('pt.ts')),en=keys(load('en.ts')),es=keys(load('es.ts'));
console.log('faltando en:',pt.filter(k=>!en.includes(k)));
console.log('faltando es:',pt.filter(k=>!es.includes(k)));
"
```

Esperado: `faltando en: []` e `faltando es: []`.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/pt.ts src/i18n/en.ts src/i18n/es.ts
git commit -m "feat: chaves de i18n para pais, estado, municipio e telefone"
```

---

### Task 7: `AddressFields.vue`

**Files:**
- Create: `src/components/AddressFields.vue`

**Interfaces:**
- Consumes: `loadRegions`, `sortedCountries`, `countryName`, `flagOf`, `dialOf` de `src/lib/geo.ts`; `useI18n` de `src/composables/useI18n.ts`
- Produces: componente com models `countryCode`, `stateCode`, `stateName`, `municipality`, `street`, `neighborhood` e prop `withStreet: boolean` (default `true`)

- [ ] **Step 1: Criar o componente**

```vue
<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { countryName, dialOf, flagOf, loadRegions, sortedCountries, type CountryRegions } from '../lib/geo'

withDefaults(defineProps<{ withStreet?: boolean }>(), { withStreet: true })

const countryCode = defineModel<string>('countryCode', { default: 'BR' })
const stateCode = defineModel<string>('stateCode', { default: '' })
const stateName = defineModel<string>('stateName', { default: '' })
const municipality = defineModel<string>('municipality', { default: '' })
const street = defineModel<string>('street', { default: '' })
const neighborhood = defineModel<string>('neighborhood', { default: '' })

const { t, lang } = useI18n()

const regions = ref<CountryRegions>({ code: '', states: [], cities: {} })
const loadingRegions = ref(false)
/** True depois do primeiro carregamento — evita limpar os valores já hidratados pelo pai. */
const initialized = ref(false)

const countries = computed(() => sortedCountries(lang.value))
const hasStates = computed(() => regions.value.states.length > 0)
const cityOptions = computed(() => regions.value.cities?.[stateCode.value] ?? [])
const citiesListId = `cities-${useId()}`

async function loadFor(code: string): Promise<void> {
  if (!code) {
    regions.value = { code: '', states: [], cities: {} }
    return
  }
  loadingRegions.value = true
  try {
    regions.value = await loadRegions(code)
  } finally {
    loadingRegions.value = false
  }
}

watch(
  countryCode,
  (code) => {
    if (!initialized.value) {
      initialized.value = true
      void loadFor(code)
      return
    }
    stateCode.value = ''
    stateName.value = ''
    municipality.value = ''
    void loadFor(code)
  },
  { immediate: true },
)

function onStateChange(): void {
  const found = regions.value.states.find((s) => s.code === stateCode.value)
  stateName.value = found?.name ?? ''
}

const inputClass =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all'
</script>

<template>
  <div class="space-y-4">
    <div v-if="withStreet" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('auth.endereco') }}</label>
        <input v-model="street" type="text" :placeholder="t('auth.ruaNumero')" :class="inputClass" />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('auth.bairro') }}</label>
        <input v-model="neighborhood" type="text" :placeholder="t('auth.seuBairro')" :class="inputClass" />
      </div>
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('common.pais') }} *</label>
      <select v-model="countryCode" :class="inputClass">
        <option v-for="c in countries" :key="c.code" :value="c.code">
          {{ flagOf(c.code) }} {{ countryName(c.code, lang) }} (+{{ dialOf(c.code) }})
        </option>
      </select>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('common.estadoProvincia') }} *</label>
        <select v-if="hasStates" v-model="stateCode" @change="onStateChange" :class="inputClass">
          <option value="">{{ t('common.selecioneEstado') }}</option>
          <option v-for="s in regions.states" :key="s.code" :value="s.code">{{ s.name }}</option>
        </select>
        <input
          v-else
          v-model="stateName"
          type="text"
          :placeholder="t('common.digiteOuSelecione')"
          :class="inputClass"
        />
        <p v-if="loadingRegions" class="text-[11px] text-slate-500 mt-1">…</p>
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('common.municipio') }} *</label>
        <input
          v-model="municipality"
          type="text"
          :list="citiesListId"
          :placeholder="t('common.selecioneMunicipio')"
          :class="inputClass"
        />
        <datalist :id="citiesListId">
          <option v-for="city in cityOptions" :key="city" :value="city" />
        </datalist>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Rodar o typecheck**

```bash
npm run typecheck
```

Esperado: sem erro novo ligado a `AddressFields.vue` (os erros pendentes são os das Tasks 5/9/10).

- [ ] **Step 3: Commit**

```bash
git add src/components/AddressFields.vue
git commit -m "feat: componente de endereco em cascata pais, estado e municipio"
```

---

### Task 8: `PhoneInput.vue`

**Files:**
- Create: `src/components/PhoneInput.vue`

**Interfaces:**
- Consumes: `dialOf`, `flagOf`, `countryName`, `sortedCountries` de `src/lib/geo.ts`; `formatNational`, `validatePhone`, `nationalDigits`, `countryFromE164`, `nationalFromE164` de `src/lib/phone.ts`
- Produces: componente com models `phone` (E.164) e `phoneCountry` (ISO2 do telefone)

- [ ] **Step 1: Criar o componente**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { countryName, dialOf, flagOf, sortedCountries } from '../lib/geo'
import { countryFromE164, formatNational, nationalDigits, nationalFromE164, validatePhone } from '../lib/phone'

const phone = defineModel<string>('phone', { default: '' })
const phoneCountry = defineModel<string>('phoneCountry', { default: 'BR' })

const { t, lang } = useI18n()

const national = ref('')
const error = ref('')
/** Último E.164 emitido por este componente (evita re-hidratar o próprio output). */
let lastEmitted = ''

const countries = computed(() => sortedCountries(lang.value))
const dial = computed(() => dialOf(phoneCountry.value))

const inputClass =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all'

function hydrate(value: string): void {
  if (!value) {
    national.value = ''
    error.value = ''
    lastEmitted = ''
    return
  }
  const country = countryFromE164(value) || phoneCountry.value || 'BR'
  if (country !== phoneCountry.value) phoneCountry.value = country
  national.value = formatNational(country, nationalFromE164(value, country))
  error.value = ''
  lastEmitted = value
}

function emitPhone(): void {
  const result = validatePhone(phoneCountry.value, national.value)
  error.value = result.ok ? '' : t('common.errTelefoneInvalido')
  lastEmitted = result.ok ? result.e164 : ''
  phone.value = lastEmitted
}

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  national.value = formatNational(phoneCountry.value, raw)
  emitPhone()
}

watch(phone, (value) => {
  if (value === lastEmitted) return
  hydrate(value)
})

watch(phoneCountry, () => {
  if (!national.value) return
  national.value = formatNational(phoneCountry.value, nationalDigits(national.value))
  emitPhone()
})
</script>

<template>
  <div>
    <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('common.telefone') }} *</label>
    <div class="flex gap-2">
      <select
        v-model="phoneCountry"
        class="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all"
        :aria-label="t('common.codigoPais')"
      >
        <option v-for="c in countries" :key="c.code" :value="c.code">
          {{ flagOf(c.code) }} +{{ dialOf(c.code) }}
        </option>
      </select>
      <input
        :value="national"
        type="tel"
        inputmode="tel"
        :placeholder="t('common.digiteOuSelecione')"
        :class="inputClass"
        @input="onInput"
      />
    </div>
    <p v-if="error" class="text-[11px] text-red-400 mt-1">{{ error }}</p>
    <p v-else-if="dial" class="text-[11px] text-slate-500 mt-1">+{{ dial }}</p>
  </div>
</template>
```

- [ ] **Step 2: Rodar o typecheck e o lint**

```bash
npm run typecheck && npx eslint src/components/PhoneInput.vue src/components/AddressFields.vue
```

Esperado: sem erro.

- [ ] **Step 3: Commit**

```bash
git add src/components/PhoneInput.vue
git commit -m "feat: componente de telefone com codigo de pais e mascara"
```

---

### Task 9: Cadastro (formulário de registro)

**Files:**
- Modify: `src/composables/useAuth.ts:58-68` (`registerForm`), `:171-182` (insert em `users`), `:189-214` (insert em `professionals`), `:220` (reset)
- Modify: `src/components/auth/AuthModal.vue:214-255` (bloco de endereço), e o bloco do telefone

**Interfaces:**
- Consumes: `AddressFields.vue`, `PhoneInput.vue` (Tasks 7 e 8); `dialOf` de `src/lib/geo.ts`
- Produces: `registerForm` com os campos `phone`, `phone_country`, `country_code`, `state`, `state_code`, `municipality`

- [ ] **Step 1: Estender `registerForm` em `useAuth.ts`**

```ts
const registerForm = ref({
  name: '',
  email: '',
  password: '',
  birth_date: '',
  address: '',
  bairro: '',
  cidade: '',
  uf: '',
  category: '',
  country_code: 'BR',
  state: '',
  state_code: '',
  municipality: '',
  phone: '',
  phone_country: 'BR',
})
```

- [ ] **Step 2: Gravar as colunas novas no insert de `users`**

Substituir o bloco `createUserRecord({...})` por:

```ts
    const record = await createUserRecord({
      auth_id: user.id,
      role: authRole.value,
      name: registerForm.value.name.trim(),
      email: registerForm.value.email.trim(),
      birth_date: registerForm.value.birth_date,
      address: registerForm.value.address,
      bairro: registerForm.value.bairro,
      cidade: registerForm.value.municipality.trim(),
      uf: registerForm.value.state_code.trim().toUpperCase(),
      country_code: registerForm.value.country_code,
      state: registerForm.value.state.trim(),
      municipality: registerForm.value.municipality.trim(),
      phone: registerForm.value.phone,
      phone_country_code: dialOf(registerForm.value.phone_country),
      category: authRole.value === 'pro' ? registerForm.value.category : '',
    })
```

Adicionar o import no topo de `useAuth.ts`:

```ts
import { dialOf } from '../lib/geo'
```

- [ ] **Step 3: Gravar as colunas novas no insert de `professionals`**

Trocar `phone: ''`, `cidade: ''` e `uf: ''` por:

```ts
        phone: registerForm.value.phone,
        phone_country_code: dialOf(registerForm.value.phone_country),
        cidade: registerForm.value.municipality.trim(),
        uf: registerForm.value.state_code.trim().toUpperCase(),
        country_code: registerForm.value.country_code,
        state: registerForm.value.state.trim(),
        municipality: registerForm.value.municipality.trim(),
```

- [ ] **Step 4: Resetar o form com os campos novos**

```ts
    registerForm.value = {
      name: '', email: '', password: '', birth_date: '', address: '', bairro: '',
      cidade: '', uf: '', category: '', country_code: 'BR', state: '', state_code: '',
      municipality: '', phone: '', phone_country: 'BR',
    }
```

- [ ] **Step 5: Trocar o bloco de endereço no `AuthModal.vue`**

Remover o bloco de "Endereço / Bairro" e o bloco "Cidade / UF" (as linhas com `registerForm.address`, `registerForm.bairro`, `registerForm.cidade`, `registerForm.uf`) e colocar no lugar:

```vue
          <AddressFields
            v-model:country-code="registerForm.country_code"
            v-model:state-code="registerForm.state_code"
            v-model:state-name="registerForm.state"
            v-model:municipality="registerForm.municipality"
            v-model:street="registerForm.address"
            v-model:neighborhood="registerForm.bairro"
          />

          <PhoneInput
            v-model:phone="registerForm.phone"
            v-model:phone-country="registerForm.phone_country"
          />
```

Adicionar os imports no `<script setup>` do `AuthModal.vue`:

```ts
import AddressFields from '../AddressFields.vue'
import PhoneInput from '../PhoneInput.vue'
```

- [ ] **Step 6: Rodar o typecheck e o lint**

```bash
npm run typecheck && npx eslint src/components/auth/AuthModal.vue src/composables/useAuth.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/composables/useAuth.ts src/components/auth/AuthModal.vue
git commit -m "feat: endereco internacional e telefone com DDI no cadastro"
```

---

### Task 10: Edição de perfil

**Files:**
- Modify: `src/components/ProfileEditModal.vue` — refs (`:35-49`), hidratação (`:70-106`), `handleSave` (`:188-321`), template do profissional (`:411-449`) e do cliente (`:534-571`)

**Interfaces:**
- Consumes: `AddressFields.vue`, `PhoneInput.vue`; `dialOf` de `src/lib/geo.ts`; `validatePhone` de `src/lib/phone.ts`
- Produces: nada novo exportado — só o payload das tabelas `professionals` e `users`

- [ ] **Step 1: Trocar as refs de localização**

Em `ProfileEditModal.vue`, remover `proCidade`, `proUf`, `cidade`, `uf` e adicionar:

```ts
const phoneCountry = ref('BR')
const proCountryCode = ref('BR')
const proStateCode = ref('')
const proStateName = ref('')
const proMunicipality = ref('')
const userCountryCode = ref('BR')
const userStateCode = ref('')
const userStateName = ref('')
const userMunicipality = ref('')
```

- [ ] **Step 2: Hidratar o profissional**

No `watch` que carrega o profissional, substituir as linhas de `cidade`/`uf` por:

```ts
      phone.value = professional.phone || ''
      phoneCountry.value = countryFromE164(professional.phone) || professional.country_code || 'BR'
      proCountryCode.value = professional.country_code || 'BR'
      proStateCode.value = professional.uf || ''
      proStateName.value = professional.state || ''
      proMunicipality.value = professional.municipality || professional.cidade || ''
```

- [ ] **Step 3: Hidratar o cliente**

No `watch` que carrega o cliente, substituir as linhas de `cidade`/`uf` por:

```ts
      phone.value = user.phone || ''
      phoneCountry.value = countryFromE164(user.phone) || user.country_code || 'BR'
      userCountryCode.value = user.country_code || 'BR'
      userStateCode.value = user.uf || ''
      userStateName.value = user.state || ''
      userMunicipality.value = user.municipality || user.cidade || ''
```

- [ ] **Step 4: Validar o telefone com a lib**

O `PhoneInput` já emite o telefone em E.164, então a validação é feita sobre o E.164. Substituir as duas validações `digits.length < 10 || digits.length > 11` por:

```ts
      const phoneCheck = validateE164(phone.value)
      if (!phoneCheck.ok) {
        fail(t('common.errTelefoneInvalido'))
        return
      }
```

e gravar `phone: phoneCheck.e164` no `createProfessional`/`updateProfessional`.

- [ ] **Step 5: Gravar as colunas novas do profissional**

No `createProfessional` e no `updateProfessional`, trocar `cidade`/`uf` por:

```ts
          cidade: proMunicipality.value.trim(),
          uf: proStateCode.value.trim().toUpperCase(),
          country_code: proCountryCode.value,
          state: proStateName.value.trim(),
          municipality: proMunicipality.value.trim(),
          phone: phoneCheck.e164,
          phone_country_code: dialOf(phoneCountry.value),
```

- [ ] **Step 6: Gravar as colunas novas do cliente**

No payload do cliente:

```ts
    const payload: Partial<UserProfile> = {
      name: trimmedName,
      address: address.value,
      bairro: bairro.value,
      cidade: userMunicipality.value.trim(),
      uf: userStateCode.value.trim().toUpperCase(),
      country_code: userCountryCode.value,
      state: userStateName.value.trim(),
      municipality: userMunicipality.value.trim(),
      phone: phoneCheck.e164,
      phone_country_code: dialOf(phoneCountry.value),
    }
```

- [ ] **Step 7: Trocar o template do profissional**

Substituir o par "Cidade de atendimento / UF" e o campo de telefone por:

```vue
              <PhoneInput
                v-model:phone="phone"
                v-model:phone-country="phoneCountry"
              />

              <AddressFields
                :with-street="false"
                v-model:country-code="proCountryCode"
                v-model:state-code="proStateCode"
                v-model:state-name="proStateName"
                v-model:municipality="proMunicipality"
              />
```

- [ ] **Step 8: Trocar o template do cliente**

Substituir o par "Cidade / UF" do cliente por:

```vue
              <AddressFields
                v-model:country-code="userCountryCode"
                v-model:state-code="userStateCode"
                v-model:state-name="userStateName"
                v-model:municipality="userMunicipality"
                v-model:street="address"
                v-model:neighborhood="bairro"
              />
```

- [ ] **Step 9: Ajustar os imports**

```ts
import { dialOf } from '../lib/geo'
import { countryFromE164, validateE164 } from '../lib/phone'
import AddressFields from './AddressFields.vue'
import PhoneInput from './PhoneInput.vue'
```

- [ ] **Step 10: Rodar o typecheck e o lint**

```bash
npm run typecheck && npx eslint src/components/ProfileEditModal.vue
```

- [ ] **Step 11: Commit**

```bash
git add src/components/ProfileEditModal.vue
git commit -m "feat: endereco internacional e telefone com DDI no perfil"
```

---

### Task 11: Telefone nos consumidores

**Files:**
- Modify: `src/lib/whatsapp.ts:1-4`
- Modify: `src/lib/quoteFlow.ts:37-40` e `:56` (`client_phone` no payload)
- Modify: `src/lib/quoteFlow.test.ts`
- Modify: `functions/notify-pros.ts:13-16`
- Modify: `functions/notify-pros-sms.ts:13-16`

**Interfaces:**
- Consumes: `legacyToE164` de `src/lib/phone.ts` (no frontend). As edge functions **não** importam de `src/` (rodam no Deno, fora do bundle do Vite), então levam a normalização inline.
- Produces: `formatWhatsAppPhone` devolve só dígitos; `validateQuoteForm` aceita E.164; `buildQuotePayload` grava `client_phone` em E.164

- [ ] **Step 1: Ajustar `src/lib/whatsapp.ts`**

```ts
import { legacyToE164 } from './phone'

/** Normaliza o telefone para dígitos no formato internacional (E.164). */
export function formatWhatsAppPhone(phone: string): string {
  return legacyToE164(phone).replace(/\D/g, '')
}

export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${formatWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`
}
```

- [ ] **Step 2: Ajustar a validação em `src/lib/quoteFlow.ts`**

Substituir o bloco de validação do telefone por:

```ts
  const rawPhone = data.clientPhone.trim()
  const phoneDigits = rawPhone.replace(/\D/g, '')
  const isE164 = rawPhone.startsWith('+')
  const validPhone = isE164
    ? phoneDigits.length >= 8 && phoneDigits.length <= 15
    : phoneDigits.length >= 10 && phoneDigits.length <= 11
  if (!validPhone) {
    errors.clientPhone = messages.clientPhone
  }
```

E, no `buildQuotePayload`, trocar `client_phone: args.form.clientPhone.trim()` por:

```ts
    client_phone: legacyToE164(args.form.clientPhone),
```

Adicionando o import no topo do arquivo:

```ts
import { legacyToE164 } from './phone'
```

- [ ] **Step 3: Atualizar `src/lib/quoteFlow.test.ts`**

Adicionar casos ao describe existente:

```ts
  it('aceita telefone internacional em E.164', () => {
    const errors = validateQuoteForm({
      clientName: 'Ana',
      clientPhone: '+5511987654321',
      clientAddress: 'Rua A, 10',
    })
    expect(errors.clientPhone).toBeUndefined()
  })

  it('aceita telefone nacional brasileiro', () => {
    const errors = validateQuoteForm({
      clientName: 'Ana',
      clientPhone: '11987654321',
      clientAddress: 'Rua A, 10',
    })
    expect(errors.clientPhone).toBeUndefined()
  })

  it('rejeita telefone curto', () => {
    const errors = validateQuoteForm({
      clientName: 'Ana',
      clientPhone: '12345',
      clientAddress: 'Rua A, 10',
    })
    expect(errors.clientPhone).toBeDefined()
  })
```

E, no `buildQuotePayload`, um caso de normalização:

```ts
  it('normaliza o telefone do cliente para E.164 no payload', () => {
    const payload = buildQuotePayload({
      clientId: 'c1',
      form: { clientName: 'Ana', clientPhone: '11987654321', clientAddress: 'Rua A, 10' },
      category: 'Eletricista',
      photoUrl: 'p.jpg',
      notes: '',
      aiAnalysis: null,
      finalPrice: null,
      sendMode: 'direct',
      professionalId: 'p1',
    })
    expect(payload.client_phone).toBe('+5511987654321')
  })
```

- [ ] **Step 4: Ajustar `functions/notify-pros.ts` e `functions/notify-pros-sms.ts`**

Substituir o `onlyDigits` dos dois arquivos por:

```ts
function onlyDigits(phone: string): string {
  const raw = (phone || '').trim()
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  // E.164 gravado pelo app
  if (raw.startsWith('+')) return digits
  // legado: número nacional brasileiro
  return digits.startsWith('55') ? digits : `55${digits}`
}
```

- [ ] **Step 5: Rodar os testes e o typecheck**

```bash
npm test && npm run typecheck
```

Esperado: todos os testes passam.

- [ ] **Step 6: Commit**

```bash
git add src/lib/whatsapp.ts src/lib/quoteFlow.ts src/lib/quoteFlow.test.ts functions/notify-pros.ts functions/notify-pros-sms.ts
git commit -m "fix: telefone internacional no whatsapp, sms e cotacao"
```

---

### Task 12: Verificação final

**Files:**
- Nenhum arquivo novo — apenas verificação.

**Interfaces:**
- Produces: nada.

- [ ] **Step 1: Rodar a suíte completa**

```bash
npm test
```

Esperado: todos os testes passam (os de `geo`, `phone`, `quoteFlow` e os pré-existentes de `revenue`, `requestStatus`, `planLimits`, `directoryFilters`, `guards`).

- [ ] **Step 2: Rodar typecheck e lint**

```bash
npm run typecheck && npm run lint
```

Esperado: sem erro e sem warning novo.

- [ ] **Step 3: Build de produção**

```bash
npm run build
```

Esperado: build sem erro. Conferir que `src/data/geo/regions/` virou chunks separados e que `countries.json` está no bundle principal:

```bash
ls dist/assets | grep -c "\.js$"
```

- [ ] **Step 4: Conferir o diff completo contra a spec**

```bash
git diff origin/main --stat
```

Reler `docs/superpowers/specs/2026-10-19-endereco-internacional-telefone-design.md` e confirmar que: (a) todos os campos novos existem no cadastro e no perfil, (b) o telefone é gravado em E.164, (c) `uf`/`cidade` continuam em sincronia, (d) nada ficou hard-coded em português.

- [ ] **Step 5: Commit final (só se sobrou algo)**

```bash
git status --short
git add -A && git commit -m "chore: ajustes finais do endereco internacional"
```

Só commitar se `git status` mostrar alteração pendente.
