-- Permite ao dono apagar as proprias fotos do portfolio no storage.
-- O front remove o arquivo em best-effort; sem esta policy o DELETE cai em
-- 403 e os arquivos ficariam orfaos no bucket para sempre.
DROP POLICY IF EXISTS casaor_photos_delete ON storage.objects;

CREATE POLICY casaor_photos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket = 'service-photos'
    AND (
      (storage.foldername(key))[1] = auth.uid()::text
      OR (
        (storage.foldername(key))[1] = 'portfolio'
        AND (storage.foldername(key))[2] = auth.uid()::text
      )
    )
  );
