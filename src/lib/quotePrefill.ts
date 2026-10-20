import type { User } from '../types'

type PrefillProfile = Pick<
  User,
  'name' | 'phone' | 'address' | 'bairro' | 'municipality' | 'cidade' | 'uf' | 'state'
>

export interface ClientPrefill {
  clientName: string
  clientPhone: string
  clientAddress: string
  clientCity: string
  clientUf: string
}

export function buildClientPrefill(profile: PrefillProfile): ClientPrefill {
  return {
    clientName: profile.name,
    clientPhone: profile.phone,
    clientAddress: [profile.address, profile.bairro].filter(Boolean).join(' - '),
    clientCity: profile.municipality || profile.cidade,
    clientUf: profile.uf || profile.state,
  }
}
