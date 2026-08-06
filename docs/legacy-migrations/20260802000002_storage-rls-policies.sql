-- Enable RLS on storage.objects (idempotent)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on storage.objects for this bucket
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Allow anon to INSERT (upload) files to professional-avatars bucket
CREATE POLICY storage_objects_anon_insert ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket = 'professional-avatars');

-- Allow anon to SELECT (read) files from professional-avatars bucket
CREATE POLICY storage_objects_anon_select ON storage.objects
  FOR SELECT TO anon
  USING (bucket = 'professional-avatars');

-- Allow anon to UPDATE files in professional-avatars bucket
CREATE POLICY storage_objects_anon_update ON storage.objects
  FOR UPDATE TO anon
  USING (bucket = 'professional-avatars')
  WITH CHECK (bucket = 'professional-avatars');

-- Allow anon to DELETE files from professional-avatars bucket
CREATE POLICY storage_objects_anon_delete ON storage.objects
  FOR DELETE TO anon
  USING (bucket = 'professional-avatars');

-- Grant necessary permissions to anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon;
GRANT USAGE ON SCHEMA storage TO anon;