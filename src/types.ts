export interface AIAnalysis {
  summary: string
  description: string
  category: string
  complexity: "Baixa" | "Média" | "Alta"
  estimatedTime: string
  materialsNeeded: string[]
  suggestedMinPrice: number
  suggestedMaxPrice: number
  technicalNotes: string
  recommendedAction: string
}

export interface Professional {
  id: string
  name: string
  category: string
  email: string
  phone: string
  rating: number
  reviews_count: number
  avatar: string
  pix_key: string
  bio: string
  plan: 'gratuito' | 'bronze' | 'prata' | 'ouro'
  plan_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_expires_at: string | null
  requests_this_month: number
  requests_reset_at: string | null
}

export interface ServiceRequest {
  id: string
  created_at: string
  client_name: string
  client_phone: string
  client_address: string
  category: string
  photo_url: string
  notes: string
  ai_analysis: AIAnalysis | null
  status: "Pendente" | "Visita Agendada" | "Em Execução" | "Concluído" | "Cancelado"
  professional_id: string | null
  broadcast: boolean
  agendamento: {
    data: string
    hora: string
    observacao?: string
  } | null
  final_price: number | null
  receipt_issued: boolean
  rating: {
    stars: number
    comment: string
    date: string
  } | null
}

export interface Plan {
  id: string
  display_name: string
  rank: number
  monthly_price: number
  request_limit: number | null
  receives_broadcasts: boolean
  show_whatsapp_to_client: boolean
  client_visible: boolean
  badge_label: string | null
  badge_bg: string | null
  badge_text: string | null
  badge_border: string | null
}