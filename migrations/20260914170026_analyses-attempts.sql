-- Worker resiliente: contador de tentativas + recuperação de claims travados.
-- Linha só vai para 'error' após 3 tentativas; antes disso volta para 'processing'.

ALTER TABLE public.service_analyses
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- Recupera a linha de teste travada em 'working' pelo worker anterior
UPDATE public.service_analyses
SET status = 'processing', attempts = 0, updated_at = NOW()
WHERE status = 'working';
