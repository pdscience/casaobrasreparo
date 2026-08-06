-- migrations/20260806141330_add-service-photos-storage-policies.sql
-- Allow anon to INSERT (upload) files to service-photos bucket
DROP POLICY IF EXISTS "service_photos_anon_insert" ON storage.objects;
CREATE POLICY service_photos_anon_insert ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket = 'service-photos');

-- Allow anon to SELECT (read) files from service-photos bucket
DROP POLICY IF EXISTS "service_photos_anon_select" ON storage.objects;
CREATE POLICY service_photos_anon_select ON storage.objects
  FOR SELECT TO anon
  USING (bucket = 'service-photos');

-- Allow anon to UPDATE files in service-photos bucket
DROP POLICY IF EXISTS "service_photos_anon_update" ON storage.objects;
CREATE POLICY service_photos_anon_update ON storage.objects
  FOR UPDATE TO anon
  USING (bucket = 'service-photos')
  WITH CHECK (bucket = 'service-photos');

-- Allow anon to DELETE files from service-photos bucket
DROP POLICY IF EXISTS "service_photos_anon_delete" ON storage.objects;
CREATE POLICY service_photos_anon_delete ON storage.objects
  FOR DELETE TO anon
  USING (bucket = 'service-photos');

-- Grant necessary permissions to anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon;
GRANT USAGE ON SCHEMA storage TO anon;
