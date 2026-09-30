import { ref, computed } from 'vue'
import type { Plan } from '../types'
import { changePlan, createCheckoutSession, createPortalSession } from '../api/insforgeService'
import { User, ShieldCheck, Zap, Sparkles } from 'lucide-vue-next'
import { useAuth } from './useAuth'
import { useNavigation } from './useNavigation'
import { useRequests } from './useRequests'
import { pushToast } from './useUi'

const plans = ref<Plan[]>([])

const planMap = computed(() => {
  const m = new Map<string, Plan>()
  for (const p of plans.value) m.set(p.id, p)
  return m
})

function planLimitText(id: string, fallback: string): string {
  const row = planMap.value.get(id)
  if (!row) return fallback
  return row.request_limit === null ? 'ilimitados' : `${row.request_limit}/mês`
}

const currentPlanRow = computed(() => planMap.value.get(useAuth().proProfile.value.plan) ?? null)

const planFeatures = computed(() => {
  const { proProfile } = useAuth()
  const plan = proProfile.value.plan
  const row = currentPlanRow.value
  // Limites e visibilidade vêm da tabela plans (fonte única); request_limit NULL = ilimitado
  const maxRequests = row ? (row.request_limit === null ? Infinity : row.request_limit) : 0
  return {
    maxRequests,
    prioritySearch: plan === 'ouro' || plan === 'prata',
    verifiedBadge: plan === 'ouro',
    advancedReports: plan === 'ouro',
    whatsappVisible: row ? row.show_whatsapp_to_client : false,
    isGratuito: plan === 'gratuito',
    isBronze: plan === 'bronze',
    isPrata: plan === 'prata',
    isOuro: plan === 'ouro',
  }
})

const requestUsage = computed(() => {
  const { proProfile } = useAuth()
  const current = proProfile.value.requests_this_month || 0
  const limit = planFeatures.value.maxRequests
  return {
    current,
    limit,
    percentage: limit === Infinity ? 0 : (current / limit) * 100,
    isNearLimit: limit !== Infinity && current >= limit - 2,
    isAtLimit: limit !== Infinity && current >= limit,
  }
})

const canReceiveRequests = computed(() =>
  currentPlanRow.value?.receives_broadcasts ?? useAuth().proProfile.value.plan !== 'gratuito')

function hasFeature(feature: 'whatsappVisible' | 'advancedReports' | 'verifiedBadge'): boolean {
  return Boolean(planFeatures.value[feature])
}

const PLANS = [
  { id: 'gratuito', name: 'Gratuito', price: 'R$0', icon: User, tagline: 'Apenas cadastro do perfil', features: ['Cadastro profissional gratuito', 'Perfil público básico'], cta: 'Começar Grátis' },
  { id: 'bronze', name: 'Bronze', price: 'R$34,90', icon: ShieldCheck, tagline: 'Para começar a atender', features: ['10 pedidos por mês', 'Até 5 fotos', '1 categoria de serviço'], cta: 'Assinar Bronze' },
  { id: 'prata', name: 'Prata', price: 'R$54,90', icon: Zap, tagline: 'Para crescer com visibilidade', features: ['30 pedidos por mês', 'Perfil completo', 'WhatsApp no perfil', 'Avaliações', 'Prioridade nas buscas'], cta: 'Assinar Prata' },
  { id: 'ouro', name: 'Ouro', price: 'R$79,90', icon: Sparkles, tagline: 'O máximo para dominar a região', features: ['Pedidos ilimitados', 'Destaque nas pesquisas', 'Selo verificado', 'Estatísticas avançadas', 'Múltiplas categorias', 'Anúncios patrocinados'], cta: 'Assinar Ouro' },
]

const PLAN_LABELS: Record<string, string> = {
  gratuito: 'Gratuito',
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
}

