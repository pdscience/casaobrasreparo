-- Baseline Casa Obras e Reparos (projeto CasaOR) — schema novo e limpo.
--
-- Tabelas:
--   public.users             perfil de acesso (cliente ou profissional) ligado ao auth
--   public.professionals     perfil público do prestador + assinatura
--   public.service_requests  chamados com análise da IA, agendamento e recibo
--   public.plans             planos de visibilidade (fonte única de preço/limite)
--
-- Buckets (criados via CLI, públicos): professional-avatars, service-photos.

-- ============ USERS ============
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,
  auth_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'pro')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  birth_date DATE,
  address TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_role ON public.users(role);

-- ============ PROFESSIONALS ============
CREATE TABLE public.professionals (
  id TEXT PRIMARY KEY,
  auth_id TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  rating NUMERIC NOT NULL DEFAULT 0,
  reviews_count INTEGER NOT NULL DEFAULT 0,
  avatar TEXT NOT NULL DEFAULT '',
  pix_key TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT 'gratuito' CHECK (plan IN ('gratuito', 'bronze', 'prata', 'ouro')),
  plan_status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_expires_at TIMESTAMPTZ,
  requests_this_month INTEGER NOT NULL DEFAULT 0,
  requests_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_professionals_auth_id ON public.professionals(auth_id);
CREATE INDEX idx_professionals_plan ON public.professionals(plan);
CREATE INDEX idx_professionals_category ON public.professionals(category);
CREATE INDEX idx_professionals_stripe_customer ON public.professionals(stripe_customer_id);

-- ============ SERVICE REQUESTS ============
CREATE TABLE public.service_requests (
  id TEXT PRIMARY KEY,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'Pendente',
  professional_id TEXT REFERENCES public.professionals(id) ON DELETE SET NULL,
  broadcast BOOLEAN NOT NULL DEFAULT false,
  agendamento JSONB,
  final_price NUMERIC,
  receipt_issued BOOLEAN NOT NULL DEFAULT false,
  rating JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
CREATE INDEX idx_service_requests_category ON public.service_requests(category);
CREATE INDEX idx_service_requests_professional_id ON public.service_requests(professional_id);
CREATE INDEX idx_service_requests_client_id ON public.service_requests(client_id);
CREATE INDEX idx_service_requests_created_at ON public.service_requests(created_at DESC);

-- ============ PLANS (+ seed) ============
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  monthly_price INTEGER NOT NULL DEFAULT 0,
  request_limit INTEGER,
  receives_broadcasts BOOLEAN NOT NULL DEFAULT false,
  show_whatsapp_to_client BOOLEAN NOT NULL DEFAULT false,
  client_visible BOOLEAN NOT NULL DEFAULT true,
  badge_label TEXT,
  badge_bg TEXT,
  badge_text TEXT,
  badge_border TEXT,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- request_limit NULL = ilimitado. Bronze SEM price (preencher quando o Price R$34,90 existir no Stripe).
INSERT INTO public.plans (id, display_name, rank, monthly_price, request_limit, receives_broadcasts, show_whatsapp_to_client, client_visible, badge_label, badge_bg, badge_text, badge_border, stripe_price_id) VALUES
('ouro', 'Ouro', 1, 7990, NULL, true, true, true, 'Premium', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20', 'price_1U0CldKUfRcMtQSBbx4QJEO0'),
('prata', 'Prata', 2, 5490, 30, true, true, true, 'Prioridade', 'bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20', 'price_1U0CknKUfRcMtQSByHhQdRrj'),
('bronze', 'Bronze', 3, 3490, 10, true, false, true, 'Concorrência', 'bg-amber-500/10', 'text-amber-400', 'border-amber-500/20', NULL),
('gratuito', 'Gratuito', 4, 0, 0, false, false, false, NULL, NULL, NULL, NULL, NULL);

-- ============ UPDATED_AT ============
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- ============ RLS ============
-- App usa anon key com filtros no código (mesmo modelo do projeto anterior):
-- leitura pública, escrita autenticada/anon conforme o fluxo (cadastro cria perfil).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select ON public.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY users_insert ON public.users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY users_update ON public.users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY professionals_select ON public.professionals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY professionals_insert ON public.professionals FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY professionals_update ON public.professionals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY service_requests_select ON public.service_requests FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY service_requests_insert ON public.service_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY service_requests_update ON public.service_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY service_requests_delete ON public.service_requests FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY plans_select ON public.plans FOR SELECT TO anon, authenticated USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.professionals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;

-- ============ STORAGE (buckets já criados via CLI) ============
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "casaor_avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "casaor_avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "casaor_avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "casaor_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "casaor_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "casaor_photos_update" ON storage.objects;

CREATE POLICY casaor_avatars_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket = 'professional-avatars');
CREATE POLICY casaor_avatars_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket = 'professional-avatars');
CREATE POLICY casaor_avatars_update ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket = 'professional-avatars')
  WITH CHECK (bucket = 'professional-avatars');

CREATE POLICY casaor_photos_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket = 'service-photos');
CREATE POLICY casaor_photos_insert ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket = 'service-photos');
CREATE POLICY casaor_photos_update ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket = 'service-photos')
  WITH CHECK (bucket = 'service-photos');

GRANT USAGE ON SCHEMA storage TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON storage.objects TO anon, authenticated;
