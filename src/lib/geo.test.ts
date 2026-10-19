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
