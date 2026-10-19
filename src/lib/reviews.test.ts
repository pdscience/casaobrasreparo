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
