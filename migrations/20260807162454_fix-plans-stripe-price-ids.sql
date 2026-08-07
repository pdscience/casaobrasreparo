UPDATE public.plans
SET stripe_price_id = CASE id
  WHEN 'ouro' THEN 'price_1U0CldKUfRcMtQSBbx4QJEO0'
  WHEN 'prata' THEN 'price_1U0CknKUfRcMtQSByHhQdRrj'
  WHEN 'bronze' THEN 'price_1U0AmlKUfRcMtQSBvI3sLXY9'
  ELSE NULL
END
WHERE id IN ('ouro', 'prata', 'bronze');
