-- Plano 'ouro' passa a ser exibido como Premium. O id e o stripe_price_id
-- continuam iguais para não quebrar assinaturas existentes.
UPDATE public.plans
SET display_name = 'Premium',
    badge_label = 'Premium',
    updated_at = now()
WHERE id = 'ouro';
