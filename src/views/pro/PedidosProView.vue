<script setup lang="ts">
import { statusSteps } from '../../lib/requestStatus'
import { buildWhatsAppLink } from '../../lib/whatsapp'
import { useAuth } from '../../composables/useAuth'
import { useNavigation } from '../../composables/useNavigation'
import { useRequests } from '../../composables/useRequests'
import { usePlans } from '../../composables/usePlans'
import { useUi } from '../../composables/useUi'
import ProSubTabs from '../../components/layout/ProSubTabs.vue'
import {
  SlidersHorizontal,
  Lock,
  Sparkles,
  MapPin,
  Calendar,
  Wrench,
  CheckCircle2,
  MessageSquare,
  Clock,
} from 'lucide-vue-next'

const { userMode, proProfile } = useAuth()
const { activeTab, goToTab } = useNavigation()
const { proRequests, handleUpdateStatus } = useRequests()
const { canReceiveRequests } = usePlans()
const { scheduleModal, schedulePrice } = useUi()
</script>

<template>
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
              @click="goToTab('perfil_pro')"
              class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Sparkles class="w-4 h-4" />
              Ver Planos
            </button>
            <button
              @click="goToTab('perfil_pro')"
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
                  :href="buildWhatsAppLink(req.client_phone, `Olá ${req.client_name}! Aqui é o ${proProfile.name}, prestador de serviços. Vi sua solicitação #${req.id} de ${req.category} e estou disponível para o atendimento.`)"
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
</template>
