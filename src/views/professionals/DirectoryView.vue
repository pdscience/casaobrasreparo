<script setup lang="ts">
import { CATEGORIES } from '../../lib/categories'
import { useNavigation } from '../../composables/useNavigation'
import { useProfessionals } from '../../composables/useProfessionals'
import { useQuoteForm } from '../../composables/useQuoteForm'
import { useRequests } from '../../composables/useRequests'
import { usePlans } from '../../composables/usePlans'
import ProfessionalCard from '../../components/ProfessionalCard.vue'
import { HardHat } from 'lucide-vue-next'

const { activeTab, scrollToId, trackCta, goToTab } = useNavigation()
const {
  filterCategory, filterUf, filterCidade, filterBairro,
  directoryPage,
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
          <HardHat class="w-4 h-4" /> Profissionais
        </span>
        <h1 class="tesla-title text-white text-[28px] sm:text-[36px] leading-tight mt-3">Encontre por profissão</h1>
        <p class="text-xs text-slate-400 mt-1">
          {{ filterCategory === 'Todas' ? 'Escolha uma profissão para filtrar' : `Mostrando: ${filterCategory}` }}
          · {{ filteredProfessionals.length }} encontrado(s)
        </p>
      </div>
      <button @click="scrollToId('inicio')" class="text-xs font-bold text-slate-300 hover:text-white border border-slate-700 rounded-full px-4 py-2 whitespace-nowrap">Voltar ao início</button>
    </div>
    <!-- FILTROS (PROFISSÃO / UF / CIDADE / BAIRRO) -->
    <div class="flex flex-wrap items-center gap-2">
      <select
        :value="filterCategory"
        aria-label="Filtrar por profissão"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
        @change="handleLandingCategory(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="cat in ['Todas', ...CATEGORIES.map(c => c.name)]" :key="'pub-cat-' + cat" :value="cat">
          {{ cat === 'Todas' ? 'Todas as profissões' : cat }}
        </option>
      </select>
      <select
        v-model="filterUf"
        aria-label="Filtrar por UF"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
      >
        <option v-for="u in availableUfs" :key="'pub-uf-' + u" :value="u">
          {{ u === 'Todas' ? 'Todas as UFs' : u }}
        </option>
      </select>
      <select
        v-model="filterCidade"
        aria-label="Filtrar por cidade"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
      >
        <option v-for="c in availableCidades" :key="'pub-cidade-' + c" :value="c">
          {{ c === 'Todas' ? 'Todas as cidades' : c }}
        </option>
      </select>
      <select
        v-model="filterBairro"
        aria-label="Filtrar por bairro"
        class="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-3.5 py-2 focus:outline-none focus:border-amber-500/50 hover:border-slate-600 transition-all"
      >
        <option v-for="b in availableBairros" :key="'pub-bairro-' + b" :value="b">
          {{ b === 'Todos' ? 'Todos os bairros' : b }}
        </option>
      </select>
      <button
        v-if="filterCategory !== 'Todas' || filterUf !== 'Todas' || filterCidade !== 'Todas' || filterBairro !== 'Todos'"
        type="button"
        @click="resetDirectoryFilters"
        class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition-all"
      >
        Limpar filtros
      </button>
    </div>

    <div v-if="isLoading" class="text-center text-xs text-slate-400 py-8">Carregando profissionais...</div>
    <div v-else-if="paginatedProfessionals.length === 0" class="bg-slate-900 rounded-2xl p-8 text-center border border-slate-800">
      <p class="text-sm text-slate-300 font-bold">Nenhum profissional nesta categoria ainda.</p>
      <p class="text-xs text-slate-400 mt-1">Tente outra profissão ou envie para todos após a análise da IA.</p>
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
      />
    </div>
    <p v-if="selectedProfessional" class="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">
      Selecionado: <strong>{{ selectedProfessional.name }}</strong> ({{ selectedProfessional.category }}) — faça login/cadastro para preencher a solicitação.
    </p>
  </div>
</template>
