<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { trackEvent } from './lib/analytics'
import { CATEGORIES } from './lib/categories'
import { statusSteps, clientStatusGroup, formatRequestDate } from './lib/requestStatus'
import { useAuth } from './composables/useAuth'
import { useNavigation } from './composables/useNavigation'
import { useRequests } from './composables/useRequests'
import { useProfessionals } from './composables/useProfessionals'
import { usePlans } from './composables/usePlans'
import { useQuoteForm } from './composables/useQuoteForm'
import { useUi } from './composables/useUi'
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
  Building2,
  Edit2,
  SlidersHorizontal,
  Lock,
  History,
} from 'lucide-vue-next'
import ProfessionalCard from './components/ProfessionalCard.vue'
import ProfileEditModal from './components/ProfileEditModal.vue'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import ClientSubTabs from './components/layout/ClientSubTabs.vue'
import ProSubTabs from './components/layout/ProSubTabs.vue'
import ToastHost from './components/layout/ToastHost.vue'
import AuthModal from './components/auth/AuthModal.vue'
import UpgradeModal from './components/modals/UpgradeModal.vue'
import OnboardingPlansModal from './components/modals/OnboardingPlansModal.vue'
import ScheduleModal from './components/modals/ScheduleModal.vue'
import RateModal from './components/modals/RateModal.vue'
import ReceiptModal from './components/modals/ReceiptModal.vue'
import LandingView from './views/landing/LandingView.vue'
import DirectoryView from './views/professionals/DirectoryView.vue'

const {
  authUser, userProfile, userMode,
  showAuth,
  proProfile, showProfileModal, isLanding,
  hydrateAuth, handleProfileModalSaved,
} = useAuth()

const {
  activeTab, onPageScroll,
} = useNavigation()

const {
  requests,
  myRequests, filteredClientRequests, historicClientRequests, historicProRequests, proRequests,
  clientStatusFilter,
  totalRevenueMonth, completedCount, avgTicket, revenueChartOption,
  loadData, handleUpdateStatus,
} = useRequests()

const {
  findProfessional,
  filterCategory, filterPlan, filterUf, filterCidade, filterBairro,
  directoryPage,
  availableCategories, availableUfs, availableCidades, availableBairros,
  filteredProfessionals, totalPages, paginatedProfessionals,
  prataBronzeCount, visibleProfessionals, resetDirectoryFilters,
} = useProfessionals()

const {
  displayPlans, requestUsage, canReceiveRequests,
  planMap, hasFeature,
  PLAN_LABELS, PLAN_PRICES,
  subscribePlan, handleOpenPortal,
} = usePlans()

const {
  selectedCategory, clientName, clientPhone, clientAddress, notes,
  imagePreview, photoFile, isAnalyzing, latestAiResult, createdOrderSuccess,
  sendMode, formError, selectedProfessional, aiReadyToast, directCandidates,
  handlePhotoUpload, handleAnalyzeWithAI, handleConfirmOrder,
  handleChooseProfessional, clearProfessionalSelection,
} = useQuoteForm()

const {
  viewReceiptModal, rateOrderModal, scheduleModal,
  ratingStars, schedulePrice,
} = useUi()

// ---------- Views públicas (landing + diretório) em src/views ----------

const fileInputRef = ref<HTMLInputElement | null>(null)

function getWhatsAppLink(phone: string, text: string) {
  const cleanPhone = phone.replace(/\D/g, '')
  const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`
}

onMounted(() => {
  loadData()
  hydrateAuth()
  trackEvent('page_view_landing', { path: window.location.pathname })
  window.addEventListener('scroll', onPageScroll, { passive: true })
  onPageScroll()
  // Reavalia o header quando a landing entra em cena (scroll state global fica no shell — ruling 8)
  watch(isLanding, (v) => {
    if (v) nextTick(() => { onPageScroll() })
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onPageScroll)
})
</script>
<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
    <AppHeader />

    <AuthModal v-if="showAuth" />

    <!-- MAIN CONTENT AREA -->
    <main :class="[isLanding ? 'flex-1 w-full' : 'flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6']">
      <LandingView v-if="activeTab === 'boas_vindas'" />
      <DirectoryView v-if="activeTab === 'profissionais'" />
      <!-- MODE CLIENT: TAB 1 - SOLICITAR COM IA -->
      <div v-if="userMode === 'client' && activeTab === 'solicitar'" class="space-y-6 animate-in fade-in duration-300">
        <ClientSubTabs :active="activeTab" />

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
        <ClientSubTabs :active="activeTab" />

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
        <ClientSubTabs :active="activeTab" />

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
        <ClientSubTabs :active="activeTab" />

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
        <ProSubTabs :active="activeTab" />

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
                  <span v-if="(req.ai_analysis?.suggestedMinPrice ?? 0) > 0 || (req.ai_analysis?.suggestedMaxPrice ?? 0) > 0" class="text-base font-extrabold text-white">
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
        <ProSubTabs :active="activeTab" />

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

      <!-- MODE PRO: HISTÓRICO DE ATENDIMENTOS -->
      <div v-if="userMode === 'pro' && activeTab === 'historico_pro'" class="space-y-6 animate-in fade-in duration-300">
        <ProSubTabs :active="activeTab" />

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

    <UpgradeModal />
    <OnboardingPlansModal />

    <ScheduleModal />

    <RateModal />

    <ReceiptModal />

    <!-- MODAL DE EDIÇÃO DE PERFIL / CONTA -->
    <ProfileEditModal
      :open="showProfileModal"
      :role="userMode === 'pro' ? 'pro' : 'client'"
      :professional="proProfile.id ? proProfile : null"
      :auth-id="authUser?.id ?? null"
      :user="userProfile"
      :categories="CATEGORIES.map(c => c.name)"
      @close="showProfileModal = false"
      @saved="handleProfileModalSaved"
    />

    <AppFooter />
    <ToastHost />
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