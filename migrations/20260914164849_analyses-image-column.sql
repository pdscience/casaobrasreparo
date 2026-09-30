-- Worker de análises: guarda a imagem (já reduzida, ~500KB) e permite
-- reservar a linha (status working) para o schedule não processar em duplicidade.
-- A imagem é apagada (NULL) ao concluir para manter a tabela enxuta.

ALTER TABLE public.service_analyses
  ADD COLUMN IF NOT EXISTS image_base64 TEXT;

ALTER TABLE public.service_analyses
  DROP CONSTRAINT IF EXISTS service_analyses_status_check;

ALTER TABLE public.service_analyses
  ADD CONSTRAINT service_analyses_status_check
  CHECK (status IN ('processing', 'working', 'ready', 'error'));
