<script setup lang="ts">
import { ref } from 'vue'
import { Maximize2 } from 'lucide-vue-next'
import type { PortfolioItem } from '../types'
import { useI18n } from '../composables/useI18n'
import PhotoLightbox from './PhotoLightbox.vue'

defineProps<{
  photos: PortfolioItem[]
}>()

const { t } = useI18n()
const lightboxOpen = ref(false)
const activeIndex = ref(0)

function openAt(index: number): void {
  activeIndex.value = index
  lightboxOpen.value = true
}

function captionOf(photo: PortfolioItem): string {
  return photo.caption?.trim() || t('portfolio.captionFallback')
}
</script>

<template>
  <div v-if="photos.length" class="space-y-2">
    <div class="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      <button
        v-for="(photo, index) in photos"
        :key="photo.url"
        type="button"
        class="group relative aspect-[4/3] w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-white/10 transition-all hover:ring-amber-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-44"
        :aria-label="`${t('portfolio.viewPhoto')} ${index + 1}`"
        @click="openAt(index)"
      >
        <img
          :src="photo.url"
          :alt="captionOf(photo)"
          loading="lazy"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent"></span>
        <span class="absolute bottom-2 left-2 right-2 line-clamp-2 text-left text-[11px] font-semibold leading-tight text-white">
          {{ captionOf(photo) }}
        </span>
        <span class="absolute right-2 top-2 rounded-full bg-slate-950/70 p-1.5 opacity-0 ring-1 ring-white/10 transition-opacity group-hover:opacity-100">
          <Maximize2 class="h-3.5 w-3.5 text-white" />
        </span>
      </button>
    </div>

    <PhotoLightbox
      v-model:open="lightboxOpen"
      v-model:index="activeIndex"
      :photos="photos"
    />
  </div>
</template>
