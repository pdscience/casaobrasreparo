import { ref, computed } from 'vue'
import type { ServiceRequest } from '../types'
import { getServiceRequests, getProfessionals, getPlans, updateServiceRequest } from '../api/insforgeService'
import { clientStatusGroup } from '../lib/requestStatus'
import { useAuth } from './useAuth'
import { usePlans } from './usePlans'
import { useProfessionals } from './useProfessionals'
import { useUi } from './useUi'

const requests = ref<ServiceRequest[]>([])
const isLoading = ref(true)

const myRequests = computed(() => {
  const { authUser } = useAuth()
  return authUser.value
    ? requests.value.filter((r) => r.client_id === authUser.value?.id)
    : []
})

// Filtro de acompanhamento do cliente: pendentes / em andamento / concluídas
const clientStatusFilter = ref<'todas' | 'pendentes' | 'andamento' | 'concluidas'>('todas')
const filteredClientRequests = computed(() =>
  clientStatusFilter.value === 'todas'
    ? myRequests.value
    : myRequests.value.filter((r) => clientStatusGroup(r.status) === clientStatusFilter.value)
)
// Histórico (armazenados): finalizados de cada lado
const historicClientRequests = computed(() =>
  myRequests.value.filter((r) => r.status === 'Concluído' || r.status === 'Cancelado')
)
const historicProRequests = computed(() => {
  const { proProfile } = useAuth()
  return proProfile.value.id
    ? requests.value.filter((r) =>
        r.professional_id === proProfile.value.id &&
        (r.status === 'Concluído' || r.status === 'Cancelado')
      )
    : []
})

const proRequests = computed(() => {
  const { canReceiveRequests } = usePlans()
  const { proProfile } = useAuth()
  if (!canReceiveRequests.value) return []
  const category = proProfile.value.category?.toLowerCase()
  return requests.value.filter((r) =>
    r.status !== 'Concluído' &&
    (r.broadcast || r.professional_id === proProfile.value.id) &&
    (!category || r.category?.toLowerCase() === category)
  )
})

const revenueChartData = computed(() => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const now = new Date()
  const currentMonth = now.getMonth()

  return months.map((month, i) => {
    const monthIndex = (currentMonth - 11 + i + 12) % 12
    const yearOffset = Math.floor((currentMonth - 11 + i + 12) / 12)
    const targetYear = now.getFullYear() - yearOffset

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

const totalRevenueMonth = computed(() => {
  return requests.value
    .filter((r) => r.status === 'Concluído')
    .reduce((acc, curr) => acc + (curr.final_price || 0), 0)
})

const completedCount = computed(() => {
  return requests.value.filter((r) => r.status === 'Concluído').length
})

const avgTicket = computed(() => {
  return totalRevenueMonth.value / (completedCount.value || 1)
})

const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '12px',
    textStyle: { color: '#fff', fontSize: 12 },
    formatter: (params: { value: number }) => `R$ ${params.value},00`,
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

async function loadData() {
  const { professionals } = useProfessionals()
  const { plans } = usePlans()
  isLoading.value = true
  try {
    const [serviceRequests, professionalsData, plansData] = await Promise.all([
      getServiceRequests(),
      getProfessionals(),
      getPlans(),
    ])
    requests.value = serviceRequests
    professionals.value = professionalsData
    plans.value = plansData
  } catch (err) {
    console.error('Erro ao carregar dados:', err)
  } finally {
    isLoading.value = false
  }
}

async function handleSaveSchedule() {
  const { scheduleModal, scheduleDate, scheduleTime, schedulePrice, scheduleObs } = useUi()
  const { proProfile } = useAuth()
  if (!scheduleModal.value) return

  try {
    // Ao assumir (agendar) um broadcast sem dono, o pedido passa a ser deste profissional
    const assumeOwner = !scheduleModal.value.professional_id && proProfile.value.id
      ? { professional_id: proProfile.value.id }
      : {}
    await updateServiceRequest(scheduleModal.value.id, {
      status: 'Visita Agendada',
      ...assumeOwner,
      agendamento: {
        data: scheduleDate.value || new Date().toISOString().split('T')[0],
        hora: scheduleTime.value || '14:00',
        observacao: scheduleObs.value,
      },
      final_price: schedulePrice.value ? parseFloat(schedulePrice.value) : scheduleModal.value.final_price,
    })
    await loadData()
    scheduleModal.value = null
  } catch (err) {
    console.error('Erro ao agendar:', err)
    alert('Não foi possível agendar a visita. Tente novamente.')
  }
}

async function handleUpdateStatus(orderId: string, newStatus: ServiceRequest['status']) {
  const { proProfile } = useAuth()
  try {
    const req = requests.value.find((r) => r.id === orderId)
    if (!req) return

    // Garante dono ao avançar um broadcast sem dono (histórico do pro depende disso)
    const assumeOwner = !req.professional_id && proProfile.value.id
      ? { professional_id: proProfile.value.id }
      : {}
    await updateServiceRequest(orderId, {
      status: newStatus,
      ...assumeOwner,
      receipt_issued: newStatus === 'Concluído' ? true : req.receipt_issued,
    })
    await loadData()
  } catch (err) {
    console.error('Erro ao atualizar status:', err)
    alert('Não foi possível atualizar o status do pedido. Tente novamente.')
  }
}

async function handleSaveRating() {
  const { rateOrderModal, ratingStars, ratingComment } = useUi()
  if (!rateOrderModal.value) return

  try {
    await updateServiceRequest(rateOrderModal.value.id, {
      rating: {
        stars: ratingStars.value,
        comment: ratingComment.value || 'Excelente serviço!',
        date: new Date().toISOString().split('T')[0],
      },
    })
    await loadData()
    rateOrderModal.value = null
    ratingStars.value = 5
    ratingComment.value = ''
  } catch (err) {
    console.error('Erro ao salvar avaliação:', err)
    alert('Não foi possível salvar a avaliação. Tente novamente.')
  }
}

export function useRequests() {
  return {
    requests, isLoading,
    myRequests, filteredClientRequests, historicClientRequests, historicProRequests, proRequests,
    clientStatusFilter,
    revenueChartData, totalRevenueMonth, completedCount, avgTicket, revenueChartOption,
    loadData,
    handleSaveSchedule, handleUpdateStatus, handleSaveRating,
  }
}
