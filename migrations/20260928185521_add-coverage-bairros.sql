-- Bairros atendidos pelo prestador (exibido no card do catálogo público).
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS coverage_bairros TEXT[] NOT NULL DEFAULT '{}';
