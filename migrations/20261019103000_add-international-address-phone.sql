-- Endereco internacional (pais/estado/municipio) e telefone com DDI.
-- O telefone passa a ser gravado em E.164 (+5511987654321); o DDI fica em phone_country_code.
-- As colunas legadas uf e cidade sao mantidas e preenchidas em sincronia pelo app.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS municipality TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '55';

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS municipality TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '55';

-- Backfill dos registros existentes (tudo era brasileiro).
UPDATE public.users
SET state = upper(uf) WHERE state = '' AND uf <> '';
UPDATE public.users
SET municipality = cidade WHERE municipality = '' AND cidade <> '';
UPDATE public.users
SET phone = '+55' || phone WHERE phone <> '' AND phone NOT LIKE '+%';
UPDATE public.users
SET phone_country_code = '55' WHERE phone_country_code = '';

UPDATE public.professionals
SET state = upper(uf) WHERE state = '' AND uf <> '';
UPDATE public.professionals
SET municipality = cidade WHERE municipality = '' AND cidade <> '';
UPDATE public.professionals
SET phone = '+55' || phone WHERE phone <> '' AND phone NOT LIKE '+%';
UPDATE public.professionals
SET phone_country_code = '55' WHERE phone_country_code = '';
