<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATEGORIES } from '../../lib/categories'
import { useNavigation } from '../../composables/useNavigation'
import { useProfessionals } from '../../composables/useProfessionals'
import { useQuoteForm } from '../../composables/useQuoteForm'
import { useRequests } from '../../composables/useRequests'
import { usePlans } from '../../composables/usePlans'
import { useUi } from '../../composables/useUi'
import { useFavorites } from '../../composables/useFavorites'
import { useI18n } from '../../composables/useI18n'
import ProfessionalCard from '../../components/ProfessionalCard.vue'
import { HardHat, Heart } from 'lucide-vue-next'
import type { Professional } from '../../types'

const { t, categoryText } = useI18n()
const route = useRoute()
const router = useRouter()

const { activeTab, scrollToId, trackCta, goToTab } = useNavigation()
const {
  professionals,
  filterCategory, filterUf, filterCidade, filterBairro,
  directoryPage, favoritesOnly,
  availableUfs, availableCidades, availableBairros,
  filteredProfessionals, paginatedProfessionals,
  resetDirectoryFilters,
} = useProfessionals()
const {
  selectedCategory, selectedProfessional,
  handleChooseProfessional, clearProfessionalSelection,
} = useQuoteForm()
const { isLoading } = useRequests()
const { planMap } = usePlans()
const { profileModalPro } = useUi()
const { favoritesCount } = useFavorites()

function openProfile(pro: Professional): void {
  profileModalPro.value = pro
}

function cleanProQuery(): void {
  if (!route.query.pro) return
  const query = { ...route.query }
  delete query.pro
  void router.replace({ query })
}

watch(
  [() => route.query.pro, () => professionals.value, isLoading],
  ([rawId, list, loading]) => {
    const id = Array.isArray(rawId) ? rawId[0] : rawId
    if (!id) return
    const found = (list as Professional[]).find((p) => p.id === id)
    if (found) {
      profileModalPro.value = found
      return
    }
    if (!loading && (list as Professional[]).length > 0) cleanProQuery()
  },
  { immediate: true },
)

watch(profileModalPro, (current) => {
  if (!current) cleanProQuery()
})

function handleLandingCategory(categoryName: string) {
  trackCta('categoria_' + categoryName)
  filterCategory.value = categoryName
  selectedCategory.value = CATEGORIES.some(c => c.name === categoryName) ? categoryName : selectedCategory.value
  directoryPage.value = 1
  if (activeTab.value !== 'profissionais') {
    goToTab('profissionais')
    window.scrollTo({ top: 0 })
  }
}
</script>

<template>
  <!-- ROTA PÚBLICA #/profissionais: CATÁLOGO POR PROFISSÃO -->
  <div v-if="activeTab === 'profissionais'" class="pt-20 pb-10 space-y-5 animate-in fade-in duration-300">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="inline-flex w-fit items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
          <HardHat class="w-4 h-4" /> {{ t('nav.profissionais') }}
        </span>
        <h1 class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-3">{{ t('directory.findByProfession') }}</h1>
        <p class="text-xs text-slate-400 mt-1">
          {{ filterCategory === 'Todas' ? t('directory.chooseProfession') : `${t('directory.showing')}: ${categoryText(filterCategory)}` }}
          · {{ filteredProfessionals.length }} {{ t('directory.found') }}
        </p>
      </div>
      <button @click="scrollToId('inicio')" class="text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-full px-4 py-2 whitespace-nowrap">{{ t('directory.backToStart') }}</button>
    </div>
    <!-- FILTROS (PROFISSÃO / UF / CIDADE / BAIRRO) -->
    <div class="flex flex-wrap items-center gap-2">
      <select
        :value="filterCategory"
        :aria-label="t('directory.filterByProfession')"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
        @change="handleLandingCategory(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="cat in ['Todas', ...CATEGORIES.map(c => c.name)]" :key="'pub-cat-' + cat" :value="cat">
          {{ cat === 'Todas' ? t('directory.allProfessions') : categoryText(cat) }}
        </option>
      </select>
      <select
        v-model="filterUf"
        :aria-label="t('directory.filterByUf')"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
      >
        <option v-for="u in availableUfs" :key="'pub-uf-' + u" :value="u">
          {{ u === 'Todas' ? t('directory.allUfs') : u }}
        </option>
      </select>
      <select
        v-model="filterCidade"
        :aria-label="t('directory.filterByCity')"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
      >
        <option v-for="c in availableCidades" :key="'pub-cidade-' + c" :value="c">
          {{ c === 'Todas' ? t('directory.allCities') : c }}
        </option>
      </select>
      <select
        v-model="filterBairro"
        :aria-label="t('directory.filterByNeighborhood')"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
      >
        <option v-for="b in availableBairros" :key="'pub-bairro-' + b" :value="b">
          {{ b === 'Todos' ? t('directory.allNeighborhoods') : b }}
        </option>
      </select>
      <button
        type="button"
        @click="favoritesOnly = !favoritesOnly"
        :aria-pressed="favoritesOnly"
        class="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5"
        :class="favoritesOnly ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' : 'border-slate-700 text-slate-300 hover:border-rose-500/50 hover:text-rose-300'"
      >
        <Heart class="w-3.5 h-3.5" :class="favoritesOnly ? 'fill-rose-500 text-rose-500' : ''" />
        {{ t('directory.favorites') }} ({{ favoritesCount }})
      </button>
      <button
        v-if="filterCategory !== 'Todas' || filterUf !== 'Todas' || filterCidade !== 'Todas' || filterBairro !== 'Todos' || favoritesOnly"
        type="button"
        @click="resetDirectoryFilters"
        class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all"
      >
        {{ t('directory.clearFilters') }}
      </button>
    </div>

    <div v-if="isLoading" class="text-center text-xs text-slate-400 py-8">{{ t('directory.loading') }}</div>
    <div v-else-if="favoritesOnly && favoritesCount === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
      <p class="text-sm text-slate-300 font-bold">{{ t('directory.noFavoritesTitle') }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ t('directory.noFavoritesDesc') }}</p>
      <button
        type="button"
        @click="favoritesOnly = false"
        class="mt-3 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all"
      >
        {{ t('directory.clearFilters') }}
      </button>
    </div>
    <div v-else-if="paginatedProfessionals.length === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
      <p class="text-sm text-slate-300 font-bold">{{ t('directory.emptyTitle') }}</p>
      <p class="text-xs text-slate-400 mt-1">{{ t('directory.emptyDesc') }}</p>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <ProfessionalCard
        v-for="pro in paginatedProfessionals"
        :key="'pub-'+pro.id"
        :professional="pro"
        :plan-info="planMap.get(pro.plan) ?? null"
        :selectable="true"
        :selected="selectedProfessional?.id === pro.id"
        @choose="handleChooseProfessional"
        @clear="clearProfessionalSelection"
        @view="openProfile"
      />
    </div>
    <p v-if="selectedProfessional" class="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">
      {{ t('directory.selected') }}: <strong>{{ selectedProfessional.name }}</strong> ({{ categoryText(selectedProfessional.category) }}) — {{ t('directory.loginToContinue') }}
    </p>
  </div>
</template>
