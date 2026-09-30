import { ref, computed, nextTick } from 'vue'
import type { AIAnalysis, Professional, ServiceRequest } from '../types'
import { analyzeWithAI, uploadServicePhoto, createServiceRequest } from '../api/insforgeService'
import { validateQuoteForm, buildQuotePayload, type SendMode } from '../lib/quoteFlow'
import { buildWhatsAppLink } from '../lib/whatsapp'
import { useAuth } from './useAuth'
import { useNavigation } from './useNavigation'
import { useProfessionals } from './useProfessionals'
import { useRequests } from './useRequests'

const selectedCategory = ref<string>('Eletricista')
const clientName = ref<string>('')
const clientPhone = ref<string>('')
const clientAddress = ref<string>('')
const notes = ref<string>('')
const imagePreview = ref<string | null>(null)
const photoFile = ref<File | null>(null)
const isAnalyzing = ref<boolean>(false)
const latestAiResult = ref<AIAnalysis | null>(null)
const createdOrderSuccess = ref<ServiceRequest | null>(null)

const selectedProfessional = ref<Professional | null>(null)
// Profissionais elegíveis à escolha direta na categoria atual do formulário
const directCandidates = computed(() => {
  const { visibleProfessionals } = useProfessionals()
  const list = visibleProfessionals.value.filter(p =>
    !selectedCategory.value || p.category === selectedCategory.value
  )
  return list.length > 0 ? list : visibleProfessionals.value
})
const sendMode = ref<SendMode | null>(null)
const formError = ref<string>('')

const aiReadyToast = ref(false)
// Banner de fallback da IA (ativado na Task 9)
const aiFallback = ref(false)

