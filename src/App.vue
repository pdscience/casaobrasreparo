<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { trackEvent, buildWhatsAppLink, getWhatsAppNumber } from './lib/analytics'
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
  History,
  Newspaper,
  Lightbulb,
  Hammer,
  Droplets,
  ZapOff,
  Thermometer,
  Shield,
  HardHat,
  LogIn,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  BadgeCheck,
  Flame,
  Trees,
  Refrigerator,
  Sofa,
  Tv,
  Layers,
  Grid2x2,
  Fence,
  Home,
  Gem,
  LayoutGrid,
  Bug,
  Paintbrush,
  Monitor,
} from 'lucide-vue-next'
import type { AIAnalysis, Professional, ServiceRequest, Plan, User as UserProfile } from './types'
import { analyzeWithAI, getServiceRequests, createServiceRequest, updateServiceRequest, getProfessionals, createProfessional, updateProfessional, getProfessionalByAuthId, uploadProfessionalAvatar, uploadServicePhoto, createPortalSession, changePlan, createCheckoutSession, getPlans, signUpAuth, signInAuth, signOutAuth, getCurrentAuthUser, getUserByAuthId, createUserRecord } from './api/insforgeService'
import ProfessionalCard from './components/ProfessionalCard.vue'
import ProfileEditModal from './components/ProfileEditModal.vue'
import { validateQuoteForm, buildQuotePayload, type SendMode } from './lib/quoteFlow'

const CATEGORIES = [
  { name: 'Eletricista', icon: Zap, gradient: 'from-amber-600 to-yellow-500', accent: 'text-amber-300', img: 'https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Encanador', icon: Wrench, gradient: 'from-blue-600 to-cyan-500', accent: 'text-blue-300', img: 'https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Pintor', icon: Sparkles, gradient: 'from-yellow-500 to-orange-400', accent: 'text-yellow-300', img: 'https://images.pexels.com/photos/994164/pexels-photo-994164.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Ar-Condicionado', icon: RefreshCw, gradient: 'from-cyan-500 to-teal-400', accent: 'text-cyan-300', img: 'https://images.pexels.com/photos/32497161/pexels-photo-32497161.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Marceneiro', icon: Building2, gradient: 'from-orange-600 to-amber-500', accent: 'text-orange-300', img: 'https://images.pexels.com/photos/5974296/pexels-photo-5974296.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Pedreiro / Reformas', icon: ShieldCheck, gradient: 'from-stone-600 to-stone-400', accent: 'text-stone-300', img: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Chaveiro', icon: Sliders, gradient: 'from-purple-600 to-violet-500', accent: 'text-purple-300', img: 'https://images.pexels.com/photos/101808/pexels-photo-101808.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Limpeza Geral', icon: ThumbsUp, gradient: 'from-rose-500 to-pink-400', accent: 'text-rose-300', img: 'https://images.pexels.com/photos/5591860/pexels-photo-5591860.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Gás', icon: Flame, gradient: 'from-red-600 to-orange-500', accent: 'text-red-300', img: 'https://images.pexels.com/photos/3722212/pexels-photo-3722212.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Jardinagem', icon: Trees, gradient: 'from-green-600 to-emerald-500', accent: 'text-green-300', img: 'https://images.pexels.com/photos/38936344/pexels-photo-38936344.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Eletrodomésticos', icon: Refrigerator, gradient: 'from-sky-600 to-blue-500', accent: 'text-sky-300', img: 'https://images.pexels.com/photos/34734504/pexels-photo-34734504.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Montagem de Móveis', icon: Sofa, gradient: 'from-indigo-600 to-violet-500', accent: 'text-indigo-300', img: 'https://images.pexels.com/photos/4554417/pexels-photo-4554417.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Instalação de TV', icon: Tv, gradient: 'from-slate-600 to-sky-600', accent: 'text-sky-300', img: 'https://images.pexels.com/photos/6020432/pexels-photo-6020432.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Gesso e Drywall', icon: Layers, gradient: 'from-slate-500 to-zinc-400', accent: 'text-slate-300', img: 'https://images.pexels.com/photos/4981812/pexels-photo-4981812.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Vidros e Espelhos', icon: Grid2x2, gradient: 'from-teal-500 to-sky-400', accent: 'text-teal-300', img: 'https://images.pexels.com/photos/3615723/pexels-photo-3615723.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Grades e Portões', icon: Fence, gradient: 'from-neutral-600 to-zinc-400', accent: 'text-neutral-300', img: 'https://images.pexels.com/photos/13278911/pexels-photo-13278911.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Telhado e Calhas', icon: Home, gradient: 'from-red-500 to-rose-400', accent: 'text-red-300', img: 'https://images.pexels.com/photos/38524253/pexels-photo-38524253.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Impermeabilização', icon: Droplets, gradient: 'from-blue-500 to-indigo-500', accent: 'text-blue-300', img: 'https://images.pexels.com/photos/39238328/pexels-photo-39238328.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Marmoraria', icon: Gem, gradient: 'from-purple-500 to-fuchsia-400', accent: 'text-purple-300', img: 'https://images.pexels.com/photos/14225905/pexels-photo-14225905.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Azulejista', icon: LayoutGrid, gradient: 'from-slate-500 to-cyan-600', accent: 'text-cyan-300', img: 'https://images.pexels.com/photos/8293686/pexels-photo-8293686.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Controle de Pragas', icon: Bug, gradient: 'from-lime-600 to-green-600', accent: 'text-lime-300', img: 'https://images.pexels.com/photos/19789837/pexels-photo-19789837.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Limpeza Pós-Obra', icon: Paintbrush, gradient: 'from-pink-500 to-rose-400', accent: 'text-pink-300', img: 'https://images.pexels.com/photos/3616735/pexels-photo-3616735.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Marido de Aluguel', icon: Hammer, gradient: 'from-yellow-600 to-lime-500', accent: 'text-yellow-300', img: 'https://images.pexels.com/photos/17063686/pexels-photo-17063686.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Informática', icon: Monitor, gradient: 'from-violet-600 to-indigo-500', accent: 'text-violet-300', img: 'https://images.pexels.com/photos/10558599/pexels-photo-10558599.jpeg?auto=compress&cs=tinysrgb&w=400' },
]

const statusSteps = ['Pendente', 'Visita Agendada', 'Em Execução', 'Concluído']

const userMode = computed<'client' | 'pro' | null>(() => userProfile.value?.role ?? null)
const activeTab = ref<string>('boas_vindas')

const CATEGORY_UNLISTED = 'Serviço que não está na lista'

const contactForm = ref({
  name: '',
  email: '',
  phone: '',
  category: '',
  categoryOther: '',
  subject: '',
  message: '',
})
const contactSubmitting = ref(false)
const contactSuccess = ref(false)

const handleContactSubmit = () => {
  contactSubmitting.value = true
  const { name, email, phone, category, subject, message } = contactForm.value
  const isUnlisted = category === CATEGORY_UNLISTED
  const categoryLine = isUnlisted
    ? `Categoria: ${contactForm.value.categoryOther} (sugerida — ainda não está na lista)`
    : category ? `Categoria: ${category}` : ''
  // Experiência sem sair da página: abre WhatsApp em nova aba + mantém toast
  const waMessage = [
    `Olá! Vim pelo site Casa Obras e Reparos.`,
    ``,
    `Nome: ${name}`,
    `E-mail: ${email}`,
    phone ? `Telefone: ${phone}` : '',
    categoryLine,
    subject ? `Assunto: ${subject}` : '',
    ``,
    `Mensagem: ${message}`,
  ].filter(Boolean).join('\n')

  trackEvent('lead_whatsapp', { category: isUnlisted ? 'categoria_sugerida' : (category || 'geral'), subject: subject || '' })
  try {
    window.open(buildWhatsAppLink(waMessage, getWhatsAppNumber()), '_blank', 'noopener')
  } catch { /* noop */ }

  setTimeout(() => {
    contactSubmitting.value = false
    contactSuccess.value = true
    contactForm.value = { name: '', email: '', phone: '', category: '', categoryOther: '', subject: '', message: '' }
    setTimeout(() => { contactSuccess.value = false }, 6000)
  }, 500)
}

// ---------- Landing premium (página única) ----------
const isLanding = computed(() =>
  !authUser.value && ['boas_vindas', 'como_funciona', 'para_profissionais', 'contato', 'blog'].includes(activeTab.value)
)
const heroVideoUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_HERO_VIDEO_URL || ''
const openFaq = ref<number | null>(0)
function planLimitText(id: string, fallback: string): string {
  const row = planMap.value.get(id)
  if (!row) return fallback
  return row.request_limit === null ? 'ilimitados' : `${row.request_limit}/mês`
}
const faqs = computed(() => [
  { q: 'Como funciona o orçamento com IA?', a: 'Você envia uma foto do problema, escolhe a categoria e a IA gera diagnóstico, materiais, tempo estimado e faixa de preço. Depois você envia para profissionais Ouro ou para toda a base.' },
  { q: 'Preciso pagar para pedir um orçamento?', a: 'Não. Cliente não paga nada para solicitar. Você só combina o valor diretamente com o profissional via WhatsApp.' },
  { q: 'Como o profissional recebe meus pedidos?', a: 'Profissionais assinantes (Bronze, Prata e Ouro) veem os chamados da sua categoria em tempo real, com foto e análise da IA. O plano Ouro ainda recebe contato direto individual.' },
  { q: 'O que muda entre Bronze, Prata e Ouro?', a: `Bronze (${dbPlanPrice('bronze', 'R$34,90')}): ${planLimitText('bronze', '10/mês')} pedidos. Prata (${dbPlanPrice('prata', 'R$54,90')}): ${planLimitText('prata', '30/mês')} pedidos, WhatsApp visível e prioridade. Ouro (${dbPlanPrice('ouro', 'R$79,90')}): pedidos ${planLimitText('ouro', 'ilimitados')}, topo do catálogo, selo verificado e relatórios avançados.` },
  { q: 'Como falo com vocês?', a: 'Use o formulário abaixo — ele abre o WhatsApp da Casa Obras e Reparos com sua mensagem pronta, sem sair da experiência.' },
])
const partnerLogos = ['Eletricistas PRO', 'Hidráulica Prime', 'Pinturas & Cia', 'ClimaFrio', 'Marcenaria Alto Padrão', 'Reforma Fácil', 'Chave Ouro 24h', 'Limpa Total']

// Tesla stack: seções fullscreen + nav flutuante + dots
const isScrolled = ref(false)
const activeSection = ref('inicio')
const teslaSections = [
  { id: 'inicio', label: 'Início' },
  { id: 'servicos-eletrica', label: 'Elétrica & Hidráulica' },
  { id: 'servicos-reforma', label: 'Pintura & Reformas' },
  { id: 'contato', label: 'Contato' },
]
function onPageScroll() {
  isScrolled.value = window.scrollY > 24
  // dots: acha seção mais visível
  let current = 'inicio'
  for (const s of teslaSections) {
    const el = document.getElementById(s.id)
    if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) current = s.id
  }
  activeSection.value = current
}

const PROFESSIONALS_ROUTE = '#/profissionais'

