-- Escrita restrita ao dono (auth.uid()) + índices dos filtros geográficos.
--
-- O baseline deixava INSERT/UPDATE/DELETE com qual = true para anon e
-- authenticated: qualquer visitante alterava ou apagava qualquer linha.
-- SELECT continua público de propósito: a landing monta o catálogo e a lista
-- de pedidos com Promise.all no mount.
--
-- service_analyses não é tocada: analyze-service grava com o JWT do usuário e
-- analyze-worker roda com ANON_KEY (dependem da escrita aberta).
--
-- O fulfillment do Stripe usa a função SECURITY DEFINER, que não passa por RLS.

-- ---------------------------------------------------------------------------
-- users: o dono é quem tem auth_id = auth.uid() (uuid do auth).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS users_insert ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;

CREATE POLICY users_insert ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = auth_id);

CREATE POLICY users_update ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = auth_id)
  WITH CHECK (auth.uid()::text = auth_id);

-- ---------------------------------------------------------------------------
-- professionals: dono = auth_id. O catálogo continua legível para todos.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS professionals_insert ON public.professionals;
DROP POLICY IF EXISTS professionals_update ON public.professionals;

CREATE POLICY professionals_insert ON public.professionals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = auth_id);

CREATE POLICY professionals_update ON public.professionals
  FOR UPDATE TO authenticated
  USING (auth.uid()::text = auth_id)
  WITH CHECK (auth.uid()::text = auth_id);

-- ---------------------------------------------------------------------------
-- service_requests:
--  - insert: só o próprio cliente (client_id = auth.uid()); o pedido sempre
--    nasce logado em handleConfirmOrder.
--  - update: o cliente dono, o profissional dono, ou broadcast ainda sem dono
--    (é assim que o pro assume um broadcast em handleUpdateStatus/handleSchedule).
--  - delete: só o cliente dono (o app não usa, mas mantém o poder com o dono).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS service_requests_insert ON public.service_requests;
DROP POLICY IF EXISTS service_requests_update ON public.service_requests;
DROP POLICY IF EXISTS service_requests_delete ON public.service_requests;

CREATE POLICY service_requests_insert ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY service_requests_update ON public.service_requests
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      client_id = auth.uid()
      OR professional_id IN (SELECT id FROM public.professionals WHERE auth_id = auth.uid()::text)
      OR professional_id IS NULL
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      client_id = auth.uid()
      OR professional_id IN (SELECT id FROM public.professionals WHERE auth_id = auth.uid()::text)
      OR professional_id IS NULL
    )
  );

CREATE POLICY service_requests_delete ON public.service_requests
  FOR DELETE TO authenticated
  USING (client_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: o arquivo passa a nascer em {auth_uid}/{chave}, então o dono é o
-- primeiro segmento do path. SELECT público é mantido (exibir avatar e foto).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS casaor_avatars_insert ON storage.objects;
DROP POLICY IF EXISTS casaor_avatars_update ON storage.objects;
DROP POLICY IF EXISTS casaor_photos_insert ON storage.objects;
DROP POLICY IF EXISTS casaor_photos_update ON storage.objects;

CREATE POLICY casaor_avatars_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'professional-avatars'
    AND (storage.foldername(key))[1] = auth.uid()::text
  );

CREATE POLICY casaor_avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket = 'professional-avatars'
    AND (storage.foldername(key))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket = 'professional-avatars'
    AND (storage.foldername(key))[1] = auth.uid()::text
  );

CREATE POLICY casaor_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'service-photos'
    AND (storage.foldername(key))[1] = auth.uid()::text
  );

CREATE POLICY casaor_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket = 'service-photos'
    AND (storage.foldername(key))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket = 'service-photos'
    AND (storage.foldername(key))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Índices para os filtros do diretório (cidade/UF/bairros via coverage_bairros).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_professionals_cidade ON public.professionals (cidade);
CREATE INDEX IF NOT EXISTS idx_professionals_uf ON public.professionals (uf);
CREATE INDEX IF NOT EXISTS idx_professionals_coverage_bairros ON public.professionals USING GIN (coverage_bairros);
