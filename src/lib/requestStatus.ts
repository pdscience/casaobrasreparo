export const statusSteps: string[] = ['Pendente', 'Visita Agendada', 'Em Execução', 'Concluído']

export type StatusGroup = 'pendentes' | 'andamento' | 'concluidas'

export function clientStatusGroup(
  status: 'Pendente' | 'Visita Agendada' | 'Em Execução' | 'Concluído' | 'Cancelado',
): StatusGroup {
  if (status === 'Pendente') return 'pendentes'
  if (status === 'Concluído' || status === 'Cancelado') return 'concluidas'
  return 'andamento'
}

export function formatRequestDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
