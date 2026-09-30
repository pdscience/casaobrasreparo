import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const REQUIRED_ANALYSIS_FIELDS = ['summary', 'description', 'category', 'complexity', 'estimatedTime', 'materialsNeeded', 'suggestedMinPrice', 'suggestedMaxPrice', 'technicalNotes', 'recommendedAction']

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

function toIntegerReais(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string') {
    const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.')
    const n = Number(cleaned)
    if (Number.isFinite(n)) return Math.round(n)
  }
  return typeof value === 'number' ? Math.round(value) : 0
}

function tryParseObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // tenta próxima estratégia
  }
  return null
}

function extractAndValidateAnalysis(content: string | undefined): Record<string, unknown> | null {
  if (!content) return null
  const candidates: string[] = []
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) candidates.push(fenced[1].trim())
  candidates.push(content.trim())
  // modelo às vezes ignora a ordem e escreve texto antes/depois: extrai o maior bloco {...}
  const first = content.indexOf('{')
  const last = content.lastIndexOf('}')
  if (first >= 0 && last > first) candidates.push(content.slice(first, last + 1))
  for (const c of candidates) {
    const obj = tryParseObject(c.replace(/,\s*([}\]])/g, '$1'))
    if (!obj) continue
    let ok = true
    for (const f of REQUIRED_ANALYSIS_FIELDS) if (!(f in obj)) { ok = false; break }
    if (!ok) continue
    obj.suggestedMinPrice = toIntegerReais(obj.suggestedMinPrice)
    obj.suggestedMaxPrice = toIntegerReais(obj.suggestedMaxPrice)
    return obj
  }
  return null
}

function buildSystemPrompt(): string {
  // Prompt enxuto: a geracao completa precisa ser rápida.
  return `Voce e um perito em orcamentos de servicos residenciais no Brasil. Responda em portugues, EXCLUSIVAMENTE com um objeto JSON valido (sem markdown), com EXATAMENTE estes campos: summary (string curta), description (string, max 2 frases), category (string), complexity ("Baixa", "Media" ou "Alta"), estimatedTime (string curta), materialsNeeded (array com no maximo 4 strings curtas), suggestedMinPrice (inteiro em R$, ex. 1200), suggestedMaxPrice (inteiro em R$), technicalNotes (string curta, pode ser vazia), recommendedAction ("Custo Direto" ou "Visita Tecnica"). Seja conciso em todos os textos.`
}

async function runNvidia(
  apiKey: string,
  baseUrl: string,
  model: string,
  userContent: Array<Record<string, unknown>>,
  systemPrompt: string,
  timeoutMs: number,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController()
  const cutoff = setTimeout(() => controller.abort(), timeoutMs)
  try {
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
        max_tokens: 512,
        stream: false,
      }),
      signal: controller.signal,
    })
    if (!aiRes.ok) return null
    const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
    return extractAndValidateAnalysis(aiJson.choices?.[0]?.message?.content)
  } catch {
    return null
  } finally {
    clearTimeout(cutoff)
  }
}

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  const userToken = authHeader ? authHeader.replace('Bearer ', '') : null

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    accessToken: userToken,
  })

  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { imageBase64?: string; mimeType?: string; category?: string; notes?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', category, notes } = body
    const apiKey = Deno.env.get('NVIDIA_API_KEY')
    const preliminary = getFallbackAnalysis(category, notes)

    const analysisId = crypto.randomUUID()
    await client.database.from('service_analyses').insert([{
      id: analysisId,
      category: category || '',
      notes: notes || '',
      status: 'processing',
      result: null,
      image_base64: imageBase64 || null,
    }])

    if (!apiKey) {
      await client.database.from('service_analyses').update({ status: 'ready', result: preliminary }).eq('id', analysisId)
      return new Response(JSON.stringify({ status: 'ready', analysis: preliminary, analysisId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
    const model = Deno.env.get('NVIDIA_MODEL') || 'meta/llama-3.2-11b-vision-instruct'

    const userText = `Voce e um perito em avaliacao tecnica de prestacao de servicos residenciais e comerciais no Brasil. Examine a foto e as informacoes fornecidas para a categoria de servico: "${category || 'Geral'}". Descricao/Observacao do cliente: "${notes || 'Sem descricao adicional'}". Faca uma analise minuciosa dos danos, reparos necessarios, materiais e estimativa de custos em Reais (R$).`
    const userContent: Array<Record<string, unknown>> = [{ type: 'text', text: userText }]
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${cleanBase64}` },
      })
    }
    const systemPrompt = buildSystemPrompt()

    // Tentativa rápida: se a IA responder depressa, devolve o real de uma vez.
    const fast = await runNvidia(apiKey, baseUrl, model, userContent, systemPrompt, 15000)
    if (fast) {
      await client.database.from('service_analyses').update({ status: 'ready', result: fast, image_base64: null }).eq('id', analysisId)
      return new Response(JSON.stringify({ status: 'ready', analysis: fast, analysisId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Lenta: responde o preliminar agora; o worker (schedule a cada 1 min)
    // conclui em background e o front faz polling até status=ready.
    return new Response(JSON.stringify({ status: 'processing', analysis: preliminary, analysisId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    console.error('Erro na analise tecnica:', error)
    const reqBody = (req as unknown as { body?: { category?: string; notes?: string } }).body || {}
    return new Response(JSON.stringify({ status: 'error', analysis: getFallbackAnalysis(reqBody.category, reqBody.notes), analysisId: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
