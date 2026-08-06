<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Wrench,
  Camera,
  Upload,
  Bot,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  MessageSquare,
  FileText,
  TrendingUp,
  Star,
  User,
  Users,
  Phone,
  MapPin,
  ShieldCheck,
  Check,
  ArrowRight,
  Printer,
  RefreshCw,
  X,
  BarChart2,
  Zap,
  Building2,
  Sliders,
  ThumbsUp,
  Edit2,
  CheckSquare,
  SlidersHorizontal,
  Smartphone,
  Menu,
  Lock,
  Mail,
  CircleDot,
  Image,
  Brain,
  MessageCircle,
  ClipboardCheck,
  Search,
  Send,
  FileCheck,
  Receipt,
  Handshake,
  DollarSign,
  BarChart3,
  Award,
  Newspaper,
  Lightbulb,
  Hammer,
  Droplets,
  ZapOff,
  Thermometer,
  Shield,
  HardHat,
} from 'lucide-vue-next'
import type { AIAnalysis, Professional, ServiceRequest, Plan } from './types'
import { analyzeWithAI, getServiceRequests, createServiceRequest, updateServiceRequest, getProfessionals, createProfessional, updateProfessional, uploadProfessionalAvatar, canCreateRequest, createPortalSession, changePlan, createCheckoutSession, getPlans } from './api/insforgeService'
import ProfessionalCard from './components/ProfessionalCard.vue'

const CATEGORIES = [
  { name: 'Eletricista', icon: Zap, gradient: 'from-amber-600 to-yellow-500', accent: 'text-amber-300', img: 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Encanador', icon: Wrench, gradient: 'from-blue-600 to-cyan-500', accent: 'text-blue-300', img: 'https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Pintor', icon: Sparkles, gradient: 'from-yellow-500 to-orange-400', accent: 'text-yellow-300', img: 'https://images.pexels.com/photos/994164/pexels-photo-994164.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Ar-Condicionado', icon: RefreshCw, gradient: 'from-cyan-500 to-teal-400', accent: 'text-cyan-300', img: 'https://images.pexels.com/photos/32497161/pexels-photo-32497161.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Marceneiro', icon: Building2, gradient: 'from-orange-600 to-amber-500', accent: 'text-orange-300', img: 'https://images.pexels.com/photos/5974296/pexels-photo-5974296.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Pedreiro / Reformas', icon: ShieldCheck, gradient: 'from-stone-600 to-stone-400', accent: 'text-stone-300', img: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Chaveiro', icon: Sliders, gradient: 'from-purple-600 to-violet-500', accent: 'text-purple-300', img: 'https://images.pexels.com/photos/101808/pexels-photo-101808.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Limpeza Geral', icon: ThumbsUp, gradient: 'from-rose-500 to-pink-400', accent: 'text-rose-300', img: 'https://images.pexels.com/photos/5591860/pexels-photo-5591860.jpeg?auto=compress&cs=tinysrgb&w=400' },
]

const statusSteps = ['Pendente', 'Visita Agendada', 'Em Execução', 'Concluído']

const userMode = ref<'client' | 'pro' | null>(null)
const activeTab = ref<string>('boas_vindas')

const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  category: '',
  subject: '',
  message: '',
})
const contactSubmitting = ref(false)
const contactSuccess = ref(false)

const handleContactSubmit = () => {
  contactSubmitting.value = true
  const { name, email, phone, category, subject, message } = contactForm.value
  const body = [
    `Olá! vim pelo site Casa Obras e Reparos.`,
    '',
    `Nome: ${name}`,
    `E-mail: ${email}`,
    phone ? `Telefone: ${phone}` : '',
    category ? `Categoria: ${category}` : '',
    '',
    `Mensagem: ${message}`,
    '',
    '---',
    `Assunto: ${subject}`,
  ].filter(Boolean).join('\n')

  const mailtoLink = `mailto:casaobrasereparos@gmail.com?subject=${encodeURIComponent(subject || 'Contato via site')}&body=${encodeURIComponent(body)}`
  window.location.href = mailtoLink

  setTimeout(() => {
    contactSubmitting.value = false
    contactSuccess.value = true
    contactForm.value = { name: '', email: '', phone: '', category: '', subject: '', message: '' }
    setTimeout(() => { contactSuccess.value = false }, 5000)
  }, 500)
}
const requests = ref<ServiceRequest[]>([])
const professionals = ref<Professional[]>([])
const proProfile = ref<Professional>({
  id: '',
  name: '',
  category: '',
  email: '',
  phone: '',
  rating: 0,
  reviews_count: 0,
  avatar: '',
  pix_key: '',
  bio: '',
  plan: 'gratuito',
  plan_status: 'active',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  plan_expires_at: null,
  requests_this_month: 0,
  requests_reset_at: null,
})
const isLoading = ref(true)

const selectedCategory = ref<string>('Eletricista')
const clientName = ref<string>('')
const clientPhone = ref<string>('')
const clientAddress = ref<string>('')
const notes = ref<string>('')
const imagePreview = ref<string | null>(null)
const isAnalyzing = ref<boolean>(false)
const latestAiResult = ref<AIAnalysis | null>(null)
const createdOrderSuccess = ref<ServiceRequest | null>(null)

const viewReceiptModal = ref<ServiceRequest | null>(null)
const rateOrderModal = ref<ServiceRequest | null>(null)
const scheduleModal = ref<ServiceRequest | null>(null)
const ratingStars = ref<number>(5)
const ratingComment = ref<string>('')

const scheduleDate = ref<string>('')
const scheduleTime = ref<string>('14:00')
const schedulePrice = ref<string>('')
const scheduleObs = ref<string>('')

const showUpgradeModal = ref<boolean>(false)

const isEditingProfile = ref<boolean>(false)
const isRegistering = ref<boolean>(false)

const planMap = computed(() => {
  const m = new Map<string, Plan>()
  for (const p of plans.value) m.set(p.id, p)
  return m
})

const visibleProfessionals = computed(() => {
  const visibleIds = plans.value.filter(p => p.client_visible).map(p => p.id)
  return professionals.value
    .filter(p => visibleIds.includes(p.plan))
    .sort((a, b) => {
      const ra = planMap.value.get(a.plan)?.rank ?? 99
      const rb = planMap.value.get(b.plan)?.rank ?? 99
      if (ra !== rb) return ra - rb
      if (b.rating !== a.rating) return b.rating - a.rating
      return (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
    })
})

const selectedOuroProfessional = ref<Professional | null>(null)
const ourosNoCatalogo = computed(() =>
  visibleProfessionals.value.filter(p => planMap.value.get(p.plan)?.rank === 1)
)
const sendMode = ref<'broadcast' | 'ouro' | null>(null)
const prataBronzeCount = computed(() =>
  visibleProfessionals.value.filter(p => {
    const rank = planMap.value.get(p.plan)?.rank
    return rank === 2 || rank === 3
  }).length
)

const filterCategory = ref<string>('Todas')
const filterPlan = ref<string>('Todos')
const directoryPage = ref<number>(1)
const CARDS_PER_PAGE = 12

const availableCategories = computed(() => {
  const cats = new Set(professionals.value.map(p => p.category).filter(Boolean))
  return ['Todas', ...Array.from(cats).sort()]
})

const filteredProfessionals = computed(() => {
  let list = visibleProfessionals.value
  if (filterCategory.value !== 'Todas') {
    list = list.filter(p => p.category === filterCategory.value)
  }
  if (filterPlan.value !== 'Todos') {
    list = list.filter(p => p.plan === filterPlan.value)
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProfessionals.value.length / CARDS_PER_PAGE)))

const paginatedProfessionals = computed(() => {
  const start = (directoryPage.value - 1) * CARDS_PER_PAGE
  return filteredProfessionals.value.slice(start, start + CARDS_PER_PAGE)
})

watch([filterCategory, filterPlan], () => {
  directoryPage.value = 1
})

const editProName = ref<string>('')
const editProCategory = ref<string>('')
const editProPhone = ref<string>('')
const editProEmail = ref<string>('')
const editProPix = ref<string>('')
const editProBio = ref<string>('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref<string | null>(null)

const plans = ref<Plan[]>([])

const fileInputRef = ref<HTMLInputElement | null>(null)

const logoUrl = '/logo_casa.png'
const lojaUrl = '/loja.png'

async function loadData() {
  isLoading.value = true
  try {
    const [serviceRequests, professionalsData, plansData] = await Promise.all([
      getServiceRequests(),
      getProfessionals(),
      getPlans(),
    ])
    requests.value = serviceRequests
    professionals.value = professionalsData
    plans.value = plansData
    if (professionalsData.length > 0) {
      proProfile.value = professionalsData[0]
    }
  } catch (err) {
    console.error('Erro ao carregar dados:', err)
  } finally {
    isLoading.value = false
  }
}

function openProfileEditor() {
  editProName.value = proProfile.value.name
  editProCategory.value = proProfile.value.category
  editProPhone.value = proProfile.value.phone
  editProEmail.value = proProfile.value.email || ''
  editProPix.value = proProfile.value.pix_key
  editProBio.value = proProfile.value.bio
  avatarFile.value = null
  avatarPreview.value = null
  isEditingProfile.value = true
}

function handleAvatarUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    avatarFile.value = file
    const reader = new FileReader()
    reader.onloadend = () => {
      avatarPreview.value = reader.result as string
    }
    reader.readAsDataURL(file)
  }
}

async function handleSaveProfile() {
  const phoneDigits = editProPhone.value.replace(/\D/g, '')
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    alert('Informe um telefone válido com DDD (10 ou 11 dígitos).')
    return
  }

  try {
    let avatarUrl = proProfile.value.avatar
    if (avatarFile.value) {
      avatarUrl = await uploadProfessionalAvatar(avatarFile.value)
    }

    const payload = {
      name: editProName.value,
      category: editProCategory.value,
      phone: editProPhone.value,
      email: editProEmail.value,
      pix_key: editProPix.value,
      bio: editProBio.value,
      avatar: avatarUrl,
      rating: proProfile.value.rating || 0,
      reviews_count: proProfile.value.reviews_count || 0,
    }

    if (proProfile.value.id) {
      await updateProfessional(proProfile.value.id, payload)
      proProfile.value = { ...proProfile.value, ...payload }
    } else {
      const created = await createProfessional(payload)
      proProfile.value = created
    }
    isEditingProfile.value = false
    isRegistering.value = false
    avatarFile.value = null
    avatarPreview.value = null
  } catch (err) {
    console.error('Erro ao salvar perfil:', err)
  }
}

async function handleConfirmOrder() {
  if (!latestAiResult.value) return

  if (sendMode.value === 'broadcast') {
    const newOrder: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'> = {
      client_name: clientName.value || 'Cliente',
      client_phone: clientPhone.value || '',
      client_address: clientAddress.value || '',
      category: selectedCategory.value,
      photo_url: imagePreview.value || '',
      notes: notes.value || '',
      ai_analysis: latestAiResult.value,
      status: 'Pendente',
      professional_id: null,
      broadcast: true,
      agendamento: null,
      final_price: latestAiResult.value.suggestedMinPrice || null,
      receipt_issued: false,
      rating: null,
    }

    try {
      const created = await createServiceRequest(newOrder)
      requests.value = [created, ...requests.value]
      resetForm()
      activeTab.value = 'meus_pedidos'
    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      alert(`Não foi possível enviar o pedido. ${err instanceof Error ? err.message : 'Erro de conexão com o servidor.'}`)
    }
    return
  }

  if (sendMode.value === 'ouro') {
    if (!selectedOuroProfessional.value) {
      alert('Selecione um profissional ouro antes de enviar.')
      return
    }

    const pro = selectedOuroProfessional.value
    const newOrder: Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'> = {
      client_name: clientName.value || 'Cliente',
      client_phone: clientPhone.value || '',
      client_address: clientAddress.value || '',
      category: selectedCategory.value,
      photo_url: imagePreview.value || '',
      notes: notes.value || '',
      ai_analysis: latestAiResult.value,
      status: 'Pendente',
      professional_id: pro.id,
      broadcast: false,
      agendamento: null,
      final_price: latestAiResult.value.suggestedMinPrice || null,
      receipt_issued: false,
      rating: null,
    }

    try {
      const created = await createServiceRequest(newOrder)
      requests.value = [created, ...requests.value]

      const msg = `Olá ${pro.name}! Vi seu perfil na Casa Obra e Reparos.\n\nPreciso de um serviço de *${selectedCategory.value}*.\n${latestAiResult.value!.description}\n\nPode me enviar uma proposta?`
      const cleanPhone = pro.phone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')

      resetForm()
      activeTab.value = 'meus_pedidos'
    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      alert(`Não foi possível enviar o pedido. ${err instanceof Error ? err.message : 'Erro de conexão com o servidor.'}`)
    }
  }
}

