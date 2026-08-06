CREATE TABLE IF NOT EXISTS public.professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating NUMERIC,
  reviews_count INTEGER,
  avatar TEXT,
  pix_key TEXT,
  bio TEXT,
  plan TEXT NOT NULL DEFAULT 'gratuito',
  plan_status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at TIMESTAMPTZ,
  requests_this_month INTEGER DEFAULT 0,
  requests_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_address TEXT NOT NULL,
  category TEXT NOT NULL,
  photo_url TEXT,
  notes TEXT,
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'Pendente',
  professional_id TEXT REFERENCES public.professionals(id),
  agendamento JSONB,
  final_price NUMERIC,
  receipt_issued BOOLEAN,
  rating JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_category ON public.service_requests(category);
CREATE INDEX IF NOT EXISTS idx_service_requests_professional_id ON public.service_requests(professional_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON public.service_requests(created_at DESC);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_requests_select ON public.service_requests FOR SELECT USING (true);
CREATE POLICY service_requests_insert ON public.service_requests FOR INSERT WITH CHECK (true);
CREATE POLICY service_requests_update ON public.service_requests FOR UPDATE USING (true);
CREATE POLICY service_requests_delete ON public.service_requests FOR DELETE USING (true);

CREATE POLICY professionals_select ON public.professionals FOR SELECT USING (true);
CREATE POLICY professionals_insert ON public.professionals FOR INSERT WITH CHECK (true);
CREATE POLICY professionals_update ON public.professionals FOR UPDATE USING (true);
CREATE POLICY professionals_delete ON public.professionals FOR DELETE USING (true);