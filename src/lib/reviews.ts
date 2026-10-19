export interface ProfessionalReview {
  stars: number
  comment: string
  review_date: string | null
}

export function clampStars(value: unknown): number {
  if (typeof value === 'boolean') return 0
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(5, Math.max(1, Math.round(n)))
}

export function formatReviewDate(value: string | null | undefined, lang: string): string {
  if (!value) return ''
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(date)
  } catch {
    return value
  }
}
