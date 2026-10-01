-- Mantém professionals.rating / reviews_count sincronizados com as avaliações
-- dos pedidos. Sem isso, o card do profissional exibe "0 (0)" para sempre,
-- pois a avaliação é salva só em service_requests.rating e o RLS impede o
-- cliente de atualizar a linha do profissional diretamente.

CREATE OR REPLACE FUNCTION public.sync_professional_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.professional_id IS NULL OR NEW.rating IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF NEW.professional_id IS NULL
    OR (NEW.rating IS NOT DISTINCT FROM OLD.rating
        AND NEW.professional_id IS NOT DISTINCT FROM OLD.professional_id) THEN
    RETURN NEW;
  END IF;

  UPDATE public.professionals p
  SET rating = COALESCE(sub.avg_stars, 0),
      reviews_count = COALESCE(sub.n, 0)::int
  FROM (
    SELECT ROUND(AVG((r.rating ->> 'stars')::numeric), 1) AS avg_stars,
           COUNT(*) AS n
    FROM public.service_requests r
    WHERE r.professional_id = COALESCE(NEW.professional_id, OLD.professional_id)
      AND (r.rating ->> 'stars') ~ '^[0-9]+(\.[0-9]+)?$'
  ) sub
  WHERE p.id = COALESCE(NEW.professional_id, OLD.professional_id);

  -- Se o pedido trocou de profissional, recalcula o antigo também.
  IF TG_OP = 'UPDATE'
    AND OLD.professional_id IS NOT NULL
    AND OLD.professional_id IS DISTINCT FROM NEW.professional_id THEN
    UPDATE public.professionals p
    SET rating = COALESCE(sub.avg_stars, 0),
        reviews_count = COALESCE(sub.n, 0)::int
    FROM (
      SELECT ROUND(AVG((r.rating ->> 'stars')::numeric), 1) AS avg_stars,
             COUNT(*) AS n
      FROM public.service_requests r
      WHERE r.professional_id = OLD.professional_id
        AND (r.rating ->> 'stars') ~ '^[0-9]+(\.[0-9]+)?$'
    ) sub
    WHERE p.id = OLD.professional_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_professional_rating ON public.service_requests;
CREATE TRIGGER trg_sync_professional_rating
AFTER INSERT OR UPDATE OF rating, professional_id ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_professional_rating();

-- Backfill: corrige os profissionais que já têm avaliações (ex.: 5.0 (1) em vez de 0 (0)).
UPDATE public.professionals p
SET rating = COALESCE(sub.avg_stars, 0),
    reviews_count = COALESCE(sub.n, 0)::int
FROM (
  SELECT r.professional_id AS pid,
         ROUND(AVG((r.rating ->> 'stars')::numeric), 1) AS avg_stars,
         COUNT(*) AS n
  FROM public.service_requests r
  WHERE r.professional_id IS NOT NULL
    AND (r.rating ->> 'stars') ~ '^[0-9]+(\.[0-9]+)?$'
  GROUP BY r.professional_id
) sub
WHERE p.id = sub.pid;