function handleChooseProfessional(pro: Professional) {
  const { goToTab, trackCta } = useNavigation()
  const { authUser, authRole, authView, authError, showAuth } = useAuth()
  const { filterCategory } = useProfessionals()
  trackCta('escolher_profissional_' + pro.id)
  selectedProfessional.value = pro
  if (pro.category) {
    selectedCategory.value = pro.category
    filterCategory.value = pro.category
  }
  sendMode.value = 'direct'
  formError.value = ''
  // Visitante: pede login/cadastro mas preserva a escolha; logado: vai ao formulário
  if (!authUser.value) {
    authRole.value = 'client'
    authView.value = 'register'
    authError.value = ''
    showAuth.value = true
    return
  }
  goToTab('solicitar')
  nextTick(() => {
    document.getElementById('solicitar-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function clearProfessionalSelection() {
  selectedProfessional.value = null
  if (sendMode.value === 'direct') sendMode.value = null
}

function handlePhotoUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    photoFile.value = file
    const reader = new FileReader()
    reader.onloadend = () => {
      imagePreview.value = reader.result as string
    }
    reader.readAsDataURL(file)
  }
}

async function handleAnalyzeWithAI() {
  if (!imagePreview.value) {
    alert('Por favor, tire ou selecione uma foto antes de solicitar a análise da IA.')
    return
  }

  isAnalyzing.value = true
  latestAiResult.value = null
  aiReadyToast.value = false

  try {
    const res = await analyzeWithAI(
      imagePreview.value.startsWith('data:') ? imagePreview.value : undefined,
      selectedCategory.value,
      notes.value
    )
    latestAiResult.value = res.analysis
    // Sem polling: a IA real não cabe nos 30s do proxy de forma confiável;
    // quando ela responder a tempo (status ready) o resultado já vem completo.
      aiReadyToast.value = res.status === 'ready' && (res.analysis.suggestedMinPrice > 0 || res.analysis.suggestedMaxPrice > 0)
    if (aiReadyToast.value) setTimeout(() => { aiReadyToast.value = false }, 6000)
  } catch (err) {
    console.error(err)
    latestAiResult.value = {
      summary: `Avaliação de Serviço: ${selectedCategory.value}`,
      description: `Diagnóstico prévio para ${selectedCategory.value}. Requer inspeção técnica das instalações.`,
      category: selectedCategory.value,
      complexity: 'Média',
      estimatedTime: '1 a 2 horas',
      materialsNeeded: ['Peças e insumos específicos de reposição', 'Insumos de fixação e isolamento'],
      suggestedMinPrice: 0,
      suggestedMaxPrice: 0,
      technicalNotes: '',
      recommendedAction: 'Custo Direto',
    }
  } finally {
    isAnalyzing.value = false
  }
}

async function handleConfirmOrder() {
  const { authUser, authRole, authView, authError, showAuth } = useAuth()
  const { goToTab } = useNavigation()
  const { requests } = useRequests()
  if (!latestAiResult.value || !sendMode.value) return
  formError.value = ''

  // Login no fim: visitante escolhe antes, autentica ao confirmar
  if (!authUser.value) {
    authRole.value = 'client'
    authView.value = 'register'
    authError.value = ''
    showAuth.value = true
    return
  }

  const errors = validateQuoteForm({
    clientName: clientName.value,
    clientPhone: clientPhone.value,
    clientAddress: clientAddress.value,
  })
  if (Object.keys(errors).length > 0) {
    formError.value = errors.clientName || errors.clientPhone || errors.clientAddress || 'Verifique os dados.'
    return
  }

  if (sendMode.value === 'direct' && !selectedProfessional.value) {
    formError.value = 'Escolha um profissional para envio direto.'
    return
  }

  let photoUrl = imagePreview.value || ''
  if (photoFile.value) {
    try {
      photoUrl = await uploadServicePhoto(photoFile.value, authUser.value.id)
    } catch (err) {
      console.error('Erro ao enviar foto:', err)
    }
  }

  const payload = buildQuotePayload({
    clientId: authUser.value?.id ?? null,
    form: { clientName: clientName.value, clientPhone: clientPhone.value, clientAddress: clientAddress.value },
    category: selectedCategory.value,
    photoUrl,
    notes: notes.value || '',
    aiAnalysis: latestAiResult.value,
    finalPrice: latestAiResult.value.suggestedMinPrice || null,
    sendMode: sendMode.value,
    professionalId: selectedProfessional.value?.id ?? null,
  })
  const newOrder = payload as unknown as Omit<ServiceRequest, 'id' | 'created_at' | 'updated_at'>

  try {
    const created = await createServiceRequest(newOrder)
    requests.value = [created, ...requests.value]

    if (sendMode.value === 'direct' && selectedProfessional.value?.phone) {
      const pro = selectedProfessional.value
      const msg = `Olá ${pro.name}! Vi seu perfil na Casa Obra e Reparos.\n\nPreciso de um serviço de *${selectedCategory.value}*.\n${latestAiResult.value!.description}\n\nPode me enviar uma proposta?`
      window.open(buildWhatsAppLink(pro.phone, msg), '_blank')
    }

    resetForm()
    goToTab('meus_pedidos')
  } catch (err) {
    console.error('Erro ao criar pedido:', err)
    formError.value = `Não foi possível enviar o pedido. ${err instanceof Error ? err.message : 'Erro de conexão com o servidor.'}`
  }
}

function resetForm() {
  latestAiResult.value = null
  aiReadyToast.value = false
  selectedProfessional.value = null
  sendMode.value = null
  formError.value = ''
  imagePreview.value = null
  photoFile.value = null
  notes.value = ''
  clientName.value = ''
  clientPhone.value = ''
  clientAddress.value = ''
  selectedCategory.value = 'Eletricista'
}

export function useQuoteForm() {
  return {
    selectedCategory, clientName, clientPhone, clientAddress, notes,
    imagePreview, photoFile,
    isAnalyzing, latestAiResult,
    createdOrderSuccess,
    sendMode, formError,
    selectedProfessional,
    aiReadyToast, aiFallback,
    directCandidates,
    handlePhotoUpload, handleAnalyzeWithAI, handleConfirmOrder,
    handleChooseProfessional, clearProfessionalSelection,
    resetForm,
  }
}