// Preços exibidos vêm de plans.monthly_price (fonte única); fallback = valor do seed
function formatBRL(cents: number | null | undefined, fallback: string): string {
  if (cents === null || cents === undefined) return fallback
  if (cents === 0) return 'R$0'
  return `R$${(cents / 100).toFixed(2).replace('.', ',')}`
}
function dbPlanPrice(id: string, fallback: string): string {
  const row = planMap.value.get(id)
  return row ? formatBRL(row.monthly_price, fallback) : fallback
}
const PLAN_PRICES = computed<Record<string, string>>(() => ({
  gratuito: dbPlanPrice('gratuito', 'R$0'),
  bronze: dbPlanPrice('bronze', 'R$34,90'),
  prata: dbPlanPrice('prata', 'R$54,90'),
  ouro: dbPlanPrice('ouro', 'R$79,90'),
}))

// Limite da feature ("N pedidos por mês" / "Pedidos ilimitados") lido do banco
function withDbLimit(planId: string, feature: string): string {
  const row = planMap.value.get(planId)
  if (!row) return feature
  if (/^\d+\s+pedidos por mês$/.test(feature)) {
    return row.request_limit === null ? 'Pedidos ilimitados' : `${row.request_limit} pedidos por mês`
  }
  if (feature === 'Pedidos ilimitados' && row.request_limit !== null) {
    return `${row.request_limit} pedidos por mês`
  }
  return feature
}

// PLANS com preço/limite mesclados do banco (copy de marketing mantida no resto)
const displayPlans = computed(() =>
  PLANS.map((p) => ({
    ...p,
    price: dbPlanPrice(p.id, p.price),
    features: p.features.map((f) => withDbLimit(p.id, f)),
  }))
)

const upgradeRecommendation = computed(() => {
  const current = useAuth().proProfile.value.plan
  const order: Record<string, number> = { gratuito: 0, bronze: 1, prata: 2, ouro: 3 }
  const next = displayPlans.value.find((p) => order[p.id] === order[current] + 1)
  if (!next) return null
  return { plan: next.id, label: next.name, price: next.price, features: next.features }
})

async function subscribePlan(targetPlan: string) {
  const { proProfile } = useAuth()
  const { loadData } = useRequests()
  const { goToTab } = useNavigation()
  try {
    if (!proProfile.value.id) {
      pushToast('warning', 'Você precisa estar logado como profissional para assinar um plano.')
      return
    }
    if (proProfile.value.plan === targetPlan) return
    const hasActiveSubscription = !!proProfile.value.stripe_subscription_id && proProfile.value.plan_status === 'active'
    if (hasActiveSubscription) {
      await changePlan(proProfile.value.id, targetPlan)
      await loadData()
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(proProfile.value.email)) {
      pushToast('warning', 'Cadastre um e-mail válido no seu perfil para assinar o plano.')
      goToTab('perfil_pro')
      return
    }
    const { url } = await createCheckoutSession(proProfile.value.id, targetPlan, proProfile.value.email)
    if (url) window.location.href = url
  } catch (err) {
    console.error('Erro ao assinar plano:', err)
    pushToast('error', 'Erro ao assinar plano. Tente novamente.')
  }
}

async function handleOpenPortal() {
  const { proProfile } = useAuth()
  try {
    if (!proProfile.value.id) return
    const { url } = await createPortalSession(proProfile.value.id)
    if (url) window.location.href = url
  } catch (err) {
    console.error('Erro ao abrir portal de assinatura:', err)
    pushToast('error', 'Erro ao abrir o portal de gerenciamento de assinatura.')
  }
}

export function usePlans() {
  return {
    plans, planMap,
    PLANS, PLAN_LABELS, displayPlans, PLAN_PRICES,
    planFeatures, requestUsage, canReceiveRequests, currentPlanRow, upgradeRecommendation,
    hasFeature,
    formatBRL, dbPlanPrice, planLimitText,
    subscribePlan, handleOpenPortal,
  }
}
