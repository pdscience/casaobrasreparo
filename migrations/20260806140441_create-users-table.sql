-- migrations/20260806140441_create-users-table.sql
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  auth_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'pro')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  birth_date TEXT,
  address TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own record" ON public.users
  FOR SELECT USING (auth_id = auth.uid()::text);

CREATE POLICY "Users can insert own record" ON public.users
  FOR INSERT WITH CHECK (auth_id = auth.uid()::text);

CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (auth_id = auth.uid()::text)
  WITH CHECK (auth_id = auth.uid()::text);

CREATE POLICY "Users can delete own record" ON public.users
  FOR DELETE USING (auth_id = auth.uid()::text);
