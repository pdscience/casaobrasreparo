<script setup lang="ts">
import { useNavigation, type TabId } from '../../composables/useNavigation'
import { SlidersHorizontal, TrendingUp, Star, History } from 'lucide-vue-next'

defineProps<{ active: TabId }>()
const { goToTab } = useNavigation()
</script>

<template>
  <!-- PRO SUB-TABS -->
  <div class="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
    <button
      @click="goToTab('pedidos_pro')"
      :class="['px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5', active === 'pedidos_pro' ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50']"
    >
      <SlidersHorizontal class="w-3.5 h-3.5" />
      Painel de Atendimentos
    </button>
    <button
      @click="goToTab('faturamento')"
      :class="['px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5', active === 'faturamento' ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50']"
    >
      <TrendingUp class="w-3.5 h-3.5" />
      Faturamento
    </button>
    <button
      @click="goToTab('perfil_pro')"
      :class="['px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5', active === 'perfil_pro' ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50']"
    >
      <Star class="w-3.5 h-3.5" />
      Meu Perfil
    </button>
    <button
      @click="goToTab('historico_pro')"
      :class="['px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5', active === 'historico_pro' ? 'bg-slate-800 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50']"
    >
      <History class="w-3.5 h-3.5" />
      Histórico
    </button>
  </div>
</template>
