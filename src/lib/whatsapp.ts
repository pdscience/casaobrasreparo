export function formatWhatsAppPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  return clean.length <= 11 ? `55${clean}` : clean
}

export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${formatWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`
}
