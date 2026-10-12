-- Fotos do portfólio nascem em portfolio/{auth_uid}/{arquivo} (Task 5), mas a
-- policy anterior exigia o dono no PRIMEIRO segmento do path — todo upload de
-- portfólio caía em 403 ("You do not have permission to write ...").
--
-- Mantém o prefixo antigo {auth_uid}/{arquivo} (foto do orçamento do cliente
-- em useQuoteForm) e libera também portfolio/{auth_uid}/{arquivo}.
-- Em ambos os casos só o próprio dono escreve; SELECT continua público.

DROP POLICY IF EXISTS casaor_photos_insert ON storage.objects;
DROP POLICY IF EXISTS casaor_photos_update ON storage.objects;

CREATE POLICY casaor_photos_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket = 'service-photos'
    AND (
      (storage.foldername(key))[1] = auth.uid()::text
      OR (
        (storage.foldername(key))[1] = 'portfolio'
        AND (storage.foldername(key))[2] = auth.uid()::text
      )
    )
  );

CREATE POLICY casaor_photos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket = 'service-photos'
    AND (
      (storage.foldername(key))[1] = auth.uid()::text
      OR (
        (storage.foldername(key))[1] = 'portfolio'
        AND (storage.foldername(key))[2] = auth.uid()::text
      )
    )
  )
  WITH CHECK (
    bucket = 'service-photos'
    AND (
      (storage.foldername(key))[1] = auth.uid()::text
      OR (
        (storage.foldername(key))[1] = 'portfolio'
        AND (storage.foldername(key))[2] = auth.uid()::text
      )
    )
  );
