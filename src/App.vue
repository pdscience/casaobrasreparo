<script setup lang="ts">
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { trackEvent } from './lib/analytics'
import { CATEGORIES } from './lib/categories'
import { useAuth } from './composables/useAuth'
import { useNavigation } from './composables/useNavigation'
import { useRequests } from './composables/useRequests'
import ProfileEditModal from './components/ProfileEditModal.vue'
import AppHeader from './components/layout/AppHeader.vue'
import AppFooter from './components/layout/AppFooter.vue'
import ToastHost from './components/layout/ToastHost.vue'
import AuthModal from './components/auth/AuthModal.vue'
import UpgradeModal from './components/modals/UpgradeModal.vue'
import OnboardingPlansModal from './components/modals/OnboardingPlansModal.vue'
import ScheduleModal from './components/modals/ScheduleModal.vue'
import RateModal from './components/modals/RateModal.vue'
import ReceiptModal from './components/modals/ReceiptModal.vue'

const {
  authUser, userProfile, userMode,
  showAuth,
  proProfile, showProfileModal, isLanding,
  hydrateAuth, handleProfileModalSaved,
} = useAuth()

const {
  onPageScroll,
} = useNavigation()

const {
  loadData,
} = useRequests()

// ---------- Views públicas (landing + diretório) em src/views ----------

onMounted(() => {
  loadData()
  hydrateAuth()
  trackEvent('page_view_landing', { path: window.location.pathname })
  window.addEventListener('scroll', onPageScroll, { passive: true })
  onPageScroll()
  // Reavalia o header quando a landing entra em cena (scroll state global fica no shell — ruling 8)
  watch(isLanding, (v) => {
    if (v) nextTick(() => { onPageScroll() })
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', onPageScroll)
})
</script>
<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
    <AppHeader />

    <AuthModal v-if="showAuth" />

    <!-- MAIN CONTENT AREA -->
    <main :class="[isLanding ? 'flex-1 w-full' : 'flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pb-4 sm:pb-6 pt-20']">
      <router-view />
    </main>

    <UpgradeModal />
    <OnboardingPlansModal />

    <ScheduleModal />

    <RateModal />

    <ReceiptModal />

    <!-- MODAL DE EDIÇÃO DE PERFIL / CONTA -->
    <ProfileEditModal
      :open="showProfileModal"
      :role="userMode === 'pro' ? 'pro' : 'client'"
      :professional="proProfile.id ? proProfile : null"
      :auth-id="authUser?.id ?? null"
      :user="userProfile"
      :categories="CATEGORIES.map(c => c.name)"
      @close="showProfileModal = false"
      @saved="handleProfileModalSaved"
    />

    <AppFooter />
    <ToastHost />
  </div>
</template>

<style>
@keyframes carousel {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-carousel {
  animation: carousel 30s linear infinite;
}
.animate-carousel:hover {
  animation-play-state: paused;
}
</style>
