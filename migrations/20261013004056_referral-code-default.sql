-- Gera referral_code automaticamente nos novos profissionais.
ALTER TABLE public.professionals ALTER COLUMN referral_code SET DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
