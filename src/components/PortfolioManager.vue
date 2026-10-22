<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ImagePlus, Loader2, Trash2 } from 'lucide-vue-next'
import type { PortfolioItem } from '../types'
import {
  canAddPortfolioPhoto,
  normalizePortfolioItems,
  portfolioPhotoCountLabel,
  remainingPhotoSlots,
  sanitizeCaption,
} from '../lib/portfolio'
import { compressPortfolioImage, removePortfolioFile, updateProfessional, uploadPortfolioPhoto } from '../api/insforgeService'
import { pushToast } from '../composables/useUi'
import { useI18n } from '../composables/useI18n'

const props = defineProps<{
  professionalId: string
  ownerId: string | null
  items: PortfolioItem[]
}>()

const emit = defineEmits<{
  (e: 'saved', items: PortfolioItem[]): void
}>()

const { t } = useI18n()
const items = ref<PortfolioItem[]>(normalizePortfolioItems(props.items))
const uploading = ref(false)
const saving = ref(false)
const error = ref('')

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 8 * 1024 * 1024

const countLabel = computed(() => portfolioPhotoCountLabel(items.value.length))
const canAdd = computed(() => canAddPortfolioPhoto(items.value.length))
const busy = computed(() => uploading.value || saving.value)

watch(
  () => props.items,
  (next) => {
    if (!saving.value && !uploading.value) items.value = normalizePortfolioItems(next)
  },
  { deep: true },
)

async function persist(next: PortfolioItem[], successKey?: string): Promise<boolean> {
  saving.value = true
  error.value = ''
  try {
    const updated = await updateProfessional(props.professionalId, { portfolio_items: next })
    items.value = normalizePortfolioItems(updated.portfolio_items)
    emit('saved', items.value)
    if (successKey) pushToast('success', t(successKey))
    return true
  } catch (err) {
    console.error('Erro ao salvar galeria:', err)
    error.value = t('portfolio.saveError')
    items.value = normalizePortfolioItems(props.items)
    return false
  } finally {
    saving.value = false
  }
}

async function onFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  error.value = ''

  if (!props.ownerId) {
    error.value = t('portfolio.loginError')
    return
  }
  const slots = remainingPhotoSlots(items.value.length)
  if (slots <= 0) {
    error.value = t('portfolio.limitReached')
    return
  }

  uploadFiles(files.slice(0, slots), props.ownerId)
}

async function uploadFiles(files: File[], ownerId: string): Promise<void> {
  uploading.value = true
  error.value = ''
  const uploaded: PortfolioItem[] = []

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      error.value = t('portfolio.invalidType')
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      error.value = t('portfolio.tooLarge')
      continue
    }
    try {
      const compressed = await compressPortfolioImage(file)
      const url = await uploadPortfolioPhoto(compressed, ownerId)
      uploaded.push({ url, caption: '' })
    } catch (err) {
      console.error('Erro ao enviar foto da galeria:', err)
      error.value = t('portfolio.uploadError')
    }
  }

  uploading.value = false
  if (!uploaded.length) return

  const next = normalizePortfolioItems([...items.value, ...uploaded])
  await persist(next, 'portfolio.uploadSuccess')
}

async function saveCaption(index: number): Promise<void> {
  const current = items.value[index]
  if (!current) return
  const caption = sanitizeCaption(current.caption ?? '')
  if (caption !== current.caption) {
    items.value = items.value.map((item, i) => (i === index ? { ...item, caption } : item))
  }
  const next = items.value.map((item) => ({ ...item }))
  const previous = normalizePortfolioItems(props.items)
  if (JSON.stringify(next) === JSON.stringify(previous)) return
  await persist(next, 'portfolio.captionSaved')
}

async function removeAt(index: number): Promise<void> {
  if (busy.value) return
  const target = items.value[index]
  if (!target) return
  const next = items.value.filter((_, i) => i !== index)
  const ok = await persist(next, 'portfolio.removeSuccess')
  if (ok) void removePortfolioFile(target.url)
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-start justify-between gap-2">
      <p class="text-[11px] leading-relaxed text-slate-400">{{ t('portfolio.ownerHint') }}</p>
      <span class="shrink-0 rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-bold text-slate-400">
        {{ countLabel }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div
        v-for="(item, index) in items"
        :key="item.url"
        class="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
      >
        <div class="relative aspect-[4/3]">
          <img :src="item.url" :alt="item.caption || t('portfolio.captionFallback')" class="h-full w-full object-cover" />
          <span class="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold text-slate-300 ring-1 ring-white/10">
            {{ index + 1 }}
          </span>
          <button
            type="button"
            class="absolute right-2 top-2 rounded-full bg-slate-950/80 p-1.5 text-slate-300 ring-1 ring-white/10 transition-colors hover:text-rose-300 disabled:opacity-40"
            :aria-label="t('portfolio.remove')"
            :disabled="busy"
            @click="removeAt(index)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
        <input
          v-model="item.caption"
          type="text"
          maxlength="80"
          :placeholder="t('portfolio.captionPlaceholder')"
          :aria-label="t('portfolio.captionPlaceholder')"
          class="w-full border-t border-slate-800 bg-slate-950 px-2.5 py-2 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          @blur="saveCaption(index)"
        />
      </div>

      <label
        v-if="canAdd"
        class="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 text-slate-400 transition-colors hover:border-amber-500/50 hover:text-amber-300"
        :class="busy ? 'pointer-events-none opacity-60' : ''"
      >
        <Loader2 v-if="uploading" class="h-5 w-5 animate-spin" />
        <ImagePlus v-else class="h-5 w-5" />
        <span class="text-[11px] font-bold">{{ uploading ? t('portfolio.uploading') : t('portfolio.add') }}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          class="hidden"
          :disabled="busy"
          @change="onFiles"
        />
      </label>
    </div>

    <p v-if="!canAdd" class="text-[11px] text-amber-300/80">{{ t('portfolio.limitReached') }}</p>
    <p v-if="error" class="text-[11px] text-rose-300">{{ error }}</p>
    <p v-else-if="saving" class="text-[11px] text-slate-400">{{ t('common.saving') }}</p>
  </div>
</template>