function resetForm() {
  latestAiResult.value = null
  selectedOuroProfessional.value = null
  sendMode.value = null
  imagePreview.value = null
  notes.value = ''
  clientName.value = ''
  clientPhone.value = ''
  clientAddress.value = ''
  selectedCategory.value = 'Eletricista'
}

async function handleSaveSchedule() {
  if (!scheduleModal.value) return

  try {
    await updateServiceRequest(scheduleModal.value.id, {
      status: 'Visita Agendada',
      agendamento: {
        data: scheduleDate.value || new Date().toISOString().split('T')[0],
        hora: scheduleTime.value || '14:00',
        observacao: scheduleObs.value,
      },
      final_price: schedulePrice.value ? parseFloat(schedulePrice.value) : scheduleModal.value.final_price,
    })
    await loadData()
    scheduleModal.value = null
  } catch (err) {
    console.error('Erro ao agendar:', err)
  }
}

async function handleUpdateStatus(orderId: string, newStatus: ServiceRequest['status']) {
  try {
    const req = requests.value.find((r) => r.id === orderId)
    if (!req) return

    await updateServiceRequest(orderId, {
      status: newStatus,
      receipt_issued: newStatus === 'Concluído' ? true : req.receipt_issued,
    })
    await loadData()
  } catch (err) {
    console.error('Erro ao atualizar status:', err)
  }
}

async function handleSaveRating() {
  if (!rateOrderModal.value) return

  try {
    await updateServiceRequest(rateOrderModal.value.id, {
      rating: {
        stars: ratingStars.value,
        comment: ratingComment.value || 'Excelente serviço!',
        date: new Date().toISOString().split('T')[0],
      },
    })
    await loadData()
    rateOrderModal.value = null
    ratingStars.value = 5
    ratingComment.value = ''
  } catch (err) {
    console.error('Erro ao salvar avaliação:', err)
  }
}

async function subscribePlan(targetPlan: string) {
  try {
    if (!proProfile.value.id) {
      alert('Você precisa estar logado como profissional para assinar um plano.')
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
      alert('Cadastre um e-mail válido no seu perfil para assinar o plano.')
      activeTab.value = 'perfil_pro'
      return
    }
    const { url } = await createCheckoutSession(proProfile.value.id, targetPlan, proProfile.value.email)
    if (url) window.location.href = url
  } catch (err) {
    console.error('Erro ao assinar plano:', err)
    alert('Erro ao assinar plano. Tente novamente.')
  }
}

async function handleOpenPortal() {
  try {
    if (!proProfile.value.id) return
    const { url } = await createPortalSession(proProfile.value.id)
    if (url) window.location.href = url
  } catch (err) {
    console.error('Erro ao abrir portal de assinatura:', err)
    alert('Erro ao abrir o portal de gerenciamento de assinatura.')
  }
}

const isMobileMenuOpen = ref<boolean>(false)

function handlePhotoUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onloadend = () => {
      imagePreview.value = reader.result as string
    }
    reader.readAsDataURL(file)
  }
}

async function handleAnalyzeWithAI() {
  if (!imagePreview.value) {
    alert('Por favor, tire ou selecione uma foto antes de solicitar a análise da IA.')
    return
  }

  isAnalyzing.value = true
  latestAiResult.value = null

  try {
    const data = await analyzeWithAI(
      imagePreview.value.startsWith('data:') ? imagePreview.value : undefined,
      selectedCategory.value,
      notes.value
    )
    latestAiResult.value = data
  } catch (err) {
    console.error(err)
    latestAiResult.value = {
      summary: `Avaliação de Serviço: ${selectedCategory.value}`,
      description: `Diagnóstico prévio para ${selectedCategory.value}. Requer inspeção técnica das instalações.`,
      category: selectedCategory.value,
      complexity: 'Média',
      estimatedTime: '1 a 2 horas',
      materialsNeeded: ['Peças e insumos específicos de reposição', 'Insumos de fixação e isolamento'],
      suggestedMinPrice: 0,
      suggestedMaxPrice: 0,
      technicalNotes: '',
      recommendedAction: 'Custo Direto',
    }
  } finally {
    isAnalyzing.value = false
  }
}

function getWhatsAppLink(phone: string, text: string) {
  const cleanPhone = phone.replace(/\D/g, '')
  const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
}

function findProfessional(id: string | null): Professional | undefined {
  if (!id) return undefined
  return professionals.value.find(p => p.id === id)
}

const revenueChartData = computed(() => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const now = new Date()
  const currentMonth = now.getMonth()

  return months.map((month, i) => {
    const monthIndex = (currentMonth - 11 + i + 12) % 12
    const yearOffset = Math.floor((currentMonth - 11 + i + 12) / 12)
    const targetYear = now.getFullYear() - yearOffset

    const total = requests.value
      .filter((r) => {
        if (r.status !== 'Concluído' || !r.final_price) return false
        const d = new Date(r.created_at)
        return d.getMonth() === monthIndex && d.getFullYear() === targetYear
      })
      .reduce((acc, r) => acc + (r.final_price || 0), 0)

    return { month, faturamento: total }
  })
})

const totalRevenueMonth = computed(() => {
  return requests.value
    .filter((r) => r.status === 'Concluído')
    .reduce((acc, curr) => acc + (curr.final_price || 0), 0)
})

const completedCount = computed(() => {
  return requests.value.filter((r) => r.status === 'Concluído').length
})

const avgTicket = computed(() => {
  return totalRevenueMonth.value / (completedCount.value || 1)
})

const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '12px',
    textStyle: { color: '#fff', fontSize: 12 },
    formatter: (params: { value: number }) => `R$ ${params.value},00`,
  },
  grid: { left: '3%', right: '4%', bottom: '3%' },
  xAxis: {
    type: 'category',
    data: revenueChartData.value.map((d) => d.month),
    axisLabel: { color: '#64748b', fontSize: 12 },
    axisLine: { lineStyle: { color: '#1e293b' } },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#64748b', fontSize: 12 },
    axisLine: { lineStyle: { color: '#1e293b' } },
    splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
  },
  series: [
    {
      data: revenueChartData.value.map((d) => d.faturamento),
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#f59e0b', width: 3 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(245,158,11,0.4)' },
            { offset: 1, color: 'rgba(245,158,11,0.0)' },
          ],
        },
      },
    },
  ],
}))

const planFeatures = computed(() => {
  const plan = proProfile.value.plan
  return {
    maxRequests: plan === 'ouro' ? Infinity : plan === 'prata' ? 30 : plan === 'bronze' ? 10 : 0,
    prioritySearch: plan === 'ouro' || plan === 'prata',
    verifiedBadge: plan === 'ouro',
    advancedReports: plan === 'ouro',
    whatsappVisible: plan === 'prata' || plan === 'ouro',
    isGratuito: plan === 'gratuito',
    isBronze: plan === 'bronze',
    isPrata: plan === 'prata',
    isOuro: plan === 'ouro',
  }
})

