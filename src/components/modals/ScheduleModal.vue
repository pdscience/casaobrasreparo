<script setup lang="ts">
import { useUi } from '../../composables/useUi'
import { useRequests } from '../../composables/useRequests'
import { Calendar, X } from 'lucide-vue-next'

const { scheduleModal, scheduleDate, scheduleTime, schedulePrice, scheduleObs } = useUi()
const { handleSaveSchedule } = useRequests()
</script>

<template>
<!-- MODAL 1: SCHEDULE VISIT / SET COST -->
<div v-if="scheduleModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
  <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="font-bold text-white text-sm flex items-center gap-2">
        <Calendar class="w-4 h-4 text-amber-400" />
        Agendar Visita / Definir Preço
      </h3>
      <button @click="scheduleModal = null" class="text-slate-400 hover:text-white">
        <X class="w-5 h-5" />
      </button>
    </div>

    <div class="space-y-3 text-xs">
      <p class="text-slate-300">
        Defina o dia, horário e valor acordado para o atendimento de <strong>{{ scheduleModal.client_name }}</strong>.
      </p>

      <div>
        <label class="text-slate-400 font-medium">Data da Visita:</label>
        <input
          type="date"
          v-model="scheduleDate"
          class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label class="text-slate-400 font-medium">Horário Estimado:</label>
        <input
          type="time"
          v-model="scheduleTime"
          class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
        />
      </div>

      <div>
        <label class="text-slate-400 font-medium">Valor do Serviço / Visita (R$):</label>
        <input
          type="number"
          v-model="schedulePrice"
          class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500 font-bold"
          placeholder="Ex: 220"
        />
      </div>

      <div>
        <label class="text-slate-400 font-medium">Observação para o Cliente:</label>
        <input
          type="text"
          v-model="scheduleObs"
          class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
          placeholder="Ex: Trazer escada alta e disjuntor de fiação"
        />
      </div>
    </div>

    <div class="flex gap-2 pt-2">
      <button
        @click="handleSaveSchedule"
        class="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
      >
        Confirmar Agendamento
      </button>
      <button
        @click="scheduleModal = null"
        class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
      >
        Cancelar
      </button>
    </div>
  </div>
</div>
</template>
