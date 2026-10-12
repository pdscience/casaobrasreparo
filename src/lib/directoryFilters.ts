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

export function categoriesOf(p: { category: string; categories?: string[] }): string[] {
  const list = [...(p.categories ?? []), p.category].map((c) => (c || '').trim()).filter(Boolean)
  return [...new Set(list)]
}

export function filterProfessionals<
  T extends { category: string; categories?: string[]; plan: string; uf?: string; cidade?: string; coverage_bairros?: string[] },
>(list: T[], f: DirectoryFilters): T[] {
  let out = list
  if (f.category !== 'Todas') out = out.filter((p) => categoriesOf(p).includes(f.category))
  if (f.plan !== 'Todos') out = out.filter((p) => p.plan === f.plan)
  if (f.uf !== 'Todas') out = out.filter((p) => (p.uf || '').trim().toUpperCase() === f.uf.trim().toUpperCase())
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
