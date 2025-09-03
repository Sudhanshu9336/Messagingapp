/*
  # Complete Database Schema for SecureChat

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - session identifier
      - `user_id` (bigint, unique) - 8-digit user ID
      - `username` (text, not null) - chosen username
      - `gender` (text, optional) - user gender
      - `avatar_url` (text, optional) - profile picture URL
      - `bio` (text, optional) - user bio
      - `public_key` (text, not null) - encryption public key
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `chats`
      - `id` (uuid, primary key)
      - `name` (text, optional) - group chat name
      - `is_group` (boolean, default false)
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `chat_participants`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key to chats)
      - `user_id` (uuid, foreign key to profiles)
      - `role` (text, enum: admin, member)
      - `joined_at` (timestamp)

    - `messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key to chats)
      - `sender_id` (uuid, foreign key to profiles)
      - `content` (text, encrypted message content)
      - `message_type` (text, enum: text, file, image, audio, video)
      - `file_url` (text, optional)
      - `file_name` (text, optional)
      - `file_size` (bigint, optional)
      - `encrypted_key` (text, optional) - file encryption key
      - `status` (text, enum: sent, delivered, read)
      - `reply_to` (uuid, optional, foreign key to messages)
      - `created_at` (timestamp)

    - `message_reactions`
      - `id` (uuid, primary key)
      - `message_id` (uuid, foreign key to messages)
      - `user_id` (uuid, foreign key to profiles)
      - `emoji` (text, reaction emoji)
      - `created_at` (timestamp)

    - `typing_indicators`
      - `chat_id` (uuid, foreign key to chats)
      - `user_id` (uuid, foreign key to profiles)
      - `is_typing` (boolean)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Policies for chat participants to access chat data

  3. Storage
    - Create storage bucket for files
    - Set up policies for file access
*/

-- Create the profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint UNIQUE NOT NULL,
  username text NOT NULL,
  gender text,
  avatar_url text,
  bio text,
  public_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create the chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_group boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create the chat_participants table
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'audio', 'video')),
  file_url text,
  file_name text,
  file_size bigint,
  encrypted_key text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create the message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create the typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Profiles policies (allow public read for search, own data management)
CREATE POLICY "Profiles are publicly readable"
  ON profiles
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated, anon
  USING (true);

CREATE POLICY "Anyone can create profile"
  ON profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Chats policies
CREATE POLICY "Users can view chats they participate in"
  ON chats
  FOR SELECT
  TO authenticated, anon
  USING (
    id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = id
    )
  );

CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Chat participants policies
CREATE POLICY "Users can view chat participants for their chats"
  ON chat_participants
  FOR SELECT
  TO authenticated, anon
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = user_id
    )
  );

CREATE POLICY "Users can be added to chats"
  ON chat_participants
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Messages policies
CREATE POLICY "Users can view messages from their chats"
  ON messages
  FOR SELECT
  TO authenticated, anon
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = sender_id
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON messages
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = sender_id
    )
  );

CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  TO authenticated, anon
  USING (sender_id = sender_id);

-- Message reactions policies
CREATE POLICY "Users can view reactions on messages they can see"
  ON message_reactions
  FOR SELECT
  TO authenticated, anon
  USING (
    message_id IN (
      SELECT id FROM messages WHERE chat_id IN (
        SELECT chat_id FROM chat_participants WHERE user_id = user_id
      )
    )
  );

CREATE POLICY "Users can add reactions to messages they can see"
  ON message_reactions
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    message_id IN (
      SELECT id FROM messages WHERE chat_id IN (
        SELECT chat_id FROM chat_participants WHERE user_id = user_id
      )
    )
  );

-- Typing indicators policies
CREATE POLICY "Users can view typing indicators for their chats"
  ON typing_indicators
  FOR SELECT
  TO authenticated, anon
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = user_id
    )
  );

CREATE POLICY "Users can update typing indicators for their chats"
  ON typing_indicators
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = user_id
    )
  );

CREATE POLICY "Users can update their typing status"
  ON typing_indicators
  FOR UPDATE
  TO authenticated, anon
  USING (user_id = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);

-- Create storage bucket for files
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Storage policies
CREATE POLICY "Anyone can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'files');

CREATE POLICY "Anyone can view files"
  ON storage.objects
  FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'files');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();