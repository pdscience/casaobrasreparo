<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useNavigation } from '../../composables/useNavigation'
import { useRequests } from '../../composables/useRequests'
import { usePlans } from '../../composables/usePlans'
import { computeMonthlySummary } from '../../lib/revenue'
import ProSubTabs from '../../components/layout/ProSubTabs.vue'
import { TrendingUp, BarChart2, Lock } from 'lucide-vue-next'

const { userMode } = useAuth()
const { activeTab } = useNavigation()
const { requests } = useRequests()
const { hasFeature, subscribePlan } = usePlans()

// Primeira letra maiúscula (ex.: "setembro" → "Setembro")
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Decimal com vírgula (ex.: 1.1 → "1,1")
function formatDecimal(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

const summary = computed(() => computeMonthlySummary(requests.value, new Date()))

const revenueChartData = computed(() => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const now = new Date()
  const currentMonth = now.getMonth()

  return months.map((month, i) => {
    const monthIndex = (currentMonth - 11 + i + 12) % 12
    const yearOffset = Math.floor((currentMonth - 11 + i + 12) / 12)
    const targetYear = now.getFullYear() - yearOffset

    // O ponto do mês corrente usa a síntese real (concluídos do mês)
    if (monthIndex === currentMonth && targetYear === now.getFullYear()) {
      return { month, faturamento: summary.value.total }
    }

    const total = requests.value
      .filter((r) => {
        if (r.status !== 'Concluído' || !r.final_price) return false
        const d = new Date(r.created_at)
        return d.getMonth() === monthIndex && d.getFullYear() === targetYear
      })
      .reduce((acc, r) => acc + (r.final_price || 0), 0)

    return { month, faturamento: total }
  })
})

const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '12px',
    textStyle: { color: '#fff', fontSize: 12 },
    formatter: (params: { value: number }) => 'R$ ' + Number(params.value).toFixed(2).replace('.', ','),
  },
  grid: { left: '3%', right: '4%', bottom: '3%' },
  xAxis: {
    type: 'category',
    data: revenueChartData.value.map((d) => d.month),
    axisLabel: { color: '#64748b', fontSize: 12 },
    axisLine: { lineStyle: { color: '#1e293b' } },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#64748b', fontSize: 12 },
    axisLine: { lineStyle: { color: '#1e293b' } },
    splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
  },
  series: [
    {
      data: revenueChartData.value.map((d) => d.faturamento),
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#f59e0b', width: 3 },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(245,158,11,0.4)' },
            { offset: 1, color: 'rgba(245,158,11,0.0)' },
          ],
        },
      },
    },
  ],
}))
</script>

<template>
      <!-- MODE PRO: TAB 2 - RELATÓRIO DE FATURAMENTO -->
      <div v-if="userMode === 'pro' && activeTab === 'faturamento'" class="space-y-6 animate-in fade-in duration-300">
        <ProSubTabs :active="activeTab" />

        <!-- GATED: Relatórios avançados apenas no plano Ouro -->
        <template v-if="hasFeature('advancedReports')">
        <div>
          <h2 class="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <TrendingUp class="w-5 h-5 text-amber-400" />
            Relatório Financeiro & Faturamento Mensal
          </h2>
          <p class="text-xs text-slate-400 mt-1">
            Acompanhe o rendimento do seu trabalho, total faturado e quantidade de serviços prestados.
          </p>
        </div>

        <!-- METRICS CARDS -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Faturamento de {{ capitalize(summary.monthLabel) }}
            </span>
            <span class="text-2xl sm:text-3xl font-black text-amber-400">
              R$ {{ summary.total.toLocaleString('pt-BR') }},00
            </span>
            <p v-if="summary.deltaPercent !== null" :class="[
              'text-[11px] font-medium flex items-center gap-1',
              summary.deltaPercent > 0 ? 'text-emerald-400' : summary.deltaPercent < 0 ? 'text-red-400' : 'text-slate-400'
            ]">
              <TrendingUp class="w-3.5 h-3.5" /> {{ summary.deltaPercent > 0 ? '+' : '' }}{{ summary.deltaPercent }}% vs mês anterior
            </p>
          </div>

          <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Serviços Concluídos no Mês
            </span>
            <span class="text-2xl sm:text-3xl font-black text-white">
              {{ summary.completedCount }} atendimentos
            </span>
            <p class="text-[11px] text-slate-400 font-medium">
              Média de {{ formatDecimal(summary.completedCount / new Date().getDate()) }} serviços por dia
            </p>
          </div>

          <div class="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-2">
            <span class="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
              Ticket Médio por Serviço
            </span>
            <span class="text-2xl sm:text-3xl font-black text-cyan-400">
              R$ {{ Math.round(summary.avgTicket) }},00
            </span>
            <p class="text-[11px] text-slate-400 font-medium">
              Com base em serviços residenciais e prediais
            </p>
          </div>
        </div>

        <!-- REVENUE CHART -->
        <div class="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-bold text-white text-sm flex items-center gap-2">
              <BarChart2 class="w-4 h-4 text-amber-400" />
              Evolução do Faturamento Mensal (Em Reais R$)
            </h3>
            <span class="text-xs text-slate-400">Semestre Atual (2026)</span>
          </div>

          <div class="h-64 w-full pt-4">
            <v-chart :option="revenueChartOption" :autoresize="true" />
          </div>
        </div>
        </template>
        <div v-else class="bg-slate-900 rounded-2xl p-10 border border-slate-800 text-center space-y-4">
          <div class="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
            <Lock class="w-7 h-7" />
          </div>
          <h2 class="text-xl font-bold text-white">Relatórios disponíveis no plano Ouro</h2>
          <p class="text-sm text-slate-400 max-w-md mx-auto">
            Acompanhe faturamento mensal, ticket médio e a evolução dos seus serviços com o plano Ouro.
          </p>
          <button
            @click="subscribePlan('ouro')"
            class="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm hover:from-amber-400 hover:to-yellow-300 transition-all"
          >
            Assinar Ouro
          </button>
        </div>
      </div>
</template>
