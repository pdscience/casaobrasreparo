import type { PortfolioItem } from '../types'

export type { PortfolioItem } from '../types'

export const MAX_PORTFOLIO_PHOTOS = 3
export const MAX_PORTFOLIO_CAPTION = 80

export function normalizePortfolioItems(value: unknown): PortfolioItem[] {
  if (!Array.isArray(value)) return []
  const items: PortfolioItem[] = []
  for (const entry of value) {
    if (items.length >= MAX_PORTFOLIO_PHOTOS) break
    if (typeof entry === 'string') {
      const url = entry.trim()
      if (url) items.push({ url, caption: '' })
      continue
    }
    if (!entry || typeof entry !== 'object') continue
    const raw = entry as Record<string, unknown>
    const url = typeof raw.url === 'string' ? raw.url.trim() : ''
    if (!url) continue
    items.push({
      url,
      caption: typeof raw.caption === 'string' ? sanitizeCaption(raw.caption) : '',
    })
  }
  return items
}

export function canAddPortfolioPhoto(currentCount: number, limit = MAX_PORTFOLIO_PHOTOS): boolean {
  return currentCount < limit
}

export function remainingPhotoSlots(currentCount: number, limit = MAX_PORTFOLIO_PHOTOS): number {
  return Math.max(0, limit - currentCount)
}

export function sanitizeCaption(value: string): string {
  return value.trim().slice(0, MAX_PORTFOLIO_CAPTION)
}

export function portfolioPhotoCountLabel(currentCount: number, limit = MAX_PORTFOLIO_PHOTOS): string {
  return `${Math.min(Math.max(0, currentCount), limit)}/${limit}`
}

/**
 * Extrai a chave do objeto no bucket service-photos a partir da URL publica.
 * Só devolve chaves do prefixo `portfolio/` para nunca apagar outra foto.
 */
export function portfolioStorageKey(url: string): string | null {
  const marker = '/api/storage/buckets/service-photos/objects/'
  try {
    const parsed = new URL(url)
    const index = parsed.pathname.indexOf(marker)
    if (index < 0) return null
    const key = decodeURIComponent(parsed.pathname.slice(index + marker.length))
    return key.startsWith('portfolio/') ? key : null
  } catch {
    return null
  }
}
