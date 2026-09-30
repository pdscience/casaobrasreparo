export interface MonthlySummary {
  monthLabel: string
  total: number
  previousTotal: number
  deltaPercent: number | null
  completedCount: number
  avgTicket: number
  avgPerDay: number
}

export function computeMonthlySummary(
  requests: Array<{ status: string; final_price?: number | null; created_at: string }>,
  now: Date = new Date(),
): MonthlySummary {
  const month = now.getMonth()
  const year = now.getFullYear()
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const done = requests.filter((r) => r.status === 'Concluído' && r.final_price)
  const ofMonth = done.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === month && d.getFullYear() === year
  })
  const ofPrev = done.filter((r) => {
    const d = new Date(r.created_at)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  })

  const total = ofMonth.reduce((acc, r) => acc + (r.final_price || 0), 0)
  const previousTotal = ofPrev.reduce((acc, r) => acc + (r.final_price || 0), 0)
  const completedCount = ofMonth.length

  return {
    monthLabel: now.toLocaleDateString('pt-BR', { month: 'long' }),
    total,
    previousTotal,
    deltaPercent: previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 1000) / 10 : null,
    completedCount,
    avgTicket: completedCount ? total / completedCount : 0,
    avgPerDay: total / now.getDate(),
  }
}
