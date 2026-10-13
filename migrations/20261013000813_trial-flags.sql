-- Flag de trial único por profissional (autoativação do ouro, 1 vez por auth_id).
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;