const requestUsage = computed(() => {
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

function hasFeature(feature: string): boolean {
  return planFeatures.value[feature as keyof typeof planFeatures.value] as boolean
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

const PLAN_PRICES: Record<string, string> = {
  gratuito: 'R$0',
  bronze: 'R$34,90',
  prata: 'R$54,90',
  ouro: 'R$79,90',
}

const upgradeRecommendation = computed(() => {
  const current = proProfile.value.plan
  const order: Record<string, number> = { gratuito: 0, bronze: 1, prata: 2, ouro: 3 }
  const next = PLANS.find((p) => order[p.id] === order[current] + 1)
  if (!next) return null
  return { plan: next.id, label: next.name, price: next.price, features: next.features }
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
    <!-- HEADER & MODE SWITCHER -->
    <header class="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg">
            <img :src="logoUrl" alt="Casa Obras e Reparos" class="w-10 h-10 rounded-xl object-cover" />
          </div>
          <div>
            <h1 class="font-extrabold text-lg text-white tracking-tight flex items-center gap-2">
              Casa Obras e Reparos
            </h1>
            <p class="text-xs text-slate-400 hidden sm:block">
              
            </p>
          </div>
        </div>

        <!-- NAV TABS (desktop) -->
        <nav class="hidden md:flex items-center gap-1">
          <button
            @click="activeTab = 'boas_vindas'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'boas_vindas' && userMode === null
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            Apresentação
          </button>
          <button
            @click="activeTab = 'como_funciona'; userMode = null"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'como_funciona'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <CircleDot class="w-3.5 h-3.5" />
            Como Funciona
          </button>
          <button
            @click="activeTab = 'para_profissionais'; userMode = null"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'para_profissionais'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <Handshake class="w-3.5 h-3.5" />
            Para Profissionais
          </button>
          <button
            @click="activeTab = 'contato'; userMode = null"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'contato'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <Mail class="w-3.5 h-3.5" />
            Contato
          </button>
        </nav>

        <div class="flex items-center gap-2">
          <!-- DUAL MODE TOGGLE (CLIENT vs PRO) -->
          <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
          <button
            @click="userMode = 'client'; if (activeTab !== 'boas_vindas') activeTab = 'solicitar'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              userMode === 'client'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <User class="w-3.5 h-3.5" />
            Modo Cliente
          </button>
          <button
            @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
            :class="[
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              userMode === 'pro'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-bold'
                : 'text-slate-400 hover:text-white'
            ]"
          >
            <Wrench class="w-3.5 h-3.5" />
            Modo Prestador
          </button>
        </div>

          <button
            class="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            @click="isMobileMenuOpen = true"
          >
            <Menu class="w-5 h-5" />
          </button>
        </div>
        </div>
    </header>

    <!-- MOBILE NAVIGATION DRAWER -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 md:hidden">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="isMobileMenuOpen = false"></div>
      <div class="absolute right-0 top-0 h-full w-72 bg-slate-900 border-l border-slate-800 shadow-2xl p-4 space-y-4 overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="font-bold text-white text-sm">Navegação</span>
          <button @click="isMobileMenuOpen = false" class="text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-2">
          <button
            @click="activeTab = 'boas_vindas'; isMobileMenuOpen = false"
            :class="[
              'w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
              activeTab === 'boas_vindas'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <Sparkles class="w-4 h-4 text-amber-400" />
            ✨ Apresentação
          </button>
          <button
            @click="activeTab = 'como_funciona'; userMode = null; isMobileMenuOpen = false"
            :class="[
              'w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
              activeTab === 'como_funciona'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <CircleDot class="w-4 h-4" />
            Como Funciona
          </button>
          <button
            @click="activeTab = 'para_profissionais'; userMode = null; isMobileMenuOpen = false"
            :class="[
              'w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
              activeTab === 'para_profissionais'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <Handshake class="w-4 h-4" />
            Para Profissionais
          </button>
          <button
            @click="activeTab = 'contato'; userMode = null; isMobileMenuOpen = false"
            :class="[
              'w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
              activeTab === 'contato'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            ]"
          >
            <Mail class="w-4 h-4" />
            Contato
          </button>

          <div class="border-t border-slate-800 pt-2 mt-2 space-y-1">
            <button
              @click="userMode = 'client'; activeTab = 'solicitar'; isMobileMenuOpen = false"
              :class="[
                'w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
                userMode === 'client'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              ]"
            >
              <User class="w-4 h-4" />
              Modo Cliente
            </button>
            <button
              @click="userMode = 'pro'; activeTab = 'pedidos_pro'; isMobileMenuOpen = false"
              :class="[
                'w-full px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2',
                userMode === 'pro'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              ]"
            >
              <Wrench class="w-4 h-4" />
              Modo Prestador
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT AREA -->
    <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
      <!-- WELCOME / SYSTEM PRESENTATION TAB -->
      <div v-if="activeTab === 'boas_vindas'" class="space-y-8 animate-in fade-in duration-300">
        <!-- HERO PRESENTATION BANNER -->
        <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden shadow-2xl">
          <div class="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div class="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div class="space-y-5">
              <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide">
                <Sparkles class="w-4 h-4 text-amber-400" /> Plataforma Integrada com Inteligência Artificial
              </div>

              <h2 class="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Seja Bem-Vindo ao <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Casa Obras e Reparos</span>
              </h2>

              <p class="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                A solução completa feita para profissionais liberais, técnicos e prestadores de serviços em geral. Gerencie seus atendimentos, emita orçamentos instantâneos com foto por IA, agende visitas com lembrete WhatsApp para o cliente, crie recibos digitais e acompanhe seu faturamento mensal em um só lugar.
              </p>

              <!-- DUAL CTA BUTTONS -->
              <div class="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  @click="userMode = 'client'; activeTab = 'solicitar'"
                  class="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Bot class="w-5 h-5" />
                  Experimentar como Cliente (Criar Orçamento com IA)
                  <ArrowRight class="w-4 h-4" />
                </button>
                <button
                  @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
                  class="px-6 py-3.5 rounded-xl bg-slate-800/80 text-amber-400 border border-amber-500/30 font-extrabold text-xs sm:text-sm hover:bg-slate-700/80 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
                >
                  <Wrench class="w-5 h-5" />
                  Acessar Painel do Prestador (Gestão & Relatórios)
                </button>
              </div>
            </div>

            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-yellow-400/20 rounded-full blur-3xl"></div>
              <img :src="lojaUrl" alt="Casa Obras e Reparos" class="relative w-full max-w-sm lg:max-w-md rounded-3xl shadow-2xl shadow-amber-500/10 border border-amber-500/20 object-cover aspect-square" />
            </div>
          </div>
        </div>

        <!-- HOW IT WORKS DUAL WORKFLOW -->
        <div class="space-y-6">
          <h3 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Smartphone class="w-5 h-5 text-amber-400" />
            Como Funciona a Dinâmica no Sistema
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- WORKFLOW CLIENT -->
            <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 space-y-5 relative overflow-hidden backdrop-blur-sm">
              <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div class="relative z-10 space-y-4">
                <div class="flex items-center gap-3 text-amber-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <User class="w-4 h-4" />
                  </div>
                  Jornada para o Cliente
                </div>

                <ul class="space-y-4 text-xs text-slate-300">
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <div>
                      <strong class="text-white block">Envio da Foto do Problema:</strong>
                      Selecione ou tire uma foto de tomadas, vazamentos, eletrodomésticos ou pinturas diretamente do celular.
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <div>
                      <strong class="text-white block">Análise Instantânea com IA:</strong>
                      O sistema gera diagnóstico, tempo estimado, materiais e faixa de custo sugerida em Reais (R$).
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <div>
                      <strong class="text-white block">Atendimento & WhatsApp:</strong>
                      Agende visita ou receba o valor do serviço com notificações e botão direto para o WhatsApp do profissional.
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <div>
                      <strong class="text-white block">Recibo Digital e Avaliação:</strong>
                      Acesse recibos digitais em PDF após o término e avalie a qualidade do serviço do profissional.
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <!-- WORKFLOW PRO -->
            <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 space-y-5 relative overflow-hidden backdrop-blur-sm">
              <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div class="relative z-10 space-y-4">
                <div class="flex items-center gap-3 text-amber-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Wrench class="w-4 h-4" />
                  </div>
                  Jornada para o Prestador de Serviços
                </div>

                <ul class="space-y-4 text-xs text-slate-300">
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <div>
                      <strong class="text-white block">Painel de Atendimentos em Tempo Real:</strong>
                      Visualize chamados pendentes com foto, diagnóstico da IA e endereço do cliente.
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <div>
                      <strong class="text-white block">Agende Visita ou Envie Valor Direto:</strong>
                      Defina data, horário e valor acordado com lembrete e mensagem formatada para o WhatsApp do cliente.
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <div>
                      <strong class="text-white block">Emissão de Recibo Digital:</strong>
                      Gere comprovantes impressos ou em PDF com dados do serviço e sua chave PIX.
                    </div>
                  </li>
                  <li class="flex items-start gap-3">
                    <span class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center shrink-0 text-[10px]">4</span>
                    <div>
                      <strong class="text-white block">Relatórios de Faturamento Mensal:</strong>
                      Acompanhe receita total em gráficos, quantidade de serviços e ticket médio.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- KEY FEATURES GRID -->
        <div class="space-y-6">
          <h3 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CheckSquare class="w-5 h-5 text-amber-400" />
            Recursos Principais do Sistema
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <Bot class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm">Visão Computacional por IA</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Diagnóstico automático de danos, materiais necessários e precificação orientada ao mercado técnico.
              </p>
            </div>

            <div class="group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <MessageSquare class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm">Notificações por WhatsApp</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Envio com 1 clique de lembretes de visitas, atualizações de status e confirmação de valores.
              </p>
            </div>

            <div class="group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <FileText class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm">Recibos Digitais Prontos</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Comprovante oficial impresso ou baixável em formato padronizado com chave PIX e itens executados.
              </p>
            </div>

            <div class="group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <TrendingUp class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm">Faturamento e Relatórios</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Métricas de faturamento acumulado, comparativos mensais e acompanhamento financeiro para o profissional.
              </p>
            </div>

            <div class="group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <Star class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm">Perfil com Avaliações</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Construção de reputação com estrelas e depoimentos reais dos clientes atendidos.
              </p>
            </div>

            <div class="group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 backdrop-blur-sm">
              <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-400/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform duration-300">
                <ShieldCheck class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm">Design Mobile Responsivo</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Interface intuitiva e rápida para o uso diário em smartphones, tablets e computadores.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTATO PAGE -->
      <div v-if="activeTab === 'contato'" class="space-y-8 animate-in fade-in duration-300">
        <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div class="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Mail class="w-4 h-4" /> Fale Conosco
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Entre em <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Contato</span>
            </h2>
            <p class="text-sm text-slate-300 max-w-lg mx-auto">
              Precisa de um orçamento, tem dúvidas ou quer ser um prestador parceiro? Preencha o formulário abaixo e entraremos em contato via e-mail.
            </p>
          </div>
        </div>

        <div class="max-w-2xl mx-auto">
          <form @submit.prevent="handleContactSubmit" class="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Nome completo *</label>
                <input
                  v-model="contactForm.name"
                  type="text"
                  required
                  placeholder="Seu nome"
                  class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail *</label>
                <input
                  v-model="contactForm.email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Telefone / WhatsApp</label>
                <input
                  v-model="contactForm.phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Categoria do serviço</label>
                <select
                  v-model="contactForm.category"
                  class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Assunto *</label>
              <input
                v-model="contactForm.subject"
                type="text"
                required
                placeholder="Ex: Solicitação de orçamento para reforma"
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Mensagem *</label>
              <textarea
                v-model="contactForm.message"
                required
                rows="4"
                placeholder="Descreva sua necessidade, dúvida ou proposta..."
                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
              />
            </div>

            <div v-if="contactSuccess" class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 class="w-5 h-5 text-emerald-400 shrink-0" />
              <p class="text-xs text-emerald-300">Mensagem enviada com sucesso! Entraremos em contato em breve.</p>
            </div>

            <button
              type="submit"
              :disabled="contactSubmitting"
              class="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail class="w-4 h-4" />
              {{ contactSubmitting ? 'Enviando...' : 'Enviar Mensagem' }}
            </button>
          </form>
        </div>
      </div>

      <!-- COMO FUNCIONA PAGE -->
      <div v-if="activeTab === 'como_funciona'" class="space-y-10 animate-in fade-in duration-300">
        <!-- HERO -->
        <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden text-center">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div class="relative z-10 max-w-2xl mx-auto space-y-4">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <CircleDot class="w-4 h-4" /> Passo a Passo
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Como <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Funciona</span>
            </h2>
            <p class="text-sm text-slate-300 max-w-lg mx-auto">
              Uma plataforma simples e inteligente que conecta quem precisa de serviços domésticos aos melhores profissionais da região.
            </p>
          </div>
        </div>

        <!-- FLUXO CLIENTE -->
        <div class="space-y-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <User class="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 class="text-lg font-extrabold text-white">Para o Cliente</h3>
              <p class="text-xs text-slate-400">Como solicitar um serviço em poucos passos</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Passo 1 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">1</div>
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Image class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Tire uma Foto</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Photographe o problema: vazamento, rachadura, item quebrado, instalação necessária. Quanto mais clara a foto, melhor a análise.
              </p>
            </div>

            <!-- Passo 2 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">2</div>
              <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">IA Analisa</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Nossa inteligência artificial identifica o serviço, estima valores, sugere categorias e gera um orçamento automaticamente.
              </p>
            </div>

            <!-- Passo 3 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">3</div>
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Escolha o Profissional</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Veja os profissionais disponíveis, seus planos (Ouro, Prata, Bronze), avaliações e ranking. Ou envie para todos de uma vez.
              </p>
            </div>

            <!-- Passo 4 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">4</div>
              <div class="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Agende via WhatsApp</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Converse diretamente com o profissional pelo WhatsApp. Agende o dia e horário, acompanhe o status e receba seu recibo digital.
              </p>
            </div>
          </div>
        </div>

        <!-- FLUXO PROFISSIONAL -->
        <div class="space-y-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center">
              <Wrench class="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 class="text-lg font-extrabold text-white">Para o Profissional</h3>
              <p class="text-xs text-slate-400">Como receber e atender chamados da região</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Passo 1 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">1</div>
              <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ClipboardCheck class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Cadastre-se</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Crie seu perfil profissional com categoría, área de atendimento, telefone e foto. Escolha seu plano de visibilidade.
              </p>
            </div>

            <!-- Passo 2 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">2</div>
              <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Send class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Receba Solicitações</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Clientes da sua região enviam pedidos. Você recebe notificações com foto, orçamento da IA e dados do cliente.
              </p>
            </div>

            <!-- Passo 3 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">3</div>
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileCheck class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Confirme ou Proponha</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Aceite o orçamento da IA, proponha um valor diferente ou agende uma visita técnica para avaliar presencialmente.
              </p>
            </div>

            <!-- Passo 4 -->
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/30 transition-all group relative">
              <div class="absolute -top-3 -left-1 w-7 h-7 rounded-full bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-lg shadow-amber-500/30">4</div>
              <div class="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Receipt class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Atenda e Emita Recibo</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Realize o serviço, atualize o status no painel e emita um recibo digital profissional para o cliente.
              </p>
            </div>
          </div>
        </div>

        <!-- DIFERENCIAIS -->
        <div class="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
          <div class="text-center space-y-2">
            <h3 class="text-lg font-extrabold text-white">Por que escolher o Casa Obras e Reparos?</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Benefícios que fazem a diferença para clientes e profissionais</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div class="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Brain class="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 class="font-bold text-white text-xs">Orçamento com IA</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Análise inteligente da foto com estimativa de valor e categoria automatica.</p>
              </div>
            </div>
            <div class="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div class="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle class="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 class="font-bold text-white text-xs">WhatsApp Direto</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Contato imediato sem intermediários. Agende, combine e resolva pelo app.</p>
              </div>
            </div>
            <div class="flex items-start gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <div class="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Receipt class="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 class="font-bold text-white text-xs">Recibos Digitais</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Documentos profissionais gerados automaticamente após cada serviço.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="text-center space-y-4">
          <p class="text-sm text-slate-300">Pronto para começar?</p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              @click="userMode = 'client'; activeTab = 'solicitar'"
              class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Bot class="w-5 h-5" />
              Solicitar um Serviço
            </button>
            <button
              @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
              class="px-6 py-3 rounded-xl bg-slate-800/80 text-amber-400 border border-amber-500/30 font-extrabold text-sm hover:bg-slate-700/80 transition-all flex items-center justify-center gap-2"
            >
              <Wrench class="w-5 h-5" />
              Ser um Profissional Parceiro
            </button>
          </div>
        </div>
      </div>

      <!-- PARA PROFISSIONAIS PAGE -->
      <div v-if="activeTab === 'para_profissionais'" class="space-y-10 animate-in fade-in duration-300">
        <!-- HERO -->
        <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div class="relative z-10 max-w-2xl space-y-5">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Handshake class="w-4 h-4" /> Seja um Parceiro
            </div>
            <h2 class="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Aumente seus clientes com a <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Casa Obras e Reparos</span>
            </h2>
            <p class="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Junte-se a centenas de profissionais que já estão recebendo chamados da região. Cadastro gratuito, sem mensalidade oculta e com ferramentas inteligentes para crescer seu negócio.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
                class="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Wrench class="w-5 h-5" />
                Cadastrar-se Agora
                <ArrowRight class="w-4 h-4" />
              </button>
              <button
                @click="activeTab = 'como_funciona'"
                class="px-6 py-3.5 rounded-xl bg-slate-800/80 text-amber-400 border border-amber-500/30 font-extrabold text-sm hover:bg-slate-700/80 transition-all flex items-center justify-center gap-2"
              >
                <CircleDot class="w-5 h-5" />
                Ver Como Funciona
              </button>
            </div>
          </div>
        </div>

        <!-- CARROSSEL DE CATEGORIAS -->
        <div class="space-y-4">
          <div class="text-center space-y-2">
            <h3 class="text-xl font-extrabold text-white">Categorias atendidas</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Áreas de atuação dos nossos profissionais parceiros</p>
          </div>
          <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div class="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
            <div class="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
            <div class="flex animate-carousel gap-5 py-6 px-6" style="width: max-content;">
              <div v-for="(cat, i) in [...CATEGORIES, ...CATEGORIES]" :key="'c1-'+i"
                class="flex-shrink-0 w-64 h-44 rounded-xl overflow-hidden relative group cursor-pointer border border-white/10 hover:border-white/30 transition-all hover:scale-105"
              >
                <div class="absolute inset-0 bg-gradient-to-br opacity-90" :class="cat.gradient" />
                <img
                  :src="cat.img"
                  :alt="cat.name"
                  loading="lazy"
                  class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                <div class="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <component :is="cat.icon" class="w-4 h-4 text-amber-300 drop-shadow" />
                    <span class="text-xs font-bold text-white drop-shadow-lg tracking-wide leading-tight">{{ cat.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- BENEFICIOS -->
        <div class="space-y-6">
          <div class="text-center space-y-2">
            <h3 class="text-xl font-extrabold text-white">Por que se cadastrar?</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Benefícios reais para impulsionar sua carreira</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Visibilidade -->
            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-amber-500/30 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-2">Visibilidade na Região</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Apareça para clientes que estão procurando serviços na sua área. Quanto maior o plano, mais destaque você ganha no catálogo.
              </p>
            </div>

            <!-- Orçamentos IA -->
            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-amber-500/30 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Brain class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-2">Orçamentos Automáticos</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                A IA gera orçamentos com estimativa de valor antes mesmo de você entrar em contato. Menos tempo perdido, mais eficiência.
              </p>
            </div>

            <!-- WhatsApp -->
            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-amber-500/30 transition-all group">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle class="w-6 h-6" />
              </div>
              <h4 class="font-bold text-white text-sm mb-2">Contato Direto via WhatsApp</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Sem intermediários. Combine horários, envie propostas e feche negócios pelo WhatsApp que você já usa no dia a dia.
              </p>
            </div>
          </div>
        </div>

        <!-- PLANOS COMPARATIVO -->
        <div class="space-y-6">
          <div class="text-center space-y-2">
            <h3 class="text-xl font-extrabold text-white">Planos de Visibilidade</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Escolha o plano ideal para o tamanho do seu negócio</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Bronze -->
            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🥉</span>
                <h4 class="font-bold text-white">Bronze</h4>
              </div>
              <p class="text-2xl font-black text-white mb-1">Grátis</p>
              <p class="text-[11px] text-slate-400 mb-4">Para quem está começando</p>
              <ul class="space-y-2 mb-6">
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Perfil no catálogo</li>
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Receber orçamentos via broadcast</li>
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Painel de atendimentos</li>
                <li class="flex items-center gap-2 text-xs text-slate-500"><X class="w-3.5 h-3.5 text-slate-600 shrink-0" /> Destaque no catálogo</li>
                <li class="flex items-center gap-2 text-xs text-slate-500"><X class="w-3.5 h-3.5 text-slate-600 shrink-0" /> Relatórios avançados</li>
              </ul>
              <button
                @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition-all"
              >
                Começar Grátis
              </button>
            </div>

            <!-- Prata -->
            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-700 relative">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">POPULAR</div>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🥈</span>
                <h4 class="font-bold text-white">Prata</h4>
              </div>
              <p class="text-2xl font-black text-white mb-1">R$ 29<span class="text-xs font-normal text-slate-400">/mês</span></p>
              <p class="text-[11px] text-slate-400 mb-4">Para profissionais em crescimento</p>
              <ul class="space-y-2 mb-6">
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Tudo do Bronze</li>
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Prioridade no broadcast</li>
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Badge de prioridade</li>
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Recibos digitais</li>
                <li class="flex items-center gap-2 text-xs text-slate-500"><X class="w-3.5 h-3.5 text-slate-600 shrink-0" /> Relatórios avançados</li>
              </ul>
              <button
                @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
                class="w-full px-4 py-2.5 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-400 transition-all"
              >
                Assinar Prata
              </button>
            </div>

            <!-- Ouro -->
            <div class="bg-gradient-to-b from-amber-950/40 to-slate-900 rounded-2xl p-6 border border-amber-500/40 relative">
              <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">PREMIUM</div>
              <div class="flex items-center gap-2 mb-3">
                <span class="text-lg">🥇</span>
                <h4 class="font-bold text-amber-400">Ouro</h4>
              </div>
              <p class="text-2xl font-black text-white mb-1">R$ 79<span class="text-xs font-normal text-slate-400">/mês</span></p>
              <p class="text-[11px] text-slate-400 mb-4">Máxima visibilidade e leads</p>
              <ul class="space-y-2 mb-6">
                <li class="flex items-center gap-2 text-xs text-slate-300"><Check class="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Tudo do Prata</li>
                <li class="flex items-center gap-2 text-xs text-amber-300"><Check class="w-3.5 h-3.5 text-amber-400 shrink-0" /> Top 1 no catálogo</li>
                <li class="flex items-center gap-2 text-xs text-amber-300"><Check class="w-3.5 h-3.5 text-amber-400 shrink-0" /> Leads individuais diretos</li>
                <li class="flex items-center gap-2 text-xs text-amber-300"><Check class="w-3.5 h-3.5 text-amber-400 shrink-0" /> Relatórios avançados</li>
                <li class="flex items-center gap-2 text-xs text-amber-300"><Check class="w-3.5 h-3.5 text-amber-400 shrink-0" /> Suporte prioritário</li>
              </ul>
              <button
                @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
                class="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20"
              >
                Assinar Ouro
              </button>
            </div>
          </div>
        </div>

        <!-- DEPOIMENTOS PROFISSIONAIS -->
        <div class="space-y-6">
          <div class="text-center space-y-2">
            <h3 class="text-xl font-extrabold text-white">O que dizem nossos parceiros</h3>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div class="flex items-center gap-1">
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <p class="text-xs text-slate-300 italic leading-relaxed">"Recebo em média 8 pedidos por semana desde que migrei pro plano Prata. O broadcast priorizado faz diferença."</p>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">MA</div>
                <div>
                  <p class="text-xs font-bold text-white">Marco A.</p>
                  <p class="text-[10px] text-slate-400">Eletricista • São Paulo</p>
                </div>
              </div>
            </div>
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div class="flex items-center gap-1">
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <p class="text-xs text-slate-300 italic leading-relaxed">"A IA já chega com o orçamento pronto. Não preciso mais ficar adivinhando preço. Profissionalismo total."</p>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">CS</div>
                <div>
                  <p class="text-xs font-bold text-white">Carlos S.</p>
                  <p class="text-[10px] text-slate-400">Encanador • Rio de Janeiro</p>
                </div>
              </div>
            </div>
            <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div class="flex items-center gap-1">
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
              <p class="text-xs text-slate-300 italic leading-relaxed">"O recibo digital é uma mão na roda. Cliente adora receber no WhatsApp e eu fico com tudo documentado."</p>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold">RP</div>
                <div>
                  <p class="text-xs font-bold text-white">Roberto P.</p>
                  <p class="text-[10px] text-slate-400">Pedreiro • Belo Horizonte</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA FINAL -->
        <div class="bg-gradient-to-r from-amber-500/10 to-yellow-400/10 rounded-2xl p-6 sm:p-8 border border-amber-500/20 text-center space-y-4">
          <h3 class="text-lg font-extrabold text-white">Comece a receber chamados hoje</h3>
          <p class="text-xs text-slate-300 max-w-md mx-auto">Cadastro em menos de 2 minutos. Sem cartão de crédito, sem burocracia.</p>
          <button
            @click="userMode = 'pro'; activeTab = 'pedidos_pro'"
            class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mx-auto"
          >
            <Wrench class="w-5 h-5" />
            Quero Ser um Parceiro
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- BLOG / DICAS PAGE -->
      <div v-if="activeTab === 'blog'" class="space-y-8 animate-in fade-in duration-300">
        <!-- HERO -->
        <div class="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden text-center">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div class="relative z-10 max-w-2xl mx-auto space-y-4">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Newspaper class="w-4 h-4" /> Blog & Dicas
            </div>
            <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dicas de <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">Manutenção do Lar</span>
            </h2>
            <p class="text-sm text-slate-300 max-w-lg mx-auto">
              Artigos úteis para cuidar da sua casa, evitar problemas e saber quando chamar um profissional.
            </p>
          </div>
        </div>

        <!-- ARTIGOS DESTAQUE -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Artigo 1 -->
          <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer">
            <div class="h-40 bg-gradient-to-br from-blue-900/40 to-slate-900 flex items-center justify-center">
              <Droplets class="w-16 h-16 text-blue-400/40 group-hover:text-blue-400/60 transition-colors" />
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">Encanamento</span>
                <span class="text-[10px] text-slate-500">5 min de leitura</span>
              </div>
              <h3 class="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">10 Sinais de que seus Canos Precisam de Atenção Urgente</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Vazamentos silenciosos, pressão fraca, água com manchas e outros sinais que indicam problema na encanamento. Aprenda a identificar antes que vire um quebrado maior.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <div class="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[9px] font-bold">CO</div>
                <span class="text-[10px] text-slate-400">Casa Obras • 15 Jul 2026</span>
              </div>
            </div>
          </div>

          <!-- Artigo 2 -->
          <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer">
            <div class="h-40 bg-gradient-to-br from-amber-900/40 to-slate-900 flex items-center justify-center">
              <ZapOff class="w-16 h-16 text-amber-400/40 group-hover:text-amber-400/60 transition-colors" />
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">Elétrica</span>
                <span class="text-[10px] text-slate-500">7 min de leitura</span>
              </div>
              <h3 class="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Erros Comuns de Elétrica que Todo Mundo Comete em Casa</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Extensões sobrecarregadas, falta de aterramento, fios apodrecidos e mais. Conheça os erros que colocam sua família em risco e como evitar.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <div class="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-[9px] font-bold">CO</div>
                <span class="text-[10px] text-slate-400">Casa Obras • 10 Jul 2026</span>
              </div>
            </div>
          </div>

          <!-- Artigo 3 -->
          <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer">
            <div class="h-40 bg-gradient-to-br from-stone-900/40 to-slate-900 flex items-center justify-center">
              <Hammer class="w-16 h-16 text-stone-400/40 group-hover:text-stone-400/60 transition-colors" />
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-stone-500/10 text-stone-300 text-[10px] font-bold border border-stone-500/20">Reformas</span>
                <span class="text-[10px] text-slate-500">6 min de leitura</span>
              </div>
              <h3 class="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Checklist Completo Antes de Começar uma Reforma</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Planejamento, orçamento, escolha de materiais, prazos e documentação. Tudo o que você precisa saber antes de quebrar a primeira parede.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <div class="w-6 h-6 rounded-full bg-stone-500/20 flex items-center justify-center text-stone-300 text-[9px] font-bold">CO</div>
                <span class="text-[10px] text-slate-400">Casa Obras • 05 Jul 2026</span>
              </div>
            </div>
          </div>

          <!-- Artigo 4 -->
          <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer">
            <div class="h-40 bg-gradient-to-br from-cyan-900/40 to-slate-900 flex items-center justify-center">
              <Thermometer class="w-16 h-16 text-cyan-400/40 group-hover:text-cyan-400/60 transition-colors" />
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">Ar-Condicionado</span>
                <span class="text-[10px] text-slate-500">4 min de leitura</span>
              </div>
              <h3 class="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Manutenção Preventiva do Ar-Condicionado: Guia Prático</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Como limpar filtros, checar gás, evitar vazamentos e manter o aparelho funcionando bem o ano todo. Economia de energia garantida.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <div class="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-[9px] font-bold">CO</div>
                <span class="text-[10px] text-slate-400">Casa Obras • 28 Jun 2026</span>
              </div>
            </div>
          </div>

          <!-- Artigo 5 -->
          <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer">
            <div class="h-40 bg-gradient-to-br from-yellow-900/40 to-slate-900 flex items-center justify-center">
              <HardHat class="w-16 h-16 text-yellow-400/40 group-hover:text-yellow-400/60 transition-colors" />
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">Segurança</span>
                <span class="text-[10px] text-slate-500">5 min de leitura</span>
              </div>
              <h3 class="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Como Escolher um Profissional de Confiança para sua Casa</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Referências, avaliação, planos, comunicação e muito cuidado. Dicas para contratar com segurança e evitar dor de cabeça.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <div class="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-[9px] font-bold">CO</div>
                <span class="text-[10px] text-slate-400">Casa Obras • 20 Jun 2026</span>
              </div>
            </div>
          </div>

          <!-- Artigo 6 -->
          <div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-amber-500/30 transition-all group cursor-pointer">
            <div class="h-40 bg-gradient-to-br from-purple-900/40 to-slate-900 flex items-center justify-center">
              <Shield class="w-16 h-16 text-purple-400/40 group-hover:text-purple-400/60 transition-colors" />
            </div>
            <div class="p-5 space-y-3">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold border border-purple-500/20">Prevenção</span>
                <span class="text-[10px] text-slate-500">8 min de leitura</span>
              </div>
              <h3 class="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">Manutenção Residencial: O Que Fazer em Cada Mês do Ano</h3>
              <p class="text-xs text-slate-400 leading-relaxed">
                Calendário completo de manutenção preventiva. Do limpar as calhas em março a revisar a aquecedora em setembro.
              </p>
              <div class="flex items-center gap-2 pt-1">
                <div class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-[9px] font-bold">CO</div>
                <span class="text-[10px] text-slate-400">Casa Obras • 15 Jun 2026</span>
              </div>
            </div>
          </div>
        </div>

        <!-- NEWSLETTER CTA -->
        <div class="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 text-center space-y-4">
          <Lightbulb class="w-10 h-10 text-amber-400 mx-auto" />
          <h3 class="text-lg font-extrabold text-white">Receba dicas por e-mail</h3>
          <p class="text-xs text-slate-400 max-w-md mx-auto">Cadastre-se e receba semanalmente dicas de manutenção, promocões e novidades da plataforma.</p>
          <div class="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="seu@email.com"
              class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
            />
            <button class="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all whitespace-nowrap">
              Inscrever-se
            </button>
          </div>
        </div>
      </div>

      <!-- MODE CLIENT: TAB 1 - SOLICITAR COM IA -->
      <div v-if="userMode === 'client' && activeTab === 'solicitar'" class="space-y-6 animate-in fade-in duration-300">
        <!-- CLIENT SUB-TABS -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'solicitar'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <Bot class="w-3.5 h-3.5" />
            Solicitar com IA
          </button>
          <button
            @click="activeTab = 'meus_pedidos'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 relative"
          >
            <Clock class="w-3.5 h-3.5" />
            Meus Pedidos
            <span v-if="requests.length > 0" class="bg-amber-400 text-slate-950 font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {{ requests.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'recibos_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <FileText class="w-3.5 h-3.5" />
            Meus Recibos
          </button>
        </div>

        <!-- SUCCESS BANNER WHEN ORDER CREATED -->
        <div v-if="createdOrderSuccess" class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <CheckCircle2 class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-white text-base">
                Solicitação #{{ createdOrderSuccess.id }} enviada com sucesso!
              </h3>
              <p class="text-xs text-slate-300 mt-1">
                O prestador <strong class="text-amber-400">{{ findProfessional(createdOrderSuccess.professional_id)?.name || 'Prestador' }}</strong> foi notificado para confirmação do agendamento ou envio da proposta.
              </p>
            </div>
          </div>
          <div class="flex gap-2 w-full sm:w-auto">
            <button
              @click="activeTab = 'meus_pedidos'; createdOrderSuccess = null"
              class="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              Acompanhar Pedido
              <ArrowRight class="w-4 h-4" />
            </button>
            <button
              @click="createdOrderSuccess = null"
              class="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
            >
              Fechar
            </button>
          </div>
        </div>

        <!-- HERO INTRODUCTION -->
        <div class="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 rounded-3xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
          <div class="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />
          <div class="relative z-10 space-y-3">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sparkles class="w-3.5 h-3.5" /> Orçamento Técnico por Inteligência Artificial
            </div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tire uma foto do problema e receba um orçamento instantâneo
            </h2>
            <p class="text-sm text-slate-300 max-w-2xl leading-relaxed">
              A nossa IA analisa o estado do equipamento, identifica peças necessárias, calcula a média de preço praticada no mercado brasileiro e conecta você ao prestador especializado.
            </p>
          </div>
        </div>

        <!-- PROFESSIONAL DIRECTORY -->
        <div v-if="visibleProfessionals.length > 0" class="space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-base font-bold text-white flex items-center gap-2">
                <Building2 class="w-4 h-4 text-amber-400" />
                Profissionais disponíveis
              </h3>
              <p class="text-[10px] text-slate-400 mt-0.5">
                {{ filteredProfessionals.length }} profissional(is) encontrado(s)
              </p>
            </div>
          </div>

          <!-- FILTERS -->
          <div class="flex flex-wrap gap-2">
            <select
              v-model="filterCategory"
              class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50"
            >
              <option v-for="cat in availableCategories" :key="cat" :value="cat">
                {{ cat === 'Todas' ? '📋 Todas as categorias' : cat }}
              </option>
            </select>
            <select
              v-model="filterPlan"
              class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50"
            >
              <option value="Todos">🏷️ Todos os planos</option>
              <option value="ouro">⭐ Ouro</option>
              <option value="prata">🔒 Prata</option>
              <option value="bronze">🛡️ Bronze</option>
            </select>
          </div>

          <!-- CARDS GRID -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ProfessionalCard
              v-for="pro in paginatedProfessionals"
              :key="pro.id"
              :professional="pro"
              :plan-info="planMap.get(pro.plan) ?? null"
            />
          </div>

          <div v-if="filteredProfessionals.length === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
            <p class="text-sm text-slate-400">Nenhum profissional encontrado com os filtros selecionados.</p>
          </div>

          <!-- PAGINATION -->
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              @click="directoryPage = Math.max(1, directoryPage - 1)"
              :disabled="directoryPage === 1"
              :class="[
                'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                directoryPage === 1
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              ]"
            >
              ← Anterior
            </button>
            <span class="text-[10px] text-slate-400">
              Página {{ directoryPage }} de {{ totalPages }}
            </span>
            <button
              type="button"
              @click="directoryPage = Math.min(totalPages, directoryPage + 1)"
              :disabled="directoryPage === totalPages"
              :class="[
                'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
                directoryPage === totalPages
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              ]"
            >
              Próxima →
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- LEFT COLUMN: UPLOAD & INPUTS -->
          <div class="lg:col-span-7 bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-5">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              <Camera class="w-5 h-5 text-amber-400" />
              1. Foto do Equipamento ou Danos
            </h3>

            <!-- UPLOAD ZONE -->
            <div class="space-y-3">
              <input
                type="file"
                ref="fileInputRef"
                @change="handlePhotoUpload"
                accept="image/*"
                class="hidden"
              />

              <div v-if="imagePreview" class="relative rounded-xl overflow-hidden border border-slate-700 group bg-slate-950">
                <img :src="imagePreview" alt="Preview" class="w-full h-64 object-cover" />
                <div class="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                  <button
                    @click="fileInputRef?.click()"
                    class="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 flex items-center gap-1.5"
                  >
                    <RefreshCw class="w-4 h-4" /> Trocar Foto
                  </button>
                  <button
                    @click="imagePreview = null"
                    class="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-medium hover:bg-rose-500/30 border border-rose-500/30 flex items-center gap-1.5"
                  >
                    <X class="w-4 h-4" /> Remover
                  </button>
                </div>
              </div>

              <div
                v-else
                @click="fileInputRef?.click()"
                class="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/50 hover:bg-slate-950 group"
              >
                <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload class="w-7 h-7" />
                </div>
                <p class="text-sm font-semibold text-slate-200">
                  Clique para carregar uma foto ou tirar da câmera
                </p>
                <p class="text-xs text-slate-400 mt-1">
                  Suporta arquivos PNG, JPG ou JPEG (Máx. 10MB)
                </p>
              </div>
            </div>

            <!-- CATEGORY SELECTOR -->
            <div class="space-y-2 pt-2">
              <label class="text-xs font-semibold text-slate-300">
                2. Categoria do Serviço Requerido:
              </label>
              <select
                v-model="selectedCategory"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500 transition-all"
              >
                <option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>

            <!-- CLIENT DETAILS FORM -->
            <div class="space-y-3 pt-2 border-t border-slate-800">
              <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">
                3. Seus Dados de Contato e Endereço:
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="text-[11px] text-slate-400 font-medium">Seu Nome Completo:</label>
                  <input
                    type="text"
                    v-model="clientName"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mt-1"
                    placeholder="Ex: Carlos Costa"
                  />
                </div>
                <div>
                  <label class="text-[11px] text-slate-400 font-medium">WhatsApp para Notificação:</label>
                  <input
                    type="text"
                    v-model="clientPhone"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mt-1"
                    placeholder="Ex: 11987654321"
                  />
                </div>
              </div>
              <div>
                <label class="text-[11px] text-slate-400 font-medium">Endereço do Atendimento:</label>
                <input
                  type="text"
                  v-model="clientAddress"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mt-1"
                  placeholder="Ex: Rua Funchal, 200 - Bairro"
                />
              </div>
              <div>
                <label class="text-[11px] text-slate-400 font-medium">Observação/Detalhe adicional:</label>
                <textarea
                  v-model="notes"
                  rows="2"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mt-1 resize-none"
                  placeholder="Descreva brevemente o que aconteceu ou restrições de horário..."
                />
              </div>
            </div>

            <!-- AI SUBMIT BUTTON -->
            <button
              type="button"
              @click="handleAnalyzeWithAI"
              :disabled="isAnalyzing || !imagePreview"
              class="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <template v-if="isAnalyzing">
                <RefreshCw class="w-5 h-5 animate-spin" />
                Analisando Imagem com IA Gemini...
              </template>
              <template v-else>
                <Bot class="w-5 h-5" />
                Analisar Foto com IA e Gerar Orçamento
              </template>
            </button>
          </div>

          <!-- RIGHT COLUMN: AI RESULT BREAKDOWN & CONFIRMATION -->
          <div class="lg:col-span-5 space-y-5">
            <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 h-full flex flex-col justify-between">
              <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 class="font-bold text-white text-base flex items-center gap-2">
                    <Sparkles class="w-5 h-5 text-amber-400" />
                    Resultado do Diagnóstico por IA
                  </h3>
                  <span v-if="latestAiResult" class="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded-full border border-amber-500/20">
                    Pronto
                  </span>
                </div>

                <div v-if="!latestAiResult && !isAnalyzing" class="text-center py-12 text-slate-400 space-y-3">
                  <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Bot class="w-6 h-6" />
                  </div>
                  <p class="text-xs max-w-xs mx-auto leading-relaxed">
                    Selecione ou tire uma foto e clique no botão para gerar o orçamento técnico instantâneo por IA.
                  </p>
                </div>

                <div v-if="isAnalyzing" class="text-center py-12 space-y-4">
                  <div class="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto animate-bounce">
                    <Bot class="w-6 h-6" />
                  </div>
                  <div class="space-y-1">
                    <p class="text-xs font-bold text-amber-400">
                      Processando imagem com Visão Computacional...
                    </p>
                    <p class="text-[11px] text-slate-400">
                      Calculando horas estimadas, materiais e média de mercado.
                    </p>
                  </div>
                </div>

                <div v-if="latestAiResult && !isAnalyzing" class="space-y-4 text-xs animate-in fade-in duration-200">
                  <!-- SUMMARY HEADER -->
                  <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] uppercase font-bold text-slate-400">
                        Problema Identificado:
                      </span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Complexidade {{ latestAiResult.complexity }}
                      </span>
                    </div>
                    <h4 class="text-sm font-bold text-white">
                      {{ latestAiResult.summary }}
                    </h4>
                    <p class="text-slate-300 leading-relaxed text-[11px]">
                      {{ latestAiResult.description }}
                    </p>
                  </div>

                  <!-- ESTIMATED PRICE RANGE -->
                  <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                        Estimativa do Serviço
                      </span>
                      <span v-if="latestAiResult.suggestedMinPrice > 0 || latestAiResult.suggestedMaxPrice > 0" class="text-xl font-extrabold text-white">
                        R$ {{ latestAiResult.suggestedMinPrice }},00 ~ R$ {{ latestAiResult.suggestedMaxPrice }},00
                      </span>
                      <span v-else class="text-base font-extrabold text-white">
                        O profissional fornecerá o valor.
                      </span>
                      <span v-if="latestAiResult.suggestedMinPrice === 0 && latestAiResult.suggestedMaxPrice === 0" class="block text-[10px] text-slate-400 mt-0.5">
                        A previsão não pôde ser avaliada pela IA.
                      </span>
                    </div>
                    <div class="text-right">
                      <span class="text-[10px] text-slate-400 block">Tempo Est.</span>
                      <span class="text-xs font-bold text-slate-200">
                        {{ latestAiResult.estimatedTime }}
                      </span>
                    </div>
                  </div>

                  <!-- MATERIALS NEEDED -->
                  <div class="space-y-1.5">
                    <span class="font-bold text-slate-300 text-[11px] flex items-center gap-1">
                      <CheckCircle2 class="w-3.5 h-3.5 text-amber-400" />
                      Insumos & Peças Prováveis:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                      <span
                        v-for="(mat, i) in latestAiResult.materialsNeeded"
                        :key="i"
                        class="bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[10px]"
                      >
                        • {{ mat }}
                      </span>
                    </div>
                  </div>

                  <!-- TECHNICAL RECOMMENDATION -->
                  <div v-if="latestAiResult.technicalNotes" class="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                    <span class="font-bold text-amber-400 block">
                      Orientação Técnica:
                    </span>
                    <p>{{ latestAiResult.technicalNotes }}</p>
                  </div>

                  <!-- SEND MODE CHOICE -->
                  <div v-if="!sendMode" class="space-y-2 pt-2">
                    <span class="font-bold text-amber-400 text-[11px] block">
                      Como deseja enviar seu orçamento?
                    </span>
                    <button
                      type="button"
                      @click="sendMode = 'broadcast'"
                      class="w-full p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all text-left flex items-start gap-3"
                    >
                      <div class="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Users class="w-5 h-5" />
                      </div>
                      <div>
                        <p class="font-bold text-white text-xs">Enviar para todos os profissionais</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                          Seu orçamento será enviado para <strong class="text-cyan-400">{{ prataBronzeCount }} profissionais</strong> prata e bronze da categoria.
                          Eles enviarão suas propostas.
                        </p>
                      </div>
                    </button>
                    <button
                      v-if="ourosNoCatalogo.length > 0"
                      type="button"
                      @click="sendMode = 'ouro'"
                      class="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-left flex items-start gap-3"
                    >
                      <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles class="w-5 h-5" />
                      </div>
                      <div>
                        <p class="font-bold text-white text-xs">Falar com um profissional ouro</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                          Selecione um profissional ouro para contato direto via WhatsApp.
                        </p>
                      </div>
                    </button>
                  </div>

                  <!-- BROADCAST CONFIRM -->
                  <div v-if="sendMode === 'broadcast'" class="space-y-2">
                    <div class="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
                      <p class="text-[10px] text-cyan-400 font-bold">
                        Enviando para {{ prataBronzeCount }} profissionais prata e bronze
                      </p>
                    </div>
                    <button
                      type="button"
                      @click="sendMode = null"
                      class="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      ← Voltar e escolher outra opção
                    </button>
                  </div>

                  <!-- OURO SELECTION -->
                  <div v-if="sendMode === 'ouro'" class="space-y-2">
                    <button
                      type="button"
                      @click="sendMode = null; selectedOuroProfessional = null"
                      class="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      ← Voltar e escolher outra opção
                    </button>
                    <span class="font-bold text-amber-400 text-[11px] block">
                      Selecione o profissional ouro:
                    </span>
                    <div
                      v-for="pro in ourosNoCatalogo"
                      :key="pro.id"
                      @click="selectedOuroProfessional = pro"
                      :class="[
                        'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                        selectedOuroProfessional?.id === pro.id
                          ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      ]"
                    >
                      <div class="flex items-center gap-3">
                        <img v-if="pro.avatar" :src="pro.avatar" :alt="pro.name" class="w-10 h-10 rounded-full object-cover border border-slate-700" />
                        <div v-else class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <User class="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <p class="font-bold text-white text-xs">{{ pro.name }}</p>
                          <p class="text-[10px] text-slate-400">{{ pro.category }}</p>
                        </div>
                      </div>
                      <div class="text-right">
                        <span class="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {{ pro.rating ?? 0 }}
                        </span>
                        <span class="text-[9px] text-slate-400">({{ pro.reviews_count ?? 0 }})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- CONFIRM ORDER BUTTON -->
              <div v-if="latestAiResult && !isAnalyzing && sendMode" class="pt-4 mt-4 border-t border-slate-800">
                <button
                  type="button"
                  @click="handleConfirmOrder"
                  :disabled="sendMode === 'ouro' && !selectedOuroProfessional"
                  :class="[
                    'w-full py-3 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2',
                    (sendMode === 'broadcast' || (sendMode === 'ouro' && selectedOuroProfessional))
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  ]"
                >
                  <Check class="w-4 h-4" />
                  <template v-if="sendMode === 'broadcast'">
                    Enviar para {{ prataBronzeCount }} profissionais
                  </template>
                  <template v-else-if="sendMode === 'ouro' && selectedOuroProfessional">
                    Enviar para {{ selectedOuroProfessional.name }}
                  </template>
                  <template v-else>
                    Selecione um profissional ouro
                  </template>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE CLIENT: TAB 2 - MEUS PEDIDOS & STATUS -->
      <div v-if="userMode === 'client' && activeTab === 'meus_pedidos'" class="space-y-6 animate-in fade-in duration-300">
        <!-- CLIENT SUB-TABS -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'solicitar'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Bot class="w-3.5 h-3.5" />
            Solicitar com IA
          </button>
          <button
            @click="activeTab = 'meus_pedidos'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30 relative"
          >
            <Clock class="w-3.5 h-3.5" />
            Meus Pedidos
            <span v-if="requests.length > 0" class="bg-amber-400 text-slate-950 font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {{ requests.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'recibos_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <FileText class="w-3.5 h-3.5" />
            Meus Recibos
          </button>
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Clock class="w-5 h-5 text-amber-400" />
              Acompanhamento de Serviços em Tempo Real
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              Acompanhe o status do seu chamado, interaja via WhatsApp e avalie o prestador após a conclusão.
            </p>
          </div>
        </div>

        <div v-if="requests.length === 0" class="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <p class="text-sm text-slate-400">Nenhum serviço solicitado até o momento.</p>
          <button
            @click="activeTab = 'solicitar'"
            class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
          >
            Solicitar Primeiro Orçamento
          </button>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="req in requests"
            :key="req.id"
            class="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-all space-y-5"
          >
            <!-- HEADER LINE -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold bg-slate-950 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800">
                  {{ req.id }}
                </span>
                <div>
                  <h3 class="font-bold text-white text-sm">
                    {{ req.ai_analysis?.summary || req.category }}
                  </h3>
                  <p class="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin class="w-3 h-3 text-slate-500" />
                    {{ req.client_address }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {{ req.status }}
                </span>
                <span class="text-xs font-extrabold text-white bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  R$ {{ req.final_price || req.ai_analysis?.suggestedMinPrice }},00
                </span>
              </div>
            </div>

            <!-- STEP TIMELINE -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div
                v-for="(step, idx) in statusSteps"
                :key="step"
                :class="[
                  'p-2.5 rounded-xl border text-center transition-all',
                  statusSteps.indexOf(req.status) >= idx
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                ]"
              >
                <div class="text-[10px] uppercase tracking-wider mb-0.5">Etapa {{ idx + 1 }}</div>
                <div class="text-xs truncate">{{ step }}</div>
              </div>
            </div>

            <!-- DETAIL CARD CONTENT -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div class="md:col-span-3">
                <img :src="req.photo_url" alt="Equipamento" class="w-full h-28 object-cover rounded-lg border border-slate-800" />
              </div>

              <div class="md:col-span-6 space-y-2 text-xs">
                <p class="text-slate-300">
                  <strong class="text-white">Descrição da IA:</strong> {{ req.ai_analysis?.description }}
                </p>
                <div v-if="req.agendamento" class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-amber-300 flex items-center gap-2">
                  <Calendar class="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>Visita Agendada:</strong> {{ req.agendamento.data }} às {{ req.agendamento.hora }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-slate-400">
                  <User class="w-3.5 h-3.5 text-slate-500" />
                  <span>Prestador: <strong>{{ findProfessional(req.professional_id)?.name || 'Não atribuído' }}</strong></span>
                </div>
              </div>

              <div class="md:col-span-3 space-y-2 flex flex-col justify-center">
                <!-- WHATSAPP ACTION BUTTON -->
                <a
                  v-if="hasFeature('whatsappVisible')"
                  :href="getWhatsAppLink(findProfessional(req.professional_id)?.phone || '', `Olá ${findProfessional(req.professional_id)?.name || 'Prestador'}! Gostaria de confirmar informações sobre o pedido #${req.id} de ${req.category}.`)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-2 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <MessageSquare class="w-4 h-4" />
                  Enviar no WhatsApp
                </a>

                <!-- RECEIPT BUTTON -->
                <button
                  v-if="req.status === 'Concluído'"
                  @click="viewReceiptModal = req"
                  class="w-full py-2 px-3 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-slate-700 flex items-center justify-center gap-1.5"
                >
                  <FileText class="w-4 h-4" />
                  Ver Recibo Digital
                </button>

                <!-- RATING BUTTON -->
                <button
                  v-if="req.status === 'Concluído' && !req.rating"
                  @click="rateOrderModal = req; ratingStars = 5"
                  class="w-full py-2 px-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 flex items-center justify-center gap-1.5"
                >
                  <Star class="w-4 h-4 fill-amber-400 text-amber-400" />
                  Avaliar Prestador
                </button>

                <div v-if="req.rating" class="text-[11px] bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-300 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 font-medium">Sua Avaliação:</span>
                    <span class="text-amber-400 font-bold flex items-center">
                      {{ req.rating.stars }} <Star class="w-3 h-3 fill-amber-400 text-amber-400 ml-0.5" />
                    </span>
                    <span class="truncate max-w-[150px]">&quot;{{ req.rating.comment }}&quot;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE CLIENT: TAB 3 - MEUS RECIBOS DIGITAIS -->
      <div v-if="userMode === 'client' && activeTab === 'recibos_cliente'" class="space-y-6 animate-in fade-in duration-300">
        <!-- CLIENT SUB-TABS -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'solicitar'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Bot class="w-3.5 h-3.5" />
            Solicitar com IA
          </button>
          <button
            @click="activeTab = 'meus_pedidos'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50 relative"
          >
            <Clock class="w-3.5 h-3.5" />
            Meus Pedidos
            <span v-if="requests.length > 0" class="bg-amber-400 text-slate-950 font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {{ requests.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'recibos_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <FileText class="w-3.5 h-3.5" />
            Meus Recibos
          </button>
        </div>

        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FileText class="w-5 h-5 text-amber-400" />
            Seus Recibos e Comprovantes Digitais
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Histórico completo de recibos oficiais emitidos para os serviços já concluídos.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="req in requests.filter(r => r.status === 'Concluído' || r.receipt_issued)"
            :key="req.id"
            class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
          >
            <div class="space-y-2 text-xs">
              <div class="flex justify-between items-center">
                <span class="font-mono font-bold text-amber-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                  {{ req.id }}
                </span>
                <span class="text-[11px] text-slate-400">
                  Data: {{ req.agendamento?.data || '2026-07-29' }}
                </span>
              </div>
              <h4 class="font-bold text-white text-sm">
                {{ req.ai_analysis?.summary || req.category }}
              </h4>
              <p class="text-slate-400">
                Prestador responsável: <strong class="text-slate-200">{{ findProfessional(req.professional_id)?.name || proProfile.name }}</strong>
              </p>
              <div class="text-base font-extrabold text-amber-400 pt-1">
                R$ {{ req.final_price }},00 <span class="text-[10px] text-slate-500 font-normal">(Valor Quitado)</span>
              </div>
            </div>

            <button
              @click="viewReceiptModal = req"
              class="w-full py-2.5 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Printer class="w-4 h-4" /> Visualizar / Imprimir Recibo
            </button>
          </div>
        </div>
      </div>

      <!-- MODE PRO: TAB 1 - PAINEL DE ATENDIMENTOS -->
      <div v-if="userMode === 'pro' && activeTab === 'pedidos_pro'" class="space-y-6 animate-in fade-in duration-300">
        <!-- PRO SUB-TABS -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'pedidos_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <SlidersHorizontal class="w-3.5 h-3.5" />
            Painel de Atendimentos
          </button>
          <button
            @click="activeTab = 'faturamento'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <TrendingUp class="w-3.5 h-3.5" />
            Faturamento
          </button>
          <button
            @click="activeTab = 'perfil_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Star class="w-3.5 h-3.5" />
            Meu Perfil
          </button>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <SlidersHorizontal class="w-5 h-5 text-amber-400" />
              Painel do Prestador - Solicitantes da Região
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              Gerencie orçamentos gerados por IA, agende visitas técnicas e atualize o status dos atendimentos.
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span class="text-slate-300 font-medium">Modo Ativo de Recebimento de Chamados</span>
          </div>
        </div>

        <div class="space-y-4">
          <div
            v-for="req in requests"
            :key="req.id"
            class="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div class="flex items-center gap-3">
                <span class="text-xs font-mono font-bold bg-slate-950 text-amber-400 px-2.5 py-1 rounded-lg border border-slate-800">
                  {{ req.id }}
                </span>
                <div>
                  <h3 class="font-bold text-white text-sm">
                    {{ req.client_name }} • {{ req.category }}
                  </h3>
                  <p class="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin class="w-3 h-3 text-slate-500" />
                    {{ req.client_address }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {{ req.status }}
                </span>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              <div class="md:col-span-3">
                <img :src="req.photo_url" alt="Foto do dano" class="w-full h-32 object-cover rounded-xl border border-slate-800" />
              </div>

              <div class="md:col-span-6 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <p class="font-bold text-amber-400 text-xs">
                  Diagnóstico da IA: {{ req.ai_analysis?.summary }}
                </p>
                <p class="text-slate-300 leading-relaxed text-[11px]">
                  {{ req.ai_analysis?.description }}
                </p>
                <div class="pt-2 border-t border-slate-800/80 text-[11px] text-slate-300">
                  <strong class="text-slate-400 block mb-0.5">Relato do Cliente:</strong>
                  &quot;{{ req.notes }}&quot;
                </div>
              </div>

              <div class="md:col-span-3 space-y-2 flex flex-col justify-center">
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span class="text-[10px] text-slate-400 block uppercase">Sugestão de Preço IA</span>
                  <span v-if="req.ai_analysis?.suggestedMinPrice > 0 || req.ai_analysis?.suggestedMaxPrice > 0" class="text-base font-extrabold text-white">
                    R$ {{ req.ai_analysis?.suggestedMinPrice }} ~ R$ {{ req.ai_analysis?.suggestedMaxPrice }}
                  </span>
                  <span v-else class="text-xs font-bold text-slate-200">
                    O profissional fornecerá o valor.
                  </span>
                </div>

                <!-- ACTIONS FOR PRO -->
                <button
                  v-if="req.status === 'Pendente'"
                  @click="scheduleModal = req; schedulePrice = req.ai_analysis?.suggestedMinPrice.toString() || ''"
                  class="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  <Calendar class="w-4 h-4" />
                  Agendar Visita / Definir Preço
                </button>

                <button
                  v-if="req.status === 'Visita Agendada'"
                  @click="handleUpdateStatus(req.id, 'Em Execução')"
                  class="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-all flex items-center justify-center gap-1.5"
                >
                  <Wrench class="w-4 h-4" />
                  Iniciar Execução
                </button>

                <button
                  v-if="req.status === 'Em Execução'"
                  @click="handleUpdateStatus(req.id, 'Concluído')"
                  class="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 class="w-4 h-4" />
                  Concluir & Emitir Recibo
                </button>

                <a
                  :href="getWhatsAppLink(req.client_phone, `Olá ${req.client_name}! Aqui é o ${proProfile.name}, prestador de serviços. Vi sua solicitação #${req.id} de ${req.category} e estou disponível para o atendimento.`)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-full py-2 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30 font-semibold text-xs hover:bg-slate-700 flex items-center justify-center gap-1.5"
                >
                  <MessageSquare class="w-4 h-4" />
                  Contato WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- MODE PRO: TAB 2 - RELATÓRIO DE FATURAMENTO -->
      <div v-if="userMode === 'pro' && activeTab === 'faturamento'" class="space-y-6 animate-in fade-in duration-300">
        <!-- PRO SUB-TABS -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'pedidos_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <SlidersHorizontal class="w-3.5 h-3.5" />
            Painel de Atendimentos
          </button>
          <button
            @click="activeTab = 'faturamento'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <TrendingUp class="w-3.5 h-3.5" />
            Faturamento
          </button>
          <button
            @click="activeTab = 'perfil_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Star class="w-3.5 h-3.5" />
            Meu Perfil
          </button>
        </div>

        <!-- GATED: Relatórios avançados apenas no plano Ouro -->
        <template v-if="hasFeature('advancedReports')">
        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-amber-400" />
            Relatório Financeiro & Faturamento Mensal
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Acompanhe o rendimento do seu trabalho, total faturado e quantidade de serviços prestados.
          </p>
        </div>

        <!-- METRICS CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Faturamento Julho (Acumulado)
            </span>
            <span class="text-2xl sm:text-3xl font-black text-amber-400">
              R$ {{ totalRevenueMonth.toLocaleString('pt-BR') }},00
            </span>
            <p class="text-[11px] text-amber-400/80 font-medium flex items-center gap-1">
              <TrendingUp class="w-3.5 h-3.5" /> +18.4% em relação ao mês anterior
            </p>
          </div>

          <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Serviços Concluídos no Mês
            </span>
            <span class="text-2xl sm:text-3xl font-black text-white">
              {{ completedCount }} atendimentos
            </span>
            <p class="text-[11px] text-slate-400 font-medium">
              Média de 1.1 serviços por dia trabalhado
            </p>
          </div>

          <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Ticket Médio por Serviço
            </span>
            <span class="text-2xl sm:text-3xl font-black text-cyan-400">
              R$ {{ Math.round(avgTicket) }},00
            </span>
            <p class="text-[11px] text-slate-400 font-medium">
              Com base em serviços residenciais e prediais
            </p>
          </div>
        </div>

        <!-- REVENUE CHART -->
        <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-bold text-white text-sm flex items-center gap-2">
              <BarChart2 class="w-4 h-4 text-amber-400" />
              Evolução do Faturamento Mensal (Em Reais R$)
            </h3>
            <span class="text-xs text-slate-400">Semestre Atual (2026)</span>
          </div>

          <div class="h-64 w-full pt-4">
            <v-chart :option="revenueChartOption" :autoresize="true" />
          </div>
        </div>
        </template>
        <div v-else class="bg-slate-900 rounded-2xl p-10 border border-slate-800 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
            <Lock class="w-7 h-7" />
          </div>
          <h2 class="text-xl font-bold text-white">Relatórios disponíveis no plano Ouro</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto">
            Acompanhe faturamento mensal, ticket médio e a evolução dos seus serviços com o plano Ouro.
          </p>
          <button
            @click="subscribePlan('ouro')"
            class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all"
          >
            Assinar Ouro
          </button>
        </div>
      </div>

      <!-- MODE PRO: TAB 3 - PERFIL PROFISSIONAL -->
      <div v-if="userMode === 'pro' && activeTab === 'perfil_pro'" class="space-y-6 animate-in fade-in duration-300">
        <!-- PRO SUB-TABS -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            @click="activeTab = 'pedidos_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <SlidersHorizontal class="w-3.5 h-3.5" />
            Painel de Atendimentos
          </button>
          <button
            @click="activeTab = 'faturamento'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <TrendingUp class="w-3.5 h-3.5" />
            Faturamento
          </button>
          <button
            @click="activeTab = 'perfil_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <Star class="w-3.5 h-3.5" />
            Meu Perfil
          </button>
        </div>

        <!-- CADASTRO: Quando não há profissional cadastrado -->
        <div v-if="!proProfile.id && !isRegistering" class="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-4">
          <Building2 class="w-14 h-14 text-amber-400 mx-auto" />
          <h2 class="text-xl font-bold text-white">Você ainda não é um prestador cadastrado</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto">Cadastre-se para receber solicitações de serviço dos clientes na sua região.</p>
          <button
            @click="isRegistering = true; openProfileEditor()"
            class="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all inline-flex items-center gap-2"
          >
            <Wrench class="w-4 h-4" />
            Cadastrar como Prestador
          </button>
        </div>

        <!-- CARD DO PERFIL -->
        <div v-if="proProfile.id && !isEditingProfile" class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-amber-500/50 shadow-lg overflow-hidden flex items-center justify-center shrink-0">
                <img v-if="proProfile.avatar" :src="proProfile.avatar" :alt="proProfile.name" class="w-full h-full object-cover" />
                <User v-else class="w-6 h-6 text-slate-500" />
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="text-xl font-bold text-white">{{ proProfile.name }}</h2>
                  <span
                    v-if="hasFeature('verifiedBadge')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30"
                  >
                    <ShieldCheck class="w-3 h-3" />
                    Verificado
                  </span>
                </div>
                <p class="text-xs text-amber-400 font-semibold">{{ proProfile.category }}</p>
                <p class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Phone class="w-3 h-3" /> WhatsApp: {{ proProfile.phone }}
                </p>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                @click="openProfileEditor"
                class="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 flex items-center gap-1.5"
              >
                <Edit2 class="w-4 h-4 text-amber-400" />
                Editar Perfil
              </button>
            </div>
          </div>

          <!-- BIO & RATING STATS -->
          <div class="space-y-4">
            <p class="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
              {{ proProfile.bio }}
            </p>

            <h3 class="font-bold text-white text-base flex items-center gap-2 pt-2">
              <Star class="w-5 h-5 text-amber-400 fill-amber-400" />
              Avaliações do Perfil ({{ proProfile.reviews_count }} Clientes)
            </h3>

            <div class="space-y-3">
              <div
                v-for="(req, idx) in requests.filter(r => r.rating)"
                :key="idx"
                class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs"
              >
                <div class="flex justify-between items-center">
                  <span class="font-bold text-white">{{ req.client_name }}</span>
                  <span class="text-amber-400 font-bold flex items-center gap-1">
                    {{ req.rating?.stars }} <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400 ml-0.5" />
                  </span>
                </div>
                <p class="text-slate-300 italic">&quot;{{ req.rating?.comment }}&quot;</p>
                <span class="text-[10px] text-slate-500 block pt-1">
                  Serviço: {{ req.category }} • Data: {{ req.rating?.date }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- PLAN SELECTION SECTION -->
        <div v-if="proProfile.id && !isEditingProfile" class="space-y-6">
          <!-- Current Plan Badge -->
          <div class="bg-slate-900/80 rounded-2xl p-6 border border-slate-800">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-bold text-white">Seu Plano Atual</h3>
                <p class="text-sm text-slate-400 mt-1">
                  {{ PLAN_LABELS[proProfile.plan] }}
                </p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-extrabold text-amber-400">
                  {{ PLAN_PRICES[proProfile.plan] }}
                </span>
                <span class="text-slate-400 text-sm">/mês</span>
              </div>
            </div>

            <!-- Request Usage (plans with finite limits) -->
            <div v-if="proProfile.plan === 'bronze' || proProfile.plan === 'prata'" class="mt-4">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-slate-400">Pedidos este mês</span>
                <span class="text-white font-medium">
                  {{ requestUsage.current }}/{{ requestUsage.limit }}
                </span>
              </div>
              <div class="w-full bg-slate-800 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-300"
                  :class="requestUsage.isAtLimit ? 'bg-red-500' : requestUsage.isNearLimit ? 'bg-amber-500' : 'bg-green-500'"
                  :style="{ width: Math.min(requestUsage.percentage, 100) + '%' }"
                ></div>
              </div>
            </div>

            <div v-else-if="proProfile.plan === 'ouro'" class="mt-4">
              <span class="inline-flex items-center gap-2 text-green-400 text-sm font-medium">
                <CheckCircle2 class="w-4 h-4" />
                Pedidos ilimitados
              </span>
            </div>

            <div v-else class="mt-4">
              <span class="inline-flex items-center gap-2 text-slate-400 text-sm font-medium">
                <Sparkles class="w-4 h-4" />
                Assine um plano para começar a receber pedidos
              </span>
            </div>

            <!-- Manage Subscription (Portal) -->
            <button
              v-if="proProfile.stripe_subscription_id && proProfile.plan_status === 'active'"
              @click="handleOpenPortal"
              class="mt-4 w-full py-3 px-4 bg-slate-800 text-amber-400 border border-amber-500/30 font-bold rounded-xl hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <SlidersHorizontal class="w-5 h-5" />
              Gerenciar Assinatura
            </button>
          </div>

          <!-- Plan Comparison Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="p in PLANS"
              :key="p.id"
              :class="[
                'bg-slate-900/80 rounded-2xl p-6 border-2 transition-all flex flex-col',
                proProfile.plan === p.id ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-800'
              ]"
            >
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <component :is="p.icon" class="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 class="font-bold text-white">{{ p.name }}</h4>
                  <p class="text-amber-400 font-extrabold">{{ p.price }}<span class="text-xs text-slate-400 font-medium">/mês</span></p>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 mb-3">{{ p.tagline }}</p>
              <ul class="space-y-2 flex-1">
                <li v-for="feature in p.features" :key="feature" class="flex items-center gap-2">
                  <Check class="w-4 h-4 text-green-400 shrink-0" />
                  <span class="text-xs text-slate-300">{{ feature }}</span>
                </li>
              </ul>
              <div v-if="proProfile.plan === p.id" class="mt-4 w-full py-2 px-4 bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-center text-sm">
                Plano Atual
              </div>
              <button
                v-else-if="p.id !== 'gratuito'"
                @click="subscribePlan(p.id)"
                class="mt-4 w-full py-2 px-4 bg-slate-800 text-amber-400 border border-amber-500/30 font-bold rounded-xl hover:bg-slate-700 transition-all"
              >
                {{ p.cta }}
              </button>
              <div v-else class="mt-4 w-full py-2 px-4 bg-slate-950 text-slate-500 border border-slate-800 rounded-xl text-center text-sm">
                Cancele pelo Portal para voltar ao Gratuito
              </div>
            </div>
          </div>
        </div>

        <!-- EDIT PROFILE FORM (forboth registration and editing) -->
        <div v-if="isEditingProfile" class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 class="font-bold text-white text-sm">{{ isRegistering ? 'Cadastrar Perfil Profissional' : 'Editar Informações Públicas' }}</h3>
          <!-- AVATAR UPLOAD -->
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
              <img v-if="avatarPreview || proProfile.avatar" :src="avatarPreview || proProfile.avatar" class="w-full h-full object-cover" />
              <User v-else class="w-6 h-6 text-slate-500" />
            </div>
            <label class="cursor-pointer px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs hover:bg-slate-700 flex items-center gap-1.5">
              <Camera class="w-3 h-3" />
              Escolher Foto
              <input type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
            </label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-slate-400">Nome Profissional:</label>
              <input
                type="text"
                v-model="editProName"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="text-slate-400">Categoria:</label>
              <select
                v-model="editProCategory"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              >
                <option value="" disabled>Selecione uma categoria</option>
                <option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-slate-400">E-mail para Assinatura:</label>
              <input
                type="email"
                v-model="editProEmail"
                placeholder="voce@email.com"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="text-slate-400">WhatsApp de Atendimento:</label>
              <input
                type="text"
                v-model="editProPhone"
                placeholder="(11) 99999-9999"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="text-slate-400">Chave PIX para Recibos:</label>
              <input
                type="text"
                v-model="editProPix"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          <div>
            <label class="text-slate-400">Biografia / Experiência:</label>
            <textarea
              v-model="editProBio"
              rows="2"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white mt-1 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
          <div class="flex gap-2">
            <button
              @click="handleSaveProfile"
              class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
            >
              {{ isRegistering ? 'Cadastrar' : 'Salvar Alterações' }}
            </button>
            <button
              v-if="isRegistering"
              @click="isRegistering = false; isEditingProfile = false"
              class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- UPGRADE MODAL -->
    <div v-if="showUpgradeModal && upgradeRecommendation" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showUpgradeModal = false"></div>
      <div class="relative bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl max-w-md w-full space-y-6">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-extrabold text-white">Fazer Upgrade</h3>
          <button @click="showUpgradeModal = false" class="text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="bg-gradient-to-br from-amber-500/10 to-yellow-400/10 rounded-2xl p-6 border border-amber-500/20">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Sparkles class="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 class="font-bold text-white text-lg">Plano {{ upgradeRecommendation.label }}</h4>
              <p class="text-amber-400 font-extrabold text-xl">{{ upgradeRecommendation.price }}<span class="text-sm text-slate-400 font-medium">/mês</span></p>
            </div>
          </div>
          <ul class="space-y-2 text-sm text-slate-300">
            <li v-for="feature in upgradeRecommendation.features" :key="feature" class="flex items-center gap-2">
              <Check class="w-4 h-4 text-green-400" />
              {{ feature }}
            </li>
          </ul>
        </div>

        <div class="flex gap-3">
          <button
            @click="showUpgradeModal = false"
            class="flex-1 py-3 px-4 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-all"
          >
            Cancelar
          </button>
          <button
            @click="subscribePlan(upgradeRecommendation.plan); showUpgradeModal = false"
            class="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold rounded-xl hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-2"
          >
            <Zap class="w-5 h-5" />
            Assinar Agora
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 1: SCHEDULE VISIT / SET COST -->
    <div v-if="scheduleModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-bold text-white text-sm flex items-center gap-2">
            <Calendar class="w-4 h-4 text-amber-400" />
            Agendar Visita / Definir Preço
          </h3>
          <button @click="scheduleModal = null" class="text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-3 text-xs">
          <p class="text-slate-300">
            Defina o dia, horário e valor acordado para o atendimento de <strong>{{ scheduleModal.client_name }}</strong>.
          </p>

          <div>
            <label class="text-slate-400 font-medium">Data da Visita:</label>
            <input
              type="date"
              v-model="scheduleDate"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="text-slate-400 font-medium">Horário Estimado:</label>
            <input
              type="time"
              v-model="scheduleTime"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label class="text-slate-400 font-medium">Valor do Serviço / Visita (R$):</label>
            <input
              type="number"
              v-model="schedulePrice"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500 font-bold"
              placeholder="Ex: 220"
            />
          </div>

          <div>
            <label class="text-slate-400 font-medium">Observação para o Cliente:</label>
            <input
              type="text"
              v-model="scheduleObs"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              placeholder="Ex: Trazer escada alta e disjuntor de fiação"
            />
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button
            @click="handleSaveSchedule"
            class="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
          >
            Confirmar Agendamento
          </button>
          <button
            @click="scheduleModal = null"
            class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: RATE SERVICE -->
    <div v-if="rateOrderModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-bold text-white text-sm flex items-center gap-2">
            <Star class="w-4 h-4 text-amber-400 fill-amber-400" />
            Avaliar Prestador de Serviço
          </h3>
          <button @click="rateOrderModal = null" class="text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="space-y-4 text-xs text-center">
          <p class="text-slate-300">
            Como foi o atendimento de <strong>{{ proProfile.name }}</strong> para o serviço de {{ rateOrderModal.category }}?
          </p>

          <!-- STAR SELECTOR -->
          <div class="flex items-center justify-center gap-2 py-2">
            <button
              v-for="star in 5"
              :key="star"
              type="button"
              @click="ratingStars = star"
              class="p-1 hover:scale-125 transition-transform"
            >
              <Star
                :class="[
                  'w-7 h-7',
                  star <= ratingStars ? 'fill-amber-400 text-amber-400' : 'text-slate-700 hover:text-amber-400'
                ]"
              />
            </button>
          </div>

          <div>
            <textarea
              v-model="ratingComment"
              rows="3"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Escreva um breve comentário sobre a qualidade e pontualidade..."
            />
          </div>
        </div>

        <div class="flex gap-2">
          <button
            @click="handleSaveRating"
            class="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
          >
            Enviar Avaliação
          </button>
          <button
            @click="rateOrderModal = null"
            class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 3: VIEW & PRINT DIGITAL RECEIPT -->
    <div v-if="viewReceiptModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="font-bold text-white text-sm flex items-center gap-2">
            <FileText class="w-4 h-4 text-amber-400" />
            Recibo Digital de Prestação de Serviço
          </h3>
          <button @click="viewReceiptModal = null" class="text-slate-400 hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- PRINTABLE RECEIPT CONTAINER -->
        <div class="bg-white text-slate-900 p-6 rounded-xl space-y-5 font-mono text-xs shadow-inner">
          <div class="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
            <div>
              <h4 class="font-extrabold text-sm uppercase tracking-tight">Recibo de Serviço</h4>
              <p class="text-[10px] text-slate-600">Nº Ord: {{ viewReceiptModal.id }}</p>
            </div>
            <div class="text-right text-[10px] text-slate-600">
              <p>Data: {{ viewReceiptModal.agendamento?.data || '2026-07-29' }}</p>
              <p>Status: QUITADO</p>
            </div>
          </div>

          <div class="space-y-2 text-[11px]">
            <p><strong>PRESTADOR:</strong> {{ proProfile.name }}</p>
            <p><strong>CATEGORIA:</strong> {{ proProfile.category }}</p>
            <p><strong>CHAVE PIX:</strong> {{ proProfile.pix_key }}</p>
          </div>

          <div class="border-t border-b border-slate-200 py-3 space-y-2 text-[11px]">
            <p><strong>CLIENTE:</strong> {{ viewReceiptModal.client_name }}</p>
            <p><strong>ENDEREÇO:</strong> {{ viewReceiptModal.client_address }}</p>
            <p><strong>SERVIÇO EXECUTADO:</strong> {{ viewReceiptModal.ai_analysis?.summary || viewReceiptModal.category }}</p>
          </div>

          <div class="flex justify-between items-center text-sm font-extrabold pt-2">
            <span>VALOR TOTAL PAGO:</span>
            <span class="text-amber-700">R$ {{ viewReceiptModal.final_price }},00</span>
          </div>

          <div class="text-center pt-4 text-[9px] text-slate-500 border-t border-dashed border-slate-300">
            Comprovante gerado digitalmente via Casa Obras e Reparos IA.
          </div>
        </div>

        <!-- MODAL ACTIONS -->
        <div class="flex gap-2">
          <button
            @click="window.print()"
            class="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
          >
            <Printer class="w-4 h-4" /> Imprimir ou Salvar PDF
          </button>
          <button
            @click="viewReceiptModal = null"
            class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <footer class="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
      <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Casa Obras e Reparos © 2026 — Plataforma Inteligente para Prestadores de Serviços Gerais</span>
        <span class="text-[11px] text-slate-600">Alimentado por Gemini AI Vision API</span>
      </div>
    </footer>
  </div>
</template>

<style>
@keyframes carousel {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-carousel {
  animation: carousel 30s linear infinite;
}
.animate-carousel:hover {
  animation-play-state: paused;
}
</style>