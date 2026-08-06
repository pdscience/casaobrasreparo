import 'dotenv/config'
import express from 'express'
import Stripe from 'stripe'

const INSFORGE_URL = process.env.INSFORGE_URL || process.env.VITE_INSFORGE_URL
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY || process.env.VITE_INSFORGE_ANON_KEY

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as never,
})

const PAID_PLANS = ['bronze', 'prata', 'ouro'] as const
const PRICE_IDS: Record<string, string | undefined> = {
  bronze: process.env.STRIPE_BRONZE_PRICE_ID,
  prata: process.env.STRIPE_PRATA_PRICE_ID,
  ouro: process.env.STRIPE_OURO_PRICE_ID,
}

const app = express()

async function insforgeQuery(table: string, method: string, body?: Record<string, unknown>, params?: string) {
  const url = `${INSFORGE_URL}/api/database/records/${table}${params ? `?${params}` : ''}`
  const headers: Record<string, string> = {
    'apikey': INSFORGE_ANON_KEY!,
    'Authorization': `Bearer ${INSFORGE_ANON_KEY!}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' || method === 'PATCH' ? 'return=representation' : 'return=minimal',
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`InsForge error: ${response.status} - ${error}`)
  }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).send(`Webhook Error: ${err}`)
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const professionalId = session.metadata?.professional_id
    const plan = session.metadata?.plan
    if (professionalId && plan) {
      try {
        const subscription = session.subscription ? await stripe.subscriptions.retrieve(session.subscription as string) : null
        const planExpiresAt = subscription ? new Date((subscription.items.data[0]?.current_period_end ?? subscription.created) * 1000).toISOString() : null
        await insforgeQuery('professionals', 'PATCH', {
          plan,
          plan_status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan_expires_at: planExpiresAt,
        }, `id=eq.${professionalId}`)
        console.log('Plano atualizado com sucesso:', { professionalId, plan })
      } catch (error) {
        console.error('Erro ao atualizar plano:', error)
      }
    }
  }
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription
    try {
      await insforgeQuery('professionals', 'PATCH', {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        plan_expires_at: new Date((subscription.items.data[0]?.current_period_end ?? subscription.created) * 1000).toISOString(),
      }, `stripe_customer_id=eq.${subscription.customer}`)
    } catch (error) {
      console.error('Erro ao atualizar plano na criacao:', error)
    }
  }
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    try {
      const priceId = subscription.items.data[0]?.price?.id
      let plan: string | undefined
      if (priceId === process.env.STRIPE_OURO_PRICE_ID) plan = 'ouro'
      else if (priceId === process.env.STRIPE_PRATA_PRICE_ID) plan = 'prata'
      else if (priceId === process.env.STRIPE_BRONZE_PRICE_ID) plan = 'bronze'
      const updates: Record<string, unknown> = {
        plan_status: subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'canceled',
        plan_expires_at: new Date((subscription.items.data[0]?.current_period_end ?? subscription.created) * 1000).toISOString(),
      }
      if (plan) updates.plan = plan
      await insforgeQuery('professionals', 'PATCH', updates, `stripe_subscription_id=eq.${subscription.id}`)
    } catch (error) {
      console.error('Erro ao atualizar plano na atualizacao:', error)
    }
  }
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    try {
      await insforgeQuery('professionals', 'PATCH', { plan_status: 'canceled', plan: 'gratuito' }, `stripe_subscription_id=eq.${subscription.id}`)
    } catch (error) {
      console.error('Erro ao cancelar plano:', error)
    }
  }
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice
    try {
      await insforgeQuery('professionals', 'PATCH', {
        plan_expires_at: new Date(invoice.period_end * 1000).toISOString(),
        plan_status: 'active',
      }, `stripe_subscription_id=eq.${(invoice as Stripe.Invoice & { subscription: string | null }).subscription}`)
    } catch (error) {
      console.error('Erro ao atualizar periodo de cobranca:', error)
    }
  }
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    try {
      await insforgeQuery('professionals', 'PATCH', { plan_status: 'past_due' }, `stripe_subscription_id=eq.${(invoice as Stripe.Invoice & { subscription: string | null }).subscription}`)
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }
  res.json({ received: true })
})

app.use(express.json())
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

app.post('/api/analyze-service', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', category, notes } = req.body
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) return res.json(getFallbackAnalysis(category, notes))
    const baseUrl = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1'
    const model = process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct'

    const userText = `Voce e um perito em avaliacao tecnica de prestacao de servicos residenciais e comerciais no Brasil. Examine a foto e as informacoes fornecidas para a categoria de servico: "${category || 'Geral'}". Descricao/Observacao do cliente: "${notes || 'Sem descricao adicional'}". Faca uma analise minuciosa dos danos, reparos necessarios, materiais e estimativa de custos em Reais (R$).`
    const userContent: Array<Record<string, unknown>> = [{ type: 'text', text: userText }]
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${cleanBase64}` },
      })
    }

    const systemPrompt = `Voce e um assistente tecnico especializado em orcamentos para prestadores de servicos gerais no Brasil. Responda em portugues com termos claros. Responda EXCLUSIVAMENTE com um objeto JSON valido (sem markdown, sem texto antes ou depois), com EXATAMENTE estes campos e tipos:
- summary (string): titulo sucinto do problema/servico identificado
- description (string): descricao detalhada do diagnostico visual
- category (string): categoria de servico recomendada
- complexity (string): um destes valores: "Baixa", "Media" ou "Alta"
- estimatedTime (string): estimativa de tempo de execucao (ex.: "2 a 3 horas")
- materialsNeeded (array de strings): lista de materiais provavelmente necessarios
- suggestedMinPrice (number): valor minimo estimado em R$, SEMPRE como numero inteiro (ex.: 1200 para R$ 1.200,00; nunca 1.2 ou "1200")
- suggestedMaxPrice (number): valor maximo estimado em R$, SEMPRE como numero inteiro (ex.: 3000 para R$ 3.000,00; nunca 1.2 ou "3000")
- technicalNotes (string): orientacoes ou alertas de seguranca para o profissional
- recommendedAction (string): "Custo Direto" ou "Visita Tecnica"
Nao inclua nenhum campo alem desses. Nao envolva o JSON em cercas de codigo. Todos os valores monetarios DEVEM ser numeros inteiros (sem casas decimais, sem moeda, sem separador de milhar); por exemplo, use 1200 e nunca 1.2, "R$ 1200" ou "1.200".`

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        top_p: 1,
        max_tokens: 1024,
        stream: false,
      }),
    })
    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '')
      throw new Error(`NVIDIA HTTP ${aiRes.status}: ${errText.slice(0, 200)}`)
    }
    const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const content = aiJson.choices?.[0]?.message?.content
    const validated = extractAndValidateAnalysis(content)
    if (!validated) return res.json(getFallbackAnalysis(category, notes))
    res.json(validated)
  } catch (error: unknown) {
    console.error('Erro na analise tecnica do NVIDIA:', error)
    const reqBody = req.body || {}
    res.json(getFallbackAnalysis(reqBody.category, reqBody.notes))
  }
})

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { professionalId, plan, email } = req.body
    if (!professionalId || !plan || !email) return res.status(400).json({ error: 'Missing required fields' })
    if (!(PAID_PLANS as readonly string[]).includes(plan)) return res.status(400).json({ error: 'Invalid plan' })
    const priceId = PRICE_IDS[plan]
    if (!priceId) return res.status(500).json({ error: 'Price ID not configured' })
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { professional_id: professionalId, plan },
      success_url: `${req.headers.origin || 'http://localhost:5173'}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || 'http://localhost:5173'}/?canceled=true`,
    })
    res.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Erro ao criar sessao de checkout:', error)
    res.status(500).json({ error: 'Erro ao criar sessao de checkout' })
  }
})

