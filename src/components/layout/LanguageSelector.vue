<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Languages, Check, ChevronDown } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'

const { lang, meta, locales, setLang, t } = useI18n()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function select(code: typeof lang.value): void {
  setLang(code)
  open.value = false
}

function onDocumentClick(e: MouseEvent): void {
  if (!rootRef.value) return
  if (!rootRef.value.contains(e.target as Node)) open.value = false
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <!-- TRIGGER -->
    <button
      type="button"
      :aria-label="t('nav.selecionarIdioma')"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :title="t('nav.idioma')"
      @click.stop="open = !open"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all text-xs font-bold text-slate-200"
    >
      <Languages class="w-3.5 h-3.5 text-amber-400" />
      <span class="hidden sm:inline">{{ meta.short }}</span>
      <ChevronDown :class="['w-3 h-3 transition-transform duration-200', open ? 'rotate-180' : '']" />
    </button>

    <!-- DROPDOWN -->
    <div
      v-if="open"
      role="listbox"
      :aria-label="t('nav.selecionarIdioma')"
      class="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in duration-150"
    >
      <div class="px-3 py-2 border-b border-slate-800">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {{ t('nav.idioma') }}
        </p>
      </div>
      <button
        v-for="l in locales"
        :key="l.code"
        type="button"
        role="option"
        :aria-selected="l.code === lang"
        @click="select(l.code)"
        :class="[
          'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors text-left',
          l.code === lang
            ? 'bg-amber-500/15 text-amber-300'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
        ]"
      >
        <span class="text-base leading-none">{{ l.flag }}</span>
        <span class="flex-1 truncate">{{ l.label }}</span>
        <Check v-if="l.code === lang" class="w-3.5 h-3.5 text-amber-400 shrink-0" />
      </button>
    </div>
  </div>
</template>
