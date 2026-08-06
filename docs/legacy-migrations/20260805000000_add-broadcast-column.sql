ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS broadcast BOOLEAN NOT NULL DEFAULT false;
