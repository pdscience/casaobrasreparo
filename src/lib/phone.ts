import { AsYouType, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'
import { dialOf } from './geo'

export interface PhoneValidation {
  ok: boolean
  e164: string
  digits: number
}

/** Formata o número nacional conforme o país (BR → "(11) 98765-4321"). */
export function formatNational(countryCode: string, value: string): string {
  const cc = (countryCode || '').toUpperCase()
  if (!cc || !value) return value
  try {
    return new AsYouType(cc as CountryCode).input(value)
  } catch {
    return value
  }
}

/** Só os dígitos do valor informado. */
export function nationalDigits(value: string): string {
  return (value || '').replace(/\D/g, '')
}

/** Monta o E.164 a partir do país e do número nacional. */
export function toE164(countryCode: string, national: string): string {
  const dial = dialOf(countryCode)
  const digits = nationalDigits(national)
  if (!dial || !digits) return ''
  return `+${dial}${digits}`
}

/** Valida o número nacional contra as regras do país. */
export function validatePhone(countryCode: string, national: string): PhoneValidation {
  const digits = nationalDigits(national)
  const e164 = toE164(countryCode, digits)
  if (!e164) return { ok: false, e164: '', digits: digits.length }
  let parsed
  try {
    parsed = parsePhoneNumberFromString(e164)
  } catch {
    parsed = undefined
  }
  // `isValid` (e não `isPossible`) rejeita números com comprimento plausível
  // mas inválidos (ex.: +5500000000000), que só falhariam depois no provedor.
  if (!parsed || !parsed.isValid()) return { ok: false, e164, digits: digits.length }
  return { ok: true, e164: parsed.number, digits: digits.length }
}

/** Valida um telefone já gravado em E.164. */
export function validateE164(phone: string): PhoneValidation {
  const digits = nationalDigits(phone)
  if (!digits) return { ok: false, e164: '', digits: 0 }
  let parsed
  try {
    parsed = parsePhoneNumberFromString(`+${digits}`)
  } catch {
    parsed = undefined
  }
  if (!parsed || !parsed.isValid()) return { ok: false, e164: `+${digits}`, digits: digits.length }
  return { ok: true, e164: parsed.number, digits: digits.length }
}

/** País (ISO2) de um telefone já em E.164. */
export function countryFromE164(phone: string): string {
  if (!phone) return ''
  try {
    return parsePhoneNumberFromString(phone)?.country ?? ''
  } catch {
    return ''
  }
}

/** Número nacional (sem DDI) a partir de um E.164. */
export function nationalFromE164(phone: string, countryCode: string): string {
  if (!phone) return ''
  try {
    const parsed = parsePhoneNumberFromString(phone)
    if (parsed) return parsed.nationalNumber
  } catch {
    // cai no fallback manual
  }
  const dial = dialOf(countryCode)
  const digits = nationalDigits(phone)
  if (dial && digits.startsWith(dial)) return digits.slice(dial.length)
  return digits
}

/**
 * Normaliza telefone legado (gravado só com o número nacional) para E.164.
 * Segue a heurística já usada em src/lib/whatsapp.ts: mais de 11 dígitos = já tem DDI.
 */
export function legacyToE164(phone: string): string {
  const raw = (phone || '').trim()
  if (!raw) return ''
  const digits = nationalDigits(raw)
  if (!digits) return ''
  if (raw.startsWith('+')) return `+${digits}`
  if (digits.length > 11) return `+${digits}`
  return `+55${digits}`
}
