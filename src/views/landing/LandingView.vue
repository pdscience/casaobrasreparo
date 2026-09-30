<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { trackEvent, getWhatsAppNumber } from '../../lib/analytics'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { CATEGORIES, CATEGORY_UNLISTED } from '../../lib/categories'
import { useAuth } from '../../composables/useAuth'
import { useNavigation } from '../../composables/useNavigation'
import { useProfessionals } from '../../composables/useProfessionals'
import { usePlans } from '../../composables/usePlans'
import { useQuoteForm } from '../../composables/useQuoteForm'
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  FileText,
  Handshake,
  MessageCircle,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Wrench,
  Zap,
} from 'lucide-vue-next'

const { isLanding } = useAuth()
const {
  activeTab, activeSection, teslaSections,
  goToTab, goToModule, scrollToId, trackCta,
} = useNavigation()
const { filterCategory, directoryPage } = useProfessionals()
const { dbPlanPrice, planLimitText } = usePlans()
const { selectedCategory } = useQuoteForm()

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
    window.open(buildWhatsAppLink(getWhatsAppNumber(), waMessage), '_blank', 'noopener')
  } catch { /* noop */ }

  setTimeout(() => {
    contactSubmitting.value = false
    contactSuccess.value = true
    contactForm.value = { name: '', email: '', phone: '', category: '', categoryOther: '', subject: '', message: '' }
    setTimeout(() => { contactSuccess.value = false }, 6000)
  }, 500)
}

// ---------- Landing premium (página única) ----------
const heroVideoUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_HERO_VIDEO_URL || ''
const openFaq = ref<number | null>(0)
const faqs = computed(() => [
  { q: 'Como funciona o orçamento com IA?', a: 'Você envia uma foto do problema, escolhe a categoria e a IA gera diagnóstico, materiais, tempo estimado e faixa de preço. Depois você envia para profissionais Ouro ou para toda a base.' },
  { q: 'Preciso pagar para pedir um orçamento?', a: 'Não. Cliente não paga nada para solicitar. Você só combina o valor diretamente com o profissional via WhatsApp.' },
  { q: 'Como o profissional recebe meus pedidos?', a: 'Profissionais assinantes (Bronze, Prata e Ouro) veem os chamados da sua categoria em tempo real, com foto e análise da IA. O plano Ouro ainda recebe contato direto individual.' },
  { q: 'O que muda entre Bronze, Prata e Ouro?', a: `Bronze (${dbPlanPrice('bronze', 'R$34,90')}): ${planLimitText('bronze', '10/mês')} pedidos. Prata (${dbPlanPrice('prata', 'R$54,90')}): ${planLimitText('prata', '30/mês')} pedidos, WhatsApp visível e prioridade. Ouro (${dbPlanPrice('ouro', 'R$79,90')}): pedidos ${planLimitText('ouro', 'ilimitados')}, topo do catálogo, selo verificado e relatórios avançados.` },
  { q: 'Como falo com vocês?', a: 'Use o formulário abaixo — ele abre o WhatsApp da Casa Obras e Reparos com sua mensagem pronta, sem sair da experiência.' },
])
const partnerLogos = ['Eletricistas PRO', 'Hidráulica Prime', 'Pinturas & Cia', 'ClimaFrio', 'Marcenaria Alto Padrão', 'Reforma Fácil', 'Chave Ouro 24h', 'Limpa Total']

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

function handleLandingCategory(categoryName: string) {
  trackCta('categoria_' + categoryName)
  filterCategory.value = categoryName
  selectedCategory.value = CATEGORIES.some(c => c.name === categoryName) ? categoryName : selectedCategory.value
  directoryPage.value = 1
  if (activeTab.value !== 'profissionais') {
    goToTab('profissionais')
    window.scrollTo({ top: 0 })
  }
}

const lojaUrl = '/loja.png'

onMounted(() => {
  window.addEventListener('pointermove', onCursorMove, { passive: true })
  nextTick(() => initPremiumMotion())
})

onUnmounted(() => {
  window.removeEventListener('pointermove', onCursorMove)
  try { gsapCtx?.revert?.() } catch { /* noop */ }
})
</script>

<template>
  <div ref="cursorGlow" id="cursor-glow" aria-hidden="true"></div>
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
</template>
