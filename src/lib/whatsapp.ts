import { legacyToE164 } from './phone'

/** Normaliza o telefone para dígitos no formato internacional (E.164). */
export function formatWhatsAppPhone(phone: string): string {
  return legacyToE164(phone).replace(/\D/g, '')
}

export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${formatWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`
}
