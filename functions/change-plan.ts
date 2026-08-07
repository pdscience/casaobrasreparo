import { createClient } from 'npm:@insforge/sdk'
import Stripe from 'npm:stripe'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const PAID_PLANS = ['bronze', 'prata', 'ouro']

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

  let body: { professionalId?: string; targetPlan?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const { professionalId, targetPlan } = body
  if (!professionalId || !targetPlan) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (!PAID_PLANS.includes(targetPlan)) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const secretKey = Deno.env.get('STRIPE_TEST_SECRET_KEY')
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const stripe = new Stripe(secretKey)

  const { data: proData, error: proError } = await client.database
    .from('professionals')
    .select('stripe_subscription_id,plan,auth_id')
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
  if (!proData.stripe_subscription_id) {
    return new Response(JSON.stringify({ error: 'No active subscription found' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: planData, error: planError } = await client.database
    .from('plans')
    .select('stripe_price_id')
    .eq('id', targetPlan)
    .maybeSingle()
  if (planError || !planData?.stripe_price_id) {
    return new Response(JSON.stringify({ error: 'Price ID not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const subscription = await stripe.subscriptions.update(proData.stripe_subscription_id, {
      items: [{ price: planData.stripe_price_id }],
      proration_behavior: 'create_prorations',
    })
    await client.database
      .from('professionals')
      .update({ plan: targetPlan })
      .eq('id', professionalId)
    return new Response(JSON.stringify({ subscriptionId: subscription.id, status: subscription.status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao alterar plano:', error)
    return new Response(JSON.stringify({ error: 'Erro ao alterar plano' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}
