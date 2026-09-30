import { describe, it, expect } from 'vitest'
import { evaluateRouteGuard } from './guards'

describe('evaluateRouteGuard', () => {
  it('rota pública passa', () => {
    expect(evaluateRouteGuard({ isAuthenticated: false, currentRole: null })).toEqual({ action: 'allow' })
  })
  it('visitante em rota protegida redireciona para / com openAuth e fullPath salvo', () => {
    const r = evaluateRouteGuard({
      requiresAuth: true, role: 'client', isAuthenticated: false, currentRole: null,
      fullPath: '/cliente/recibos',
    })
    expect(r).toEqual({ action: 'redirect', to: '/', openAuth: 'login', redirect: '/cliente/recibos' })
  })
  it('logado com role errada vai para a home da própria role (pro)', () => {
    const r = evaluateRouteGuard({ requiresAuth: true, role: 'client', isAuthenticated: true, currentRole: 'pro' })
    expect(r).toEqual({ action: 'redirect', to: '/pro/pedidos' })
  })
  it('logado com role certa passa', () => {
    expect(
      evaluateRouteGuard({ requiresAuth: true, role: 'client', isAuthenticated: true, currentRole: 'client' }),
    ).toEqual({ action: 'allow' })
  })
})
