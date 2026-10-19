<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Heart, MapPin, Share2, Star, User, Wrench, X } from 'lucide-vue-next'
import { useUi } from '../composables/useUi'
import { useFavorites } from '../composables/useFavorites'
import { usePlans } from '../composables/usePlans'
import { useQuoteForm } from '../composables/useQuoteForm'
import { useI18n } from '../composables/useI18n'
import { getProfessionalReviews } from '../api/insforgeService'
import { clampStars, formatReviewDate, type ProfessionalReview } from '../lib/reviews'
import { shareProfessional } from '../lib/share'
import { countryName } from '../lib/geo'

const { profileModalPro, pushToast } = useUi()
const { isFavorite, toggleFavorite } = useFavorites()
const { planMap } = usePlans()
const { handleChooseProfessional } = useQuoteForm()
const { t, categoryText, planText, lang } = useI18n()

const reviews = ref<ProfessionalReview[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref(false)
let requestSeq = 0

const pro = computed(() => profileModalPro.value)
const primaryCategory = computed(() => pro.value?.categories?.[0] || pro.value?.category || '')
const extraCategories = computed(() => {
  if (!pro.value) return 0
  return Math.max(0, (pro.value.categories?.length || 1) - 1)
})
const cityLine = computed(() => {
  if (!pro.value) return ''
  const place = [pro.value.cidade?.trim(), pro.value.uf?.trim().toUpperCase()].filter(Boolean).join(' - ')
  const country = pro.value.country_code ? countryName(pro.value.country_code, lang.value) : ''
  return [place, country].filter(Boolean).join(' · ')
})

watch(pro, async (current) => {
  const seq = ++requestSeq
  reviews.value = []
  reviewsError.value = false
  if (!current) return
  reviewsLoading.value = true
  try {
    const data = await getProfessionalReviews(current.id)
    if (seq === requestSeq) reviews.value = data
  } catch {
    if (seq === requestSeq) reviewsError.value = true
  } finally {
    if (seq === requestSeq) reviewsLoading.value = false
  }
}, { immediate: true })

function close(): void {
  profileModalPro.value = null
}

async function handleShare(): Promise<void> {
  if (!pro.value) return
  const mode = await shareProfessional(pro.value, {
    share: typeof navigator !== 'undefined' && navigator.share
      ? (data) => navigator.share(data)
      : undefined,
    clipboard: typeof navigator !== 'undefined' ? navigator.clipboard : undefined,
    open: (url) => window.open(url, '_blank', 'noopener'),
  })
  if (mode === 'clipboard') pushToast('success', t('profile.shareCopied'))
  if (mode === 'shared') pushToast('success', t('profile.shareCopied'))
  if (mode === 'whatsapp') pushToast('info', t('profile.share'))
}

function requestQuote(): void {
  if (!pro.value) return
  const target = pro.value
  close()
  handleChooseProfessional(target)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
<div
  v-if="pro"
  class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
  role="dialog"
  aria-modal="true"
  :aria-label="t('profile.title')"
  @click.self="close"
>
  <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
    <div class="flex items-start gap-3 p-5 border-b border-slate-800">
      <img
        v-if="pro.avatar"
        :src="pro.avatar"
        :alt="pro.name"
        class="w-16 h-16 rounded-2xl object-cover border-2 border-slate-950 ring-2 ring-amber-500/40 shrink-0"
      />
      <div v-else class="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-950 ring-2 ring-amber-500/40 flex items-center justify-center shrink-0">
        <User class="w-7 h-7 text-slate-500" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-bold text-white text-base leading-tight truncate">{{ pro.name }}</h3>
          <button type="button" @click="close" :aria-label="t('common.close')" class="text-slate-400 hover:text-white shrink-0">
            <X class="w-5 h-5" />
          </button>
        </div>
        <p class="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-lg bg-amber-400/10 border border-amber-500/40 text-[11px] font-extrabold uppercase tracking-wide text-amber-300">
          <Wrench class="w-3 h-3 shrink-0" />
          <span class="truncate">{{ extraCategories > 0 ? `${categoryText(primaryCategory)} +${extraCategories}` : categoryText(primaryCategory) }}</span>
        </p>
        <p v-if="cityLine" class="flex items-center gap-1 text-[12px] text-slate-300 mt-1">
          <MapPin class="w-3 h-3 shrink-0 text-slate-500" />
          <span class="truncate">{{ cityLine }}</span>
        </p>
      </div>
    </div>

    <div class="p-5 space-y-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-full px-2.5 py-1">
          <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span class="text-[12px] font-bold text-slate-200">{{ pro.rating ?? 0 }}</span>
          <span class="text-[11px] text-slate-500">({{ pro.reviews_count ?? 0 }})</span>
        </span>
        <span v-if="planMap.get(pro.plan)" class="text-[10px] font-bold px-2 py-1 rounded-full border" :class="[planMap.get(pro.plan)?.badge_bg, planMap.get(pro.plan)?.badge_text, planMap.get(pro.plan)?.badge_border]">
          {{ planText(pro.plan) }}
        </span>
      </div>

      <p class="text-[13px] text-slate-200 leading-relaxed">
        {{ pro.bio?.trim() || t('card.noDescription') }}
      </p>

      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{{ t('card.neighborhoodsServed') }}</p>
        <div v-if="pro.coverage_bairros?.length" class="flex flex-wrap gap-1 mt-1.5">
          <span v-for="bairro in pro.coverage_bairros" :key="bairro" class="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300">
            {{ bairro }}
          </span>
        </div>
        <p v-else class="text-[11px] text-slate-400 mt-0.5">{{ t('card.wholeRegion') }}</p>
      </div>

      <div v-if="pro.portfolio_photos?.length" class="space-y-1.5">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{{ t('profile.viewPortfolio') }}</p>
        <div class="flex gap-2 overflow-x-auto pb-1">
          <img
            v-for="(url, i) in pro.portfolio_photos"
            :key="i"
            :src="url"
            :alt="t('card.workPhoto')"
            class="w-24 h-24 rounded-xl object-cover border border-slate-800 shrink-0"
          />
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white">{{ t('profile.reviews') }}</h4>
          <span v-if="pro.reviews_count" class="text-[11px] text-slate-400">
            {{ t('profile.ratingSummary', { rating: pro.rating ?? 0, count: pro.reviews_count ?? 0 }) }}
          </span>
        </div>
        <p v-if="reviewsLoading" class="text-[12px] text-slate-400">{{ t('common.loading') }}</p>
        <p v-else-if="reviewsError" class="text-[12px] text-slate-400">{{ t('profile.reviewsUnavailable') }}</p>
        <p v-else-if="reviews.length === 0" class="text-[12px] text-slate-400">{{ t('profile.noReviews') }}</p>
        <div v-else class="space-y-2">
          <div v-for="(review, i) in reviews" :key="i" class="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-0.5">
                <Star
                  v-for="n in 5"
                  :key="n"
                  class="w-3 h-3"
                  :class="n <= clampStars(review.stars) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'"
                />
              </div>
              <span v-if="review.review_date" class="text-[10px] text-slate-500">{{ formatReviewDate(review.review_date, lang) }}</span>
            </div>
            <p class="text-[12px] text-slate-300 mt-1.5">{{ review.comment || t('profile.noReviews') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2 p-5 pt-0">
      <button
        type="button"
        @click="requestQuote"
        class="flex-1 min-w-[140px] px-3 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-all"
      >
        {{ t('profile.chooseAndRequest') }}
      </button>
      <button
        type="button"
        @click="toggleFavorite(pro.id)"
        :aria-pressed="isFavorite(pro.id)"
        class="px-3 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
        :class="isFavorite(pro.id) ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'"
      >
        <Heart class="w-4 h-4" :class="isFavorite(pro.id) ? 'fill-rose-500 text-rose-500' : ''" />
        {{ isFavorite(pro.id) ? t('profile.unfavorite') : t('profile.favorite') }}
      </button>
      <button
        type="button"
        @click="handleShare"
        class="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:text-white transition-all flex items-center gap-1.5"
      >
        <Share2 class="w-4 h-4" />
        {{ t('profile.share') }}
      </button>
    </div>
  </div>
</div>
</template>
