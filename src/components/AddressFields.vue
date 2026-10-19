<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import {
  countryName,
  dialOf,
  flagOf,
  loadRegions,
  sortedCountries,
  type CountryRegions,
} from '../lib/geo'

withDefaults(defineProps<{ withStreet?: boolean }>(), { withStreet: true })

const countryCode = defineModel<string>('countryCode', { default: 'BR' })
const stateCode = defineModel<string>('stateCode', { default: '' })
const stateName = defineModel<string>('stateName', { default: '' })
const municipality = defineModel<string>('municipality', { default: '' })
const street = defineModel<string>('street', { default: '' })
const neighborhood = defineModel<string>('neighborhood', { default: '' })

const { t, lang } = useI18n()

const regions = ref<CountryRegions>({ code: '', states: [], cities: {} })
const loadingRegions = ref(false)
/** Vira true depois do primeiro carregamento — evita limpar valores já hidratados pelo pai. */
const initialized = ref(false)

const countries = computed(() => sortedCountries(lang.value))
const hasStates = computed(() => regions.value.states.length > 0)
const cityOptions = computed(() => regions.value.cities?.[stateCode.value] ?? [])
const citiesListId = `cities-${useId()}`

async function loadFor(code: string): Promise<void> {
  if (!code) {
    regions.value = { code: '', states: [], cities: {} }
    return
  }
  loadingRegions.value = true
  try {
    regions.value = await loadRegions(code)
  } finally {
    loadingRegions.value = false
  }
}

watch(
  countryCode,
  (code) => {
    if (!initialized.value) {
      initialized.value = true
      void loadFor(code)
      return
    }
    stateCode.value = ''
    stateName.value = ''
    municipality.value = ''
    void loadFor(code)
  },
  { immediate: true },
)

function onStateChange(): void {
  const found = regions.value.states.find((s) => s.code === stateCode.value)
  stateName.value = found?.name ?? ''
}

const inputClass =
  'w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-2 focus:ring-amber-500/15 hover:border-slate-600 transition-all'
</script>

<template>
  <div class="space-y-4">
    <div v-if="withStreet" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('auth.endereco') }}</label>
        <input
          v-model="street"
          type="text"
          :placeholder="t('auth.ruaNumero')"
          :class="inputClass"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('auth.bairro') }}</label>
        <input
          v-model="neighborhood"
          type="text"
          :placeholder="t('auth.seuBairro')"
          :class="inputClass"
        />
      </div>
    </div>

    <div>
      <label class="block text-xs font-bold text-slate-300 mb-1.5">{{ t('common.pais') }} *</label>
      <select v-model="countryCode" :class="inputClass">
        <option v-for="c in countries" :key="c.code" :value="c.code">
          {{ flagOf(c.code) }} {{ countryName(c.code, lang) }} (+{{ dialOf(c.code) }})
        </option>
      </select>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">
          {{ t('common.estadoProvincia') }} *
        </label>
        <select
          v-if="hasStates"
          v-model="stateCode"
          @change="onStateChange"
          :class="inputClass"
        >
          <option value="">{{ t('common.selecioneEstado') }}</option>
          <option v-for="s in regions.states" :key="s.code" :value="s.code">{{ s.name }}</option>
        </select>
        <input
          v-else
          v-model="stateName"
          type="text"
          :placeholder="t('common.digiteOuSelecione')"
          :class="inputClass"
        />
      </div>
      <div>
        <label class="block text-xs font-bold text-slate-300 mb-1.5">
          {{ t('common.municipio') }} *
        </label>
        <input
          v-model="municipality"
          type="text"
          :list="citiesListId"
          :placeholder="t('common.selecioneMunicipio')"
          :class="inputClass"
        />
        <datalist :id="citiesListId">
          <option v-for="city in cityOptions" :key="city" :value="city" />
        </datalist>
      </div>
    </div>
  </div>
</template>
