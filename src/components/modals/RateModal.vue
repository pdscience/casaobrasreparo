<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import { useUi } from '../../composables/useUi'
import { useRequests } from '../../composables/useRequests'
import { useI18n } from '../../composables/useI18n'
import { Star, X } from 'lucide-vue-next'

const { proProfile } = useAuth()
const { rateOrderModal, ratingStars, ratingComment } = useUi()
const { handleSaveRating } = useRequests()
const { t, categoryText } = useI18n()
</script>

<template>
<!-- MODAL 2: RATE SERVICE -->
<div v-if="rateOrderModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
  <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="font-bold text-white text-sm flex items-center gap-2">
        <Star class="w-4 h-4 text-amber-400 fill-amber-400" />
        {{ t('modals.rateTitle') }}
      </h3>
      <button @click="rateOrderModal = null" class="text-slate-400 hover:text-white">
        <X class="w-5 h-5" />
      </button>
    </div>

    <div class="space-y-4 text-xs text-center">
      <p class="text-slate-300">
        {{ t('modals.rateDesc', { name: proProfile.name, category: categoryText(rateOrderModal.category) }) }}
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
          :placeholder="t('modals.ratePlaceholder')"
        />
      </div>
    </div>

    <div class="flex gap-2">
      <button
        @click="handleSaveRating"
        class="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all"
      >
        {{ t('modals.sendRating') }}
      </button>
      <button
        @click="rateOrderModal = null"
        class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
      >
        {{ t('modals.cancel') }}
      </button>
    </div>
  </div>
</div>
</template>