app.get('/api/subscription-status/:professionalId', async (req, res) => {
  try {
    const { professionalId } = req.params
    const data = await insforgeQuery('professionals', 'GET', undefined, `id=eq.${professionalId}&select=plan,plan_status,requests_this_month,requests_reset_at,plan_expires_at,stripe_customer_id`)
    if (!data || data.length === 0) return res.status(404).json({ error: 'Professional not found' })
    const pro = data[0]
    const now = new Date()
    const resetAt = pro.requests_reset_at ? new Date(pro.requests_reset_at) : null
    const needsReset = !resetAt || resetAt.getMonth() !== now.getMonth() || resetAt.getFullYear() !== now.getFullYear()
    res.json({
      plan: pro.plan,
      status: pro.plan_status,
      requestsThisMonth: needsReset ? 0 : pro.requests_this_month || 0,
      requestLimit: pro.plan === 'ouro' ? null : pro.plan === 'prata' ? 30 : pro.plan === 'bronze' ? 10 : 0,
      planExpiresAt: pro.plan_expires_at,
      stripeCustomerId: pro.stripe_customer_id,
    })
  } catch (error) {
    console.error('Erro ao buscar status:', error)
    res.status(500).json({ error: 'Erro ao buscar status' })
  }
})

app.post('/api/create-portal-session', async (req, res) => {
  try {
    const { professionalId } = req.body
    if (!professionalId) return res.status(400).json({ error: 'Missing professionalId' })
    const data = await insforgeQuery('professionals', 'GET', undefined, `id=eq.${professionalId}&select=stripe_customer_id`)
    if (!data || data.length === 0) return res.status(404).json({ error: 'Professional not found' })
    const customerId = data[0].stripe_customer_id
    if (!customerId) return res.status(400).json({ error: 'No Stripe customer found' })
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin || 'http://localhost:5173'}/perfil_pro`,
    })
    res.json({ url: portalSession.url })
  } catch (error) {
    console.error('Erro ao criar portal session:', error)
    res.status(500).json({ error: 'Erro ao criar sessao do portal' })
  }
})

app.post('/api/change-plan', async (req, res) => {
  try {
    const { professionalId, targetPlan } = req.body
    if (!professionalId || !targetPlan) return res.status(400).json({ error: 'Missing required fields' })
    if (!(PAID_PLANS as readonly string[]).includes(targetPlan)) return res.status(400).json({ error: 'Invalid plan' })
    const data = await insforgeQuery('professionals', 'GET', undefined, `id=eq.${professionalId}&select=stripe_subscription_id,plan`)
    if (!data || data.length === 0) return res.status(404).json({ error: 'Professional not found' })
    const pro = data[0]
    if (!pro.stripe_subscription_id) return res.status(400).json({ error: 'No active subscription found' })
    const priceId = PRICE_IDS[targetPlan]
    if (!priceId) return res.status(500).json({ error: 'Price ID not configured' })
    const subscription = await stripe.subscriptions.update(pro.stripe_subscription_id, {
      items: [{ price: priceId }],
      proration_behavior: 'create_prorations',
    })
    await insforgeQuery('professionals', 'PATCH', { plan: targetPlan }, `id=eq.${professionalId}`)
    res.json({ subscriptionId: subscription.id, status: subscription.status })
  } catch (error) {
    console.error('Erro ao alterar plano:', error)
    res.status(500).json({ error: 'Erro ao alterar plano' })
  }
})

function getFallbackAnalysis(category?: string, notes?: string) {
  const cat = category || 'Geral'
  const catLower = cat.toLowerCase()
  let items = ['Pecas e insumos basicos de reposicao', 'Vedacoes / Conectores', 'Consumiveis de limpeza e acabamento']
  let summary = `Manutencao e Reparo em ${cat}`
  let desc = notes ? `Analise previa baseada no relato: "${notes}". Servico requer inspecao local de conectores e estado estrutural.` : `Diagnostico visual indica reparo padrao de manutencao na categoria ${cat}. Necessita verificacao tecnica.`
  if (catLower.includes('eletric')) { summary = 'Manutencao Eletrica / Troca de Ponto ou Fiação'; items = ['Disjuntor de seguranca', 'Fios paralelos 2.5mm', 'Fita isolante 3M', 'Tomadas/Interruptores novos'] }
  else if (catLower.includes('encan') || catLower.includes('hidr')) { summary = 'Reparo Hidraulico / Eliminacao de Vazamento'; items = ['Veda rosca', 'Conexao PVC / Cobre', 'Cola para tubo de PVC', 'Sifao ajustavel'] }
  else if (catLower.includes('pinto')) { summary = 'Preparacao de Superficie e Pintura Geral'; items = ['Massa corrida / acrilica', "Lixa d'agua 150/220", 'Tinta acrilica fosca', 'Rolo de la antigota'] }
  else if (catLower.includes('ar') || catLower.includes('clima')) { summary = 'Higienizacao Profunda / Recarga de Gas do Ar'; items = ['Gas refrigerante R410A / R32', 'Detergente bactericida', 'Lona de protecao de fumaca'] }
  return { summary, description: desc, category: cat, complexity: 'Media', estimatedTime: '2 a 3 horas', materialsNeeded: items, suggestedMinPrice: 0, suggestedMaxPrice: 0, technicalNotes: '', recommendedAction: 'Custo Direto' }
}

const REQUIRED_ANALYSIS_FIELDS = ['summary', 'description', 'category', 'complexity', 'estimatedTime', 'materialsNeeded', 'suggestedMinPrice', 'suggestedMaxPrice', 'technicalNotes', 'recommendedAction']

function extractAndValidateAnalysis(content: string | undefined): Record<string, unknown> | null {
  if (!content) return null
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : content).trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(candidate)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const obj = parsed as Record<string, unknown>
  for (const f of REQUIRED_ANALYSIS_FIELDS) if (!(f in obj)) return null
  obj.suggestedMinPrice = toIntegerReais(obj.suggestedMinPrice)
  obj.suggestedMaxPrice = toIntegerReais(obj.suggestedMaxPrice)
  return obj
}

function toIntegerReais(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = Number(cleaned)
    if (Number.isFinite(n)) return Math.round(n)
  }
  return typeof value === 'number' ? Math.round(value) : 0
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor de analise rodando na porta ${PORT}`)
})
