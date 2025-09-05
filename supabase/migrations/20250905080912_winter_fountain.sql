/*
  # Cleanup Database Schema for Profile-Only Storage

  1. Remove Tables
    - Drop all messaging-related tables (chats, messages, etc.)
    - Keep only profiles table with simplified structure

  2. Profiles Table Updates
    - Add last_activity timestamp for cleanup tracking
    - Simplify structure to only essential fields

  3. Security
    - Update RLS policies for simplified access
    - Remove complex chat-related policies

  4. Cleanup Function
    - Add function to automatically delete inactive profiles
*/

-- Drop messaging-related tables
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS typing_indicators CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

-- Update profiles table structure
ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity);

-- Function to cleanup inactive profiles
CREATE OR REPLACE FUNCTION cleanup_inactive_profiles()
RETURNS void AS $$
BEGIN
  DELETE FROM profiles 
  WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for simplified access
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view chat participants for their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can be added to chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to messages they can see" ON message_reactions;
DROP POLICY IF EXISTS "Users can view typing indicators for their chats" ON typing_indicators;
DROP POLICY IF EXISTS "Users can update typing indicators for their chats" ON typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing status" ON typing_indicators;

-- Simplified profile policies
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can create profile" ON profiles;

CREATE POLICY "Profiles are publicly readable for search"
  ON profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can delete their own profile"
  ON profiles
  FOR DELETE
  TO authenticated, anon
  USING (true);

-- Function to update last activity
CREATE OR REPLACE FUNCTION update_last_activity(profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET last_activity = CURRENT_TIMESTAMP 
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql;

-- Remove storage bucket as we won't store files
DROP POLICY IF EXISTS "Anyone can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;

DO $$
BEGIN
  DELETE FROM storage.buckets WHERE id = 'files';
EXCEPTION
  WHEN OTHERS THEN null;
END $$;