-- migrations/20260805_plans_table.sql
CREATE TABLE IF NOT EXISTS public.plans (
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
