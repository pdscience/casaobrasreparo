-- Registra a indicação quando um profissional se cadastra com referred_by.
CREATE OR REPLACE FUNCTION public.track_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_id TEXT;
BEGIN
  IF NEW.referred_by IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT p.id INTO referrer_id
  FROM public.professionals p
  WHERE p.referral_code = NEW.referred_by
  LIMIT 1;
  IF referrer_id IS NULL OR referrer_id = NEW.id THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.referrals (referrer_pro_id, referred_pro_id, status)
  VALUES (referrer_id, NEW.id, 'cadastrado')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_referral ON public.professionals;
CREATE TRIGGER trg_track_referral
AFTER INSERT ON public.professionals
FOR EACH ROW
EXECUTE FUNCTION public.track_referral();
