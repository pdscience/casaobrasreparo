-- Premia a indicação no 1º serviço concluído do indicado:
-- referrer +30 dias de ouro, indicado +7 dias (janela ouro/trialing).
CREATE OR REPLACE FUNCTION public.reward_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_row RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM 'Concluído' THEN
    RETURN NEW;
  END IF;
  IF OLD.status IS NOT DISTINCT FROM 'Concluído' THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO ref_row
  FROM public.referrals
  WHERE referred_pro_id = NEW.professional_id AND status = 'cadastrado'
  ORDER BY created_at
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  UPDATE public.professionals
  SET plan = 'ouro', plan_status = 'trialing',
      plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '30 days'
  WHERE id = ref_row.referrer_pro_id;
  UPDATE public.professionals
  SET plan = 'ouro', plan_status = 'trialing',
      plan_expires_at = GREATEST(COALESCE(plan_expires_at, NOW()), NOW()) + INTERVAL '7 days'
  WHERE id = ref_row.referred_pro_id;
  UPDATE public.referrals SET status = 'premiado' WHERE id = ref_row.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_referral ON public.service_requests;
CREATE TRIGGER trg_reward_referral
AFTER UPDATE OF status ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.reward_referral();
