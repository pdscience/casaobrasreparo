<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useNavigation } from '../../composables/useNavigation'
import { useRequests } from '../../composables/useRequests'
import { usePlans } from '../../composables/usePlans'
import { activateTrial } from '../../api/insforgeService'
import { pushToast } from '../../composables/useUi'
import ProSubTabs from '../../components/layout/ProSubTabs.vue'
import {
  Building2,
  Wrench,
  User,
  ShieldCheck,
  Phone,
  Edit2,
  Star,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  Check,
} from 'lucide-vue-next'

const { userMode, proProfile, showProfileModal, loadProfessionalProfile } = useAuth()
const { activeTab } = useNavigation()
const { requests } = useRequests()
const {
  displayPlans, requestUsage,
  hasFeature,
  PLAN_LABELS, PLAN_PRICES,
  subscribePlan, handleOpenPortal,
} = usePlans()

const trialDaysLeft = computed(() => {
  if (!proProfile.value.plan_expires_at) return 0
  return Math.max(0, Math.ceil((new Date(proProfile.value.plan_expires_at).getTime() - Date.now()) / 86400000))
})
const trialEndLabel = computed(() => proProfile.value.plan_expires_at
  ? new Date(proProfile.value.plan_expires_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  : '')

async function handleActivateTrial() {
  if (!proProfile.value.id) return
  try {
    await activateTrial(proProfile.value.id)
    if (proProfile.value.auth_id) await loadProfessionalProfile(proProfile.value.auth_id)
    pushToast('success', 'Teste de 30 dias do plano Ouro ativado!')
  } catch (err) {
    console.error('Erro ao ativar trial:', err)
    pushToast('error', 'Não foi possível ativar o teste. Tente novamente.')
  }
}
</script>

<template>
      <!-- MODE PRO: TAB 3 - PERFIL PROFISSIONAL -->
      <div v-if="userMode === 'pro' && activeTab === 'perfil_pro'" class="space-y-6 animate-in fade-in duration-300">
        <ProSubTabs :active="activeTab" />

        <!-- CADASTRO: Quando não há profissional cadastrado -->
        <div v-if="!proProfile.id" class="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center space-y-4">
          <Building2 class="w-14 h-14 text-amber-400 mx-auto" />
          <h2 class="text-xl font-bold text-white">Você ainda não é um prestador cadastrado</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto">Cadastre-se para receber solicitações de serviço dos clientes na sua região.</p>
          <button
            @click="showProfileModal = true"
            class="px-6 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 transition-all inline-flex items-center gap-2"
          >
            <Wrench class="w-4 h-4" />
            Cadastrar como Prestador
          </button>
        </div>

        <!-- CARD DO PERFIL -->
        <div v-if="proProfile.id" class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
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
        <div v-if="proProfile.id" class="space-y-6">
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

          <!-- Trial -->
          <div v-if="proProfile.plan_status === 'trialing'" class="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p class="text-xs text-amber-200">
              Você está testando o <strong>OURO grátis até {{ trialEndLabel }}</strong> ({{ trialDaysLeft }} dias restantes).
            </p>
            <button
              @click="subscribePlan('ouro')"
              class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all whitespace-nowrap"
            >
              Continuar no ouro
            </button>
          </div>
          <div v-else-if="proProfile.plan === 'gratuito' && !proProfile.trial_used && proProfile.id" class="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p class="text-xs text-slate-300">
              Teste o <strong class="text-amber-300">OURO grátis por 30 dias</strong>, sem cartão.
            </p>
            <button
              @click="handleActivateTrial"
              class="px-4 py-2 rounded-xl bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-slate-700 transition-all whitespace-nowrap"
            >
              Ativar 30 dias grátis
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
      </div>
</template>
