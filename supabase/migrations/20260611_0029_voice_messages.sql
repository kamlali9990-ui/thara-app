-- Add audio_url column to chat_messages for voice messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for voice messages if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'voice-messages', 'voice-messages', true, 5242880, ARRAY['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/mp4']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'voice-messages');

-- Allow authenticated users to upload voice messages
DROP POLICY IF EXISTS "voice_messages_insert_policy" ON storage.objects;
CREATE POLICY "voice_messages_insert_policy" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-messages'
    AND (storage.foldername(name))[1] = 'chats'
  );

-- Allow anyone to read voice messages (public bucket)
DROP POLICY IF EXISTS "voice_messages_select_policy" ON storage.objects;
CREATE POLICY "voice_messages_select_policy" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'voice-messages');
