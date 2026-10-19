import { computed, ref } from 'vue'

export const FAVORITES_KEY = 'casaobra_favorites'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function parseFavorites(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function toggleFavoriteId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

function safeStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readFavorites(storage: StorageLike | null = safeStorage()): string[] {
  if (!storage) return []
  try {
    return parseFavorites(storage.getItem(FAVORITES_KEY))
  } catch {
    return []
  }
}

export function writeFavorites(ids: string[], storage: StorageLike | null = safeStorage()): void {
  if (!storage) return
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify(ids))
  } catch {
    /* modo privado: mantem apenas em memoria */
  }
}

const favoriteIds = ref<string[]>(readFavorites())
const favoriteSet = computed(() => new Set(favoriteIds.value))
const favoritesCount = computed(() => favoriteIds.value.length)

export function useFavorites() {
  function isFavorite(id: string): boolean {
    return favoriteSet.value.has(id)
  }

  function toggleFavorite(id: string): void {
    if (!id) return
    favoriteIds.value = toggleFavoriteId(favoriteIds.value, id)
    writeFavorites(favoriteIds.value)
  }

  return { favoriteIds, favoriteSet, favoritesCount, isFavorite, toggleFavorite }
}
