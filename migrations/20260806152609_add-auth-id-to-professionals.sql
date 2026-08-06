-- migrations/20260806152609_add-auth-id-to-professionals.sql
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS auth_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_auth_id ON public.professionals(auth_id);
