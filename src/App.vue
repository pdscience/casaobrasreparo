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
import LandingView from './views/landing/LandingView.vue'
import DirectoryView from './views/professionals/DirectoryView.vue'
import SolicitarView from './views/client/SolicitarView.vue'
import MeusPedidosView from './views/client/MeusPedidosView.vue'
import RecibosView from './views/client/RecibosView.vue'
import HistoricoView from './views/client/HistoricoView.vue'
import PedidosProView from './views/pro/PedidosProView.vue'
import FaturamentoView from './views/pro/FaturamentoView.vue'
import PerfilProView from './views/pro/PerfilProView.vue'
import HistoricoProView from './views/pro/HistoricoView.vue'

const {
  authUser, userProfile, userMode,
  showAuth,
  proProfile, showProfileModal, isLanding,
  hydrateAuth, handleProfileModalSaved,
} = useAuth()

const {
  activeTab, onPageScroll,
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
    <main :class="[isLanding ? 'flex-1 w-full' : 'flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6']">
      <LandingView v-if="activeTab === 'boas_vindas'" />
      <DirectoryView v-if="activeTab === 'profissionais'" />
      <SolicitarView v-if="userMode === 'client' && activeTab === 'solicitar'" />

      <MeusPedidosView v-if="userMode === 'client' && activeTab === 'meus_pedidos'" />

      <RecibosView v-if="userMode === 'client' && activeTab === 'recibos_cliente'" />

      <HistoricoView v-if="userMode === 'client' && activeTab === 'historico_cliente'" />

      <PedidosProView v-if="userMode === 'pro' && activeTab === 'pedidos_pro'" />

      <FaturamentoView v-if="userMode === 'pro' && activeTab === 'faturamento'" />

      <PerfilProView v-if="userMode === 'pro' && activeTab === 'perfil_pro'" />

      <HistoricoProView v-if="userMode === 'pro' && activeTab === 'historico_pro'" />
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
