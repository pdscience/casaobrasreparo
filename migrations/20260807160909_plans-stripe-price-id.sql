ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

UPDATE public.plans
SET stripe_price_id = CASE id
  WHEN 'ouro' THEN 'price_1U0CnKUfRcMtQSByL7oOrR3'
  WHEN 'prata' THEN 'price_1U0BmKUfRcMtQSBxK9mNpQ2'
  WHEN 'bronze' THEN 'price_1U0AnHKUfRcMtQSBD4j8gsfH'
  WHEN 'gratuito' THEN 'price_1U0AmlKUfRcMtQSBvI3sLXY9'
  ELSE NULL
END
WHERE id IN ('ouro', 'prata', 'bronze', 'gratuito');
