import { describe, it, expect } from 'vitest'
import { validateQuoteForm, buildQuotePayload } from './quoteFlow'

describe('validateQuoteForm', () => {
  it('aceita dados válidos', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria Silva', clientPhone: '11987654321', clientAddress: 'Rua A, 100' }),
    ).toEqual({})
  })
  it('erro quando nome vazio', () => {
    expect(
      validateQuoteForm({ clientName: '  ', clientPhone: '11987654321', clientAddress: 'Rua A' }).clientName,
    ).toBe('Informe seu nome completo.')
  })
  it('erro quando telefone tem menos de 10 dígitos', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '98765', clientAddress: 'Rua A' }).clientPhone,
    ).toContain('WhatsApp válido')
  })
  it('erro quando endereço vazio', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '11987654321', clientAddress: '' }).clientAddress,
    ).toBe('Informe o endereço do atendimento.')
  })
  it('aceita telefone internacional em E.164', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '+5511987654321', clientAddress: 'Rua A' }).clientPhone,
    ).toBeUndefined()
  })
  it('aceita telefone internacional sem DDI de entrada', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '+12015550123', clientAddress: 'Rua A' }).clientPhone,
    ).toBeUndefined()
  })
  it('rejeita E.164 curto demais', () => {
    expect(
      validateQuoteForm({ clientName: 'Maria', clientPhone: '+5511', clientAddress: 'Rua A' }).clientPhone,
    ).toBeDefined()
  })
})

describe('buildQuotePayload', () => {
  const base = {
    clientId: 'c1',
    form: { clientName: ' Maria ', clientPhone: '11987654321', clientAddress: 'Rua A, 100' },
    category: 'Eletricista',
    photoUrl: 'x.png',
    notes: 'n',
    aiAnalysis: { summary: 's' },
    finalPrice: 150,
    professionalId: 'p1',
    sendMode: 'direct' as const,
  }
  it('envio direto: professional_id preenchido, broadcast false, status Pendente', () => {
    const p = buildQuotePayload(base)
    expect(p.professional_id).toBe('p1')
    expect(p.broadcast).toBe(false)
    expect(p.status).toBe('Pendente')
    expect(p.client_name).toBe('Maria')
  })
  it('broadcast: professional_id null e broadcast true', () => {
    const p = buildQuotePayload({ ...base, sendMode: 'broadcast' })
    expect(p.professional_id).toBeNull()
    expect(p.broadcast).toBe(true)
  })
  it('normaliza o telefone do cliente para E.164 no payload', () => {
    expect(buildQuotePayload(base).client_phone).toBe('+5511987654321')
    expect(
      buildQuotePayload({ ...base, form: { ...base.form, clientPhone: '+12015550123' } }).client_phone,
    ).toBe('+12015550123')
  })
})
