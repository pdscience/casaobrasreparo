-- Tabela de sistema (deduplicação do push): RLS explícito no padrão das
-- demais tabelas de sistema (ex.: service_analyses) — leitura/escrita abertas
-- aos papéis de runtime, sem UPDATE/DELETE por cliente.
-- Nota: functions operam com ANON_KEY (sem service role na plataforma), logo
-- policies não distinguem a function de um cliente; forjar linhas só suprime
-- pushes (sem PII/financeiro envolvido) — risco residual documentado.
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notification_log_select ON public.notification_log;
CREATE POLICY notification_log_select ON public.notification_log
FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS notification_log_insert ON public.notification_log;
CREATE POLICY notification_log_insert ON public.notification_log
FOR INSERT TO anon, authenticated WITH CHECK (true);
