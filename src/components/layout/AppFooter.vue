<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <!-- FOOTER -->
  <footer class="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
    <div class="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span>{{ t('app.copyright') }}</span>
      <span class="text-[11px] text-slate-600">LINUXIS</span>
    </div>
  </footer>
</template>
