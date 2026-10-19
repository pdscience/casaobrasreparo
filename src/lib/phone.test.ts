import { describe, it, expect } from 'vitest'
import {
  countryFromE164,
  formatNational,
  legacyToE164,
  nationalFromE164,
  nationalDigits,
  toE164,
  validateE164,
  validatePhone,
} from './phone'

describe('phone', () => {
  it('aplica a mascara por pais', () => {
    expect(formatNational('BR', '11987654321')).toBe('(11) 98765-4321')
    expect(formatNational('US', '2015550123')).toBe('(201) 555-0123')
  })

  it('extrai apenas digitos', () => {
    expect(nationalDigits('(11) 98765-4321')).toBe('11987654321')
  })

  it('monta o E.164 a partir do pais e do numero nacional', () => {
    expect(toE164('BR', '11987654321')).toBe('+5511987654321')
    expect(toE164('US', '2015550123')).toBe('+12015550123')
  })

  it('usa DDI apenas com digitos em paises de codigo composto', () => {
    // Antes o DDI vinha do phonecode de exibicao ("+1-268"), gerando "++1-268".
    expect(toE164('AG', '2685551234')).toBe('+12685551234')
    expect(toE164('GG', '1481555123')).toBe('+441481555123')
    expect(toE164('BV', '')).toBe('')
  })

  it('valida numeros do pais', () => {
    const br = validatePhone('BR', '11987654321')
    expect(br.ok).toBe(true)
    expect(br.e164).toBe('+5511987654321')
    expect(validatePhone('BR', '123').ok).toBe(false)
    expect(validatePhone('BR', '').ok).toBe(false)
    // comprimento plausivel mas numero invalido (rejeitado por isValid)
    expect(validatePhone('BR', '00000000000').ok).toBe(false)
  })

  it('valida um telefone ja em E.164', () => {
    const ok = validateE164('+5511987654321')
    expect(ok.ok).toBe(true)
    expect(ok.e164).toBe('+5511987654321')
    expect(validateE164('+5511').ok).toBe(false)
    expect(validateE164('').ok).toBe(false)
    expect(validateE164('+5500000000000').ok).toBe(false)
  })

  it('descobre o pais a partir do E.164', () => {
    expect(countryFromE164('+5511987654321')).toBe('BR')
    expect(countryFromE164('+12015550123')).toBe('US')
    expect(countryFromE164('')).toBe('')
  })

  it('volta do E.164 para o numero nacional', () => {
    expect(nationalFromE164('+5511987654321', 'BR')).toBe('11987654321')
    expect(nationalFromE164('+12015550123', 'US')).toBe('2015550123')
  })

  it('normaliza telefones legados para E.164', () => {
    expect(legacyToE164('11987654321')).toBe('+5511987654321')
    expect(legacyToE164('+5511987654321')).toBe('+5511987654321')
    expect(legacyToE164('5511987654321')).toBe('+5511987654321')
    expect(legacyToE164('')).toBe('')
  })
})
