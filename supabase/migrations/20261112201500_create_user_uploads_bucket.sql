-- Migration: 20261112201500_create_user_uploads_bucket.sql
-- Description: Ensures public user-uploads storage bucket exists for user avatars.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-uploads',
    'user-uploads',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Allow public read user-uploads" ON storage.objects;
CREATE POLICY "Allow public read user-uploads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-uploads');
