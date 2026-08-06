ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.professionals SET plan = 'bronze' WHERE plan = 'essencial';
UPDATE public.professionals SET plan = 'ouro'   WHERE plan = 'completo';
