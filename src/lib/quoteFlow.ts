import type { Professional } from '../types'

export interface QuoteFormData {
  clientName: string
  clientPhone: string
  clientAddress: string
}

export interface QuoteValidationErrors {
  clientName?: string
  clientPhone?: string
  clientAddress?: string
}

/** Valida dados do cliente antes de confirmar o orçamento. */
export function validateQuoteForm(data: QuoteFormData): QuoteValidationErrors {
  const errors: QuoteValidationErrors = {}
  if (!data.clientName.trim()) {
    errors.clientName = 'Informe seu nome completo.'
  }
  const digits = data.clientPhone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) {
    errors.clientPhone = 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).'
  }
  if (!data.clientAddress.trim()) {
    errors.clientAddress = 'Informe o endereço do atendimento.'
  }
  return errors
}

export function isQuoteFormValid(data: QuoteFormData): boolean {
  return Object.keys(validateQuoteForm(data)).length === 0
}

/** Filtra profissionais por categoria (usado pelo catálogo público e interno). */
export function filterProfessionalsByCategory(
  list: Professional[],
  category: string,
): Professional[] {
  if (!category || category === 'Todas') return list
  return list.filter((p) => p.category === category)
}

export type SendMode = 'direct' | 'broadcast'

/** Monta o payload de criação do pedido para envio direto ou broadcast. */
export function buildQuotePayload(args: {
  clientId: string | null
  form: QuoteFormData
  category: string
  photoUrl: string
  notes: string
  aiAnalysis: unknown
  finalPrice: number | null
  sendMode: SendMode
  professionalId: string | null
}): { professional_id: string | null; broadcast: boolean; status: 'Pendente' } & Record<string, unknown> {
  const direct = args.sendMode === 'direct'
  return {
    client_id: args.clientId,
    client_name: args.form.clientName.trim(),
    client_phone: args.form.clientPhone.trim(),
    client_address: args.form.clientAddress.trim(),
    category: args.category,
    photo_url: args.photoUrl,
    notes: args.notes,
    ai_analysis: args.aiAnalysis,
    status: 'Pendente',
    professional_id: direct ? args.professionalId : null,
    broadcast: !direct,
    agendamento: null,
    final_price: args.finalPrice,
    receipt_issued: false,
    rating: null,
  }
}
