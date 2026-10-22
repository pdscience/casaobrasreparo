<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'
import type { PortfolioItem } from '../types'
import { useI18n } from '../composables/useI18n'
import { useUi } from '../composables/useUi'

const props = defineProps<{
  open: boolean
  photos: PortfolioItem[]
  index: number
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'update:index', value: number): void
}>()

const { t } = useI18n()
const { photoLightboxOpen } = useUi()
const closeButton = ref<HTMLButtonElement | null>(null)
let previousOverflow = ''

const current = computed(() => props.photos[props.index] ?? null)
const hasMultiple = computed(() => props.photos.length > 1)
const caption = computed(() => current.value?.caption?.trim() || t('portfolio.captionFallback'))

function close(): void {
  emit('update:open', false)
}

function go(delta: number): void {
  if (!props.photos.length) return
  const next = (props.index + delta + props.photos.length) % props.photos.length
  emit('update:index', next)
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'ArrowLeft') {
    go(-1)
  } else if (event.key === 'ArrowRight') {
    go(1)
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    photoLightboxOpen.value = isOpen
    if (typeof document === 'undefined') return
    if (isOpen) {
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      await nextTick()
      closeButton.value?.focus()
    } else {
      document.body.style.overflow = previousOverflow
    }
  },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  photoLightboxOpen.value = false
  if (typeof document !== 'undefined') document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && current"
      class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      :aria-label="t('portfolio.title')"
      @click.self="close"
    >
      <button
        ref="closeButton"
        type="button"
        class="absolute right-4 top-4 rounded-full bg-slate-900/80 p-2.5 text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        :aria-label="t('portfolio.close')"
        @click="close"
      >
        <X class="h-5 w-5" />
      </button>

      <button
        v-if="hasMultiple"
        type="button"
        class="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 p-2.5 text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:left-6"
        :aria-label="t('portfolio.previous')"
        @click.stop="go(-1)"
      >
        <ChevronLeft class="h-6 w-6" />
      </button>

      <figure class="flex max-h-full w-full max-w-3xl flex-col items-center gap-3">
        <img
          :src="current.url"
          :alt="caption"
          class="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
        />
        <figcaption class="max-w-xl text-center text-sm text-slate-200">
          {{ caption }}
        </figcaption>
        <span v-if="hasMultiple" class="rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-white/10">
          {{ index + 1 }} / {{ photos.length }}
        </span>
      </figure>

      <button
        v-if="hasMultiple"
        type="button"
        class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 p-2.5 text-slate-300 ring-1 ring-white/10 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:right-6"
        :aria-label="t('portfolio.next')"
        @click.stop="go(1)"
      >
        <ChevronRight class="h-6 w-6" />
      </button>
    </div>
  </Teleport>
</template>
