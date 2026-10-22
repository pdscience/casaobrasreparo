<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Heart, Images, MapPin, Share2, Star, User, Wrench, X } from 'lucide-vue-next'
import { useUi } from '../composables/useUi'
import { useFavorites } from '../composables/useFavorites'
import { usePlans } from '../composables/usePlans'
import { useQuoteForm } from '../composables/useQuoteForm'
import { useI18n } from '../composables/useI18n'
import { getProfessionalReviews } from '../api/insforgeService'
import { normalizePortfolioItems, portfolioPhotoCountLabel } from '../lib/portfolio'
import { clampStars, formatReviewDate, type ProfessionalReview } from '../lib/reviews'
import { shareProfessional } from '../lib/share'
import { countryName } from '../lib/geo'
import ProfessionalGallery from './ProfessionalGallery.vue'

const { profileModalPro, photoLightboxOpen, pushToast } = useUi()
const { isFavorite, toggleFavorite } = useFavorites()
const { planMap } = usePlans()
const { handleChooseProfessional } = useQuoteForm()
const { t, categoryText, planText, lang } = useI18n()

const reviews = ref<ProfessionalReview[]>([])
const reviewsLoading = ref(false)
const reviewsError = ref(false)
let requestSeq = 0
let previousOverflow = ''

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
const portfolio = computed(() => normalizePortfolioItems(pro.value?.portfolio_items))
const coverPhoto = computed(() => portfolio.value[0]?.url ?? '')
const ratingSummary = computed(() => {
  const count = pro.value?.reviews_count ?? 0
  return t(count === 1 ? 'profile.ratingSummaryOne' : 'profile.ratingSummary', {
    rating: pro.value?.rating ?? 0,
    count,
  })
})

watch(pro, async (current) => {
  if (typeof document !== 'undefined') {
    if (current) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = previousOverflow
    }
  }

  const seq = ++requestSeq
  reviews.value = []
  reviewsError.value = false
  if (!current) {
    reviewsLoading.value = false
    return
  }
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
  if (event.key === 'Escape' && !photoLightboxOpen.value) close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow
})
</script>

<template>
<div
  v-if="pro"
  class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 backdrop-blur-md sm:items-center sm:p-4"
  role="dialog"
  aria-modal="true"
  :aria-label="t('profile.title')"
  @click.self="close"
