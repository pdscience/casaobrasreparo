import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Worker-Key',
}

const REQUIRED_ANALYSIS_FIELDS = ['summary', 'description', 'category', 'complexity', 'estimatedTime', 'materialsNeeded', 'suggestedMinPrice', 'suggestedMaxPrice', 'technicalNotes', 'recommendedAction']

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

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const workerKey = Deno.env.get('WORKER_KEY')
  if (!workerKey || req.headers.get('X-Worker-Key') !== workerKey) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const client = createClient({
    baseUrl: Deno.env.get('INSFORGE_BASE_URL'),
    anonKey: Deno.env.get('ANON_KEY'),
  })

  // Pega a pendente mais antiga ou claim travado há +4 min (worker morto pelo timeout).
  // O claim é condicional: só vira 'working' se ainda estiver elegível.
  const cutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString()
  const { data: candidates } = await client.database
    .from('service_analyses')
    .select('id, category, notes, image_base64, status, attempts, created_at, updated_at')
    .in('status', ['processing', 'working'])
    .order('created_at', { ascending: true })
    .limit(10)

  const list = (candidates as Array<{ id: string; status: string; updated_at: string }> | null) || []
  const eligible = list.find((r) => r.status === 'processing' || r.updated_at < cutoff)
  if (!eligible) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const claimed = await client.database
    .from('service_analyses')
    .update({ status: 'working' })
    .eq('id', eligible.id)
    .in('status', ['processing', 'working'])
    .select('id, category, notes, image_base64, attempts')

  const rows = (claimed.data as Array<{ id: string; category: string; notes: string; image_base64: string | null; attempts: number }> | null) || []
  if (rows.length === 0) {
    return new Response(JSON.stringify({ processed: 0, reason: 'claimed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const row = rows[0]
  const attempts = (row.attempts || 0) + 1
  await client.database.from('service_analyses').update({ attempts }).eq('id', row.id)
  const apiKey = Deno.env.get('NVIDIA_API_KEY')
  const baseUrl = Deno.env.get('NVIDIA_BASE_URL') || 'https://integrate.api.nvidia.com/v1'
  const model = Deno.env.get('NVIDIA_MODEL') || 'meta/llama-3.2-11b-vision-instruct'

  // Erro só após 3 tentativas; antes disso volta para a fila do próximo minuto.
  const fail = async () => {
    if (attempts >= 3) {
      await client.database.from('service_analyses')
        .update({ status: 'error', image_base64: null })
        .eq('id', row.id)
    } else {
      await client.database.from('service_analyses')
        .update({ status: 'processing' })
        .eq('id', row.id)
    }
  }

  try {
    if (!apiKey || !row.image_base64) {
      await fail()
      return new Response(JSON.stringify({ processed: 1, result: 'error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanBase64 = row.image_base64.replace(/^data:image\/\w+;base64,/, '')
    const controller = new AbortController()
    const cutoff = setTimeout(() => controller.abort(), 100000)
    let result: Record<string, unknown> | null = null
    try {
      const aiRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: `Voce e um perito em orcamentos de servicos residenciais no Brasil. Responda em portugues, EXCLUSIVAMENTE com um objeto JSON valido (sem markdown), com EXATAMENTE estes campos: summary (string curta), description (string, max 2 frases), category (string), complexity ("Baixa", "Media" ou "Alta"), estimatedTime (string curta), materialsNeeded (array com no maximo 4 strings curtas), suggestedMinPrice (inteiro em R$, ex. 1200), suggestedMaxPrice (inteiro em R$), technicalNotes (string curta, pode ser vazia), recommendedAction ("Custo Direto" ou "Visita Tecnica"). Seja conciso em todos os textos.` },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Categoria: "${row.category || 'Geral'}". Observacao: "${row.notes || 'Sem descricao'}". Analise a foto e gere o orcamento.` },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${cleanBase64}` } },
              ],
            },
          ],
          temperature: 0.4,
          top_p: 1,
          max_tokens: 512,
          stream: false,
        }),
        signal: controller.signal,
      })
      if (aiRes.ok) {
        const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> }
        result = extractAndValidateAnalysis(aiJson.choices?.[0]?.message?.content)
      }
    } catch (e) {
      console.error('Worker NVIDIA error:', e instanceof Error ? e.message : e)
    } finally {
      clearTimeout(cutoff)
    }

    if (result) {
      await client.database.from('service_analyses')
        .update({ status: 'ready', result, image_base64: null })
        .eq('id', row.id)
      return new Response(JSON.stringify({ processed: 1, result: 'ready' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    await fail()
    return new Response(JSON.stringify({ processed: 1, result: 'error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('Worker failed:', e)
    await fail()
    return new Response(JSON.stringify({ processed: 0, result: 'error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
