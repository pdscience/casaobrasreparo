import { describe, it, expect } from 'vitest'
import { maxPhotosForPlan, maxCategoriesForPlan, canAddPhoto, canAddCategory, isOverCategoryLimit } from './planLimits'

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
  it('salvamento: no limite pode, acima bloqueia', () => {
    expect(isOverCategoryLimit([], 1)).toBe(false)
    expect(isOverCategoryLimit(['A'], 1)).toBe(false)
    expect(isOverCategoryLimit(['A', 'B'], 1)).toBe(true)
    expect(isOverCategoryLimit(['A', 'B', 'C'], 3)).toBe(false)
    expect(isOverCategoryLimit(['A', 'B', 'C', 'D'], 3)).toBe(true)
    expect(isOverCategoryLimit(['A', 'B', 'C', 'D', 'E', 'F'], null)).toBe(false)
  })
})
