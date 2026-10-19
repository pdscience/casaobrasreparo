import { ref } from 'vue'
import type { Professional, ServiceRequest } from '../types'

const viewReceiptModal = ref<ServiceRequest | null>(null)
const rateOrderModal = ref<ServiceRequest | null>(null)
const scheduleModal = ref<ServiceRequest | null>(null)
const showUpgradeModal = ref(false)
const showOnboardingPlans = ref(false)
const isMobileMenuOpen = ref(false)
const ratingStars = ref(5)
const ratingComment = ref('')
const scheduleDate = ref('')
const scheduleTime = ref('14:00')
const schedulePrice = ref('')
const scheduleObs = ref('')
// Categoria escolhida na landing: global para sobreviver a navegacao (a LP desmonta)
const landingCategory = ref('')
const profileModalPro = ref<Professional | null>(null)

const toasts = ref<{ id: number; kind: 'success' | 'error' | 'info' | 'warning'; message: string }[]>([])
let toastSeq = 0
export function pushToast(kind: 'success' | 'error' | 'info' | 'warning', message: string, ttlMs = 5000): void {
  const id = ++toastSeq
  toasts.value.push({ id, kind, message })
  if (ttlMs > 0) setTimeout(() => dismissToast(id), ttlMs)
}
export function dismissToast(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

export function useUi() {
  return { viewReceiptModal, rateOrderModal, scheduleModal, showUpgradeModal, showOnboardingPlans,
    isMobileMenuOpen, ratingStars, ratingComment, scheduleDate, scheduleTime, schedulePrice, scheduleObs,
    landingCategory, profileModalPro,
    toasts, pushToast, dismissToast }
}
