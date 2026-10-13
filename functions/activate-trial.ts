import { createClient } from 'npm:@insforge/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const TRIAL_DAYS = 30

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

  let body: { professionalId?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const { professionalId } = body
  if (!professionalId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: proData, error: proError } = await client.database
    .from('professionals')
    .select('plan,trial_used,auth_id')
    .eq('id', professionalId)
    .maybeSingle()
  if (proError || !proData) {
    return new Response(JSON.stringify({ error: 'Professional not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (proData.auth_id && proData.auth_id !== userData.user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (proData.trial_used || proData.plan !== 'gratuito') {
    return new Response(JSON.stringify({ error: 'Trial indisponível' }), {
      status: 409,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const expiresAt = new Date(Date.now() + TRIAL_DAYS * 86400 * 1000).toISOString()
  const { error: updateError } = await client.database
    .from('professionals')
    .update({ plan: 'ouro', plan_status: 'trialing', plan_expires_at: expiresAt, trial_used: true })
    .eq('id', professionalId)
  if (updateError) {
    console.error('Erro ao ativar trial:', updateError)
    return new Response(JSON.stringify({ error: 'Erro ao ativar trial' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ plan: 'ouro', expires_at: expiresAt }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
