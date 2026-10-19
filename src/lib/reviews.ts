export interface ProfessionalReview {
  stars: number
  comment: string
  review_date: string | null
}

export function clampStars(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(5, Math.max(1, Math.round(n)))
}

export function formatReviewDate(value: string | null | undefined, lang: string): string {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(date)
  } catch {
    return value
  }
}
