-- migrations/20260806152723_add-client-id-to-service-requests.sql
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS client_id TEXT;

CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON public.service_requests(client_id);
