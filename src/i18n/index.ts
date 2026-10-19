import pt from './pt'
import en from './en'
import es from './es'

export type Lang = 'pt-BR' | 'en' | 'es'

export interface LocaleMeta {
  code: Lang
  /** Endonym — shown in the language switcher so users find their own language. */
  label: string
  /** Short label used inside the compact trigger button. */
  short: string
  flag: string
  /** Value of the `lang` attribute set on <html>. */
  htmlLang: string
}

export const LOCALES: LocaleMeta[] = [
  { code: 'pt-BR', label: 'Português (Brasil)', short: 'PT', flag: '🇧🇷', htmlLang: 'pt-BR' },
  { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸', htmlLang: 'en' },
  { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸', htmlLang: 'es' },
]

export const DEFAULT_LANG: Lang = 'pt-BR'

const messages: Record<Lang, unknown> = { 'pt-BR': pt, en, es }

export type MessageTree = typeof pt

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Resolves a dot-path (e.g. `nav.profissionais`) against a message tree. */
function resolve(tree: unknown, path: string): string | undefined {
  const segments = path.split('.')
  let current: unknown = tree
  for (const segment of segments) {
    if (!isRecord(current)) return undefined
    current = current[segment]
    if (current === undefined) return undefined
  }
  return typeof current === 'string' ? current : undefined
}

/** Replaces `{placeholder}` tokens with the given values. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

/**
 * Translates a key for the given language, falling back to Portuguese and
 * finally to the key itself so a missing entry is visible but never crashes.
 */
export function translate(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>,
): string {
  const direct = resolve(messages[lang], key)
  if (direct !== undefined) return interpolate(direct, params)
  const fallback = resolve(messages[DEFAULT_LANG], key)
  if (fallback !== undefined) return interpolate(fallback, params)
  console.warn(`[i18n] Missing translation key: ${key}`)
  return key
}

export function localeMeta(lang: Lang): LocaleMeta {
  return LOCALES.find((l) => l.code === lang) ?? LOCALES[0]
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && LOCALES.some((l) => l.code === value)
}

// ---------------------------------------------------------------------------
// Labels for values that live in the database.
//
// The database stores Portuguese enum values (statuses, categories, plan ids
// and AI complexity levels). Those raw values must never be translated for
// comparisons or queries — only for display. The helpers below map a stored
// value to its localized label and fall back to the original value when the
// value is unknown (e.g. a legacy row).
// ---------------------------------------------------------------------------

export function statusLabel(lang: Lang, status: string): string {
  const key = `status.${status}`
  const found = resolve(messages[lang], key)
  return found !== undefined ? found : status
}

export function categoryLabel(lang: Lang, category: string): string {
  if (!category) return category
  const found = resolve(messages[lang], `category.${category}`)
  return found !== undefined ? found : category
}

export function complexityLabel(lang: Lang, complexity: string): string {
  const found = resolve(messages[lang], `complexity.${complexity}`)
  return found !== undefined ? found : complexity
}

export function planLabel(lang: Lang, planId: string): string {
  const found = resolve(messages[lang], `plans.${planId}`)
  return found !== undefined ? found : planId
}
