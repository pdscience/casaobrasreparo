<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const { t } = useI18n()
const logoUrl = '/logo_casa.png'

function goHome(): void {
  void router.push('/')
}

function goProfessionals(): void {
  void router.push('/profissionais')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center py-20 px-4 space-y-6 animate-in fade-in duration-300">
    <img :src="logoUrl" alt="Casa Obras e Reparos" class="w-16 h-16 rounded-2xl object-cover" />
    <div class="space-y-2">
      <p class="text-5xl font-black text-slate-700">404</p>
      <h1 class="text-xl font-extrabold text-white tracking-tight">{{ t('notFound.title') }}</h1>
      <p class="text-sm text-slate-400 max-w-md">
        {{ t('notFound.desc') }}
      </p>
    </div>
    <div class="flex flex-col sm:flex-row items-center gap-3">
      <button
        @click="goHome"
        class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-sm font-extrabold hover:from-amber-400 hover:to-yellow-300 transition-all shadow-lg shadow-amber-500/20"
      >
        {{ t('notFound.backHome') }}
      </button>
      <button
        @click="goProfessionals"
        class="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-bold hover:border-amber-500/60 hover:text-white transition-all"
      >
        {{ t('notFound.viewProfessionals') }}
      </button>
    </div>
  </div>
</template>
