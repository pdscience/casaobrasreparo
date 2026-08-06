<script setup lang="ts">
import type { Professional, Plan } from '../types'
import { Star, MessageCircle } from 'lucide-vue-next'

defineProps<{
  professional: Professional
  planInfo: Plan | null
}>()

function getWhatsAppLink(phone: string, text: string) {
  const clean = phone.replace(/\D/g, '')
  const formatted = clean.length <= 11 ? `55${clean}` : clean
  return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`
}
</script>

<template>
  <div class="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <img
        v-if="professional.avatar"
        :src="professional.avatar"
        :alt="professional.name"
        class="w-10 h-10 rounded-full object-cover border border-slate-700"
      />
      <div v-else class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
        <span class="text-xs text-slate-500">{{ professional.name?.charAt(0) }}</span>
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-bold text-white text-xs truncate">{{ professional.name }}</p>
          <span
            v-if="planInfo?.badge_label"
            :class="[planInfo.badge_bg, planInfo.badge_text, planInfo.badge_border]"
            class="text-[9px] font-bold px-2 py-0.5 rounded-full border"
          >
            {{ planInfo.badge_label }}
          </span>
        </div>
        <p class="text-[10px] text-slate-400">{{ professional.category }}</p>
        <div class="flex items-center gap-1 mt-0.5">
          <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
          <span class="text-[10px] text-slate-300">
            {{ professional.rating ?? 0 }}
            <span class="text-slate-500">({{ professional.reviews_count ?? 0 }})</span>
          </span>
        </div>
      </div>
    </div>

    <a
      v-if="planInfo?.show_whatsapp_to_client && professional.phone"
      :href="getWhatsAppLink(professional.phone, 'Olá! Gostaria de um orçamento.')"
      target="_blank"
      rel="noopener noreferrer"
      class="shrink-0 px-3 py-2 rounded-xl bg-green-600 text-white text-[10px] font-bold hover:bg-green-500 transition-all flex items-center gap-1"
    >
      <MessageCircle class="w-3.5 h-3.5" />
      WhatsApp
    </a>
  </div>
</template>
