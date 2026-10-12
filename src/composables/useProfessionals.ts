import { ref, computed, watch } from 'vue'
import type { Professional } from '../types'
import { filterProfessionals, paginate } from '../lib/directoryFilters'
import { usePlans } from './usePlans'

const professionals = ref<Professional[]>([])

const visibleProfessionals = computed(() => {
  const { plans, planMap } = usePlans()
  const visibleIds = plans.value.filter(p => p.client_visible).map(p => p.id)
  return professionals.value
    .filter(p => visibleIds.includes(p.plan))
    .sort((a, b) => {
      const ra = planMap.value.get(a.plan)?.rank ?? 99
      const rb = planMap.value.get(b.plan)?.rank ?? 99
      if (ra !== rb) return ra - rb
      if (b.rating !== a.rating) return b.rating - a.rating
      return (b.reviews_count ?? 0) - (a.reviews_count ?? 0)
    })
})

const filterCategory = ref<string>('Todas')
const filterPlan = ref<string>('Todos')
const filterUf = ref<string>('Todas')
const filterCidade = ref<string>('Todas')
const filterBairro = ref<string>('Todos')
const directoryPage = ref<number>(1)
const CARDS_PER_PAGE = 12

function resetDirectoryFilters() {
  filterCategory.value = 'Todas'
  filterPlan.value = 'Todos'
  filterUf.value = 'Todas'
  filterCidade.value = 'Todas'
  filterBairro.value = 'Todos'
}

const availableCategories = computed(() => {
  const cats = new Set(
    professionals.value.flatMap(p => [p.category, ...(p.categories ?? [])].map(c => (c || '').trim()).filter(Boolean)),
  )
  return ['Todas', ...Array.from(cats).sort()]
})

const availableUfs = computed(() => {
  const ufs = new Set(professionals.value.map(p => (p.uf || '').trim().toUpperCase()).filter(Boolean))
  return ['Todas', ...Array.from(ufs).sort()]
})

const availableCidades = computed(() => {
  const cidades = new Set(professionals.value.map(p => (p.cidade || '').trim()).filter(Boolean))
  return ['Todas', ...Array.from(cidades).sort((a, b) => a.localeCompare(b, 'pt-BR'))]
})

const availableBairros = computed(() => {
  const bairros = new Set(
    professionals.value.flatMap(p => (p.coverage_bairros ?? []).map(b => b.trim()).filter(Boolean)),
  )
  return ['Todos', ...Array.from(bairros).sort((a, b) => a.localeCompare(b, 'pt-BR'))]
})

const filteredProfessionals = computed(() =>
  filterProfessionals(visibleProfessionals.value, {
    category: filterCategory.value,
    plan: filterPlan.value,
    uf: filterUf.value,
    cidade: filterCidade.value,
    bairro: filterBairro.value,
  }))

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProfessionals.value.length / CARDS_PER_PAGE)))

const paginatedProfessionals = computed(() =>
  paginate(filteredProfessionals.value, directoryPage.value, CARDS_PER_PAGE))

watch([filterCategory, filterPlan, filterUf, filterCidade, filterBairro], () => {
  directoryPage.value = 1
})

const prataBronzeCount = computed(() => {
  const { planMap } = usePlans()
  return visibleProfessionals.value.filter(p => {
    const rank = planMap.value.get(p.plan)?.rank
    return rank === 2 || rank === 3
  }).length
})

function findProfessional(id: string | null): Professional | undefined {
  if (!id) return undefined
  return professionals.value.find(p => p.id === id)
}

export function useProfessionals() {
  return {
    professionals,
    visibleProfessionals,
    findProfessional,
    filterCategory, filterPlan, filterUf, filterCidade, filterBairro,
    directoryPage,
    availableCategories, availableUfs, availableCidades, availableBairros,
    filteredProfessionals, totalPages, paginatedProfessionals,
    prataBronzeCount,
    resetDirectoryFilters,
  }
}