>
  <div class="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-800/80 bg-slate-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/5 animate-in zoom-in-95 duration-200 sm:rounded-3xl">
    <div class="min-h-0 flex-1 overflow-y-auto">
      <!-- CAPA / HERO -->
      <header class="relative">
        <div class="relative h-40 overflow-hidden bg-slate-800 sm:h-48">
          <img v-if="coverPhoto" :src="coverPhoto" :alt="pro.name" class="h-full w-full object-cover" />
          <div
            v-else
            class="absolute inset-0 bg-slate-950"
            :style="{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(245,158,11,0.28), transparent 45%), radial-gradient(circle at 85% 0%, rgba(139,92,246,0.25), transparent 40%)' }"
          >
            <Wrench class="absolute -bottom-8 -right-4 h-44 w-44 rotate-12 text-white/[0.04]" />
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent"></div>

          <button
            type="button"
            @click="close"
            :aria-label="t('common.close')"
            class="absolute right-3 top-3 rounded-full bg-slate-950/60 p-2 text-slate-300 ring-1 ring-white/10 backdrop-blur transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X class="h-5 w-5" />
          </button>

          <span
            v-if="portfolio.length"
            class="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-slate-300 ring-1 ring-white/10 backdrop-blur"
          >
            <Images class="h-3 w-3 text-amber-400" />
            {{ portfolioPhotoCountLabel(portfolio.length) }}
          </span>
        </div>

        <div class="relative z-10 px-5">
          <div class="flex items-end gap-4 -mt-10 sm:-mt-12">
            <img
              v-if="pro.avatar"
              :src="pro.avatar"
              :alt="pro.name"
              class="h-20 w-20 shrink-0 rounded-2xl border border-white/10 object-cover shadow-2xl ring-4 ring-slate-900 sm:h-24 sm:w-24"
            />
            <div v-else class="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-800 shadow-2xl ring-4 ring-slate-900 sm:h-24 sm:w-24">
              <User class="h-8 w-8 text-slate-500" />
            </div>

            <div class="min-w-0 pb-1">
              <h3 class="truncate text-lg font-bold leading-tight text-white sm:text-xl">{{ pro.name }}</h3>
              <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  v-if="planMap.get(pro.plan)"
                  class="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                  :class="[planMap.get(pro.plan)?.badge_bg, planMap.get(pro.plan)?.badge_text, planMap.get(pro.plan)?.badge_border]"
                >
                  {{ planText(pro.plan) }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-950/70 px-2 py-0.5">
                  <Star class="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span class="text-[11px] font-bold text-slate-200">{{ pro.rating ?? 0 }}</span>
                  <span class="text-[10px] text-slate-500">({{ pro.reviews_count ?? 0 }})</span>
                </span>
              </div>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-300">
              <Wrench class="h-3 w-3 shrink-0" />
              <span class="truncate">{{ extraCategories > 0 ? `${categoryText(primaryCategory)} +${extraCategories}` : categoryText(primaryCategory) }}</span>
            </span>
            <span v-if="cityLine" class="inline-flex min-w-0 items-center gap-1 text-[12px] text-slate-300">
              <MapPin class="h-3 w-3 shrink-0 text-slate-500" />
              <span class="truncate">{{ cityLine }}</span>
            </span>
          </div>
        </div>
      </header>

      <div class="space-y-5 px-5 pb-5 pt-4">
        <!-- BIO -->
        <p class="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-[13px] leading-relaxed text-slate-200">
          {{ pro.bio?.trim() || t('card.noDescription') }}
        </p>

        <!-- GALERIA DE SERVICOS -->
        <section v-if="portfolio.length" class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold text-white">{{ t('portfolio.title') }}</h4>
            <span class="text-[11px] text-slate-500">{{ portfolioPhotoCountLabel(portfolio.length) }}</span>
          </div>
          <ProfessionalGallery :photos="portfolio" />
        </section>

        <!-- BAIRROS -->
        <div class="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3.5">
          <p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">{{ t('card.neighborhoodsServed') }}</p>
          <div v-if="pro.coverage_bairros?.length" class="mt-1.5 flex flex-wrap gap-1">
            <span v-for="bairro in pro.coverage_bairros" :key="bairro" class="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
              {{ bairro }}
            </span>
          </div>
          <p v-else class="mt-0.5 text-[11px] text-slate-400">{{ t('card.wholeRegion') }}</p>
        </div>

        <!-- AVALIACOES -->
        <section class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-xs font-bold text-white">{{ t('profile.reviews') }}</h4>
            <span v-if="pro.reviews_count" class="text-[11px] text-slate-400">{{ ratingSummary }}</span>
          </div>
          <p v-if="reviewsLoading" class="text-[12px] text-slate-400">{{ t('common.loading') }}</p>
          <p v-else-if="reviewsError" class="text-[12px] text-slate-400">{{ t('profile.reviewsUnavailable') }}</p>
          <p v-else-if="reviews.length === 0" class="text-[12px] text-slate-400">{{ t('profile.noReviews') }}</p>
          <div v-else class="space-y-2">
            <div v-for="(review, i) in reviews" :key="i" class="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3.5">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-0.5">
                  <Star
                    v-for="n in 5"
                    :key="n"
                    class="h-3 w-3"
                    :class="n <= clampStars(review.stars) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'"
                  />
                </div>
                <span v-if="review.review_date" class="text-[10px] text-slate-500">{{ formatReviewDate(review.review_date, lang) }}</span>
              </div>
              <p class="mt-1.5 text-[12px] text-slate-300">{{ review.comment || t('profile.noComment') }}</p>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ACOES -->
    <footer class="flex items-center gap-2 border-t border-slate-800/80 bg-slate-900/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        @click="requestQuote"
        class="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-300 hover:to-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {{ t('profile.chooseAndRequest') }}
      </button>
      <button
        type="button"
        @click="toggleFavorite(pro.id)"
        :aria-pressed="isFavorite(pro.id)"
        :aria-label="isFavorite(pro.id) ? t('profile.unfavorite') : t('profile.favorite')"
        :title="isFavorite(pro.id) ? t('profile.unfavorite') : t('profile.favorite')"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        :class="isFavorite(pro.id) ? 'border-rose-500/40 bg-rose-500/15 text-rose-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'"
      >
        <Heart class="h-4 w-4" :class="isFavorite(pro.id) ? 'fill-rose-500 text-rose-500' : ''" />
      </button>
      <button
        type="button"
        @click="handleShare"
        :aria-label="t('profile.share')"
        :title="t('profile.share')"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 transition-all hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <Share2 class="h-4 w-4" />
      </button>
    </footer>
  </div>
</div>
</template>
