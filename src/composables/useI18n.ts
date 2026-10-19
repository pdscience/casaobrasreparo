import { ref, computed } from 'vue'
import {
  DEFAULT_LANG,
  LOCALES,
  translate,
  localeMeta,
  isLang,
  statusLabel,
  categoryLabel,
  complexityLabel,
  planLabel,
  type Lang,
} from '../i18n'

const STORAGE_KEY = 'casaobra_lang'

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isLang(stored)) return stored
  } catch {
    // storage unavailable (private mode) — fall through to navigator detection
  }
  const navigatorLang = typeof navigator !== 'undefined' ? navigator.language : ''
  const normalized = navigatorLang.toLowerCase()
  if (normalized.startsWith('en')) return 'en'
  if (normalized.startsWith('es')) return 'es'
  if (normalized.startsWith('pt')) return 'pt-BR'
  return DEFAULT_LANG
}

const lang = ref<Lang>(detectInitialLang())

function applyToDocument(next: Lang): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = localeMeta(next).htmlLang
}

applyToDocument(lang.value)

export function setLang(next: Lang): void {
  lang.value = next
  applyToDocument(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // storage unavailable — the language still applies for this session
  }
}

export function useI18n() {
  const current = computed(() => lang.value)
  const meta = computed(() => localeMeta(lang.value))
  const locales = LOCALES

  function t(key: string, params?: Record<string, string | number>): string {
    return translate(lang.value, key, params)
  }

  return {
    lang: current,
    meta,
    locales,
    setLang,
    t,
    /** Localized label for a status stored in the database. */
    statusText: (status: string) => statusLabel(lang.value, status),
    /** Localized label for a category stored in the database. */
    categoryText: (category: string) => categoryLabel(lang.value, category),
    /** Localized label for the AI complexity level. */
    complexityText: (complexity: string) => complexityLabel(lang.value, complexity),
    /** Localized label for a plan id. */
    planText: (planId: string) => planLabel(lang.value, planId),
  }
}
