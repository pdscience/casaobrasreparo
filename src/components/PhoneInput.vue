<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { countryName, dialOf, flagOf, sortedCountries } from '../lib/geo'
import {
  countryFromE164,
  formatNational,
  nationalDigits,
  nationalFromE164,
  validatePhone,
} from '../lib/phone'

const props = defineProps<{ label?: string }>()

const phone = defineModel<string>('phone', { default: '' })
const phoneCountry = defineModel<string>('phoneCountry', { default: 'BR' })

const { t, lang } = useI18n()

const national = ref('')
const error = ref('')
/** Último E.164 emitido por este componente — evita re-hidratar o próprio output. */
let lastEmitted = ''

const countries = computed(() => sortedCountries(lang.value))
const dial = computed(() => dialOf(phoneCountry.value))

const inputClass =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all'

function hydrate(value: string): void {
  if (!value) {
    national.value = ''
    error.value = ''
    lastEmitted = ''
    return
  }
  const country = countryFromE164(value) || phoneCountry.value || 'BR'
  if (country !== phoneCountry.value) phoneCountry.value = country
  national.value = formatNational(country, nationalFromE164(value, country))
  error.value = ''
  lastEmitted = value
}

function emitPhone(): void {
  const result = validatePhone(phoneCountry.value, national.value)
  error.value = result.ok ? '' : t('common.errTelefoneInvalido')
  lastEmitted = result.ok ? result.e164 : ''
  phone.value = lastEmitted
}

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  national.value = formatNational(phoneCountry.value, raw)
  emitPhone()
}

watch(
  phone,
  (value) => {
    if (value === lastEmitted) return
    hydrate(value)
  },
  { immediate: true },
)

watch(phoneCountry, () => {
  if (!national.value) return
  national.value = formatNational(phoneCountry.value, nationalDigits(national.value))
  emitPhone()
})
</script>

<template>
  <div>
    <label class="block text-xs font-bold text-slate-300 mb-1.5">
      {{ props.label || t('common.telefone') }} *
    </label>
    <div class="flex gap-2">
      <select
        v-model="phoneCountry"
        class="bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all"
        :aria-label="t('common.codigoPais')"
      >
        <option v-for="c in countries" :key="c.code" :value="c.code">
          {{ flagOf(c.code) }} +{{ dialOf(c.code) }} · {{ countryName(c.code, lang) }}
        </option>
      </select>
      <input
        :value="national"
        type="tel"
        inputmode="tel"
        :placeholder="t('common.digiteOuSelecione')"
        :class="inputClass"
        @input="onInput"
      />
    </div>
    <p v-if="error" class="text-[11px] text-red-400 mt-1">{{ error }}</p>
    <p v-else-if="dial" class="text-[11px] text-slate-500 mt-1">+{{ dial }}</p>
  </div>
</template>
