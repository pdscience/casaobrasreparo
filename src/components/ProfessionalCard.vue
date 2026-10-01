<script setup lang="ts">
import { computed } from 'vue'
import type { Professional, Plan } from '../types'
import { Star, MessageCircle, X, MapPin, FileText, User } from 'lucide-vue-next'
import { buildWhatsAppLink } from '../lib/whatsapp'

const props = defineProps<{
  professional: Professional
  planInfo: Plan | null
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'choose', professional: Professional): void
  (e: 'clear'): void
}>()

const cityLine = computed(() => {
  const city = props.professional.cidade?.trim() || ''
  const uf = props.professional.uf?.trim().toUpperCase() || ''
  if (city && uf) return `${city} - ${uf}`
  return city || uf || ''
})

</script>

<template>
  <div
    class="bg-slate-900 rounded-2xl border flex flex-col transition-all overflow-hidden"
    :class="selected ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-800 hover:border-amber-500/30 hover:shadow-lg hover:shadow-black/30'"
  >
    <!-- FAIXA DO PLANO -->
    <div class="h-10" :class="planInfo?.badge_bg || 'bg-slate-800/70'"></div>

    <!-- CABEÇALHO: FOTO + NOME + PROFISSÃO + CIDADE/UF -->
    <div class="flex items-start gap-3 px-4 pb-4 -mt-7">
      <img
        v-if="professional.avatar"
        :src="professional.avatar"
        :alt="professional.name"
        class="w-16 h-16 rounded-2xl object-cover border-2 border-slate-950 shrink-0 ring-2 ring-amber-500/40"
      />
      <div
        v-else
        class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-950 shrink-0 ring-2 ring-amber-500/40 flex items-center justify-center"
      >
        <User class="w-7 h-7 text-slate-500" />
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="font-bold text-white text-sm leading-tight truncate">{{ professional.name }}</p>
          <span
            v-if="professional.plan"
            :class="[planInfo?.badge_bg, planInfo?.badge_text, planInfo?.badge_border]"
            class="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0"
          >
            {{ professional.plan }}
          </span>
        </div>
        <p class="text-xs text-amber-400 font-semibold mt-0.5 truncate">{{ professional.category }}</p>
        <p v-if="cityLine" class="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
          <MapPin class="w-3 h-3 shrink-0 text-slate-500" />
          {{ cityLine }}
        </p>
        <span class="inline-flex items-center gap-1.5 mt-1.5 bg-slate-950/70 border border-slate-800 rounded-full px-2 py-0.5">
          <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
          <span class="text-[11px] font-bold text-slate-200">{{ professional.rating ?? 0 }}</span>
          <span class="text-[10px] text-slate-500">({{ professional.reviews_count ?? 0 }})</span>
        </span>
      </div>
    </div>

    <!-- BAIRROS DE COBERTURA -->
    <div class="px-4 pb-3">
      <div class="flex items-start gap-2 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        <MapPin class="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <div class="min-w-0">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Bairros atendidos</p>
          <div v-if="professional.coverage_bairros?.length" class="flex flex-wrap gap-1 mt-1.5">
            <span
              v-for="bairro in professional.coverage_bairros"
              :key="bairro"
              class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300"
            >
              {{ bairro }}
            </span>
          </div>
          <p v-else class="text-[11px] text-slate-400 mt-0.5">Atende toda a região</p>
        </div>
      </div>
    </div>

    <!-- DESCRIÇÃO / EXPERIÊNCIA -->
    <div class="px-4 pb-3 flex-1">
      <div class="flex items-start gap-2">
        <FileText class="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p class="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
          {{ professional.bio?.trim() || 'Profissional sem descrição ainda.' }}
        </p>
      </div>
    </div>

    <!-- AÇÕES -->
    <div class="flex items-center gap-2 p-4 pt-0 border-t border-slate-800 mt-auto">
      <a
        v-if="planInfo?.show_whatsapp_to_client && professional.phone"
        :href="buildWhatsAppLink(professional.phone, 'Olá! Gostaria de um orçamento.')"
        target="_blank"
        rel="noopener noreferrer"
        class="flex-1 px-3 py-2 rounded-xl bg-green-600 text-white text-[11px] font-bold hover:bg-green-500 transition-all flex items-center justify-center gap-1.5"
      >
        <MessageCircle class="w-3.5 h-3.5" />
        WhatsApp
      </a>
      <button
        v-if="selectable && !selected"
        type="button"
        @click="emit('choose', professional)"
        class="flex-1 px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25"
      >
        Escolher e solicitar
      </button>
      <button
        v-if="selectable && selected"
        type="button"
        @click="emit('clear')"
        title="Cancelar seleção"
        class="flex-1 px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 bg-red-500/15 text-red-300 border border-red-500/40 hover:bg-red-500/25"
      >
        <X class="w-3.5 h-3.5" />
        Cancelar
      </button>
    </div>
  </div>
</template>
