<script setup lang="ts">
import { ref } from 'vue'
import { CATEGORIES } from '../../lib/categories'
import { useAuth } from '../../composables/useAuth'
import { useNavigation } from '../../composables/useNavigation'
import { useProfessionals } from '../../composables/useProfessionals'
import { usePlans } from '../../composables/usePlans'
import { useQuoteForm } from '../../composables/useQuoteForm'
import ClientSubTabs from '../../components/layout/ClientSubTabs.vue'
import ProfessionalCard from '../../components/ProfessionalCard.vue'
import {
  ArrowRight,
  Bot,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Star,
  Upload,
  User,
  Users,
  X,
} from 'lucide-vue-next'

const { userMode } = useAuth()
const { activeTab, goToTab } = useNavigation()
const {
  findProfessional,
  filterCategory, filterPlan, filterUf, filterCidade, filterBairro,
  directoryPage,
  availableCategories, availableUfs, availableCidades, availableBairros,
  filteredProfessionals, totalPages, paginatedProfessionals,
  visibleProfessionals, prataBronzeCount,
  resetDirectoryFilters,
} = useProfessionals()
const { planMap, PLAN_LABELS } = usePlans()
const {
  selectedCategory, clientName, clientPhone, clientAddress, notes,
  imagePreview, photoFile, isAnalyzing, latestAiResult, createdOrderSuccess,
  sendMode, formError, selectedProfessional, aiReadyToast, directCandidates,
  handlePhotoUpload, handleAnalyzeWithAI, handleConfirmOrder,
  handleChooseProfessional, clearProfessionalSelection,
} = useQuoteForm()

const fileInputRef = ref<HTMLInputElement | null>(null)
</script>

<template>
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
              @click="goToTab('meus_pedidos'); createdOrderSuccess = null"
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
</template>
