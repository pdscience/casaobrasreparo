-- Localização do prestador para os filtros de cidade/UF do cliente.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS cidade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS uf TEXT NOT NULL DEFAULT '';
