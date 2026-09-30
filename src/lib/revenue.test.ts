import { describe, it, expect } from 'vitest'
import { computeMonthlySummary } from './revenue'

const req = (status: string, final_price: number | null, created_at: string) => ({ status, final_price, created_at })

describe('computeMonthlySummary', () => {
  const now = new Date(2026, 8, 20) // 20/09/2026
  const requests = [
    req('Concluído', 100, '2026-09-10T10:00:00Z'),
    req('Concluído', 200, '2026-09-15T10:00:00Z'),
    req('Concluído', 50, '2026-08-20T10:00:00Z'),   // mês anterior
    req('Concluído', 999, '2026-07-01T10:00:00Z'),  // fora da janela
    req('Em Execução', 500, '2026-09-12T10:00:00Z'), // não concluído
    req('Concluído', null, '2026-09-11T10:00:00Z'),  // sem preço
  ]
  it('calcula mês corrente, anterior, delta e médias', () => {
    const s = computeMonthlySummary(requests, now)
    expect(s.total).toBe(300)
    expect(s.previousTotal).toBe(50)
    expect(s.deltaPercent).toBe(500)
    expect(s.completedCount).toBe(2)
    expect(s.avgTicket).toBe(150)
    expect(s.avgPerDay).toBe(15)      // 300 / dia 20
    expect(s.monthLabel).toBe('setembro')
  })
  it('delta null quando mês anterior zerado', () => {
    const s = computeMonthlySummary([req('Concluído', 100, '2026-09-01T10:00:00Z')], now)
    expect(s.deltaPercent).toBeNull()
    expect(s.previousTotal).toBe(0)
  })
  it('tudo zerado sem pedidos', () => {
    const s = computeMonthlySummary([], now)
    expect(s.total).toBe(0)
    expect(s.avgTicket).toBe(0)
    expect(s.completedCount).toBe(0)
  })
})
