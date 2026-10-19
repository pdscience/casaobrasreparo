import { describe, it, expect, vi } from 'vitest'
import { professionalShareUrl, shareSummary, shareProfessional } from './share'
import type { Professional } from '../types'

const pro = {
  id: 'abc-123',
  name: 'Ana Souza',
  category: 'Eletricista',
  categories: ['Eletricista', 'Encanador'],
  cidade: 'Dourados',
  uf: 'MS',
} as unknown as Professional

describe('share', () => {
  it('monta a url do diretorio com o id codificado', () => {
    expect(professionalShareUrl('abc-123', 'https://site.test')).toBe(
      'https://site.test/#/profissionais?pro=abc-123',
    )
    expect(professionalShareUrl('a b', 'https://site.test')).toBe(
      'https://site.test/#/profissionais?pro=a%20b',
    )
  })

  it('resume nome, categoria e localidade', () => {
    expect(shareSummary(pro)).toBe('Ana Souza · Eletricista · Dourados - MS')
  })

  it('usa o share nativo quando disponivel', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const clipboard = { writeText: vi.fn() }
    await expect(shareProfessional(pro, { origin: 'https://x', share, clipboard }))
      .resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://x/#/profissionais?pro=abc-123',
    }))
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })

  it('trata cancelamento do share nativo sem cair no clipboard', async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }))
    const clipboard = { writeText: vi.fn() }
    await expect(shareProfessional(pro, { origin: 'https://x', share, clipboard }))
      .resolves.toBe('cancelled')
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })

  it('cai no clipboard quando o share falha ou nao existe', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) }
    await expect(shareProfessional(pro, { origin: 'https://x', clipboard }))
      .resolves.toBe('clipboard')
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining(
      'https://x/#/profissionais?pro=abc-123',
    ))
  })

  it('cai no whatsapp quando nao ha share nem clipboard', async () => {
    const open = vi.fn()
    await expect(shareProfessional(pro, { origin: 'https://x', open }))
      .resolves.toBe('whatsapp')
    expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/?text='))
  })
})
