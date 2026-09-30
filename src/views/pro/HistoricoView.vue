<script setup lang="ts">
import { formatRequestDate } from '../../lib/requestStatus'
import { useAuth } from '../../composables/useAuth'
import { useNavigation } from '../../composables/useNavigation'
import { useRequests } from '../../composables/useRequests'
import ProSubTabs from '../../components/layout/ProSubTabs.vue'
import { History, Star } from 'lucide-vue-next'

const { userMode } = useAuth()
const { activeTab, goToTab } = useNavigation()
const { historicProRequests } = useRequests()
</script>

<template>
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
            @click="goToTab('pedidos_pro')"
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
</template>
