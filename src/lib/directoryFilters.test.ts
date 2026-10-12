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
    // id2 (sem bairros declarados) atende qualquer bairro — regra da App.vue preservada
    expect(r.map((p) => p.id)).toEqual(['1', '2'])
  })
  it('filtra por plano', () => {
    const r = filterProfessionals(list, { category: 'Todas', plan: 'ouro', uf: 'Todas', cidade: 'Todas', bairro: 'Todos' })
    expect(r.map((p) => p.id)).toEqual(['1', '3'])
  })
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
})

describe('paginate', () => {
  const list = Array.from({ length: 30 }, (_, i) => i)
  it('primeira página com 12 por página', () => {
    expect(paginate(list, 1, 12)).toHaveLength(12)
    expect(paginate(list, 3, 12)).toHaveLength(6)
    expect(paginate(list, 99, 12)).toEqual([])
  })
})
