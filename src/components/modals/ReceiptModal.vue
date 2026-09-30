<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import { useUi } from '../../composables/useUi'
import { FileText, Printer, X } from 'lucide-vue-next'

const { proProfile } = useAuth()
const { viewReceiptModal } = useUi()

function printReceipt() {
  window.print()
}
</script>

<template>
<!-- MODAL 3: VIEW & PRINT DIGITAL RECEIPT -->
<div v-if="viewReceiptModal" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
  <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
      <h3 class="font-bold text-white text-sm flex items-center gap-2">
        <FileText class="w-4 h-4 text-amber-400" />
        Recibo Digital de Prestação de Serviço
      </h3>
      <button @click="viewReceiptModal = null" class="text-slate-400 hover:text-white">
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- PRINTABLE RECEIPT CONTAINER -->
    <div class="bg-white text-slate-900 p-6 rounded-xl space-y-5 font-mono text-xs shadow-inner">
      <div class="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
        <div>
          <h4 class="font-extrabold text-sm uppercase tracking-tight">Recibo de Serviço</h4>
          <p class="text-[10px] text-slate-600">Nº Ord: {{ viewReceiptModal.id }}</p>
        </div>
        <div class="text-right text-[10px] text-slate-600">
          <p>Data: {{ viewReceiptModal.agendamento?.data || '2026-07-29' }}</p>
          <p>Status: QUITADO</p>
        </div>
      </div>

      <div class="space-y-2 text-[11px]">
        <p><strong>PRESTADOR:</strong> {{ proProfile.name }}</p>
        <p><strong>CATEGORIA:</strong> {{ proProfile.category }}</p>
        <p><strong>CHAVE PIX:</strong> {{ proProfile.pix_key }}</p>
      </div>

      <div class="border-t border-b border-slate-200 py-3 space-y-2 text-[11px]">
        <p><strong>CLIENTE:</strong> {{ viewReceiptModal.client_name }}</p>
        <p><strong>ENDEREÇO:</strong> {{ viewReceiptModal.client_address }}</p>
        <p><strong>SERVIÇO EXECUTADO:</strong> {{ viewReceiptModal.ai_analysis?.summary || viewReceiptModal.category }}</p>
      </div>

      <div class="flex justify-between items-center text-sm font-extrabold pt-2">
        <span>VALOR TOTAL PAGO:</span>
        <span class="text-amber-700">R$ {{ viewReceiptModal.final_price }},00</span>
      </div>

      <div class="text-center pt-4 text-[9px] text-slate-500 border-t border-dashed border-slate-300">
        Comprovante gerado digitalmente via Casa Obras e Reparos IA.
      </div>
    </div>

    <!-- MODAL ACTIONS -->
    <div class="flex gap-2">
      <button
        @click="printReceipt"
        class="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
      >
        <Printer class="w-4 h-4" /> Imprimir ou Salvar PDF
      </button>
      <button
        @click="viewReceiptModal = null"
        class="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
      >
        Fechar
      </button>
    </div>
  </div>
</div>
</template>
