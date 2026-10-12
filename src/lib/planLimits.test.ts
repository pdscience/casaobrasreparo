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
