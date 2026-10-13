-- Log anti-duplicado de pushes + preferência de alertas do profissional.
CREATE TABLE IF NOT EXISTS public.notification_log (
  id TEXT PRIMARY KEY DEFAULT MD5(RANDOM()::TEXT),
  request_id TEXT NOT NULL,
  pro_id TEXT NOT NULL REFERENCES public.professionals(id),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_log_request_idx ON public.notification_log (request_id, pro_id, channel);

ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT true;
