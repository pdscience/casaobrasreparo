-- Galeria de servicos do profissional: ate 3 fotos, cada uma com legenda.
-- Fonte de verdade unica no front (portfolio_photos fica descontinuada).
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS portfolio_items JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill do array legado (no maximo 3 itens) para o novo formato.
UPDATE public.professionals AS p
SET portfolio_items = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('url', photo, 'caption', '') ORDER BY photo)
    FROM unnest(p.portfolio_photos[1:3]) AS photo
    WHERE photo <> ''
  ),
  '[]'::jsonb
)
WHERE p.portfolio_items = '[]'::jsonb
  AND cardinality(p.portfolio_photos) > 0;

ALTER TABLE public.professionals
  DROP CONSTRAINT IF EXISTS professionals_portfolio_items_shape;

ALTER TABLE public.professionals
  ADD CONSTRAINT professionals_portfolio_items_shape
  CHECK (jsonb_typeof(portfolio_items) = 'array' AND jsonb_array_length(portfolio_items) <= 3);

-- A regra de fotos passa a ser global (3 para todos os planos).
UPDATE public.plans SET max_photos = 3, updated_at = now() WHERE max_photos <> 3;
