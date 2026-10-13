-- Indique e Ganhe: código próprio por profissional + tabela de indicações.
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS referred_by TEXT NULL;
UPDATE public.professionals SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id TEXT PRIMARY KEY DEFAULT MD5(RANDOM()::TEXT),
  referrer_pro_id TEXT NOT NULL REFERENCES public.professionals(id),
  referred_pro_id TEXT NOT NULL REFERENCES public.professionals(id),
  status TEXT NOT NULL DEFAULT 'cadastrado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referrals_select_own ON public.referrals;
DROP POLICY IF EXISTS referrals_insert_own ON public.referrals;
CREATE POLICY referrals_select_own ON public.referrals FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = referrals.referrer_pro_id AND p.auth_id = (auth.uid())::text));
CREATE POLICY referrals_insert_own ON public.referrals FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = referrals.referrer_pro_id AND p.auth_id = (auth.uid())::text));
