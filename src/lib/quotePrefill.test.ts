import { describe, it, expect } from 'vitest'
import { buildClientPrefill } from './quotePrefill'

const profile = {
  name: 'Ana Souza',
  phone: '+5561996911526',
  address: 'Rua A, 100',
  bairro: 'Centro',
  municipality: 'Dourados',
  cidade: '',
  uf: 'MS',
  state: 'Mato Grosso do Sul',
}

describe('buildClientPrefill', () => {
  it('mapeia nome, telefone, endereço, cidade e UF', () => {
    expect(buildClientPrefill(profile)).toEqual({
      clientName: 'Ana Souza',
      clientPhone: '+5561996911526',
      clientAddress: 'Rua A, 100 - Centro',
      clientCity: 'Dourados',
      clientUf: 'MS',
    })
  })

  it('usa cidade quando municipality está vazio', () => {
    expect(buildClientPrefill({ ...profile, municipality: '', cidade: 'Campo Grande' }).clientCity)
      .toBe('Campo Grande')
  })

  it('usa state quando uf está vazio', () => {
    expect(buildClientPrefill({ ...profile, uf: '', state: 'Mato Grosso do Sul' }).clientUf)
      .toBe('Mato Grosso do Sul')
  })
})
