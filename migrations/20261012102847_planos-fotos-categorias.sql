ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS portfolio_photos TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.professionals SET categories = ARRAY[category]
WHERE category IS NOT NULL AND category <> '' AND categories = '{}';

ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_photos INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_categories INTEGER NULL;
UPDATE public.plans SET max_photos = CASE id WHEN 'gratuito' THEN 0 WHEN 'bronze' THEN 1 WHEN 'prata' THEN 3 WHEN 'ouro' THEN 5 ELSE 0 END;
UPDATE public.plans SET max_categories = CASE id WHEN 'gratuito' THEN 1 WHEN 'bronze' THEN 1 WHEN 'prata' THEN 3 WHEN 'ouro' THEN NULL ELSE 1 END;
UPDATE public.plans SET client_visible = true WHERE id = 'gratuito';
