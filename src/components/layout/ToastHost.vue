<script setup lang="ts">
import { useUi } from '../../composables/useUi'
const { toasts, dismissToast } = useUi()
</script>
<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px]">
    <div v-for="t in toasts" :key="t.id"
      class="rounded-xl border p-3 text-sm shadow-lg backdrop-blur-sm"
      :class="{
        'bg-emerald-500/10 border-emerald-500/30 text-emerald-200': t.kind === 'success',
        'bg-red-500/10 border-red-500/30 text-red-200': t.kind === 'error',
        'bg-amber-500/10 border-amber-500/30 text-amber-200': t.kind === 'warning',
        'bg-slate-800/90 border-slate-700 text-slate-200': t.kind === 'info',
      }" role="status">
      <div class="flex items-start justify-between gap-2">
        <span>{{ t.message }}</span>
        <button class="shrink-0 opacity-60 hover:opacity-100" @click="dismissToast(t.id)">×</button>
      </div>
    </div>
  </div>
</template>
