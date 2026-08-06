import { insforge } from '../lib/insforge'
import type { AIAnalysis, Plan, Professional, ServiceRequest, User } from '../types'

export async function getServiceRequests(): Promise<ServiceRequest[]> {
  const { data, error } = await insforge.database
    .from('service_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as ServiceRequest[]) || []
}

export async function getServiceRequest(id: string): Promise<ServiceRequest | null> {
  const { data, error } = await insforge.database
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return (data as ServiceRequest) || null
}

export async function createServiceRequest(request: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceRequest> {
  const { data, error } = await insforge.database
    .from('service_requests')
    .insert([{ ...request, id: crypto.randomUUID() }])
    .select()
    .single()

  if (error) throw error
  return data as ServiceRequest
}

export async function updateServiceRequest(id: string, updates: Partial<ServiceRequest>): Promise<ServiceRequest> {
  const { data, error } = await insforge.database
    .from('service_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ServiceRequest
}

export async function deleteServiceRequest(id: string): Promise<void> {
  const { error } = await insforge.database
    .from('service_requests')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getProfessionals(): Promise<Professional[]> {
  const { data, error } = await insforge.database
    .from('professionals')
    .select('*')

  if (error) throw error
  return (data as Professional[]) || []
}

export async function getProfessional(id: string): Promise<Professional | null> {
  const { data, error } = await insforge.database
    .from('professionals')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return (data as Professional) || null
}

export async function getProfessionalByAuthId(authId: string): Promise<Professional | null> {
  const { data, error } = await insforge.database
    .from('professionals')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error) throw error
  return (data as Professional) || null
}

export async function createProfessional(professional: Omit<Professional, 'id'>): Promise<Professional> {
  const { data, error } = await insforge.database
    .from('professionals')
    .insert([{ ...professional, id: crypto.randomUUID() }])
    .select()
    .single()

  if (error) throw error
  return data as Professional
}

export async function updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional> {
  const { data, error } = await insforge.database
    .from('professionals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Professional
}

export async function uploadProfessionalAvatar(file: File): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60) || 'avatar'
  const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`
  const delays = [500, 1200, 2500]
  let lastErr: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const { data, error } = await insforge.storage
        .from('professional-avatars')
        .upload(key, file)
      if (!error && data?.url) return data.url
      lastErr = error
      if (!isTransientUploadError(error) || attempt === delays.length) {
        throw error ?? new Error('Upload failed')
      }
    } catch (err) {
      lastErr = err
      if (!isTransientUploadError(err) || attempt === delays.length) throw err
    }
    await new Promise((r) => setTimeout(r, delays[attempt]))
  }
  throw lastErr instanceof Error ? lastErr : new Error('Upload failed')
}

function isTransientUploadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /Slow Down|503|500|502|504|network|timeout|fetch failed/i.test(msg)
}

export async function uploadServicePhoto(file: File): Promise<string> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-60) || 'photo'
  const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`
  const delays = [500, 1200, 2500]
  let lastErr: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const { data, error } = await insforge.storage
        .from('service-photos')
        .upload(key, file)
      if (!error && data?.url) return data.url
      lastErr = error
      if (!isTransientUploadError(error) || attempt === delays.length) {
        throw error ?? new Error('Upload failed')
      }
    } catch (err) {
      lastErr = err
      if (!isTransientUploadError(err) || attempt === delays.length) throw err
    }
    await new Promise((r) => setTimeout(r, delays[attempt]))
  }
  throw lastErr instanceof Error ? lastErr : new Error('Upload failed')
}

export async function analyzeWithAI(imageBase64: string | undefined, category: string, notes: string): Promise<AIAnalysis> {
  const response = await fetch('/api/analyze-service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64,
      category,
      notes,
    }),
  })

  if (!response.ok) {
    throw new Error('Erro na comunicação com a IA')
  }

  return response.json()
}

export async function updateProfessionalPlan(
  id: string,
  plan: string,
  planStatus: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): Promise<Professional> {
  const updates: Record<string, unknown> = {
    plan,
    plan_status: planStatus,
  }
  if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId
  if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId

  const { data, error } = await insforge.database
    .from('professionals')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Professional
}

