import { describe, expect, it } from 'vitest'
import {
  MAX_PORTFOLIO_PHOTOS,
  canAddPortfolioPhoto,
  normalizePortfolioItems,
  portfolioPhotoCountLabel,
  portfolioStorageKey,
  remainingPhotoSlots,
  sanitizeCaption,
} from './portfolio'

describe('portfolio', () => {
  it('mantem no maximo 3 fotos', () => {
    const items = normalizePortfolioItems([
      { url: 'https://a/1.jpg', caption: 'Um' },
      { url: 'https://a/2.jpg', caption: 'Dois' },
      { url: 'https://a/3.jpg', caption: 'Tres' },
      { url: 'https://a/4.jpg', caption: 'Quatro' },
    ])
    expect(items).toHaveLength(MAX_PORTFOLIO_PHOTOS)
    expect(items.map((i) => i.caption)).toEqual(['Um', 'Dois', 'Tres'])
  })

  it('aceita o formato legado (array de urls) e descarta entradas invalidas', () => {
    const items = normalizePortfolioItems([
      '  https://a/1.jpg  ',
      '',
      null,
      { caption: 'sem url' },
      { url: 'https://a/2.jpg' },
      { url: 42, caption: 'url invalida' },
    ])
    expect(items).toEqual([
      { url: 'https://a/1.jpg', caption: '' },
      { url: 'https://a/2.jpg', caption: '' },
    ])
  })

  it('devolve lista vazia quando o valor nao e um array', () => {
    expect(normalizePortfolioItems(null)).toEqual([])
    expect(normalizePortfolioItems(undefined)).toEqual([])
    expect(normalizePortfolioItems('https://a/1.jpg')).toEqual([])
    expect(normalizePortfolioItems({ url: 'https://a/1.jpg' })).toEqual([])
  })

  it('limita a legenda a 80 caracteres e remove espacos', () => {
    const long = `  ${'a'.repeat(120)}  `
    expect(sanitizeCaption(long)).toHaveLength(80)
    expect(sanitizeCaption('  Troca de torneira  ')).toBe('Troca de torneira')
  })

  it('bloqueia o upload ao atingir 3 fotos', () => {
    expect(canAddPortfolioPhoto(0)).toBe(true)
    expect(canAddPortfolioPhoto(2)).toBe(true)
    expect(canAddPortfolioPhoto(3)).toBe(false)
    expect(canAddPortfolioPhoto(4)).toBe(false)
    expect(remainingPhotoSlots(1)).toBe(2)
    expect(remainingPhotoSlots(3)).toBe(0)
    expect(remainingPhotoSlots(5)).toBe(0)
  })

  it('extrai a chave do storage apenas de URLs do portfolio', () => {
    expect(portfolioStorageKey(
      'https://7ed2c635.us-east.insforge.app/api/storage/buckets/service-photos/objects/portfolio/abc/1-foto.jpg?v=123',
    )).toBe('portfolio/abc/1-foto.jpg')
    expect(portfolioStorageKey(
      'https://7ed2c635.us-east.insforge.app/api/storage/buckets/service-photos/objects/abc/1-foto.jpg',
    )).toBeNull()
    expect(portfolioStorageKey(
      'https://7ed2c635.us-east.insforge.app/api/storage/buckets/professional-avatars/objects/portfolio/abc/1.jpg',
    )).toBeNull()
    expect(portfolioStorageKey('https://exemplo.com/portfolio/abc/1.jpg')).toBeNull()
    expect(portfolioStorageKey('nao-e-url')).toBeNull()
  })

  it('formata o contador no padrao n/3', () => {
    expect(portfolioPhotoCountLabel(0)).toBe('0/3')
    expect(portfolioPhotoCountLabel(2)).toBe('2/3')
    expect(portfolioPhotoCountLabel(9)).toBe('3/3')
  })
})
