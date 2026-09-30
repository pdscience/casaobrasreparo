-- Análises IA assíncronas: preliminar imediato + resultado real via polling.
--
-- Fluxo: analyze-service cria a linha (processing) e responde rápido;
-- o worker em background grava o resultado (ready) ou o erro (error).

CREATE TABLE public.service_analyses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_analyses_status_created ON public.service_analyses(status, created_at DESC);

CREATE TRIGGER service_analyses_updated_at
  BEFORE UPDATE ON public.service_analyses
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.service_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_analyses_select ON public.service_analyses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY service_analyses_insert ON public.service_analyses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY service_analyses_update ON public.service_analyses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.service_analyses TO anon, authenticated;
