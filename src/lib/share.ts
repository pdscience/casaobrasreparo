import type { Professional } from '../types'

export type ShareMode = 'shared' | 'clipboard' | 'whatsapp' | 'cancelled'

export interface ShareOptions {
  origin?: string
  share?: (data: { title: string; text: string; url: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
  open?: (url: string) => void
}

function currentOrigin(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
}

export function professionalShareUrl(id: string, origin = currentOrigin()): string {
  return `${origin}/#/profissionais?pro=${encodeURIComponent(id)}`
}

export function shareSummary(pro: Professional): string {
  const category = pro.categories?.[0] || pro.category || ''
  const place = [pro.cidade?.trim(), pro.uf?.trim().toUpperCase()].filter(Boolean).join(' - ')
  return [pro.name, category, place].filter(Boolean).join(' · ')
}

export async function shareProfessional(
  pro: Professional,
  options: ShareOptions = {},
): Promise<ShareMode> {
  const url = professionalShareUrl(pro.id, options.origin)
  const text = shareSummary(pro)
  const payload = `${text}\n${url}`

  if (options.share) {
    try {
      await options.share({ title: pro.name, text, url })
      return 'shared'
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'cancelled'
    }
  }

  if (options.clipboard) {
    try {
      await options.clipboard.writeText(payload)
      return 'clipboard'
    } catch {
      /* segue para o WhatsApp */
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(payload)}`
  if (options.open) {
    options.open(waUrl)
    return 'whatsapp'
  }
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank', 'noopener')
  }
  return 'whatsapp'
}
