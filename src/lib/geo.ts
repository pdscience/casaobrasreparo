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