function scrollToId(id: string) {
  activeTab.value = 'boas_vindas'
  nextTick(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function openProfessionalsPage() {
  activeTab.value = 'profissionais'
  window.scrollTo({ top: 0 })
}

watch(activeTab, (tab) => {
  const shouldHaveRoute = tab === 'profissionais'
  const hasRoute = window.location.hash === PROFESSIONALS_ROUTE
  if (shouldHaveRoute && !hasRoute) {
    window.history.pushState({ tab: 'profissionais' }, '', PROFESSIONALS_ROUTE)
  } else if (!shouldHaveRoute && hasRoute) {
    window.history.replaceState({}, '', window.location.pathname + window.location.search)
  }
})

function syncTabFromRoute() {
  if (window.location.hash === PROFESSIONALS_ROUTE) {
    activeTab.value = 'profissionais'
    window.scrollTo({ top: 0 })
  } else if (activeTab.value === 'profissionais') {
    activeTab.value = 'boas_vindas'
  }
}

function onRoutePopstate() {
  syncTabFromRoute()
}
function trackCta(label: string) {
  trackEvent('cta_click', { label })
}
function handleTilt(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const r = el.getBoundingClientRect()
  const rx = ((e.clientY - r.top) / r.height - 0.5) * -10
  const ry = ((e.clientX - r.left) / r.width - 0.5) * 10
  el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`
}
function resetTilt(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement | null
  if (el) el.style.transform = ''
}

const cursorGlow = ref<HTMLElement | null>(null)
function onCursorMove(e: PointerEvent) {
  if (!cursorGlow.value || e.pointerType === 'touch') return
  cursorGlow.value.style.left = `${e.clientX}px`
  cursorGlow.value.style.top = `${e.clientY}px`
}

let gsapCtx: { revert?: () => void } | null = null
function initPremiumMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // Fallback reveal via IntersectionObserver (funciona sem GSAP)
  const els = document.querySelectorAll('.reveal')
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in')
        io.unobserve(en.target)
      }
    })
  }, { threshold: 0.12 })
  els.forEach((el) => io.observe(el))

  if (reduced) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'))
    return
  }
  try {
    gsap.registerPlugin(ScrollTrigger)
    gsapCtx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.gs-reveal').forEach((el) => {
        gsap.fromTo(el, { y: 36, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const target = Number(el.dataset.count || '0')
        const obj = { v: 0 }
        ScrollTrigger.create({
          trigger: el, start: 'top 90%', once: true,
          onEnter: () => gsap.to(obj, {
            v: target, duration: 1.6, ease: 'power2.out',
            onUpdate: () => { el.textContent = `${Math.round(obj.v)}${el.dataset.suffix || ''}` },
          }),
        })
      })
    })
  } catch { /* GSAP opcional */ }
}
const requests = ref<ServiceRequest[]>([])
const myRequests = computed(() =>
  authUser.value
    ? requests.value.filter((r) => r.client_id === authUser.value?.id)
    : []
)
// Filtro de acompanhamento do cliente: pendentes / em andamento / concluídas
const clientStatusFilter = ref<'todas' | 'pendentes' | 'andamento' | 'concluidas'>('todas')
function clientStatusGroup(status: ServiceRequest['status']): 'pendentes' | 'andamento' | 'concluidas' {
  if (status === 'Pendente') return 'pendentes'
  if (status === 'Concluído' || status === 'Cancelado') return 'concluidas'
  return 'andamento'
}
const filteredClientRequests = computed(() =>
  clientStatusFilter.value === 'todas'
    ? myRequests.value
    : myRequests.value.filter((r) => clientStatusGroup(r.status) === clientStatusFilter.value)
)
// Histórico (armazenados): finalizados de cada lado
const historicClientRequests = computed(() =>
  myRequests.value.filter((r) => r.status === 'Concluído' || r.status === 'Cancelado')
)
const historicProRequests = computed(() =>
  proProfile.value.id
    ? requests.value.filter((r) =>
        r.professional_id === proProfile.value.id &&
        (r.status === 'Concluído' || r.status === 'Cancelado')
      )
    : []
)
function formatRequestDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
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
  coverage_bairros: [],
  cidade: '',
  uf: '',
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
const photoFile = ref<File | null>(null)
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
const showOnboardingPlans = ref<boolean>(false)

const isEditingProfile = ref<boolean>(false)
const isRegistering = ref<boolean>(false)
const showProfileModal = ref<boolean>(false)

const authUser = ref<{ id: string; email: string; name?: string | null } | null>(null)
const userProfile = ref<UserProfile | null>(null)
const authLoading = ref(false)
const authError = ref('')
const showAuth = ref(false)
const authView = ref<'login' | 'register'>('login')
const authRole = ref<'client' | 'pro'>('client')

const loginEmail = ref('')
const loginPassword = ref('')

const registerForm = ref({
  name: '',
  email: '',
  password: '',
  birth_date: '',
  address: '',
  bairro: '',
  cidade: '',
  uf: '',
  category: '',
})

async function hydrateAuth() {
  try {
    const user = await getCurrentAuthUser()
    if (!user) return
    authUser.value = user
    try {
      userProfile.value = await getUserByAuthId(user.id)
    } catch {
      userProfile.value = null
    }
    if (userProfile.value?.role === 'pro') {
      await loadProfessionalProfile(user.id)
    }
  } catch {
    authUser.value = null
  }
}

function goToModule(role: 'client' | 'pro', view: 'login' | 'register' = 'login') {
  if (authUser.value && userProfile.value?.role === role) {
    activeTab.value = role === 'client' ? 'solicitar' : 'pedidos_pro'
    return
  }
  authRole.value = role
  authView.value = view
  authError.value = ''
  showAuth.value = true
}

async function loadProfessionalProfile(authId: string) {
  try {
    const pro = await getProfessionalByAuthId(authId)
    if (pro) proProfile.value = pro
  } catch {
    // profile missing is handled by the UI
  }
}

async function handleLogin() {
  authError.value = ''
  authLoading.value = true
  try {
    const user = await signInAuth(loginEmail.value.trim(), loginPassword.value)
    authUser.value = user
    try {
      userProfile.value = await getUserByAuthId(user.id)
    } catch {
      userProfile.value = null
    }
    if (userProfile.value?.role === 'pro') {
      await loadProfessionalProfile(user.id)
    }
    activeTab.value = userProfile.value
      ? (userProfile.value.role === 'pro' ? 'pedidos_pro' : 'solicitar')
      : 'boas_vindas'
    showAuth.value = false
    loginEmail.value = ''
    loginPassword.value = ''
  } catch (err) {
    authError.value = err instanceof Error ? err.message : 'Falha ao entrar. Verifique e-mail e senha.'
  } finally {
    authLoading.value = false
  }
}

async function handleRegister() {
  authError.value = ''
  if (registerForm.value.password.length < 6) {
    authError.value = 'A senha deve ter pelo menos 6 caracteres.'
    return
  }
  authLoading.value = true
  try {
    const { user, requireEmailVerification } = await signUpAuth(
      registerForm.value.email.trim(),
      registerForm.value.password,
      registerForm.value.name.trim()
    )
    if (!user) {
      authError.value = requireEmailVerification
        ? 'Conta criada! Verifique seu e-mail para ativar o acesso.'
        : 'Não foi possível criar a conta.'
      return
    }
    authUser.value = user
    const record = await createUserRecord({
      auth_id: user.id,
      role: authRole.value,
      name: registerForm.value.name.trim(),
      email: registerForm.value.email.trim(),
      birth_date: registerForm.value.birth_date,
      address: registerForm.value.address,
      bairro: registerForm.value.bairro,
      cidade: registerForm.value.cidade,
      uf: registerForm.value.uf,
      category: authRole.value === 'pro' ? registerForm.value.category : '',
    })
    userProfile.value = record
    if (authRole.value === 'pro') {
      const pro = await createProfessional({
        auth_id: user.id,
        name: registerForm.value.name.trim(),
        category: registerForm.value.category,
        email: registerForm.value.email.trim(),
        phone: '',
        rating: 0,
        reviews_count: 0,
        avatar: '',
        pix_key: '',
        bio: '',
        coverage_bairros: [],
        cidade: '',
        uf: '',
        plan: 'gratuito',
        plan_status: 'active',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        plan_expires_at: null,
        requests_this_month: 0,
        requests_reset_at: null,
      })
      proProfile.value = pro
      showOnboardingPlans.value = true
    }
    activeTab.value = authRole.value === 'pro' ? 'pedidos_pro' : 'solicitar'
    showAuth.value = false
    registerForm.value = { name: '', email: '', password: '', birth_date: '', address: '', bairro: '', cidade: '', uf: '', category: '' }
    authRole.value = 'client'
    authView.value = 'login'
  } catch (err) {
    authError.value = err instanceof Error ? err.message : 'Falha ao criar a conta.'
  } finally {
    authLoading.value = false
  }
}

async function handleLogout() {
  try {
    await signOutAuth()
  } catch {
    // ignore sign-out errors
  }
  authUser.value = null
  userProfile.value = null
  proProfile.value = {
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
    coverage_bairros: [],
    cidade: '',
    uf: '',
    plan: 'gratuito',
    plan_status: 'active',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    plan_expires_at: null,
    requests_this_month: 0,
    requests_reset_at: null,
  }
  resetDirectoryFilters()
  directoryPage.value = 1
  activeTab.value = 'boas_vindas'
}

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

const selectedProfessional = ref<Professional | null>(null)
// Profissionais elegíveis à escolha direta na categoria atual do formulário
const directCandidates = computed(() => {
  const list = visibleProfessionals.value.filter(p =>
    !selectedCategory.value || p.category === selectedCategory.value
  )
  return list.length > 0 ? list : visibleProfessionals.value
})
const sendMode = ref<SendMode | null>(null)
const formError = ref<string>('')
const prataBronzeCount = computed(() =>
  visibleProfessionals.value.filter(p => {
    const rank = planMap.value.get(p.plan)?.rank
    return rank === 2 || rank === 3
  }).length
)

function handleLandingCategory(categoryName: string) {
  trackCta('categoria_' + categoryName)
  filterCategory.value = categoryName
  selectedCategory.value = CATEGORIES.some(c => c.name === categoryName) ? categoryName : selectedCategory.value
  directoryPage.value = 1
  if (activeTab.value !== 'profissionais') openProfessionalsPage()
}

function handleChooseProfessional(pro: Professional) {
  trackCta('escolher_profissional_' + pro.id)
  selectedProfessional.value = pro
  if (pro.category) {
    selectedCategory.value = pro.category
    filterCategory.value = pro.category
  }
  sendMode.value = 'direct'
  formError.value = ''
  // Visitante: pede login/cadastro mas preserva a escolha; logado: vai ao formulário
  if (!authUser.value) {
    authRole.value = 'client'
    authView.value = 'register'
    authError.value = ''
    showAuth.value = true
    return
  }
  activeTab.value = 'solicitar'
  nextTick(() => {
    document.getElementById('solicitar-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function clearProfessionalSelection() {
  selectedProfessional.value = null
  if (sendMode.value === 'direct') sendMode.value = null
}

const filterCategory = ref<string>('Todas')
const filterPlan = ref<string>('Todos')
const filterUf = ref<string>('Todas')
const filterCidade = ref<string>('Todas')
const filterBairro = ref<string>('Todos')
const directoryPage = ref<number>(1)
const CARDS_PER_PAGE = 12

const normalizeFilter = (value: string) => value.trim().toLowerCase()

function resetDirectoryFilters() {
  filterCategory.value = 'Todas'
  filterPlan.value = 'Todos'
  filterUf.value = 'Todas'
  filterCidade.value = 'Todas'
  filterBairro.value = 'Todos'
}

const availableCategories = computed(() => {
  const cats = new Set(professionals.value.map(p => p.category).filter(Boolean))
  return ['Todas', ...Array.from(cats).sort()]
})

const availableUfs = computed(() => {
  const ufs = new Set(professionals.value.map(p => (p.uf || '').trim().toUpperCase()).filter(Boolean))
  return ['Todas', ...Array.from(ufs).sort()]
})

const availableCidades = computed(() => {
  const cidades = new Set(professionals.value.map(p => (p.cidade || '').trim()).filter(Boolean))
  return ['Todas', ...Array.from(cidades).sort((a, b) => a.localeCompare(b, 'pt-BR'))]
})

const availableBairros = computed(() => {
  const bairros = new Set(
    professionals.value.flatMap(p => (p.coverage_bairros ?? []).map(b => b.trim()).filter(Boolean)),
  )
  return ['Todos', ...Array.from(bairros).sort((a, b) => a.localeCompare(b, 'pt-BR'))]
})

const filteredProfessionals = computed(() => {
  let list = visibleProfessionals.value
  if (filterCategory.value !== 'Todas') {
    list = list.filter(p => p.category === filterCategory.value)
  }
  if (filterPlan.value !== 'Todos') {
    list = list.filter(p => p.plan === filterPlan.value)
  }
  if (filterUf.value !== 'Todas') {
    list = list.filter(p => (p.uf || '').trim().toUpperCase() === filterUf.value)
  }
  if (filterCidade.value !== 'Todas') {
    list = list.filter(p => normalizeFilter(p.cidade || '') === normalizeFilter(filterCidade.value))
  }
  if (filterBairro.value !== 'Todos') {
    const target = normalizeFilter(filterBairro.value)
    list = list.filter(p => {
      const coverage = (p.coverage_bairros ?? []).map(b => b.trim()).filter(Boolean)
      // Sem bairro declarado o prestador atende toda a região
      if (coverage.length === 0) return true
      return coverage.some(b => normalizeFilter(b) === target)
    })
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProfessionals.value.length / CARDS_PER_PAGE)))

const paginatedProfessionals = computed(() => {
  const start = (directoryPage.value - 1) * CARDS_PER_PAGE
  return filteredProfessionals.value.slice(start, start + CARDS_PER_PAGE)
})

watch([filterCategory, filterPlan, filterUf, filterCidade, filterBairro], () => {
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

function handleHeaderProfileClick() {
  if (userMode.value === 'client') {
    showProfileModal.value = true
    return
  }
  if (userMode.value === 'pro') {
    if (proProfile.value.id) {
      showProfileModal.value = true
    } else {
      activeTab.value = 'perfil_pro'
    }
  }
}

function handleProfileModalSaved(payload: Professional | UserProfile) {
  if (userMode.value === 'pro') {
    proProfile.value = { ...proProfile.value, ...(payload as Professional) }
  } else if (payload) {
    userProfile.value = payload as UserProfile
  }
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
    const ownerId = authUser.value?.id
    let avatarUrl = proProfile.value.avatar
    if (avatarFile.value) {
      if (!ownerId) {
        alert('Faça login novamente para enviar a foto do perfil.')
        return
      }
      avatarUrl = await uploadProfessionalAvatar(avatarFile.value, ownerId)
    }

    const payload = {
      name: editProName.value,
      category: editProCategory.value,
      phone: editProPhone.value,
      email: editProEmail.value,
      pix_key: editProPix.value,
      bio: editProBio.value,
      coverage_bairros: proProfile.value.coverage_bairros ?? [],
      cidade: proProfile.value.cidade ?? '',
      uf: proProfile.value.uf ?? '',
      avatar: avatarUrl,
    }

    if (proProfile.value.id) {
      await updateProfessional(proProfile.value.id, payload)
      proProfile.value = { ...proProfile.value, ...payload }
    } else {
      if (!ownerId) {
        alert('Faça login novamente para salvar o perfil.')
        return
      }
      const created = await createProfessional({ ...payload, auth_id: ownerId })
      proProfile.value = created
    }
    isEditingProfile.value = false
    isRegistering.value = false
    avatarFile.value = null
    avatarPreview.value = null
  } catch (err) {
    console.error('Erro ao salvar perfil:', err)
    alert('Não foi possível salvar o perfil. Tente novamente.')
  }
}

async function handleConfirmOrder() {
  if (!latestAiResult.value || !sendMode.value) return
  formError.value = ''

  // Login no fim: visitante escolhe antes, autentica ao confirmar
  if (!authUser.value) {
    authRole.value = 'client'
    authView.value = 'register'
    authError.value = ''
    showAuth.value = true
    return
  }

  const errors = validateQuoteForm({
    clientName: clientName.value,
    clientPhone: clientPhone.value,
    clientAddress: clientAddress.value,
  })
  if (Object.keys(errors).length > 0) {
    formError.value = errors.clientName || errors.clientPhone || errors.clientAddress || 'Verifique os dados.'
    return
  }

  if (sendMode.value === 'direct' && !selectedProfessional.value) {
    formError.value = 'Escolha um profissional para envio direto.'
    return
  }

  let photoUrl = imagePreview.value || ''
  if (photoFile.value) {
    try {
      photoUrl = await uploadServicePhoto(photoFile.value, authUser.value.id)
    } catch (err) {
      console.error('Erro ao enviar foto:', err)
    }
  }

  const payload = buildQuotePayload({
    clientId: authUser.value?.id ?? null,
    form: { clientName: clientName.value, clientPhone: clientPhone.value, clientAddress: clientAddress.value },
    category: selectedCategory.value,
    photoUrl,
    notes: notes.value || '',
    aiAnalysis: latestAiResult.value,
    finalPrice: latestAiResult.value.suggestedMinPrice || null,
    sendMode: sendMode.value,
    professionalId: selectedProfessional.value?.id ?? null,
  })
  const newOrder = payload as unknown as Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>

  try {
    const created = await createServiceRequest(newOrder)
    requests.value = [created, ...requests.value]

    if (sendMode.value === 'direct' && selectedProfessional.value?.phone) {
      const pro = selectedProfessional.value
      const msg = `Olá ${pro.name}! Vi seu perfil na Casa Obra e Reparos.\n\nPreciso de um serviço de *${selectedCategory.value}*.\n${latestAiResult.value!.description}\n\nPode me enviar uma proposta?`
      const cleanPhone = pro.phone.replace(/\D/g, '')
      const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    resetForm()
    activeTab.value = 'meus_pedidos'
  } catch (err) {
    console.error('Erro ao criar pedido:', err)
    formError.value = `Não foi possível enviar o pedido. ${err instanceof Error ? err.message : 'Erro de conexão com o servidor.'}`
  }
}

function resetForm() {
  latestAiResult.value = null
  aiReadyToast.value = false
  selectedProfessional.value = null
  sendMode.value = null
  formError.value = ''
  imagePreview.value = null
  photoFile.value = null
  notes.value = ''
  clientName.value = ''
  clientPhone.value = ''
  clientAddress.value = ''
  selectedCategory.value = 'Eletricista'
}

async function handleSaveSchedule() {
  if (!scheduleModal.value) return

  try {
    // Ao assumir (agendar) um broadcast sem dono, o pedido passa a ser deste profissional
    const assumeOwner = !scheduleModal.value.professional_id && proProfile.value.id
      ? { professional_id: proProfile.value.id }
      : {}
    await updateServiceRequest(scheduleModal.value.id, {
      status: 'Visita Agendada',
      ...assumeOwner,
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
    alert('Não foi possível agendar a visita. Tente novamente.')
  }
}

async function handleUpdateStatus(orderId: string, newStatus: ServiceRequest['status']) {
  try {
    const req = requests.value.find((r) => r.id === orderId)
    if (!req) return

    // Garante dono ao avançar um broadcast sem dono (histórico do pro depende disso)
    const assumeOwner = !req.professional_id && proProfile.value.id
      ? { professional_id: proProfile.value.id }
      : {}
    await updateServiceRequest(orderId, {
      status: newStatus,
      ...assumeOwner,
      receipt_issued: newStatus === 'Concluído' ? true : req.receipt_issued,
    })
    await loadData()
  } catch (err) {
    console.error('Erro ao atualizar status:', err)
    alert('Não foi possível atualizar o status do pedido. Tente novamente.')
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
    alert('Não foi possível salvar a avaliação. Tente novamente.')
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
    photoFile.value = file
    const reader = new FileReader()
    reader.onloadend = () => {
      imagePreview.value = reader.result as string
    }
    reader.readAsDataURL(file)
  }
}

const aiReadyToast = ref(false)

async function handleAnalyzeWithAI() {
  if (!imagePreview.value) {
    alert('Por favor, tire ou selecione uma foto antes de solicitar a análise da IA.')
    return
  }

  isAnalyzing.value = true
  latestAiResult.value = null
  aiReadyToast.value = false

  try {
    const res = await analyzeWithAI(
      imagePreview.value.startsWith('data:') ? imagePreview.value : undefined,
      selectedCategory.value,
      notes.value
    )
    latestAiResult.value = res.analysis
    // Sem polling: a IA real não cabe nos 30s do proxy de forma confiável;
    // quando ela responder a tempo (status ready) o resultado já vem completo.
      aiReadyToast.value = res.status === 'ready' && (res.analysis.suggestedMinPrice > 0 || res.analysis.suggestedMaxPrice > 0)
    if (aiReadyToast.value) setTimeout(() => { aiReadyToast.value = false }, 6000)
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

const currentPlanRow = computed(() => planMap.value.get(proProfile.value.plan) ?? null)

const planFeatures = computed(() => {
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

const canReceiveRequests = computed(() => currentPlanRow.value?.receives_broadcasts ?? proProfile.value.plan !== 'gratuito')

const proRequests = computed(() => {
  if (!canReceiveRequests.value) return []
  const category = proProfile.value.category?.toLowerCase()
  return requests.value.filter((r) =>
    r.status !== 'Concluído' &&
    (r.broadcast || r.professional_id === proProfile.value.id) &&
    (!category || r.category?.toLowerCase() === category)
  )
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
  const current = proProfile.value.plan
  const order: Record<string, number> = { gratuito: 0, bronze: 1, prata: 2, ouro: 3 }
  const next = displayPlans.value.find((p) => order[p.id] === order[current] + 1)
  if (!next) return null
  return { plan: next.id, label: next.name, price: next.price, features: next.features }
})

onMounted(() => {
  loadData()
  hydrateAuth()
  syncTabFromRoute()
  trackEvent('page_view_landing', { path: window.location.pathname })
  window.addEventListener('pointermove', onCursorMove, { passive: true })
  window.addEventListener('scroll', onPageScroll, { passive: true })
  window.addEventListener('popstate', onRoutePopstate)
  onPageScroll()
  nextTick(() => initPremiumMotion())
  // Re-inicializa reveals quando a landing entra em cena
  watch(isLanding, (v) => {
    if (v) nextTick(() => { initPremiumMotion(); onPageScroll() })
  })
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onCursorMove)
  window.removeEventListener('scroll', onPageScroll)
  window.removeEventListener('popstate', onRoutePopstate)
  try { gsapCtx?.revert?.() } catch { /* noop */ }
})
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
    <div ref="cursorGlow" id="cursor-glow" aria-hidden="true"></div>
    <!-- HEADER TESLA: flutuante transparente sobre hero -->
    <header :class="[isLanding && !isScrolled ? 'bg-transparent border-transparent' : 'bg-slate-950/85 backdrop-blur-md border-slate-800/80 shadow-lg shadow-black/20', 'fixed top-0 inset-x-0 z-40 border-b transition-all duration-300']">
      <div class="max-w-[1383px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
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

        <!-- NAV TESLA (desktop, 5 seções) -->
        <nav v-if="isLanding || activeTab === 'profissionais'" class="hidden md:flex items-center gap-1">
          <button v-for="s in teslaSections" :key="s.id" @click="scrollToId(s.id)" :class="['px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300', activeSection === s.id ? 'text-white bg-white/10' : 'text-slate-200/90 hover:text-white hover:bg-white/10']">
            {{ s.label }}
          </button>
          <button @click="openProfessionalsPage" :class="['px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-300', activeTab === 'profissionais' ? 'text-white bg-white/10' : 'text-slate-200/90 hover:text-white hover:bg-white/10']">
            Profissionais
          </button>
        </nav>

        <div class="flex items-center gap-2">
          <!-- AUTH (login/logout) -->
          <template v-if="authUser">
            <button
              @click="goToModule(userProfile?.role === 'pro' ? 'pro' : 'client')"
              class="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all items-center gap-1.5"
              title="Meu Painel"
            >
              <LayoutDashboard class="w-3.5 h-3.5" />
              Meu Painel
            </button>
            <button
              type="button"
              class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 cursor-pointer hover:border-amber-500/50 hover:bg-slate-800 transition-all text-left"
              title="Editar meus dados"
              @click="handleHeaderProfileClick"
            >
              <div class="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shrink-0">
                <User class="w-3.5 h-3.5 text-slate-950" />
              </div>
              <span class="text-xs font-bold text-white max-w-[120px] truncate">{{ (userMode === 'pro' ? proProfile.name : userProfile?.name) || authUser.name || authUser.email }}</span>
            </button>
            <button
              @click="handleLogout"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-700 text-slate-300 hover:border-red-500/50 hover:text-red-400 transition-all flex items-center gap-1.5"
              title="Sair"
            >
              <LogOut class="w-3.5 h-3.5" />
              <span class="hidden sm:inline">Sair</span>
            </button>
          </template>
          <button
            v-else
            @click="trackEvent('login_start', {}); showAuth = true; authView = 'login'"
            class="btn-shine px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-xs hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogIn class="w-4 h-4" />
            Entrar
          </button>

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
            v-if="authUser"
            @click="goToModule(userProfile?.role === 'pro' ? 'pro' : 'client'); isMobileMenuOpen = false"
            class="w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-amber-500/15 text-amber-300 border border-amber-500/40"
          >
            <LayoutDashboard class="w-4 h-4" />
            Meu Painel
          </button>
          <template v-if="isLanding || activeTab === 'profissionais'">
            <button v-for="s in teslaSections" :key="'m-'+s.id" @click="scrollToId(s.id); isMobileMenuOpen = false" class="w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2 text-slate-200 hover:text-white hover:bg-white/10">
              {{ s.label }}
            </button>
            <button @click="openProfessionalsPage(); isMobileMenuOpen = false" :class="['w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-2', activeTab === 'profissionais' ? 'text-white bg-white/10' : 'text-slate-200 hover:text-white hover:bg-white/10']">
              Profissionais
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- AUTH MODAL (LOGIN / REGISTER) -->
    <div v-if="showAuth" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="showAuth = false"></div>
      <div class="relative min-h-full flex items-center justify-center p-4">
        <div class="w-full max-w-lg bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          <div class="relative bg-slate-950 p-6 border-b border-slate-800 overflow-hidden">
            <div class="absolute -top-20 -right-16 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
            <div class="relative flex items-center justify-between">
              <div class="flex items-center gap-2">
                <img :src="logoUrl" alt="Casa Obras e Reparos" class="w-9 h-9 rounded-xl object-cover" />
                <h2 class="font-black text-white text-lg tracking-tight">
                  {{ authView === 'login' ? 'Entrar' : 'Criar Conta' }}
                  <span class="block text-[11px] font-medium text-slate-400">Casa Obras e Reparos</span>
                </h2>
              </div>
              <button @click="showAuth = false" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all">
                <X class="w-5 h-5" />
              </button>
            </div>
          </div>

          <div class="p-6 space-y-5">
            <!-- VIEW SWITCH -->
            <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex">
              <button
                @click="authView = 'login'; authError = ''"
                :class="[
                  'flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  authView === 'login' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
                ]"
              >
                <LogIn class="w-3.5 h-3.5 inline mr-1" /> Entrar
              </button>
              <button
                @click="authView = 'register'; authError = ''"
                :class="[
                  'flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all',
                  authView === 'register' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
                ]"
              >
                <User class="w-3.5 h-3.5 inline mr-1" /> Cadastrar
              </button>
            </div>

            <!-- LOGIN FORM -->
            <form v-if="authView === 'login'" @submit.prevent="handleLogin" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail *</label>
                <input
                  v-model="loginEmail"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Senha *</label>
                <input
                  v-model="loginPassword"
                  type="password"
                  required
                  placeholder="Sua senha"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                />
              </div>

              <div v-if="authError" class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <X class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p class="text-xs text-red-300">{{ authError }}</p>
              </div>

              <button
                type="submit"
                :disabled="authLoading"
                class="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                <LogIn class="w-4 h-4" />
                {{ authLoading ? 'Entrando...' : 'Entrar' }}
              </button>

              <p class="text-center text-xs text-slate-400">
                Ainda não tem conta?
                <button type="button" @click="authView = 'register'; authError = ''" class="text-amber-400 font-bold hover:underline">Cadastre-se</button>
              </p>
            </form>

            <!-- REGISTER FORM -->
            <form v-else @submit.prevent="handleRegister" class="space-y-4">
              <!-- ROLE TOGGLE -->
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Eu sou...</label>
                <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                  <button
                    type="button"
                    @click="authRole = 'client'"
                    :class="[
                      'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                      authRole === 'client' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'
                    ]"
                  >
                    <User class="w-3.5 h-3.5" /> Cliente
                  </button>
                  <button
                    type="button"
                    @click="authRole = 'pro'"
                    :class="[
                      'flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                      authRole === 'pro' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'text-slate-400 hover:text-white'
                    ]"
                  >
                    <Wrench class="w-3.5 h-3.5" /> Profissional
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1.5">Nome completo *</label>
                  <input
                    v-model="registerForm.name"
                    type="text"
                    required
                    placeholder="Seu nome"
                    class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1.5">Data de nascimento</label>
                  <input
                    v-model="registerForm.birth_date"
                    type="date"
                    class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail *</label>
                <input
                  v-model="registerForm.email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Senha * <span class="text-slate-500 font-normal">(mínimo 6 caracteres)</span></label>
                <input
                  v-model="registerForm.password"
                  type="password"
                  required
                  placeholder="Crie uma senha"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                />
              </div>

              <div v-if="authRole === 'pro'">
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Categoria *</label>
                <select
                  v-model="registerForm.category"
                  required
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                >
                  <option value="">Selecione a categoria...</option>
                  <option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
                </select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1.5">Endereço</label>
                  <input
                    v-model="registerForm.address"
                    type="text"
                    placeholder="Rua, número"
                    class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1.5">Bairro</label>
                  <input
                    v-model="registerForm.bairro"
                    type="text"
                    placeholder="Seu bairro"
                    class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                  />
                </div>
              </div>

              <div class="grid grid-cols-3 gap-4">
                <div class="col-span-2">
                  <label class="block text-xs font-bold text-slate-300 mb-1.5">Cidade</label>
                  <input
                    v-model="registerForm.cidade"
                    type="text"
                    placeholder="Sua cidade"
                    class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-300 mb-1.5">UF</label>
                  <input
                    v-model="registerForm.uf"
                    type="text"
                    maxlength="2"
                    placeholder="UF"
                    class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all uppercase"
                  />
                </div>
              </div>

              <div v-if="authError" class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                <X class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p class="text-xs text-red-300">{{ authError }}</p>
              </div>

              <button
                type="submit"
                :disabled="authLoading"
                class="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                <User class="w-4 h-4" />
                {{ authLoading ? 'Criando conta...' : 'Criar Conta' }}
              </button>

              <p class="text-center text-xs text-slate-400">
                Já tem conta?
                <button type="button" @click="authView = 'login'; authError = ''" class="text-amber-400 font-bold hover:underline">Entrar</button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN CONTENT AREA -->
    <main :class="[isLanding ? 'flex-1 w-full' : 'flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6']">
      <!-- LANDING TESLA STACK -->
      <div v-if="isLanding" class="tesla-stack">
        <!-- 1/5 HERO TESLA fullscreen -->
        <section id="inicio" class="tesla-section tesla-section-hero">
          <div class="tesla-media tesla-media-hero">
            <video v-if="heroVideoUrl" :src="heroVideoUrl" autoplay muted loop playsinline :poster="lojaUrl" class="opacity-70" />
            <img v-else :src="lojaUrl" alt="Fachada Casa Obras e Reparos" class="opacity-65" />
          </div>
          <div class="tesla-media tesla-media-obra" aria-hidden="true"><img src="/obrasereparo.png" alt="" loading="eager" /></div>
          <div class="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
          <div class="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] bg-orange-600/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style="animation-delay: 1.5s" />

          <div class="relative z-10 w-full max-w-[1383px] mx-auto px-6 pt-24 pb-20 flex flex-col items-start text-left">
            <p class="tesla-title text-white text-[32px] sm:text-[32px] leading-tight max-w-xl">Sua casa resolvida com 1 foto + IA</p>
            <p class="mt-3 text-[14px] text-slate-200/90 max-w-xl">Orçamento instantâneo, profissionais verificados, WhatsApp direto e recibo digital.</p>
            <div class="mt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:min-w-[520px] justify-start">
              <button @click="trackCta('hero_cliente'); goToModule('client', 'register')" class="tesla-cta-primary flex-1 px-8 py-2.5 rounded-full text-[14px] font-medium">Criar Orçamento com IA</button>
              <button @click="trackCta('hero_pro'); goToModule('pro', 'register')" class="tesla-cta-secondary flex-1 px-8 py-2.5 rounded-full text-[14px] font-medium">Sou Profissional</button>
            </div>
            <p class="mt-4 text-[14px] text-slate-300/60">• Resposta em ~24h • 100% digital • 4.9★</p>
          </div>
        </section>

        <!-- FAIXA LOGOS abaixo do hero -->
        <div class="w-full bg-slate-950 py-10 sm:py-14">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 gs-reveal space-y-4">
            <p class="text-center text-[11px] font-bold tracking-[0.25em] text-slate-500 uppercase">Profissionais e parceiros em movimento</p>
            <div class="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 py-4">
              <div class="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
              <div class="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
              <div class="flex animate-marquee gap-4 px-4" style="width: max-content;">
                <span v-for="(logo, i) in [...partnerLogos, ...partnerLogos]" :key="'logo-'+i" class="glass flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-slate-200 whitespace-nowrap">
                  <span class="w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300"></span>{{ logo }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2/5 ELÉTRICA & HIDRÁULICA split -->
        <section id="servicos-eletrica" class="w-full max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div class="tesla-card-split gs-reveal grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
            <div class="p-6 sm:p-10 flex flex-col justify-center text-left">
              <span class="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold"><Zap class="w-4 h-4" /> Elétrica & Hidráulica</span>
              <p class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-4">Eletricista e encanador verificados</p>
              <p class="mt-3 text-[14px] text-slate-300 max-w-md">Foto do problema → IA estima valor → profissional da sua região com recibo digital.</p>
              <div class="mt-6 flex flex-col sm:flex-row gap-3">
                <button @click="trackCta('eletrica_orcamento'); goToModule('client', 'register')" class="tesla-cta-primary px-8 py-2.5 rounded-full text-[14px] font-medium">Pedir Orçamento</button>
                <button @click="scrollToId('como-funciona')" class="tesla-cta-secondary px-8 py-2.5 rounded-full text-[14px] font-medium">Como Funciona</button>
              </div>
            </div>
            <div class="relative min-h-[240px] lg:min-h-[320px] bg-slate-950">
              <img src="https://images.pexels.com/photos/257736/pexels-photo-257736.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Serviço de elétrica" loading="lazy" class="absolute inset-0 w-full h-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/20 to-transparent"></div>
              <div class="absolute bottom-4 left-4 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/85 border border-amber-500/30"><Zap class="w-4 h-4 text-amber-300" /><span class="text-[11px] font-bold text-white">Resposta em ~24h</span></div>
            </div>
          </div>
        </section>

        <!-- 3/5 PINTURA & REFORMAS split -->
        <section id="servicos-reforma" class="w-full max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div class="tesla-card-split gs-reveal grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70">
            <div class="relative min-h-[240px] lg:min-h-[320px] bg-slate-950 order-2 lg:order-1">
              <img src="https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1200" alt="Pintura e reformas" loading="lazy" class="absolute inset-0 w-full h-full object-cover" />
              <div class="absolute inset-0 bg-gradient-to-l from-slate-900 via-slate-900/20 to-transparent"></div>
              <div class="absolute bottom-4 left-4 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/85 border border-amber-500/30"><Sparkles class="w-4 h-4 text-amber-300" /><span class="text-[11px] font-bold text-white">Avaliação 4.9★</span></div>
            </div>
            <div class="p-6 sm:p-10 flex flex-col justify-center text-left order-1 lg:order-2">
              <span class="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold"><Sparkles class="w-4 h-4" /> Pintura & Reformas</span>
              <p class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-4">Pintores, pedreiros e marceneiros</p>
              <p class="mt-3 text-[14px] text-slate-300 max-w-md">Avaliação real, orçamento por IA e recibo digital incluído do início ao fim.</p>
              <div class="mt-6 flex flex-col sm:flex-row gap-3">
                <button @click="trackCta('reforma_orcamento'); goToModule('client', 'register')" class="tesla-cta-primary px-8 py-2.5 rounded-full text-[14px] font-medium">Pedir Orçamento</button>
                <button @click="scrollToId('categorias')" class="tesla-cta-secondary px-8 py-2.5 rounded-full text-[14px] font-medium">Ver Serviços</button>
              </div>
            </div>
          </div>
        </section>

        <!-- resto compacto -->
        <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-12">

        <!-- HOW IT WORKS DUAL WORKFLOW -->
        <div class="space-y-6">
          <h3 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Smartphone class="w-5 h-5 text-amber-400" />
            Como Funciona a Dinâmica no Sistema
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- WORKFLOW CLIENT -->
            <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 space-y-5 relative overflow-hidden backdrop-blur-sm hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 group">
              <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div class="relative z-10 space-y-4">
                <div class="flex items-center gap-3 text-amber-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <User class="w-4 h-4" />
                  </div>
                  Jornada para o Cliente
                </div>

                <ul class="space-y-0">
                  <li v-for="(step, idx) in [
                    { t: 'Envio da Foto do Problema:', d: 'Selecione ou tire uma foto de tomadas, vazamentos, eletrodomésticos ou pinturas diretamente do celular.' },
                    { t: 'Análise Instantânea com IA:', d: 'O sistema gera diagnóstico, tempo estimado, materiais e faixa de custo sugerida em Reais (R$).' },
                    { t: 'Atendimento & WhatsApp:', d: 'Agende visita ou receba o valor do serviço com notificações e botão direto para o WhatsApp do profissional.' },
                    { t: 'Recibo Digital e Avaliação:', d: 'Acesse recibos digitais em PDF após o término e avalie a qualidade do serviço do profissional.' },
                  ]" :key="'cli-'+idx" class="relative flex items-start gap-3 pb-4 group/step animate-in fade-in slide-in-from-bottom-2 duration-500" :style="{ animationDelay: (idx*120)+'ms' }">
                    <div class="flex flex-col items-center shrink-0">
                      <span class="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center text-[10px] shadow-lg shadow-amber-500/20 group-hover/step:scale-110 transition-transform z-10">{{ idx + 1 }}</span>
                      <span v-if="idx < 3" class="flex-1 w-px bg-gradient-to-b from-amber-500/50 to-slate-700 my-1 min-h-5" />
                    </div>
                    <div>
                      <strong class="text-white block text-xs sm:text-sm">{{ step.t }}</strong>
                      <p class="text-xs text-slate-400 leading-relaxed mt-0.5">{{ step.d }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <!-- WORKFLOW PRO -->
            <div class="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 space-y-5 relative overflow-hidden backdrop-blur-sm hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-300 group">
              <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -z-0 pointer-events-none" />
              <div class="relative z-10 space-y-4">
                <div class="flex items-center gap-3 text-amber-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-yellow-400/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wrench class="w-4 h-4" />
                  </div>
                  Jornada para o Prestador de Serviços
                </div>

                <ul class="space-y-0">
                  <li v-for="(step, idx) in [
                    { t: 'Painel de Atendimentos em Tempo Real:', d: 'Visualize chamados pendentes com foto, diagnóstico da IA e endereço do cliente.' },
                    { t: 'Agende Visita ou Envie Valor Direto:', d: 'Defina data, horário e valor acordado com lembrete e mensagem formatada para o WhatsApp do cliente.' },
                    { t: 'Emissão de Recibo Digital:', d: 'Gere comprovantes impressos ou em PDF com dados do serviço e sua chave PIX.' },
                    { t: 'Relatórios de Faturamento Mensal:', d: 'Acompanhe receita total em gráficos, quantidade de serviços e ticket médio.' },
                  ]" :key="'pro-'+idx" class="relative flex items-start gap-3 pb-4 group/step animate-in fade-in slide-in-from-bottom-2 duration-500" :style="{ animationDelay: (idx*120)+'ms' }">
                    <div class="flex flex-col items-center shrink-0">
                      <span class="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 text-slate-950 font-bold flex items-center justify-center text-[10px] shadow-lg shadow-amber-500/20 group-hover/step:scale-110 transition-transform z-10">{{ idx + 1 }}</span>
                      <span v-if="idx < 3" class="flex-1 w-px bg-gradient-to-b from-amber-500/50 to-slate-700 my-1 min-h-5" />
                    </div>
                    <div>
                      <strong class="text-white block text-xs sm:text-sm">{{ step.t }}</strong>
                      <p class="text-xs text-slate-400 leading-relaxed mt-0.5">{{ step.d }}</p>
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
            <div v-for="(feat, i) in [
              { icon: Bot, t: 'Visão Computacional por IA', d: 'Diagnóstico automático de danos, materiais necessários e precificação orientada ao mercado técnico.' },
              { icon: MessageSquare, t: 'Notificações por WhatsApp', d: 'Envio com 1 clique de lembretes de visitas, atualizações de status e confirmação de valores.' },
              { icon: FileText, t: 'Recibos Digitais Prontos', d: 'Comprovante oficial impresso ou baixável em formato padronizado com chave PIX e itens executados.' },
              { icon: TrendingUp, t: 'Faturamento e Relatórios', d: 'Métricas de faturamento acumulado, comparativos mensais e acompanhamento financeiro para o profissional.' },
              { icon: Star, t: 'Perfil com Avaliações', d: 'Construção de reputação com estrelas e depoimentos reais dos clientes atendidos.' },
              { icon: ShieldCheck, t: 'Design Mobile Responsivo', d: 'Interface intuitiva e rápida para o uso diário em smartphones, tablets e computadores.' },
            ]" :key="'feat-'+i" class="relative group bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">{{ String(i + 1).padStart(2, '0') }}</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/25 to-yellow-400/15 text-amber-400 flex items-center justify-center border border-amber-500/25 group-hover:scale-110 group-hover:rotate-6 group-hover:text-amber-300 transition-all duration-300">
                  <component :is="feat.icon" class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm">{{ feat.t }}</h4>
              <p class="text-xs text-slate-400 leading-relaxed">{{ feat.d }}</p>
            </div>
          </div>
        </div>

        <!-- STATS + SVG ANIMADO -->
        <div id="como-funciona" class="gs-reveal glass rounded-3xl p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center scroll-mt-24">
          <div class="space-y-5">
            <h3 class="text-2xl sm:text-3xl font-black text-white tracking-tight">Do clique ao <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">recibo digital</span></h3>
            <p class="text-sm text-slate-300 leading-relaxed">Foto → IA → WhatsApp → Recibo. Sem intermediário, sem papel, sem espera.</p>
            <div class="grid grid-cols-3 gap-4">
              <div class="text-center"><div class="text-2xl sm:text-3xl font-black text-amber-300" data-count="200" data-suffix="+">0</div><div class="text-[11px] text-slate-400 mt-1">Profissionais</div></div>
              <div class="text-center"><div class="text-2xl sm:text-3xl font-black text-amber-300" data-count="49" data-suffix="">0</div><div class="text-[11px] text-slate-400 mt-1">Nota ×10 (4.9)</div></div>
              <div class="text-center"><div class="text-2xl sm:text-3xl font-black text-amber-300" data-count="24" data-suffix="h">0</div><div class="text-[11px] text-slate-400 mt-1">Resposta média</div></div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button @click="trackCta('stats_cliente'); goToModule('client','register')" class="btn-shine flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black hover:from-amber-400 hover:to-yellow-300 transition-all">Pedir orçamento agora</button>
              <button @click="scrollToId('contato')" class="flex-1 px-5 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-200 hover:border-amber-500/50 hover:text-white transition-all">Falar no WhatsApp</button>
            </div>
          </div>
          <div class="reveal relative rounded-2xl border border-white/10 bg-slate-950/60 p-6 overflow-hidden">
            <svg viewBox="0 0 300 160" class="w-full h-auto" fill="none" aria-hidden="true">
              <path class="svg-draw" d="M10 130 C 70 130, 70 60, 130 60 S 190 60, 190 30 S 250 20, 290 20" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
              <circle cx="10" cy="130" r="6" fill="#f59e0b" /><circle cx="130" cy="60" r="6" fill="#22c55e" /><circle cx="190" cy="30" r="6" fill="#38bdf8" /><circle cx="290" cy="20" r="6" fill="#facc15" />
            </svg>
            <div class="grid grid-cols-4 gap-2 mt-4 text-center text-[10px] font-bold text-slate-300">
              <span>Foto</span><span>IA</span><span>WhatsApp</span><span>Recibo</span>
            </div>
          </div>
        </div>

        <!-- CATEGORIAS GLASSMORPHISM com tilt 3D -->
        <div id="categorias" class="space-y-5 scroll-mt-24">
          <div class="gs-reveal flex items-end justify-between gap-4">
            <div><h3 class="text-xl sm:text-2xl font-extrabold text-white">Serviços em destaque</h3><p class="text-xs text-slate-400 mt-1">Clique numa profissão para ver os profissionais cadastrados</p></div>
            <button @click="handleLandingCategory('Todas')" class="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200">Ver tudo <ArrowRight class="w-4 h-4" /></button>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div v-for="cat in CATEGORIES" :key="'glass-'+cat.name" @mousemove="handleTilt" @mouseleave="resetTilt" class="tilt-3d glass group rounded-2xl overflow-hidden cursor-pointer transition-shadow hover:shadow-amber-500/20 hover:shadow-2xl" @click="handleLandingCategory(cat.name)">
              <div class="relative h-28 sm:h-32 overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br opacity-80" :class="cat.gradient" />
                <img v-if="cat.img" :src="cat.img" :alt="cat.name" loading="lazy" class="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" @error="($event.target as HTMLImageElement).style.display='none'" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" />
              </div>
              <div class="tilt-inner p-3.5 flex items-center gap-2.5">
                <component :is="cat.icon" class="w-5 h-5 text-amber-300 shrink-0" />
                <span class="text-xs font-bold text-white leading-tight">{{ cat.name }}</span>
              </div>
            </div>
          </div>
        </div>

        </div><!-- /resto compacto parte 1 -->

        <!-- 4/5 PROFISSIONAIS split -->
        <section id="profissionais" class="w-full max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div class="tesla-card-split gs-reveal grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900">
            <div class="p-6 sm:p-10 flex flex-col justify-center text-left">
              <span class="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold"><Handshake class="w-4 h-4" /> Para profissionais</span>
              <p class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-4">Receba chamados ainda hoje</p>
              <p class="mt-3 text-[14px] text-slate-300 max-w-md">Broadcast com foto + IA • WhatsApp direto • Recibo digital e relatórios.</p>
              <div class="mt-5 flex flex-wrap gap-2 text-[12px] font-medium">
                <span class="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200">Bronze {{ dbPlanPrice('bronze', 'R$34,90') }}</span>
                <span class="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200">Prata {{ dbPlanPrice('prata', 'R$54,90') }}</span>
                <span class="px-4 py-1.5 rounded-full bg-amber-500 text-slate-950">Ouro {{ dbPlanPrice('ouro', 'R$79,90') }}</span>
              </div>
              <div class="mt-6 flex flex-col sm:flex-row gap-3">
                <button @click="trackCta('pro_cadastrar'); goToModule('pro','register')" class="tesla-cta-primary px-8 py-2.5 rounded-full text-[14px] font-medium">Cadastrar como Profissional</button>
                <button @click="scrollToId('contato')" class="tesla-cta-secondary px-8 py-2.5 rounded-full text-[14px] font-medium">Falar no WhatsApp</button>
              </div>
            </div>
            <div class="relative min-h-[240px] lg:min-h-[320px] bg-slate-950">
              <img :src="lojaUrl" alt="Loja Casa Obras e Reparos" loading="lazy" class="absolute inset-0 w-full h-full object-cover" style="object-position: center 22%;" />
              <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/20 to-transparent"></div>
              <div class="absolute bottom-4 left-4 flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/85 border border-amber-500/30"><BadgeCheck class="w-4 h-4 text-emerald-400" /><span class="text-[11px] font-bold text-white">Selo verificado no Ouro</span></div>
            </div>
          </div>
        </section>

        <!-- resto compacto parte 2 -->
        <div class="w-full max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-12">
        <!-- FAQ com animações -->
        <div id="faq" class="gs-reveal max-w-3xl mx-auto w-full space-y-4 scroll-mt-24">
          <div class="text-center space-y-2"><h3 class="text-xl sm:text-2xl font-extrabold text-white">Perguntas frequentes</h3><p class="text-xs text-slate-400">Tudo o que você precisa saber antes de começar</p></div>
          <div class="space-y-2.5">
            <div v-for="(f, i) in faqs" :key="'faq-'+i" class="glass rounded-2xl overflow-hidden">
              <button @click="openFaq = openFaq === i ? null : i" class="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
                <span class="text-xs sm:text-sm font-bold text-white">{{ f.q }}</span>
                <ChevronDown :class="['w-4 h-4 shrink-0 text-amber-300 transition-transform duration-300', openFaq === i ? 'rotate-180' : '']" />
              </button>
              <div :class="['faq-panel px-5', openFaq === i ? 'open' : '']"><div class="faq-inner"><p class="pb-5 text-xs text-slate-300 leading-relaxed">{{ f.a }}</p></div></div>
            </div>
          </div>
        </div>

        </div><!-- /resto compacto parte 2 -->

        <!-- 5/5 CONTATO split -->
        <section id="contato" class="w-full max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-24">
          <div class="tesla-card-split gs-reveal grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-emerald-500/20 bg-slate-900/70">
            <div class="p-6 sm:p-10 flex flex-col justify-center text-left">
              <span class="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold"><MessageCircle class="w-4 h-4" /> Resposta rápida</span>
              <p class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-4">Fale no WhatsApp</p>
              <p class="mt-3 text-[14px] text-slate-300 max-w-md">Preencha ao lado — abrimos o WhatsApp com sua mensagem pronta. Você continua na página.</p>
              <div class="mt-4 flex items-center gap-2 text-[12px] text-slate-400"><ShieldCheck class="w-4 h-4 text-emerald-400" /> Seus dados só iniciam a conversa.</div>
            </div>
          <form @submit.prevent="handleContactSubmit" class="bg-slate-950/70 p-5 sm:p-8 space-y-4 border-t lg:border-t-0 lg:border-l border-white/10">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input v-model="contactForm.name" required placeholder="Seu nome *" class="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
              <input v-model="contactForm.phone" placeholder="WhatsApp (11) 99999-9999" class="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input v-model="contactForm.email" type="email" required placeholder="seu@email.com *" class="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
              <select v-model="contactForm.category" class="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/60 transition-all"><option value="">Categoria...</option><option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option><option :value="CATEGORY_UNLISTED">Serviço que não está na lista</option></select>
            </div>
            <div v-if="contactForm.category === CATEGORY_UNLISTED" class="space-y-1.5">
              <input v-model="contactForm.categoryOther" required placeholder="Qual serviço? ex: Piscineiro, Montador de cortinas *" class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
              <p class="text-[11px] text-slate-500">Diga qual serviço você precisa — vamos avaliar para adicionar.</p>
            </div>
            <input v-model="contactForm.subject" required placeholder="Assunto * — ex: vazamento na cozinha" class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all" />
            <textarea v-model="contactForm.message" required rows="3" placeholder="Descreva sua necessidade..." class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition-all resize-none" />
            <div v-if="contactSuccess" class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2"><CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" /><p class="text-xs text-emerald-300">WhatsApp aberto! Se não abriu, verifique o bloqueador de pop-ups.</p></div>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <button type="submit" :disabled="contactSubmitting" class="tesla-cta-primary flex-1 px-8 py-2.5 rounded-full text-[14px] font-medium disabled:opacity-50">{{ contactSubmitting ? 'Abrindo...' : 'Enviar via WhatsApp' }}</button>
            </div>
          </form>
          </div>
        </section>

        <!-- dots laterais Tesla -->
        <div class="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-2.5">
          <button v-for="s in teslaSections" :key="'dot-'+s.id" @click="scrollToId(s.id)" :title="s.label" :class="['tesla-dot w-2.5 h-2.5 rounded-full', activeSection === s.id ? 'bg-amber-400 scale-125' : 'bg-white/30 hover:bg-white/60']" />
        </div>

        <!-- FAQ compacto pós-stack -->
        <div class="w-full max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <div class="text-center space-y-2"><p class="text-[13px] font-medium text-slate-300">Dúvidas? Veja as perguntas frequentes acima no conteúdo — ou chame no WhatsApp.</p></div>
        </div>
      </div>

      <!-- LEGADO (mantido fora da landing single-page) -->
      <div v-if="false" class="space-y-8 animate-in fade-in duration-300">
        <div class="bg-slate-950 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden">
          <div class="absolute -top-32 -left-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
          <div class="absolute -bottom-40 -right-20 w-[26rem] h-[26rem] bg-orange-600/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style="animation-delay: 1.5s" />
          <div class="absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle at 1px 1px, rgba(251,191,36,0.5) 1px, transparent 0); background-size: 28px 28px;" />
          <div class="relative z-10 max-w-2xl mx-auto text-center space-y-4">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold backdrop-blur-sm">
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
          <form @submit.prevent="handleContactSubmit" class="bg-slate-900/80 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-5 backdrop-blur-sm relative overflow-hidden hover:border-amber-500/30 transition-all duration-300">
            <div class="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Nome completo *</label>
                <input
                  v-model="contactForm.name"
                  type="text"
                  required
                  placeholder="Seu nome"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">E-mail *</label>
                <input
                  v-model="contactForm.email"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
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
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1.5">Categoria do serviço</label>
                <select
                  v-model="contactForm.category"
                  class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
                >
                  <option value="">Selecione...</option>
                  <option v-for="cat in CATEGORIES" :key="cat.name" :value="cat.name">{{ cat.name }}</option>
                  <option :value="CATEGORY_UNLISTED">Serviço que não está na lista</option>
                </select>
              </div>
            </div>

            <div v-if="contactForm.category === CATEGORY_UNLISTED">
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Qual serviço você precisa? *</label>
              <input
                v-model="contactForm.categoryOther"
                required
                placeholder="Ex: Piscineiro, Montador de cortinas, Instalação de painel solar"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
              />
              <p class="mt-1.5 text-[11px] text-slate-500">Vamos avaliar e adicionar essa categoria.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Assunto *</label>
              <input
                v-model="contactForm.subject"
                type="text"
                required
                placeholder="Ex: Solicitação de orçamento para reforma"
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1.5">Mensagem *</label>
              <textarea
                v-model="contactForm.message"
                required
                rows="4"
                placeholder="Descreva sua necessidade, dúvida ou proposta..."
                class="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all resize-none"
              />
            </div>

            <div v-if="contactSuccess" class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 class="w-5 h-5 text-emerald-400 shrink-0" />
              <p class="text-xs text-emerald-300">Mensagem enviada com sucesso! Entraremos em contato em breve.</p>
            </div>

            <button
              type="submit"
              :disabled="contactSubmitting"
              class="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            >
              <Mail class="w-4 h-4" />
              {{ contactSubmitting ? 'Enviando...' : 'Enviar Mensagem' }}
            </button>
          </form>
        </div>
      </div>

      <!-- COMO FUNCIONA PAGE -->
      <div v-if="false && activeTab === 'como_funciona'" class="space-y-10 animate-in fade-in duration-300">
        <!-- HERO -->
        <div class="bg-slate-950 rounded-3xl p-6 sm:p-10 border border-amber-500/20 relative overflow-hidden text-center">
          <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
          <div class="absolute -bottom-40 right-0 w-[26rem] h-[26rem] bg-orange-600/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style="animation-delay: 1.5s" />
          <div class="absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle at 1px 1px, rgba(251,191,36,0.5) 1px, transparent 0); background-size: 28px 28px;" />
          <div class="relative z-10 max-w-2xl mx-auto space-y-4">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold backdrop-blur-sm">
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
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-400/20 border border-amber-500/25 flex items-center justify-center">
              <User class="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 class="text-lg font-extrabold text-white">Para o Cliente</h3>
              <p class="text-xs text-slate-400">Como solicitar um serviço em poucos passos</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Passo 1 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">01</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/25 to-blue-400/10 text-blue-400 border border-blue-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Image class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Tire uma Foto</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Photographe o problema: vazamento, rachadura, item quebrado, instalação necessária. Quanto mais clara a foto, melhor a análise.
              </p>
            </div>

            <!-- Passo 2 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">02</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/25 to-purple-400/10 text-purple-400 border border-purple-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Brain class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">IA Analisa</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Nossa inteligência artificial identifica o serviço, estima valores, sugere categorias e gera um orçamento automaticamente.
              </p>
            </div>

            <!-- Passo 3 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">03</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-400/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Search class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Escolha o Profissional</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Veja os profissionais disponíveis, seus planos (Ouro, Prata, Bronze), avaliações e ranking. Ou envie para todos de uma vez.
              </p>
            </div>

            <!-- Passo 4 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">04</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/25 to-cyan-400/10 text-cyan-400 border border-cyan-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <MessageCircle class="w-6 h-6" />
                </div>
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
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/30 to-yellow-400/20 border border-amber-500/25 flex items-center justify-center">
              <Wrench class="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 class="text-lg font-extrabold text-white">Para o Profissional</h3>
              <p class="text-xs text-slate-400">Como receber e atender chamados da região</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Passo 1 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-amber-500/40 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">01</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/25 to-yellow-400/10 text-amber-400 border border-amber-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <ClipboardCheck class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Cadastre-se</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Crie seu perfil profissional com categoría, área de atendimento, telefone e foto. Escolha seu plano de visibilidade.
              </p>
            </div>

            <!-- Passo 2 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">02</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/25 to-blue-400/10 text-blue-400 border border-blue-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Send class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Receba Solicitações</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Clientes da sua região enviam pedidos. Você recebe notificações com foto, orçamento da IA e dados do cliente.
              </p>
            </div>

            <!-- Passo 3 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">03</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-400/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <FileCheck class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Confirme ou Proponha</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Aceite o orçamento da IA, proponha um valor diferente ou agende uma visita técnica para avaliar presencialmente.
              </p>
            </div>

            <!-- Passo 4 -->
            <div class="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <span class="absolute -top-3 right-2 text-6xl font-black text-stroke-amber select-none pointer-events-none opacity-70 group-hover:opacity-100 transition-opacity">04</span>
              <div class="relative">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/25 to-rose-400/10 text-rose-400 border border-rose-500/25 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Receipt class="w-6 h-6" />
                </div>
              </div>
              <h4 class="font-bold text-white text-sm mb-1">Atenda e Emita Recibo</h4>
              <p class="text-xs text-slate-400 leading-relaxed">
                Realize o serviço, atualize o status no painel e emita um recibo digital profissional para o cliente.
              </p>
            </div>
          </div>
        </div>

        <!-- DIFERENCIAIS -->
        <div class="bg-slate-900/80 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6 relative overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div class="relative text-center space-y-2">
            <h3 class="text-lg font-extrabold text-white">Por que escolher o Casa Obras e Reparos?</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">Benefícios que fazem a diferença para clientes e profissionais</p>
          </div>
          <div class="relative grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="flex items-start gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/25 to-yellow-400/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <Brain class="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 class="font-bold text-white text-xs">Orçamento com IA</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Análise inteligente da foto com estimativa de valor e categoria automatica.</p>
              </div>
            </div>
            <div class="flex items-start gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/25 to-emerald-400/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <MessageCircle class="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 class="font-bold text-white text-xs">WhatsApp Direto</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Contato imediato sem intermediários. Agende, combine e resolva pelo app.</p>
              </div>
            </div>
            <div class="flex items-start gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300 group">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/25 to-blue-400/10 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform">
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
              @click="goToModule('client', 'register')"
              class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Bot class="w-5 h-5" />
              Solicitar um Serviço
            </button>
            <button
              @click="goToModule('pro', 'register')"
              class="px-6 py-3 rounded-xl bg-slate-800/80 text-amber-400 border border-amber-500/30 font-extrabold text-sm hover:bg-slate-700/80 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wrench class="w-5 h-5" />
              Ser um Profissional Parceiro
            </button>
          </div>
        </div>
      </div>

      <!-- PARA PROFISSIONAIS PAGE -->
      <div v-if="false && activeTab === 'para_profissionais'" class="space-y-10 animate-in fade-in duration-300">
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
                @click="goToModule('pro', 'register')"
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
                  v-if="cat.img"
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
                @click="goToModule('pro', 'register')"
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
                @click="goToModule('pro', 'register')"
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
                @click="goToModule('pro', 'register')"
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
            @click="goToModule('pro', 'register')"
            class="px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mx-auto"
          >
            <Wrench class="w-5 h-5" />
            Quero Ser um Parceiro
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- BLOG / DICAS PAGE -->
      <div v-if="false && activeTab === 'blog'" class="space-y-8 animate-in fade-in duration-300">
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

      <!-- ROTA PÚBLICA #/profissionais: CATÁLOGO POR PROFISSÃO -->
      <div v-if="activeTab === 'profissionais'" class="pt-20 pb-10 space-y-5 animate-in fade-in duration-300">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span class="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <HardHat class="w-4 h-4" /> Profissionais
            </span>
            <h1 class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-3">Encontre por profissão</h1>
            <p class="text-xs text-slate-400 mt-1">
              {{ filterCategory === 'Todas' ? 'Escolha uma profissão para filtrar' : `Mostrando: ${filterCategory}` }}
              · {{ filteredProfessionals.length }} encontrado(s)
            </p>
          </div>
          <button @click="scrollToId('inicio')" class="text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-full px-4 py-2 whitespace-nowrap">Voltar ao início</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in ['Todas', ...CATEGORIES.map(c => c.name)]"
            :key="'pub-'+cat"
            @click="handleLandingCategory(cat)"
            :class="['px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all', filterCategory === cat ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-500/50']"
          >
            {{ cat }}
          </button>
        </div>
        <div v-if="filterCategory !== 'Todas'" class="flex justify-end">
          <button @click="handleLandingCategory('Todas')" class="text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-full px-4 py-1.5">Limpar filtro</button>
        </div>

        <!-- FILTROS DE LOCALIZAÇÃO (UF / CIDADE / BAIRRO) -->
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="filterUf"
            aria-label="Filtrar por UF"
            class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
          >
            <option v-for="u in availableUfs" :key="'pub-uf-' + u" :value="u">
              {{ u === 'Todas' ? 'Todas as UFs' : u }}
            </option>
          </select>
          <select
            v-model="filterCidade"
            aria-label="Filtrar por cidade"
            class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
          >
            <option v-for="c in availableCidades" :key="'pub-cidade-' + c" :value="c">
              {{ c === 'Todas' ? 'Todas as cidades' : c }}
            </option>
          </select>
          <select
            v-model="filterBairro"
            aria-label="Filtrar por bairro"
            class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
          >
            <option v-for="b in availableBairros" :key="'pub-bairro-' + b" :value="b">
              {{ b === 'Todos' ? 'Todos os bairros' : b }}
            </option>
          </select>
          <button
            v-if="filterUf !== 'Todas' || filterCidade !== 'Todas' || filterBairro !== 'Todos'"
            type="button"
            @click="resetDirectoryFilters"
            class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all"
          >
            Limpar filtros
          </button>
        </div>

        <div v-if="isLoading" class="text-center text-xs text-slate-400 py-8">Carregando profissionais...</div>
        <div v-else-if="paginatedProfessionals.length === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
          <p class="text-sm text-slate-300 font-bold">Nenhum profissional nesta categoria ainda.</p>
          <p class="text-xs text-slate-400 mt-1">Tente outra profissão ou envie para todos após a análise da IA.</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ProfessionalCard
            v-for="pro in paginatedProfessionals"
            :key="'pub-'+pro.id"
            :professional="pro"
            :plan-info="planMap.get(pro.plan) ?? null"
            :selectable="true"
            :selected="selectedProfessional?.id === pro.id"
            @choose="handleChooseProfessional"
            @clear="clearProfessionalSelection"
          />
        </div>
        <p v-if="selectedProfessional" class="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">
          Selecionado: <strong>{{ selectedProfessional.name }}</strong> ({{ selectedProfessional.category }}) — faça login/cadastro para preencher a solicitação.
        </p>
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
          <button
            @click="activeTab = 'historico_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
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
                Profissionais disponíveis — clique em Escolher para preencher a solicitação
              </h3>
              <p class="text-[10px] text-slate-400 mt-0.5">
                {{ filteredProfessionals.length }} profissional(is) encontrado(s)
                <span v-if="selectedProfessional" class="text-amber-300">· Selecionado: {{ selectedProfessional.name }}</span>
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
            <select
              v-model="filterUf"
              class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50"
            >
              <option v-for="u in availableUfs" :key="'uf-' + u" :value="u">
                {{ u === 'Todas' ? '📍 Todas as UFs' : u }}
              </option>
            </select>
            <select
              v-model="filterCidade"
              class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50"
            >
              <option v-for="c in availableCidades" :key="'cidade-' + c" :value="c">
                {{ c === 'Todas' ? '🏙️ Todas as cidades' : c }}
              </option>
            </select>
            <select
              v-model="filterBairro"
              class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500/50"
            >
              <option v-for="b in availableBairros" :key="'bairro-' + b" :value="b">
                {{ b === 'Todos' ? '🏘️ Todos os bairros' : b }}
              </option>
            </select>
            <button
              v-if="filterCategory !== 'Todas' || filterPlan !== 'Todos' || filterUf !== 'Todas' || filterCidade !== 'Todas' || filterBairro !== 'Todos'"
              type="button"
              @click="resetDirectoryFilters"
              class="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all"
            >
              Limpar filtros
            </button>
          </div>

          <!-- CARDS GRID -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ProfessionalCard
              v-for="pro in paginatedProfessionals"
              :key="pro.id"
              :professional="pro"
              :plan-info="planMap.get(pro.plan) ?? null"
              :selectable="true"
              :selected="selectedProfessional?.id === pro.id"
              @choose="handleChooseProfessional"
              @clear="clearProfessionalSelection"
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

        <div v-if="selectedProfessional" class="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
          <p class="text-xs text-amber-200">Solicitando para <strong>{{ selectedProfessional.name }}</strong> ({{ selectedProfessional.category }})</p>
          <button type="button" @click="clearProfessionalSelection" class="text-[11px] text-slate-300 hover:text-white underline">Trocar / cancelar</button>
        </div>

        <div id="solicitar-form" class="grid grid-cols-1 lg:grid-cols-12 gap-6 scroll-mt-24">
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
                    @click="imagePreview = null; photoFile = null"
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
                3. Seus Dados de Contato e Endereço: <span class="text-amber-400 normal-case">* obrigatórios ao confirmar</span>
              </h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="text-[11px] text-slate-400 font-medium">Seu Nome Completo: *</label>
                  <input
                    type="text"
                    v-model="clientName"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mt-1"
                    placeholder="Ex: Carlos Costa"
                  />
                </div>
                <div>
                  <label class="text-[11px] text-slate-400 font-medium">WhatsApp para Notificação: *</label>
                  <input
                    type="text"
                    v-model="clientPhone"
                    class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 mt-1"
                    placeholder="Ex: 11987654321"
                  />
                </div>
              </div>
              <div>
                <label class="text-[11px] text-slate-400 font-medium">Endereço do Atendimento: *</label>
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
                  <div v-if="latestAiResult.suggestedMinPrice === 0 && latestAiResult.suggestedMaxPrice === 0" class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center gap-2">
                    <Bot class="w-4 h-4 text-blue-400 shrink-0" />
                    <p class="text-[11px] text-blue-300">Análise preliminar por categoria. O profissional confirma os valores exatos no WhatsApp.</p>
                  </div>
                  <div v-if="aiReadyToast" class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
                    <p class="text-[11px] text-emerald-300">Análise da IA concluída com valores e materiais.</p>
                  </div>
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
                      v-if="selectedProfessional"
                      type="button"
                      @click="sendMode = 'direct'"
                      class="w-full p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15 transition-all text-left flex items-start gap-3"
                    >
                      <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check class="w-5 h-5" />
                      </div>
                      <div>
                        <p class="font-bold text-white text-xs">Enviar para {{ selectedProfessional.name }}</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                          {{ selectedProfessional.category }} · contato direto via WhatsApp após salvar o pedido.
                        </p>
                      </div>
                    </button>
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
                      v-if="!selectedProfessional && directCandidates.length > 0"
                      type="button"
                      @click="sendMode = 'direct'"
                      class="w-full p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-left flex items-start gap-3"
                    >
                      <div class="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles class="w-5 h-5" />
                      </div>
                      <div>
                        <p class="font-bold text-white text-xs">Escolher um profissional específico</p>
                        <p class="text-[10px] text-slate-400 mt-0.5">
                          Selecione abaixo um profissional de {{ selectedCategory }} para contato direto via WhatsApp.
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

                  <!-- DIRECT SELECTION (qualquer plano) -->
                  <div v-if="sendMode === 'direct'" class="space-y-2">
                    <button
                      type="button"
                      @click="clearProfessionalSelection"
                      class="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      ← Voltar e escolher outra opção
                    </button>
                    <span class="font-bold text-amber-400 text-[11px] block">
                      Selecione o profissional ({{ selectedCategory }}):
                    </span>
                    <div
                      v-for="pro in directCandidates"
                      :key="pro.id"
                      @click="selectedProfessional = pro"
                      :class="[
                        'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all',
                        selectedProfessional?.id === pro.id
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
                          <p class="text-[10px] text-slate-400">{{ pro.category }} · {{ PLAN_LABELS[pro.plan] ?? pro.plan }}</p>
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
                <div v-if="formError" class="mb-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                  <X class="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p class="text-xs text-red-300">{{ formError }}</p>
                </div>
                <button
                  type="button"
                  @click="handleConfirmOrder"
                  :disabled="sendMode === 'direct' && !selectedProfessional"
                  :class="[
                    'w-full py-3 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2',
                    (sendMode === 'broadcast' || (sendMode === 'direct' && selectedProfessional))
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                  ]"
                >
                  <Check class="w-4 h-4" />
                  <template v-if="sendMode === 'broadcast'">
                    Enviar para {{ prataBronzeCount }} profissionais
                  </template>
                  <template v-else-if="sendMode === 'direct' && selectedProfessional">
                    Enviar para {{ selectedProfessional.name }}
                  </template>
                  <template v-else>
                    Selecione um profissional
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
            <span v-if="myRequests.length > 0" class="bg-amber-400 text-slate-950 font-bold text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {{ myRequests.length }}
            </span>
          </button>
          <button
            @click="activeTab = 'recibos_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <FileText class="w-3.5 h-3.5" />
            Meus Recibos
          </button>
          <button
            @click="activeTab = 'historico_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
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

        <!-- FILTRO POR STATUS -->
        <div v-if="myRequests.length > 0" class="flex flex-wrap gap-2">
          <button
            v-for="f in ([
              { id: 'todas', label: 'Todas' },
              { id: 'pendentes', label: 'Pendentes' },
              { id: 'andamento', label: 'Em andamento' },
              { id: 'concluidas', label: 'Concluídas' },
            ] as const)"
            :key="f.id"
            @click="clientStatusFilter = f.id"
            :class="[
              'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border',
              clientStatusFilter === f.id
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            ]"
          >
            {{ f.label }}
            <span
              :class="[
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]',
                clientStatusFilter === f.id ? 'bg-slate-950/20' : 'bg-slate-800'
              ]"
            >
              {{ f.id === 'todas' ? myRequests.length : myRequests.filter((r) => clientStatusGroup(r.status) === f.id).length }}
            </span>
          </button>
        </div>

        <div v-if="myRequests.length === 0" class="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <p class="text-sm text-slate-400">Nenhum serviço solicitado até o momento.</p>
          <button
            @click="activeTab = 'solicitar'"
            class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
          >
            Solicitar Primeiro Orçamento
          </button>
        </div>

        <div v-else-if="filteredClientRequests.length === 0" class="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <p class="text-sm text-slate-400">Nenhum pedido neste filtro.</p>
          <button
            @click="clientStatusFilter = 'todas'"
            class="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all"
          >
            Ver todas
          </button>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="req in filteredClientRequests"
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
          <button
            @click="activeTab = 'historico_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
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

      <!-- MODE CLIENT: HISTÓRICO DE PEDIDOS -->
      <div v-if="userMode === 'client' && activeTab === 'historico_cliente'" class="space-y-6 animate-in fade-in duration-300">
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
          </button>
          <button
            @click="activeTab = 'recibos_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <FileText class="w-3.5 h-3.5" />
            Meus Recibos
          </button>
          <button
            @click="activeTab = 'historico_cliente'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
          </button>
        </div>

        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History class="w-5 h-5 text-amber-400" />
            Histórico de Serviços
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Todos os seus pedidos concluídos ou cancelados, guardados para consulta.
          </p>
        </div>

        <div v-if="historicClientRequests.length === 0" class="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <History class="w-10 h-10 text-slate-600 mx-auto" />
          <p class="text-sm text-slate-400">Nenhum serviço finalizado ainda. Concluídos e cancelados aparecem aqui.</p>
          <button
            @click="activeTab = 'meus_pedidos'"
            class="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all"
          >
            Acompanhar pedidos ativos
          </button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="req in historicClientRequests"
            :key="req.id"
            class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  v-if="req.photo_url"
                  :src="req.photo_url"
                  alt="Foto do serviço"
                  class="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                />
                <div class="min-w-0">
                  <p class="font-bold text-white text-sm truncate">{{ req.ai_analysis?.summary || req.category }}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    {{ formatRequestDate(req.created_at) }} • {{ req.category }} • {{ findProfessional(req.professional_id)?.name || 'Broadcast' }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  :class="[
                    'text-xs font-bold px-3 py-1 rounded-full border',
                    req.status === 'Concluído'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  ]"
                >
                  {{ req.status }}
                </span>
                <span class="text-xs font-extrabold text-white bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  R$ {{ req.final_price ?? 0 }},00
                </span>
              </div>
            </div>
            <div v-if="req.rating" class="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span><strong class="text-white">{{ req.rating.stars }}/5</strong> — {{ req.rating.comment }}</span>
            </div>
            <div class="mt-3 flex flex-col sm:flex-row gap-2">
              <button
                v-if="req.receipt_issued"
                @click="viewReceiptModal = req"
                class="flex-1 py-2 rounded-xl bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <Printer class="w-3.5 h-3.5" /> Ver recibo
              </button>
              <button
                v-if="req.status === 'Concluído' && !req.rating"
                @click="rateOrderModal = req"
                class="flex-1 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
              >
                <Star class="w-3.5 h-3.5" /> Avaliar serviço
              </button>
            </div>
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
          <button
            @click="activeTab = 'historico_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
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

        <!-- GATE: plan needed to receive requests -->
        <div v-if="!canReceiveRequests" class="bg-slate-900 rounded-2xl p-10 border border-amber-500/30 text-center space-y-5">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Lock class="w-7 h-7 text-amber-400" />
          </div>
          <div class="space-y-2">
            <h3 class="text-lg font-extrabold text-white">Assine um plano para começar a receber pedidos</h3>
            <p class="text-sm text-slate-400 max-w-md mx-auto">
              Seu perfil está no plano Gratuito. Escolha um plano pago para ver e aceitar os chamados da sua região.
            </p>
          </div>
          <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              @click="activeTab = 'perfil_pro'"
              class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles class="w-4 h-4" />
              Ver Planos
            </button>
            <button
              @click="activeTab = 'perfil_pro'"
              class="px-6 py-3 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700 font-semibold text-sm hover:bg-slate-700 transition-all"
            >
              Editar meu perfil primeiro
            </button>
          </div>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="req in proRequests"
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

            <!-- STEP TIMELINE (igual ao card do cliente) -->
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
          <div v-if="proRequests.length === 0" class="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
            <Clock class="w-10 h-10 text-slate-600 mx-auto" />
            <p class="text-sm text-slate-400">Nenhum chamado para a sua categoria no momento.</p>
            <p class="text-xs text-slate-500">Novos pedidos aparecem aqui assim que clientes solicitam serviços de {{ proProfile.category || 'sua categoria' }}.</p>
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
          <button
            @click="activeTab = 'historico_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
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
          <button
            @click="activeTab = 'historico_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
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
                @click="showProfileModal = true"
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
              v-for="p in displayPlans"
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

      <!-- MODE PRO: HISTÓRICO DE ATENDIMENTOS -->
      <div v-if="userMode === 'pro' && activeTab === 'historico_pro'" class="space-y-6 animate-in fade-in duration-300">
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
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <Star class="w-3.5 h-3.5" />
            Meu Perfil
          </button>
          <button
            @click="activeTab = 'historico_pro'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-slate-800 text-amber-400 border border-amber-500/30"
          >
            <History class="w-3.5 h-3.5" />
            Histórico
          </button>
        </div>

        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <History class="w-5 h-5 text-amber-400" />
            Histórico de Atendimentos
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Serviços concluídos ou cancelados atribuídos a você, guardados para consulta.
          </p>
        </div>

        <div v-if="historicProRequests.length === 0" class="bg-slate-900 rounded-2xl p-12 text-center border border-slate-800 space-y-3">
          <History class="w-10 h-10 text-slate-600 mx-auto" />
          <p class="text-sm text-slate-400">Nenhum atendimento finalizado ainda. Concluídos e cancelados aparecem aqui.</p>
          <button
            @click="activeTab = 'pedidos_pro'"
            class="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs hover:bg-slate-700 transition-all"
          >
            Ver painel de atendimentos
          </button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="req in historicProRequests"
            :key="req.id"
            class="bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <img
                  v-if="req.photo_url"
                  :src="req.photo_url"
                  alt="Foto do serviço"
                  class="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                />
                <div class="min-w-0">
                  <p class="font-bold text-white text-sm truncate">{{ req.ai_analysis?.summary || req.category }}</p>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    {{ formatRequestDate(req.created_at) }} • {{ req.category }} • {{ req.client_name }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  :class="[
                    'text-xs font-bold px-3 py-1 rounded-full border',
                    req.status === 'Concluído'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  ]"
                >
                  {{ req.status }}
                </span>
                <span class="text-xs font-extrabold text-white bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                  R$ {{ req.final_price ?? 0 }},00
                </span>
              </div>
            </div>
            <div v-if="req.rating" class="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
              <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span><strong class="text-white">{{ req.rating.stars }}/5</strong> — {{ req.rating.comment }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- UPGRADE MODAL -->
    <!-- ONBOARDING PLANS (after pro registration) -->
    <div v-if="showOnboardingPlans" class="fixed inset-0 z-50 overflow-y-auto">
      <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"></div>
      <div class="relative min-h-full flex items-center justify-center p-4 py-8">
        <div class="w-full max-w-3xl bg-slate-900 rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          <div class="relative bg-slate-950 p-6 border-b border-slate-800 text-center overflow-hidden">
            <div class="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
            <div class="relative">
              <Sparkles class="w-9 h-9 text-amber-400 mx-auto mb-3" />
              <h3 class="text-xl sm:text-2xl font-black text-white">Bem-vindo(a) à Casa Obras e Reparos!</h3>
              <p class="text-sm text-slate-300 mt-2 max-w-lg mx-auto">
                Sua conta de <strong class="text-amber-400">Prestador</strong> foi criada. Escolha um plano para começar a receber chamados da sua região.
              </p>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                v-for="p in displayPlans"
                :key="p.id"
                :class="[
                  'bg-slate-950/60 rounded-2xl p-4 border transition-all flex flex-col',
                  p.id === 'bronze' ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-800'
                ]"
              >
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <component :is="p.icon" class="w-4.5 h-4.5 text-amber-400" style="width:18px;height:18px" />
                  </div>
                  <div>
                    <h4 class="font-bold text-white text-sm">{{ p.name }}</h4>
                    <p class="text-amber-400 font-extrabold text-sm">{{ p.price }}<span class="text-[10px] text-slate-400 font-medium">/mês</span></p>
                  </div>
                </div>
                <p class="text-[10px] text-slate-400 mb-2">{{ p.tagline }}</p>
                <ul class="space-y-1.5 flex-1 mb-3">
                  <li v-for="feature in p.features" :key="feature" class="flex items-center gap-1.5">
                    <Check class="w-3 h-3 text-green-400 shrink-0" />
                    <span class="text-[11px] text-slate-300">{{ feature }}</span>
                  </li>
                </ul>
                <button
                  v-if="p.id === 'gratuito'"
                  @click="showOnboardingPlans = false"
                  class="w-full py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all"
                >
                  Continuar Grátis
                </button>
                <button
                  v-else
                  @click="subscribePlan(p.id); showOnboardingPlans = false"
                  class="w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black hover:from-amber-400 hover:to-yellow-300 transition-all shadow-md shadow-amber-500/20"
                >
                  {{ p.cta }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-800">
              <p class="text-xs text-slate-400">Você pode escolher um plano a qualquer momento em "Meu Perfil".</p>
              <button
                @click="showOnboardingPlans = false"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                Pular por enquanto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <!-- MODAL DE EDIÇÃO DE PERFIL / CONTA -->
    <ProfileEditModal
      :open="showProfileModal"
      :role="userMode === 'pro' ? 'pro' : 'client'"
      :professional="proProfile"
      :user="userProfile"
      :categories="CATEGORIES.map(c => c.name)"
      @close="showProfileModal = false"
      @saved="handleProfileModalSaved"
    />

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