export async function incrementRequestCount(professionalId: string): Promise<void> {
  const { data: pro, error: fetchError } = await insforge.database
    .from('professionals')
    .select('requests_this_month, requests_reset_at')
    .eq('id', professionalId)
    .single()

  if (fetchError) throw fetchError

  const now = new Date()
  const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
  const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

  const newCount = needsReset ? 1 : (pro.requests_this_month || 0) + 1

  const { error: updateError } = await insforge.database
    .from('professionals')
    .update({
      requests_this_month: newCount,
      requests_reset_at: needsReset ? now.toISOString() : pro.requests_reset_at,
    })
    .eq('id', professionalId)

  if (updateError) throw updateError
}

export async function canCreateRequest(professionalId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { data: pro, error } = await insforge.database
    .from('professionals')
    .select('plan, requests_this_month, requests_reset_at')
    .eq('id', professionalId)
    .single()

  if (error) throw error

  const now = new Date()
  const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
  const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()

  const limit = pro.plan === 'ouro' ? Infinity : pro.plan === 'prata' ? 30 : pro.plan === 'bronze' ? 10 : 0
  const current = needsReset ? 0 : pro.requests_this_month || 0

  return { allowed: current < limit, current, limit }
}

export async function createPortalSession(professionalId: string): Promise<{ url: string }> {
  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professionalId }),
  })
  if (!response.ok) throw new Error('Erro ao criar sessao do portal')
  return response.json()
}

export async function changePlan(professionalId: string, targetPlan: string): Promise<{ subscriptionId: string; status: string }> {
  const response = await fetch('/api/change-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professionalId, targetPlan }),
  })
  if (!response.ok) throw new Error('Erro ao alterar plano')
  return response.json()
}

export async function getSubscriptionStatus(professionalId: string): Promise<{
  plan: string
  status: string
  requestsThisMonth: number
  requestLimit: number | null
  planExpiresAt: string | null
  stripeCustomerId: string | null
}> {
  const response = await fetch(`/api/subscription-status/${professionalId}`)
  if (!response.ok) throw new Error('Erro ao buscar status da assinatura')
  return response.json()
}

export async function createCheckoutSession(professionalId: string, plan: string, email: string): Promise<{ url: string }> {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ professionalId, plan, email }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Erro ao criar sessao de checkout')
  }
  return response.json()
}

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await insforge.database
    .from('plans')
    .select('*')
    .order('rank', { ascending: true })
  if (error) throw error
  return (data as Plan[]) || []
}

export interface AuthUser {
  id: string
  email: string
  name?: string | null
}

export async function signUpAuth(
  email: string,
  password: string,
  name: string
): Promise<{ user: AuthUser | null; requireEmailVerification: boolean }> {
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
  })
  if (error) throw error
  const user = data?.user
  const profileName = (user?.profile as { name?: string } | null | undefined)?.name
  return {
    user: user
      ? { id: user.id, email: user.email ?? email, name: profileName ?? name }
      : null,
    requireEmailVerification: Boolean(data?.requireEmailVerification),
  }
}

export async function signInAuth(
  email: string,
  password: string
): Promise<AuthUser> {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password })
  if (error || !data) throw error ?? new Error('Falha no login')
  const profileName = (data.user.profile as { name?: string } | null | undefined)?.name
  return { id: data.user.id, email: data.user.email ?? email, name: profileName ?? null }
}

export async function signOutAuth(): Promise<void> {
  const { error } = await insforge.auth.signOut()
  if (error) throw error
}

export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const { data, error } = await insforge.auth.getCurrentUser()
  if (error) return null
  if (!data?.user) return null
  const profileName = (data.user.profile as { name?: string } | null | undefined)?.name
  return { id: data.user.id, email: data.user.email ?? '', name: profileName ?? null }
}

export async function getUserByAuthId(authId: string): Promise<User | null> {
  const { data, error } = await insforge.database
    .from('users')
    .select('*')
    .eq('auth_id', authId)
    .maybeSingle()
  if (error) throw error
  return (data as User) || null
}

export async function createUserRecord(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
  const { data, error } = await insforge.database
    .from('users')
    .insert([{ ...user, id: crypto.randomUUID() }])
    .select()
    .single()
  if (error) throw error
  return data as User
}

export async function updateUserRecord(authId: string, updates: Partial<User>): Promise<User> {
  const { data, error } = await insforge.database
    .from('users')
    .update(updates)
    .eq('auth_id', authId)
    .select()
    .single()
  if (error) throw error
  return data as User
}