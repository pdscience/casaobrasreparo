-- Migration: Add professional plan fields
-- Adds plan management columns to the professionals table

ALTER TABLE public.professionals
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'essencial',
  ADD COLUMN plan_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN plan_expires_at TIMESTAMPTZ,
  ADD COLUMN requests_this_month INTEGER DEFAULT 0,
  ADD COLUMN requests_reset_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_professionals_plan ON public.professionals(plan);
CREATE INDEX IF NOT EXISTS idx_professionals_stripe_customer ON public.professionals(stripe_customer_id);
