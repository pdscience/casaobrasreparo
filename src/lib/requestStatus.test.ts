import { describe, it, expect } from 'vitest'
import { clientStatusGroup, formatRequestDate, statusSteps } from './requestStatus'

describe('clientStatusGroup', () => {
  it('agrupa os status do pipeline', () => {
    expect(clientStatusGroup('Pendente')).toBe('pendentes')
    expect(clientStatusGroup('Visita Agendada')).toBe('andamento')
    expect(clientStatusGroup('Em Execução')).toBe('andamento')
    expect(clientStatusGroup('Concluído')).toBe('concluidas')
    expect(clientStatusGroup('Cancelado')).toBe('concluidas')
  })
})

describe('formatRequestDate', () => {
  it('formata ISO dd/mm', () => {
    expect(formatRequestDate('2026-09-15T12:00:00Z')).toMatch(/\d{2}\/\d{2}/)
  })
  it('retorna traço sem data', () => {
    // '—' (traço) é o retorno verbatim da App.vue — preservado sem mudança visual
    expect(formatRequestDate(undefined)).toBe('—')
  })
})

describe('statusSteps', () => {
  it('tem os 4 passos do pipeline', () => {
    expect(statusSteps).toEqual(['Pendente', 'Visita Agendada', 'Em Execução', 'Concluído'])
  })
})
