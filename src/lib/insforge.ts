import { createClient } from '@insforge/sdk'

const baseUrl = String(import.meta.env.VITE_INSFORGE_URL || '').replace(/\/$/, '')

export const insforge = createClient({
  baseUrl,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY,
  // Análise por IA (foto + modelo vision) pode exceder os 30s padrão em redes lentas
  timeout: 120000,
  // Rota via API principal em vez do subhost function2: em algumas redes o POST
  // para *.function2.insforge.app morre no transporte (só o preflight chegava).
  functionsUrl: `${baseUrl}/functions`,
})