export function maxPhotosForPlan(maxPhotos: number | null | undefined): number {
  return maxPhotos ?? 0
}

export function maxCategoriesForPlan(maxCategories: number | null | undefined): number | null {
  return maxCategories === undefined ? 1 : maxCategories
}

export function canAddPhoto(currentCount: number, maxPhotos: number | null | undefined): boolean {
  return currentCount < maxPhotosForPlan(maxPhotos)
}

export function canAddCategory(current: string[], maxCategories: number | null | undefined): boolean {
  const max = maxCategoriesForPlan(maxCategories)
  return max === null ? true : current.length < max
}
