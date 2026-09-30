export interface GuardInput {
  requiresAuth?: boolean
  role?: 'client' | 'pro'
  isAuthenticated: boolean
  currentRole: 'client' | 'pro' | null
  fullPath?: string
}
export type GuardResult =
  | { action: 'allow' }
  | { action: 'redirect'; to: string; openAuth?: 'login'; redirect?: string }

export function evaluateRouteGuard(input: GuardInput): GuardResult {
  if (!input.requiresAuth) return { action: 'allow' }
  if (!input.isAuthenticated) {
    return { action: 'redirect', to: '/', openAuth: 'login', redirect: input.fullPath }
  }
  if (input.role && input.currentRole !== input.role) {
    return { action: 'redirect', to: input.currentRole === 'pro' ? '/pro/pedidos' : '/cliente/solicitar' }
  }
  return { action: 'allow' }
}
